// Minimal ULID (sortable, client-generated — 10 §4's id discipline). Crockford base32.
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function ulid(now = Date.now()): string {
  let t = now;
  let time = "";
  for (let i = 0; i < 10; i++) { time = B32[t % 32] + time; t = Math.floor(t / 32); }
  const rnd = new Uint8Array(16);
  globalThis.crypto.getRandomValues(rnd); // Node ≥19, browsers, and Workers all expose webcrypto globally
  let rand = "";
  for (let i = 0; i < 16; i++) rand += B32[rnd[i] % 32];
  return time + rand;
}
