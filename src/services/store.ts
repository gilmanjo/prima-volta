"use client";
// The replica (10 §5): IndexedDB is the working store; the UI reads only this.
// Logs append; the outbox pushes in batches; projections (cards) live here, never in D1.
import { boutDecision, type BoutRow, type CurrentBout } from "../core/bout";
import type { DrillCard, ReviewRow } from "../core/scheduler";
import { ulid } from "../core/ulid";

const DB_NAME = "prima-volta";
const STORES = ["cards", "reviews", "attempts", "outbox", "profiles", "meta", "bouts"] as const;

let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2); // v2 adds the bouts store (08 §6)
      req.onupgradeneeded = () => {
        for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbp;
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const r = fn(t.objectStore(store));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const store = {
  put: (s: string, key: string, value: unknown) => tx(s, "readwrite", os => os.put(value, key)),
  get: <T>(s: string, key: string) => tx<T | undefined>(s, "readonly", os => os.get(key) as IDBRequest<T | undefined>),
  all: <T>(s: string) => tx<T[]>(s, "readonly", os => os.getAll() as IDBRequest<T[]>),
  allKeys: (s: string) => tx<IDBValidKey[]>(s, "readonly", os => os.getAllKeys()),
  del: (s: string, key: string) => tx(s, "readwrite", os => os.delete(key)),
};

export async function loadCards(): Promise<Map<string, DrillCard>> {
  const cards = await store.all<DrillCard>("cards");
  return new Map(cards.map(c => [c.atomId, c]));
}

export async function saveCard(c: DrillCard): Promise<void> { await store.put("cards", c.atomId, c); }

export interface AttemptRecord {
  id: string; kind: "drill"; atomId: string; mode: "rehearsal"; profileId: string | null;
  rawMidi: unknown[]; rawChoiceJson?: unknown; // widget answers log their event stream instead (10 §4)
  graderVersion: string; tagsVersion: string; gradeJson: unknown; startedAt: number; boutId: string;
}

export async function appendAttempt(a: AttemptRecord): Promise<void> {
  await store.put("attempts", a.id, a);
  await store.put("outbox", `attempt:${a.id}`, { kind: "attempt", payload: a });
}

export async function appendReview(r: ReviewRow & { id: string }): Promise<void> {
  await store.put("reviews", r.id, r);
  await store.put("outbox", `review:${r.id}`, { kind: "review", payload: r });
}

import type { DeviceProfile } from "./midi";

/** New-device boot (10 §5, online once): pull the review stream, refold cards client-side.
 *  Runs only when the local replica is empty; pulled rows land WITHOUT outbox entries. */
export async function pullReplica(
  refold: (rows: import("../core/refold").RefoldRow[]) => Map<string, DrillCard>,
): Promise<number> {
  try {
    const res = await fetch("/api/pull");
    if (!res.ok) return 0;
    const body = (await res.json()) as {
      reviews: (import("../core/refold").RefoldRow & { id: string; tier: number })[];
      profiles: (DeviceProfile & { calibratedAt?: number | null })[];
    };
    if (!body.reviews.length) return 0;
    for (const r of body.reviews) await store.put("reviews", r.id, r);
    for (const p of body.profiles ?? []) await store.put("profiles", p.id, p);
    const cards = refold(body.reviews);
    for (const c of cards.values()) await store.put("cards", c.atomId, c);
    await store.put("meta", "pulledAt", Date.now());
    return body.reviews.length;
  } catch {
    return 0; // offline new-device boot is out of scope by design (10 §5)
  }
}

/** A measured device profile (03 §3): saved locally and synced — config, never history. */
export async function saveProfile(p: DeviceProfile & { calibratedAt: number }): Promise<void> {
  await store.put("profiles", p.id, p);
  await store.put("outbox", `profile:${p.id}`, { kind: "profile", payload: p });
}

export async function loadProfile(id: string): Promise<(DeviceProfile & { calibratedAt?: number }) | undefined> {
  return store.get("profiles", id);
}

/** The current bout's id for an attempt happening NOW (08 §6): continues the sitting within
 *  the idle window, else closes the stale bout at its last activity and opens a fresh one. */
export async function touchBout(profileId: string | null, nowMs: number): Promise<string> {
  const cur = await store.get<CurrentBout>("meta", "currentBout");
  const d = boutDecision(cur, nowMs, ulid());
  if (d.kind === "rotate") {
    if (cur && d.closeAt !== null) {
      const stale = await store.get<BoutRow>("bouts", cur.id);
      if (stale && stale.closedAt == null) {
        const closed = { ...stale, closedAt: d.closeAt };
        await store.put("bouts", closed.id, closed);
        await store.put("outbox", `bout:${closed.id}`, { kind: "bout", payload: closed });
      }
    }
    const row: BoutRow = { id: d.current.id, openedAt: nowMs, closedAt: null, profileId, clockCorrJson: null };
    await store.put("bouts", row.id, row);
    await store.put("outbox", `bout:${row.id}`, { kind: "bout", payload: row });
  }
  await store.put("meta", "currentBout", d.current);
  return d.current.id;
}

/** The device arrived mid-bout: attach its profile if the bout opened without one (08 §6). */
export async function attachBoutProfile(profileId: string): Promise<void> {
  const cur = await store.get<CurrentBout>("meta", "currentBout");
  if (!cur) return;
  const row = await store.get<BoutRow>("bouts", cur.id);
  if (!row || row.profileId !== null) return;
  const updated = { ...row, profileId };
  await store.put("bouts", updated.id, updated);
  await store.put("outbox", `bout:${updated.id}`, { kind: "bout", payload: updated });
}

export async function pushOutbox(): Promise<number> {
  const keys = (await store.allKeys("outbox")) as string[];
  if (!keys.length) return 0;
  const entries = await Promise.all(keys.map(async k => ({ key: k, entry: await store.get<{ kind: string; payload: unknown }>("outbox", k) })));
  const body = {
    attempts: entries.filter(e => e.entry?.kind === "attempt").map(e => e.entry!.payload),
    reviews: entries.filter(e => e.entry?.kind === "review").map(e => e.entry!.payload),
    bouts: entries.filter(e => e.entry?.kind === "bout").map(e => e.entry!.payload),
    profiles: entries.filter(e => e.entry?.kind === "profile").map(e => e.entry!.payload),
  };
  const res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) return 0; // offline or error: outbox simply stays (10 §5)
  await Promise.all(keys.map(k => store.del("outbox", k)));
  return keys.length;
}
