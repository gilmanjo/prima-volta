// F2 laws (F2 §Params/§Tier ladder/§Grading · 02 §1's sampled targets): seed-deterministic
// instances, T2's the-F-line-IS-F♯ semantics, octave-strict grading with the wrongOctave
// diagnosis, and the crossed-dimension admission ladder.
import { describe, it, expect } from "vitest";
import { compareAdmission, knowledgeAnswerable, type DrillAtom, type ReadingAtom } from "../src/core/catalog";
import { gradeSingleNote } from "../src/core/grader/note";
import { sampleReading, sigEffect, spellSounding } from "../src/core/reading";

const atom = (o: Partial<ReadingAtom>): ReadingAtom =>
  ({ id: `r${JSON.stringify(o)}`, family: "reading", inDefault: true, clef: "treble", band: "staff12", keyContext: "open", accidental: "none", answer: "midi", ...o }) as ReadingAtom;

describe("instance sampling (02 §1: seeded variety, re-displayable forever)", () => {
  it("the same atom + seed always yields the same instance", () => {
    const a = atom({ keyContext: "ks14", accidental: "single" });
    for (const seed of [1, 42, 987654]) {
      expect(sampleReading(a, seed)).toEqual(sampleReading(a, seed));
    }
  });

  it("T2 semantics: under a signature with no inline mark, the letter's line IS the altered note", () => {
    for (let seed = 0; seed < 300; seed++) {
      const i = sampleReading(atom({ keyContext: "ks14" }), seed);
      expect(i.inline).toBeNull();
      const eff = sigEffect(i.letter, i.sig);
      expect(i.eff).toBe(eff);
      expect(i.midi % 12).toBe((12 * (i.octave + 1) + [0, 2, 4, 5, 7, 9, 11][i.letter] + eff) % 12);
      if (eff !== 0) expect(i.spelled).toContain(eff > 0 ? "♯" : "♭"); // F line in D major spells F♯
    }
  });

  it("an inline ♮ cancels the signature; doubles move two semitones", () => {
    expect(spellSounding(3, 4, 0, 2)).toBe("F4");     // ♮ under D major names plain F4
    expect(spellSounding(3, 4, 2, 0)).toBe("F𝄪4");
    for (let seed = 0; seed < 200; seed++) {
      const i = sampleReading(atom({ accidental: "double" }), seed);
      expect(Math.abs(i.inline!)).toBe(2);
      expect(Math.abs(i.eff)).toBe(2);
    }
  });

  it("bands sample their zones: treble staff12 stays within A3–C6", () => {
    for (let seed = 0; seed < 300; seed++) {
      const i = sampleReading(atom({}), seed);
      const naturalMidi = 12 * (i.octave + 1) + [0, 2, 4, 5, 7, 9, 11][i.letter];
      expect(naturalMidi).toBeGreaterThanOrEqual(57); // A3
      expect(naturalMidi).toBeLessThanOrEqual(84);    // C6
    }
  });
});

describe("the crossed-dimension ladder (F2 §Tier ladder — the later dimension governs)", () => {
  const before = (a: ReadingAtom, b: ReadingAtom) => expect(compareAdmission(a, b)).toBeLessThan(0);
  it("T0 plain < T1 accidentals < T2 signatures < T3 deep ledger < T4 doubles", () => {
    before(atom({}), atom({ accidental: "single" }));
    before(atom({ accidental: "single" }), atom({ keyContext: "ks14" }));
    before(atom({ keyContext: "ksAll" }), atom({ band: "ledger3" }));
    before(atom({ band: "ledger3" }), atom({ accidental: "double" }));
  });
  it("crossed atoms admit at their LATER dimension: doubles-under-signatures behind T4", () => {
    before(atom({ band: "ledger3" }), atom({ keyContext: "ks14", accidental: "double" }));
  });
});

describe("knowledge-only mode's filter (08 §7 — the filler AND the map apply it)", () => {
  it("choice-answerable: keys, chord spell, reading selector — and nothing at-instrument", () => {
    const cases: [Partial<DrillAtom> & { family: string }, boolean][] = [
      [{ family: "keys", sig: 0, mode: "major", clef: "treble", dir: "sigToKey" }, true],
      [{ family: "chord", root: 0, quality: "maj", answer: "spell" }, true],
      [{ family: "reading", clef: "treble", band: "staff12", keyContext: "open", accidental: "none", answer: "selector" }, true],
      [{ family: "reading", clef: "treble", band: "staff12", keyContext: "open", accidental: "none", answer: "midi" }, false],
      [{ family: "chord", root: 0, quality: "maj", answer: "midi", hand: "RH", form: "blocked", cue: "name" }, false],
      [{ family: "scale", type: "major", key: 0, hand: "RH", cue: "name" }, false],
      [{ family: "arp", basis: "maj", root: 0, hand: "RH", start: "root" }, false],
    ];
    for (const [a, want] of cases) {
      expect(knowledgeAnswerable({ id: "x", inDefault: true, ...a } as DrillAtom)).toBe(want);
    }
  });
});

describe("staff→midi grading (F2 §Grading: octave-strict, sounding pitch)", () => {
  const spec = { midi: 66, spelled: "F♯4", windowMs: 5000, promptAtMs: 1000 };
  it("the sounding key answers, whatever its spelling → Good in the window", () => {
    const g = gradeSingleNote(spec, { midi: 66, onMs: 2400, vel: 60 });
    expect(g.rating).toBe(3);
    expect(g.latencyMs).toBe(1400);
  });
  it("right but slow → Hard", () => {
    expect(gradeSingleNote(spec, { midi: 66, onMs: 7500, vel: 60 }).rating).toBe(2);
  });
  it("the right pitch class in the wrong register is wrongOctave — register identity is the point", () => {
    const g = gradeSingleNote(spec, { midi: 78, onMs: 2000, vel: 60 });
    expect(g.rating).toBe(1);
    expect(g.errorEvents[0].type).toBe("wrongOctave");
  });
  it("a different pitch is a substitution carrying the spelled expectation", () => {
    const g = gradeSingleNote(spec, { midi: 65, onMs: 2000, vel: 60 });
    expect(g.errorEvents[0]).toMatchObject({ type: "substitution", expectedSym: "F♯4" });
  });
});
