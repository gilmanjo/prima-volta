"use client";
// The replica (10 §5): IndexedDB is the working store; the UI reads only this.
// Logs append; the outbox pushes in batches; projections (cards) live here, never in D1.
import type { DrillCard, ReviewRow } from "../core/scheduler";

const DB_NAME = "prima-volta";
const STORES = ["cards", "reviews", "attempts", "outbox", "profiles", "meta"] as const;

let dbp: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
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
  rawMidi: unknown[]; graderVersion: string; tagsVersion: string; gradeJson: unknown; startedAt: number; boutId: string;
}

export async function appendAttempt(a: AttemptRecord): Promise<void> {
  await store.put("attempts", a.id, a);
  await store.put("outbox", `attempt:${a.id}`, { kind: "attempt", payload: a });
}

export async function appendReview(r: ReviewRow & { id: string }): Promise<void> {
  await store.put("reviews", r.id, r);
  await store.put("outbox", `review:${r.id}`, { kind: "review", payload: r });
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
