// F3 laws (F3 §Params/§Tier ladder/§Grading): seeded anchor variety with the tier as the
// pool (white keys → all twelve — the instance-pool gate, 02 §1), spelling arithmetic that
// never exceeds a double, order-enforced melodic pairs, the harmonic grab, and TT's
// per-instance spelling with the engraving disambiguating the selector.
import { describe, it, expect } from "vitest";
import { compareAdmission, type IntervalAtom } from "../src/core/catalog";
import { gradeIntervalPair } from "../src/core/grader/interval";
import { KIND_SEMITONES, intervalWords, sampleInterval, spellNoteName, staffSpec } from "../src/core/intervals";

const atom = (o: Partial<IntervalAtom>): IntervalAtom =>
  ({ id: `i${JSON.stringify(o)}`, family: "interval", inDefault: true, kind: "M6", dir: "up", form: "melodic", cue: "name", clef: null, hand: "RH", answer: "midi", ...o }) as IntervalAtom;

describe("anchor sampling (F3 §Grading: instance variety; the tier IS the pool)", () => {
  it("deterministic per seed, and the interval arithmetic always holds", () => {
    for (const kind of Object.keys(KIND_SEMITONES)) for (const dir of ["up", "down"] as const) {
      for (let seed = 0; seed < 40; seed++) {
        const a = atom({ kind, dir });
        const i = sampleInterval(a, 1, seed);
        expect(sampleInterval(a, 1, seed)).toEqual(i);
        expect(Math.abs(i.target.midi - i.anchor.midi)).toBe(KIND_SEMITONES[kind]);
        expect(dir === "up" ? i.target.midi > i.anchor.midi : i.target.midi < i.anchor.midi).toBe(true);
        expect(Math.abs(i.target.inline)).toBeLessThanOrEqual(2); // spelling never exceeds a double
      }
    }
  });

  it("tier 0 draws white-key anchors; tier 1 eventually reaches the black keys", () => {
    let black = 0;
    for (let seed = 0; seed < 200; seed++) {
      expect(sampleInterval(atom({}), 0, seed).anchor.inline).toBe(0);
      if (sampleInterval(atom({}), 1, seed).anchor.inline !== 0) black++;
    }
    expect(black).toBeGreaterThan(20); // the widened pool is real
  });

  it("TT spells per instance — A4 (aug, size 4) or d5 (dim, size 5), both semitone 6", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const i = sampleInterval(atom({ kind: "TT" }), 0, seed);
      seen.add(i.label);
      expect(["A4", "d5"]).toContain(i.label);
      expect(i.label === "A4" ? i.quality : "dim").toBe(i.label === "A4" ? "aug" : "dim");
      expect(Math.abs(i.target.midi - i.anchor.midi)).toBe(6);
    }
    expect(seen.size).toBe(2);
  });

  it("names spell with their accidentals", () => {
    expect(spellNoteName({ letter: 3, octave: 4, inline: 1, midi: 66 })).toBe("F♯4");
    expect(spellNoteName({ letter: 6, octave: 3, inline: -1, midi: 58 })).toBe("B♭3");
  });

  it("engraving spec: an unaltered note carries NO glyph (♮ only cancels; nothing to cancel here)", () => {
    expect(staffSpec({ letter: 0, octave: 4, inline: 0, midi: 60 }).inline).toBeNull();
    expect(staffSpec({ letter: 3, octave: 4, inline: 1, midi: 66 }).inline).toBe(1);
    expect(staffSpec({ letter: 6, octave: 3, inline: -1, midi: 58 }).inline).toBe(-1);
  });

  it("the teach names the result in words (U2 §Teach: named, never scripted)", () => {
    expect(intervalWords({ size: 2, quality: "m" })).toBe("a minor second");
    expect(intervalWords({ size: 4, quality: "aug" })).toBe("an augmented fourth");
    expect(intervalWords({ size: 5, quality: "dim" })).toBe("a diminished fifth");
    expect(intervalWords({ size: 8, quality: "P" })).toBe("a perfect octave");
  });
});

describe("pair grading (F3 §Grading)", () => {
  const spec = { anchorMidi: 67, targetMidi: 76, form: "melodic" as const, windowMs: 5000, spreadMs: 105, promptAtMs: 1000 };
  const n = (midi: number, onMs: number) => ({ midi, onMs, vel: 60 });

  it("melodic in order → Good; the target's octave is exact", () => {
    expect(gradeIntervalPair(spec, [n(67, 2000), n(76, 2600)]).rating).toBe(3);
    const wrongOct = gradeIntervalPair(spec, [n(67, 2000), n(88, 2600)]);
    expect(wrongOct.rating).toBe(1);
    expect(wrongOct.errorEvents[0].type).toBe("wrongOctave");
  });

  it("melodic order is enforced — the anchor first (direction is identity)", () => {
    const g = gradeIntervalPair(spec, [n(76, 2000), n(67, 2600)]);
    expect(g.rating).toBe(1);
    expect(g.errorEvents[0].tags).toContain("order");
  });

  it("harmonic = the grab: both inside the spread window, any order", () => {
    const h = { ...spec, form: "harmonic" as const };
    expect(gradeIntervalPair(h, [n(76, 2000), n(67, 2050)]).rating).toBe(3);
    const apart = gradeIntervalPair(h, [n(67, 2000), n(76, 2400)]);
    expect(apart.rating).toBe(1);
    expect(apart.errorEvents[0].type).toBe("dropChordTone");
  });
});

describe("admission (kind order × form × cue — anchors are never admission)", () => {
  const before = (a: IntervalAtom, b: IntervalAtom) => expect(compareAdmission(a, b)).toBeLessThan(0);
  it("smaller kinds first; melodic before harmonic (T3); name before staff", () => {
    before(atom({ kind: "m2" }), atom({ kind: "P5" }));
    before(atom({}), atom({ form: "harmonic" }));
    before(atom({}), atom({ cue: "staff", clef: "treble" }));
  });
});
