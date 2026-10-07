// F4 staff-arm laws (F4 §Variants): the canonical home voicing spelled for the staff —
// one fact with the teach lighting — exact-key grading with the wrongOctave diagnosis,
// the seeded engraving-pick grid, and F5's pulsed octave offset (03 §7's register freedom).
import { describe, it, expect } from "vitest";
import { chordStaffNotes, chordSymbol, majorSigOf, knowledgeAnswerable, type ChordAtom } from "../src/core/catalog";
import { gradeStaffChord } from "../src/core/grader/discrete";
import { sampleEngravingPick } from "../src/core/engravingPick";
import { buildRun, pulsedOffset } from "../src/core/runs";
import type { Pc } from "../src/core/types";

const n = (midi: number, onMs: number) => ({ midi, onMs, vel: 60 });

describe("chordStaffNotes (the canonical home voicing, one fact with the teach lights)", () => {
  it("C maj root on treble stacks 60-64-67; first inversion re-stacks from the bass", () => {
    expect(chordStaffNotes({ root: 0, quality: "maj", inversion: 0 }, "treble").map(x => x.midi)).toEqual([60, 64, 67]);
    expect(chordStaffNotes({ root: 0, quality: "maj", inversion: 1 }, "treble").map(x => x.midi)).toEqual([64, 67, 72]);
    expect(chordStaffNotes({ root: 0, quality: "maj", inversion: 0 }, "bass").map(x => x.midi)).toEqual([48, 52, 55]);
  });

  it("spells within doubles across every quality × root × inversion, ascending (aug included)", () => {
    const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
    for (const quality of ["maj", "min", "dim", "aug", "maj7", "dom7", "m7", "m7b5", "dim7"]) {
      const invs = ["maj", "min", "dim", "aug"].includes(quality) ? [0, 1, 2] : [0, 1, 2, 3];
      for (let root = 0 as Pc; root < 12; root++) for (const inversion of invs) {
        const notes = chordStaffNotes({ root: root as Pc, quality, inversion }, "treble");
        for (const x of notes) {
          expect(Math.abs(x.inline ?? 0)).toBeLessThanOrEqual(2);
          expect(12 * (x.octave + 1) + LETTER_PC[x.letter] + (x.inline ?? 0)).toBe(x.midi); // the spelling sounds its key
        }
        for (let i = 1; i < notes.length; i++) expect(notes[i].midi).toBeGreaterThan(notes[i - 1].midi);
      }
    }
  });
});

describe("chordSymbol slash bass (log #98: the bass spells as the CHORD spells it)", () => {
  const sym = (root: number, quality: string, inversion: number) =>
    chordSymbol({ family: "chord", root, quality, inversion, answer: "midi" } as never);
  it("enharmonics follow the chord's letters, never the chromatic table", () => {
    expect(sym(11, "maj", 1)).toBe("B/D♯");      // not B/E♭
    expect(sym(4, "maj", 1)).toBe("E/G♯");       // not E/A♭
    expect(sym(6, "maj", 1)).toBe("F♯/A♯");      // not F♯/B♭
    expect(sym(1, "maj", 1)).toBe("C♯/E♯");      // not C♯/F
    expect(sym(0, "dim", 2)).toBe("Cdim/G♭");    // not Cdim/F♯
    expect(sym(0, "dim7", 3)).toBe("Cdim7/B𝄫"); // the double-flat is the honest spelling
    expect(sym(0, "maj", 2)).toBe("C/G");        // naturals untouched
  });
});

describe("gradeStaffChord (exact keys, one attack)", () => {
  const spec = { midis: [60, 64, 67], windowMs: 5000, spreadMs: 105, promptAtMs: 1000 };

  it("the engraved keys together → Good; an octave off is wrongOctave (the register IS the lesson)", () => {
    expect(gradeStaffChord(spec, [n(64, 2000), n(60, 2040), n(67, 2080)]).rating).toBe(3);
    const g = gradeStaffChord(spec, [n(60, 2000), n(64, 2040), n(79, 2080)]);
    expect(g.rating).toBe(1);
    expect(g.errorEvents[0].type).toBe("wrongOctave");
  });

  it("rolled → dropChordTone (timing-only); chatter never shrinks the spread", () => {
    const rolled = gradeStaffChord(spec, [n(60, 2000), n(64, 2100), n(67, 2300)]);
    expect(rolled.rating).toBe(1);
    expect(rolled.errorEvents.every(e => e.type === "dropChordTone")).toBe(true);
    expect(gradeStaffChord(spec, [n(60, 2000), n(60, 2030), n(64, 2050), n(67, 2090)]).rating).toBe(3);
  });
});

describe("the engraving-pick grid (seeded distractors — the sanctioned exception)", () => {
  it("four cells: the correct voicing, two other inversions, the neighbor quality — order seeded", () => {
    const a = { root: 0 as Pc, quality: "dom7", inversion: 1 };
    const p = sampleEngravingPick(a, 7);
    expect(sampleEngravingPick(a, 7)).toEqual(p);
    expect(p.cells.length).toBe(4);
    const ids = p.cells.map(c => c.id).sort();
    expect(ids).toContain("correct");
    expect(ids).toContain("neighbor");
    expect(ids.filter(i => i.startsWith("inv")).length).toBe(2);
    const correct = p.cells.find(c => c.id === "correct")!;
    expect(correct.notes.map(x => x.midi)).toEqual(chordStaffNotes(a, "treble").map(x => x.midi));
    const orders = new Set<string>();
    for (let s = 0; s < 30; s++) orders.add(sampleEngravingPick(a, s).cells.map(c => c.id).join(","));
    expect(orders.size).toBeGreaterThan(5); // the correct cell moves around
  });
});

describe("F5 keysig helpers", () => {
  it("majorSigOf walks the circle", () => {
    expect([0, 7, 2, 5, 10, 11, 6].map(pc => majorSigOf(pc as Pc))).toEqual([0, 1, 2, -1, -2, 5, 6]);
  });

  it("pulsedOffset: the first tonic-pc note near beat zero fixes the octave shift (03 §7)", () => {
    const run = buildRun({ id: "s", family: "scale", inDefault: true, type: "major", key: 10, hand: "LH", cue: "keysig" } as never);
    expect(run.slots[0].midis).toEqual([58]); // B♭3 home
    expect(pulsedOffset(run.slots, [n(46, 10_050)], 10_000, 1000)).toBe(-12); // anchored at B♭2
    expect(pulsedOffset(run.slots, [n(58, 10_020)], 10_000, 1000)).toBe(0);
    expect(pulsedOffset(run.slots, [n(47, 10_020)], 10_000, 1000)).toBe(0);  // not the tonic pc: no shift
    expect(pulsedOffset(run.slots, [n(46, 12_000)], 10_000, 1000)).toBe(0);  // too far from beat zero
  });

  it("the id and engraving arms are knowledge (08 §7: phone-answerable)", () => {
    const id = { family: "chord", root: 0, quality: "maj", inversion: 0, clef: "treble", answer: "id" } as unknown as ChordAtom;
    const eng = { family: "chord", root: 0, quality: "maj", inversion: 0, answer: "engraving" } as unknown as ChordAtom;
    const play = { family: "chord", root: 0, quality: "maj", inversion: 0, hand: "RH", form: "blocked", cue: "staff", answer: "midi" } as unknown as ChordAtom;
    expect(knowledgeAnswerable(id)).toBe(true);
    expect(knowledgeAnswerable(eng)).toBe(true);
    expect(knowledgeAnswerable(play)).toBe(false);
  });
});
