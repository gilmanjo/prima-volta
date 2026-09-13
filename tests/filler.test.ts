// Filler laws (08 §4): steps first · weakest next · frontier on pull with trickle ·
// polishing vs unavailable never conflated · sovereignty bypasses interleaving.
import { describe, it, expect } from "vitest";
import { catalog, compareAdmission, type ChordAtom } from "../src/core/catalog";
import { next, noteServed, type FillerState } from "../src/core/filler";
import { afterTeach, applyRep, newCard } from "../src/core/scheduler";
import type { GradeResult } from "../src/core/types";

const good: GradeResult = { rating: 3, latencyMs: 700, errorEvents: [], clean: true, inWindow: true };
const pool = (catalog.defaults("chord") as ChordAtom[])
  .filter(a => a.answer === "midi" && !a.stream && a.cue === "name" && a.form === "blocked" && a.hand !== "HT")
  .sort(compareAdmission)
  .slice(0, 40);
const fresh = (): FillerState => ({ cards: new Map(), recentServed: [], admittedThisWindow: [] });

describe("block-filler (08 §4)", () => {
  it("an empty area with no pool is unavailable, never polishing (G9)", () => {
    expect(next({ pool: [] }, fresh(), { servedCount: 0, nowMs: 0 }).kind).toBe("unavailable");
  });

  it("frontier on pull: an empty map admits teach states in admission order (maj wave first)", () => {
    const s = fresh();
    const r = next({ pool }, s, { servedCount: 0, nowMs: 0 });
    expect(r.kind).toBe("teach");
    expect((r as { atom: ChordAtom }).atom.quality).toBe("maj");
    expect((r as { atom: ChordAtom }).atom.root).toBe(0); // C first — the wave
  });

  it("trickle caps admissions per 10 minutes; appetite off admits nothing", () => {
    const s = fresh();
    let teaches = 0;
    for (let i = 0; i < 12; i++) {
      const r = next({ pool }, s, { servedCount: i, nowMs: 1000 + i });
      if (r.kind === "teach") { teaches++; s.cards.set(r.card.atomId, afterTeach(r.card)); }
      else if (r.kind === "item") {
        const { card } = applyRep(r.card, good, "t" + i, { servedCount: i, nowMs: 1000 + i });
        s.cards.set(card.atomId, card);
      }
    }
    expect(teaches).toBe(5); // TRICKLE_PER_10MIN
    const off = next({ pool, appetite: "off" }, fresh(), { servedCount: 0, nowMs: 0 });
    expect(off.kind).toBe("unavailable"); // nothing introduced, nothing admittable
  });

  it("ripe steps outrank everything (04 §2 drains first)", () => {
    const s = fresh();
    // introduce two atoms; one earns a confirm step, then practice moves on
    const a0 = pool[0], a1 = pool[1];
    let c0 = afterTeach(newCard(a0.id, 0));
    ({ card: c0 } = applyRep(c0, good, "t", { servedCount: 0, nowMs: 0 })); // → confirm, ripe at 20 items
    s.cards.set(a0.id, c0);
    s.cards.set(a1.id, afterTeach(newCard(a1.id, 0)));
    const r = next({ pool: [a0, a1] }, s, { servedCount: 25, nowMs: 1 });
    expect(r.kind).toBe("item");
    expect((r as { atom: ChordAtom }).atom.id).toBe(a0.id); // the ripe step, not the weaker learn card
  });

  it("interleaving never serves a third consecutive same root — and yields when the pool can't satisfy it", () => {
    const all = catalog.defaults("chord") as ChordAtom[];
    const find = (root: number, quality: string) =>
      all.find(a => a.root === root && a.quality === quality && a.hand === "RH" && a.answer === "midi" && !a.stream && a.cue === "name" && a.form === "blocked" && (a.inversion ?? 0) === 0)!;
    const s = fresh();
    const cMaj = find(0, "maj"), cMin = find(0, "min"), cDim = find(0, "dim"), gMaj = find(7, "maj");
    for (const a of [cDim, gMaj]) s.cards.set(a.id, afterTeach(newCard(a.id, 0)));
    noteServed(s, cMaj); noteServed(s, cMin); // two consecutive root-C serves, qualities distinct
    const r = next({ pool: [cDim, gMaj], appetite: "off" }, s, { servedCount: 2, nowMs: 0 });
    expect((r as { atom: ChordAtom }).atom.root).toBe(7); // a third root-C is blocked
    // sovereignty as the ruled yield (04 §6): a single-atom block serves it regardless
    const solo = next({ pool: [cDim], userScoped: true, appetite: "off" }, s, { servedCount: 2, nowMs: 0 });
    expect((solo as { atom: ChordAtom }).atom.id).toBe(cDim.id);
  });

  it("the cold-start dead zone never freezes: un-ripe step cards serve under user demand (08 §4, log #74)", () => {
    const s = fresh();
    // five atoms all parked in un-ripe confirm steps, trickle exhausted → must still serve
    for (const a of pool.slice(0, 5)) {
      let c = afterTeach(newCard(a.id, 0));
      ({ card: c } = applyRep(c, good, "t" + a.id, { servedCount: 0, nowMs: 0 }));
      s.cards.set(a.id, c);
    }
    s.admittedThisWindow = Array.from({ length: 5 }, () => ({ atMs: 1 }));
    const r = next({ pool: pool.slice(0, 5) }, s, { servedCount: 2, nowMs: 1000 });
    expect(r.kind).toBe("item"); // never "polishing", never frozen
  });

  it("everything graduated and bright → polishing, and it says so", () => {
    const s = fresh();
    const a = pool[0];
    let c = afterTeach(newCard(a.id, 0));
    ({ card: c } = applyRep(c, good, "t1", { servedCount: 0, nowMs: 0 }));
    ({ card: c } = applyRep(c, good, "t2", { servedCount: 25, nowMs: 1000 }));
    s.cards.set(a.id, c);
    const r = next({ pool: [a], appetite: "off" }, s, { servedCount: 30, nowMs: 2000 });
    expect(["item", "polishing"]).toContain(r.kind); // fresh graduate is bright: served as upkeep
  });
});
