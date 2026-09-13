// Pulsed-run laws (03 §4 windowed matcher · 03 §6 pulsed map · F5/F6 run shapes), pinned —
// with the personas that would notice them regressing (13's feature-ships-with-its-persona law).
import { describe, it, expect } from "vitest";
import { buildRun } from "../src/core/runs";
import { gradePulsedRun, gridWindowMs, type PulsedRunSpec } from "../src/core/grader/pulsed";
import { afterTeach, applyRep, newCard } from "../src/core/scheduler";
import type { ArpAtom, ScaleAtom } from "../src/core/catalog";
import type { NoteEvent } from "../src/core/types";

const scale = (over: Partial<ScaleAtom> = {}): ScaleAtom =>
  ({ id: "s1", family: "scale", inDefault: true, type: "major", key: 0, hand: "RH", cue: "name", ...over }) as ScaleAtom;
const arp = (over: Partial<ArpAtom> = {}): ArpAtom =>
  ({ id: "a1", family: "arp", inDefault: true, basis: "maj", root: 7, hand: "RH", start: "root", ...over }) as ArpAtom;

const T0 = 10_000, BEAT = 1000, W = gridWindowMs(BEAT, 25); // 145
const spec = (slots: PulsedRunSpec["slots"]): PulsedRunSpec =>
  ({ slots, t0Ms: T0, beatMs: BEAT, windowMs: W, promptAtMs: T0 });

/** Play a run: every expected note at its grid time + its offset (per flat note index). */
const play = (slots: PulsedRunSpec["slots"], offset: (i: number) => number): NoteEvent[] => {
  let i = 0;
  return slots.flatMap(s => s.midis.map(m => ({ midi: m, onMs: T0 + s.beat * BEAT + offset(i++), vel: 60 })));
};

describe("run shapes (F5/F6 — up-down, apex once)", () => {
  it("C major RH: one octave up-down, 15 slots, top sounded once", () => {
    const r = buildRun(scale());
    expect(r.slots.map(s => s.midis[0])).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60]);
    expect(r.slots.filter(s => s.midis[0] === 72).length).toBe(1);
  });

  it("A melodic minor ascends melodic and descends the natural form (the standard exercise)", () => {
    const r = buildRun(scale({ type: "minorMelodic", key: 9 }));
    expect(r.slots.map(s => s.midis[0]))
      .toEqual([69, 71, 72, 74, 76, 78, 80, 81, 79, 77, 76, 74, 72, 71, 69]); // F♯/G♯ up · G♮/F♮ down
  });

  it("G dominant-7th arpeggio: chord tones + octave, 9 slots", () => {
    const r = buildRun(arp({ basis: "dom7" }));
    expect(r.slots.map(s => s.midis[0])).toEqual([67, 71, 74, 77, 79, 77, 74, 71, 67]);
  });

  it("HT runs put both hands' notes in each slot, an octave apart", () => {
    const r = buildRun(scale({ hand: "HT" }));
    expect(r.slots[0].midis).toEqual([48, 60]);
    expect(r.noteCount).toBe(30);
  });
});

describe("the pulsed map (03 §6) — the pulse is part of the material", () => {
  const slots = buildRun(scale()).slots;

  it("every onset inside its grid window → Good", () => {
    const { result } = gradePulsedRun(spec(slots), play(slots, () => 40));
    expect(result.rating).toBe(3);
    expect(result.inWindow).toBe(true);
  });

  it("exactly one out-of-window onset → Hard — a timing event, never a fabricated pitch error (03 §4)", () => {
    const { result } = gradePulsedRun(spec(slots), play(slots, i => (i === 7 ? 300 : 20)));
    expect(result.rating).toBe(2);
    expect(result.errorEvents.length).toBe(1);
    expect(result.errorEvents[0].type).toBe("late");
    expect(result.clean).toBe(true); // no wrong notes — the grid judged the timing
  });

  it("more than one out-of-window onset → Again (slow, clunky runs can never pass)", () => {
    const { result } = gradePulsedRun(spec(slots), play(slots, i => (i === 3 || i === 9 ? -250 : 0)));
    expect(result.rating).toBe(1);
    expect(result.errorEvents.every(e => e.type === "early")).toBe(true);
  });

  it("a wrong neighbor is one substitution (association precedes verdict), and rates Again", () => {
    const notes = play(slots, () => 0).map(n => (n.onMs === T0 + 2000 ? { ...n, midi: 63 } : n)); // 64 → 63
    const { result } = gradePulsedRun(spec(slots), notes);
    expect(result.rating).toBe(1);
    expect(result.errorEvents.length).toBe(1);
    expect(result.errorEvents[0].type).toBe("substitution");
  });

  it("a skipped note is a deletion; an extra note an insertion — both Again", () => {
    const skipped = play(slots, () => 0).filter(n => n.onMs !== T0 + 5000);
    expect(gradePulsedRun(spec(slots), skipped).result.errorEvents.some(e => e.type === "deletion")).toBe(true);
    const extra = [...play(slots, () => 0), { midi: 66, onMs: T0 + 4500, vel: 60 }];
    const g = gradePulsedRun(spec(slots), extra);
    expect(g.result.rating).toBe(1);
    expect(g.result.errorEvents.some(e => e.type === "insertion")).toBe(true);
  });

  it("right pc in the wrong register is wrongOctave — a distinct diagnosis (03 §4)", () => {
    const notes = play(slots, () => 0).map(n => (n.onMs === T0 + 7000 ? { ...n, midi: 84 } : n)); // 72 → 84
    const { result } = gradePulsedRun(spec(slots), notes);
    expect(result.errorEvents.some(e => e.type === "wrongOctave")).toBe(true);
    expect(result.rating).toBe(1);
  });

  it("an HT slot missing one hand's note is a deletion", () => {
    const ht = buildRun(scale({ hand: "HT" })).slots;
    const notes = play(ht, () => 0).filter(n => !(n.midi === 60 && n.onMs === T0 + 7000)); // LH apex dropped
    expect(gradePulsedRun(spec(ht), notes).result.errorEvents.some(e => e.type === "deletion")).toBe(true);
  });

  it("evenness rides along as diagnostic", () => {
    const { evennessCv } = gradePulsedRun(spec(slots), play(slots, () => 0));
    expect(evennessCv).not.toBeNull();
    expect(evennessCv!).toBeLessThan(0.05);
  });
});

describe("pulsed personas (13 §law) — real grader + real steps", () => {
  const slots = buildRun(scale()).slots;
  const good = (jitter: (i: number) => number) => gradePulsedRun(spec(slots), play(slots, jitter)).result;
  const drive = (offset: (i: number) => number, reps: number) => {
    let c = afterTeach(newCard("s1", 0));
    const ratings: number[] = [];
    for (let r = 0; r < reps; r++) {
      const res = good(offset);
      ratings.push(res.rating);
      ({ card: c } = applyRep(c, res, `t${r}`, { servedCount: r * 25, nowMs: 1_000_000 + r * 15 * 60_000 }));
    }
    return { c, ratings };
  };
  let seed = 42;
  const rng = () => { seed = (seed * 1664525 + 1013904223) % 2 ** 32; return seed / 2 ** 32; };

  it("the steady worker (±40ms) rates Good and graduates", () => {
    const { c, ratings } = drive(() => Math.round(rng() * 80 - 40), 6);
    expect(ratings.every(r => r === 3)).toBe(true);
    expect(c.step).toBe("graduated");
  });

  it("the rusher (every onset 180ms early) never earns a Good and never graduates", () => {
    const { c, ratings } = drive(() => -180, 8);
    expect(ratings.every(r => r === 1)).toBe(true);
    expect(c.step).not.toBe("graduated");
  });

  it("the one-flaw player (one late onset per run) holds at Hard — steps demand a Good to advance (04 §2)", () => {
    const { c, ratings } = drive(i => (i === 5 ? 300 : 0), 8);
    expect(ratings.every(r => r === 2)).toBe(true);
    expect(c.step).not.toBe("graduated");
  });
});
