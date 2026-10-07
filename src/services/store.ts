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

/** One readwrite transaction across stores — a log row and its outbox entry land together
 *  or not at all ("logs are truth" survives a killed tab between the two writes). */
async function txAll(stores: string[], fn: (t: IDBTransaction) => void): Promise<void> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(stores, "readwrite");
    fn(t);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new DOMException("aborted"));
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
  seed?: string;                               // sampled-target atoms: the instance seed (02 §1)
  graderVersion: string; tagsVersion: string; gradeJson: unknown; startedAt: number; boutId: string;
}

export async function appendAttempt(a: AttemptRecord): Promise<void> {
  await txAll(["attempts", "outbox"], t => {
    t.objectStore("attempts").put(a, a.id);
    t.objectStore("outbox").put({ kind: "attempt", payload: a }, `attempt:${a.id}`);
  });
}

export async function appendReview(r: ReviewRow & { id: string }): Promise<void> {
  await txAll(["reviews", "outbox"], t => {
    t.objectStore("reviews").put(r, r.id);
    t.objectStore("outbox").put({ kind: "review", payload: r }, `review:${r.id}`);
  });
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
    // profiles import even when the review stream is empty — a calibrated rig with no
    // reps yet is still config worth having on a new device (03 §3)
    for (const p of body.profiles ?? []) await store.put("profiles", p.id, p);
    if (!body.reviews.length) return 0;
    for (const r of body.reviews) await store.put("reviews", r.id, r);
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
 *  the idle window, else closes the stale bout at its last activity and opens a fresh one.
 *  Serialized — device-detect and the first post-idle attempt race otherwise, and the loser's
 *  rotation would orphan a forever-open bout row. */
let boutChain: Promise<unknown> = Promise.resolve();
export function touchBout(profileId: string | null, nowMs: number): Promise<string> {
  const next = boutChain.then(() => touchBoutInner(profileId, nowMs));
  boutChain = next.catch(() => undefined);
  return next;
}

async function touchBoutInner(profileId: string | null, nowMs: number): Promise<string> {
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

// Each synced row costs the Worker one D1 subrequest; a multi-day offline backlog pushed
// whole would die mid-request forever. Chunks keep every POST inside the budget — a chunk
// that lands is deleted, a failure leaves the rest for the next push (10 §5).
const PUSH_CHUNK = 40;

export async function pushOutbox(): Promise<number> {
  const keys = (await store.allKeys("outbox")) as string[];
  if (!keys.length) return 0;
  let pushed = 0;
  for (let i = 0; i < keys.length; i += PUSH_CHUNK) {
    const chunk = keys.slice(i, i + PUSH_CHUNK);
    const entries = await Promise.all(chunk.map(async k => ({ key: k, entry: await store.get<{ kind: string; payload: unknown }>("outbox", k) })));
    const sent = entries.filter(e => e.entry !== undefined);
    const body = {
      attempts: sent.filter(e => e.entry!.kind === "attempt").map(e => e.entry!.payload),
      reviews: sent.filter(e => e.entry!.kind === "review").map(e => e.entry!.payload),
      bouts: sent.filter(e => e.entry!.kind === "bout").map(e => e.entry!.payload),
      profiles: sent.filter(e => e.entry!.kind === "profile").map(e => e.entry!.payload),
    };
    // offline or error: the outbox simply stays — a dead network is normal, never an exception
    const res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .catch(() => null);
    if (!res || !res.ok) break;
    // delete only what was ACTUALLY sent: an LWW key (bout:/profile:) overwritten while the
    // POST was in flight carries an unsent update and must stay for the next push
    await Promise.all(sent.map(async e => {
      const cur = await store.get<{ kind: string; payload: unknown }>("outbox", e.key);
      if (cur === undefined) return;
      if (JSON.stringify(cur) === JSON.stringify(e.entry)) await store.del("outbox", e.key);
    }));
    pushed += sent.length;
  }
  return pushed;
}
