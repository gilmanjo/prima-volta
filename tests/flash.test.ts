// F8 laws (F8 §Mechanics/§Tier ladder/§Grading · 04 §5): seed-derived instances rendered
// as real measures, pitch+order instance grading with the key-misread tag, the N-instance
// aggregation map, the display-ladder gates on the widened tier machinery, and group-B rows.
import { describe, it, expect } from "vitest";
import { catalog, compareAdmission, tierMaxOf, type FlashAtom } from "../src/core/catalog";
import { deriveInstanceSeed, flashDisplayMs, sampleFlash } from "../src/core/flash";
import { aggregateFlashRep, gradeFlashInstance, type FlashInstanceSpec } from "../src/core/grader/flash";
import { applyRep, gateRepPending, newCard, type DrillCard } from "../src/core/scheduler";
import { refoldCards, type RefoldRow } from "../src/core/refold";
import type { GradeResult } from "../src/core/types";

const atom = (o: Partial<FlashAtom> = {}): FlashAtom =>
  ({ id: `f${JSON.stringify(o)}`, family: "flash", inDefault: true, pattern: "third", clef: "treble", keyContext: "open", ...o }) as FlashAtom;

const DUR_BEATS: Record<string, number> = { w: 4, h: 2, q: 1, "8": 0.5 };
const beatsOf = (time: string) => Number(time.split("/")[0]);

describe("instance sampling (F8 §Mechanics: fresh renderings, real measures)", () => {
  it("deterministic per seed; the rhythm skin always fills its measure exactly", () => {
    for (const pattern of ["second", "third", "fourth", "fifth", "sixth", "triadShape", "scaleFragment", "brokenChord"]) {
      for (let seed = 0; seed < 50; seed++) {
        const a = atom({ pattern });
        const i = sampleFlash(a, 0, seed);
        expect(sampleFlash(a, 0, seed)).toEqual(i);
        const beats = (i.chord ? [i.durs[0]] : i.durs).reduce((s, d) => s + DUR_BEATS[d], 0);
        expect(beats).toBe(beatsOf(i.time));
        expect(i.durs.length).toBe(i.chord ? 1 : i.notes.length);
      }
    }
  });

  it("walks step by their interval; fragments stepwise; the snowman stacks thirds; broken figures arc", () => {
    for (let seed = 0; seed < 40; seed++) {
      const third = sampleFlash(atom({ pattern: "third" }), 0, seed);
      const L = (n: { letter: number; octave: number }) => n.octave * 7 + n.letter;
      const steps = third.notes.slice(1).map((n, k) => L(n) - L(third.notes[k]));
      expect(steps.every(s => Math.abs(s) === 2)).toBe(true);
      const frag = sampleFlash(atom({ pattern: "scaleFragment" }), 0, seed);
      expect(frag.notes.slice(1).every((n, k) => Math.abs(L(n) - L(frag.notes[k])) === 1)).toBe(true);
      const snow = sampleFlash(atom({ pattern: "triadShape" }), 0, seed);
      expect(snow.chord).toBe(true);
      expect(snow.notes.slice(1).map((n, k) => L(n) - L(snow.notes[k]))).toEqual([2, 2]);
      const broken = sampleFlash(atom({ pattern: "brokenChord" }), 0, seed);
      const rel = broken.notes.map(n => L(n) - L(broken.notes[0]));
      expect([[0, 2, 4, 2], [0, -2, -4, -2]]).toContainEqual(rel);
    }
  });

  it("stays in-staff ± a ledger, per clef", () => {
    for (const clef of ["treble", "bass"] as const) {
      const [lo, hi] = clef === "treble" ? [28, 40] : [16, 28];
      for (const pattern of ["second", "sixth", "scaleFragment", "brokenChord", "triadShape"])
        for (let seed = 0; seed < 60; seed++) {
          const i = sampleFlash(atom({ pattern, clef }), 0, seed);
          for (const n of i.notes) {
            const L = n.octave * 7 + n.letter;
            expect(L).toBeGreaterThanOrEqual(lo);
            expect(L).toBeLessThanOrEqual(hi);
          }
        }
    }
  });

  it("signatures APPLY (F2 T2): a ks12 figure sounds its key's accidentals with no inline marks", () => {
    let sharpened = 0;
    for (let seed = 0; seed < 80; seed++) {
      const i = sampleFlash(atom({ pattern: "scaleFragment", keyContext: "ks12" }), 0, seed);
      expect(i.sig).not.toBe(0);
      expect(Math.abs(i.sig)).toBeLessThanOrEqual(2);
      expect(i.keyLabel).not.toBeNull();
      for (const n of i.notes) {
        const natural = 12 * (n.octave + 1) + [0, 2, 4, 5, 7, 9, 11][n.letter];
        if (n.midi !== natural) sharpened++;
      }
    }
    expect(sharpened).toBeGreaterThan(10); // the signature genuinely bites
  });

  it("the key labels spell as their SIGNATURES spell (log #98: 5♭ is D♭, never C♯; −6 stays out)", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const i = sampleFlash(atom({ pattern: "scaleFragment", keyContext: "ksAll" }), 0, seed);
      expect(i.sig).not.toBe(-6); // G♭ is scope-gated; F♯ carries the six-accidental slot
      if (i.keyLabel) seen.add(`${i.sig}:${i.keyLabel}`);
    }
    expect(seen.has("-5:D♭")).toBe(true);
    expect([...seen].some(s => s.includes("C♯"))).toBe(false);
  });

  it("instance seeds derive from the rep seed — one seed re-renders all N (04 §5)", () => {
    expect(deriveInstanceSeed(123, 0)).toBe(deriveInstanceSeed(123, 0));
    expect(deriveInstanceSeed(123, 0)).not.toBe(deriveInstanceSeed(123, 1));
    expect(deriveInstanceSeed(123, 1)).not.toBe(deriveInstanceSeed(124, 1));
  });

  it("the display ladder is the tier (2000→400), clamped", () => {
    expect([0, 1, 2, 3, 4].map(flashDisplayMs)).toEqual([2000, 1200, 800, 600, 400]);
    expect(flashDisplayMs(9)).toBe(400);
  });
});

describe("instance grading (F8 §Grading)", () => {
  const n = (midi: number, onMs: number) => ({ midi, onMs, vel: 60 });
  const seqSpec = (midis: number[], naturals?: number[]): FlashInstanceSpec => ({
    expected: midis.map((m, i) => ({ midi: m, naturalMidi: naturals?.[i] ?? m })),
    chord: false, windowMs: 5000, blankAtMs: 1000, keyLabel: null,
  });

  it("pitch + order strict; latency = blank → first correct onset", () => {
    const g = gradeFlashInstance(seqSpec([64, 67, 71]), [n(64, 1800), n(67, 2300), n(71, 2800)]);
    expect(g.rating).toBe(3);
    expect(g.latencyMs).toBe(800);
    expect(gradeFlashInstance(seqSpec([64, 67, 71]), [n(67, 1800), n(64, 2300), n(71, 2800)]).rating).toBe(1);
  });

  it("octave-exact (a staff cue names registers): the same pc an octave off is wrongOctave", () => {
    const g = gradeFlashInstance(seqSpec([64, 67, 71]), [n(64, 1800), n(79, 2300)]);
    expect(g.rating).toBe(1);
    expect(g.errorEvents[0].type).toBe("wrongOctave");
  });

  it("a ♮ where the signature sharpens logs the key:X misread (F2 T2 semantics)", () => {
    const spec: FlashInstanceSpec = {
      expected: [{ midi: 62, naturalMidi: 62 }, { midi: 66, naturalMidi: 65 }, { midi: 69, naturalMidi: 69 }],
      chord: false, windowMs: 5000, blankAtMs: 1000, keyLabel: "D",
    };
    const g = gradeFlashInstance(spec, [n(62, 1500), n(65, 2000)]); // F♮ under two sharps
    expect(g.rating).toBe(1);
    expect(g.errorEvents[0].tags).toContain("key:D");
  });

  it("chatter collapses (03 §7); the snowman grabs in any order; a timeout's partial take is a deletion", () => {
    expect(gradeFlashInstance(seqSpec([64, 67]), [n(64, 1500), n(64, 1700), n(67, 2100)]).rating).toBe(3);
    const chord: FlashInstanceSpec = {
      expected: [64, 67, 71].map(m => ({ midi: m, naturalMidi: m })),
      chord: true, windowMs: 5000, blankAtMs: 1000, keyLabel: null,
    };
    expect(gradeFlashInstance(chord, [n(71, 1600), n(64, 1650), n(67, 1700)]).rating).toBe(3);
    const partial = gradeFlashInstance(seqSpec([64, 67, 71]), [n(64, 1500)]);
    expect(partial.rating).toBe(1);
    expect(partial.errorEvents[0].type).toBe("deletion");
  });
});

describe("the class rep (04 §5: N instances, one rating; 02 §1's ladder gates)", () => {
  const R = (rating: 1 | 2 | 3, latencyMs = 900): GradeResult =>
    ({ rating, latencyMs, errorEvents: [], clean: rating !== 1, inWindow: rating === 3 });

  it("all Good → Good · exactly one below → Hard · more → Again (4-of-5 at a gate = Hard)", () => {
    expect(aggregateFlashRep([R(3), R(3), R(3)]).rating).toBe(3);
    expect(aggregateFlashRep([R(3), R(2), R(3)]).rating).toBe(2);
    expect(aggregateFlashRep([R(3), R(1), R(3)]).rating).toBe(2); // one Again instance is still ONE below
    expect(aggregateFlashRep([R(1), R(3), R(2)]).rating).toBe(1);
    expect(aggregateFlashRep([R(3), R(3), R(3), R(3), R(2)]).rating).toBe(2);
    const agg = aggregateFlashRep([R(3, 800), R(3, 1000), R(3, 1200)]);
    expect(agg.latencyMs).toBe(1000); // the span stat: mean of the clean latencies
    expect(agg.inWindow).toBe(agg.rating === 3); // the refold invariant (10 §5)
  });

  const rep = (card: DrillCard, rating: 1 | 2 | 3, i: number, group: "A" | "B" = "B") =>
    applyRep(card, R(rating), `a${i}`, { servedCount: i, nowMs: 1_000_000 + i * 60_000 },
      false, null, true, { tierMax: 4, paramGroup: group });

  it("the display ladder gates: 3-streaks climb 0→4 and release back; rows log group B", () => {
    let c: DrillCard = { ...newCard("fx", 0), step: "graduated", fsrs: null };
    // graduate honestly first: learn → confirm → graduated
    c = { ...newCard("fx", 0), step: "learn" };
    let i = 0;
    c = rep(c, 3, i++).card;                 // learn → confirm queued
    c = rep(c, 3, i++).card;                 // confirm → graduated
    expect(c.step).toBe("graduated");
    for (let k = 0; k < 3; k++) {
      const out = rep(c, 3, i++);
      expect(out.row.paramGroup).toBe("B");
      c = out.card;
    }
    expect(c.tier).toBe(1);                  // 2000 → 1200: the first gate earned
    expect(c.gateStreak).toBe(0);
    for (let k = 0; k < 9; k++) c = rep(c, 3, i++).card;
    expect(c.tier).toBe(4);                  // climbed the whole ladder
    for (let k = 0; k < 3; k++) c = rep(c, 3, i++).card;
    expect(c.tier).toBe(4);                  // the top rung holds — no gate past 400ms
    for (let k = 0; k < 3; k++) c = rep(c, 2, i++).card;
    expect(c.tier).toBe(3);                  // held, not owned (#67): three slows release a rung
  });

  it("the gate rep is the one that would complete the earn streak (N=5 there)", () => {
    let c: DrillCard = { ...newCard("fx", 0), step: "learn" };
    let i = 0;
    c = rep(c, 3, i++).card;
    c = rep(c, 3, i++).card; // graduated
    expect(gateRepPending(c, 4)).toBe(false);
    c = rep(c, 3, i++).card;
    c = rep(c, 3, i++).card; // streak 2 — one Good from the gate
    expect(gateRepPending(c, 4)).toBe(true);
    c = rep(c, 3, i++).card; // gate crossed, streak reset
    expect(gateRepPending(c, 4)).toBe(false);
    const maxed: DrillCard = { ...c, tier: 4, gateStreak: 2 };
    expect(gateRepPending(maxed, 4)).toBe(false); // nothing left to earn at 400ms
  });

  it("the replica refold climbs the same ladder (10 §5: logs, never projections)", () => {
    const rows: RefoldRow[] = Array.from({ length: 11 }, (_, k) => ({
      atomId: "fx", attemptId: `r${k}`, rating: 3, latencyMs: 900,
      derived: false, parentAttemptId: null, reviewedAt: 1_000_000 + k * 60_000,
    }));
    const folded = refoldCards(rows, () => true, () => 4).get("fx")!;
    expect(folded.step).toBe("graduated");
    expect(folded.tier).toBe(3); // 2 step reps graduate; 9 graduated Goods = three full gates
  });

  it("admission runs the Piano Safari order: 2nds → 3rds → 5THS → 4ths (F8 §Mechanics)", () => {
    const order = ["second", "third", "fifth", "fourth"];
    for (let k = 0; k + 1 < order.length; k++) {
      expect(compareAdmission(atom({ pattern: order[k] }), atom({ pattern: order[k + 1] }))).toBeLessThan(0);
    }
    expect(compareAdmission(atom({ pattern: "sixth" }), atom({ pattern: "triadShape" }))).toBeLessThan(0);
    expect(compareAdmission(atom({}), atom({ keyContext: "ks12" }))).toBeLessThan(0);
    expect(tierMaxOf(atom({}))).toBe(4);
    expect((catalog.defaults("flash") as FlashAtom[]).length).toBe(4); // 2nds·3rds·4ths·5ths, treble, open
  });
});
