// F1 laws (F1 §Params/§Variants/§Grading · 02 §1's knowledge-no-gate · 03 §3 choice answers).
import { describe, it, expect } from "vitest";
import {
  compareAdmission, keyNameOf, majorTonicPc, relativeOf, sigSpelling, type KeysAtom,
} from "../src/core/catalog";
import { gradeChoice } from "../src/core/grader/choice";
import { afterTeach, applyRep, newCard, windowFor } from "../src/core/scheduler";
import type { GradeResult } from "../src/core/types";

const keys = (o: Partial<KeysAtom>): KeysAtom =>
  ({ id: `k${JSON.stringify(o)}`, family: "keys", inDefault: true, sig: 0, mode: "major", clef: "treble", dir: "sigToKey", ...o }) as KeysAtom;

describe("key/signature vocabulary (F1)", () => {
  it("signatures name their keys, both modes, proper spellings", () => {
    expect(keyNameOf(3, "major")).toBe("A major");
    expect(keyNameOf(-4, "major")).toBe("A♭ major");
    expect(keyNameOf(6, "major")).toBe("F♯ major"); // G♭ off → F♯ carries the six-accidental slot
    expect(keyNameOf(0, "minor")).toBe("a minor");
    expect(keyNameOf(2, "minor")).toBe("b minor");
  });
  it("relative pairs share the signature (the confirmation's reveal)", () => {
    expect(relativeOf(-3, "major")).toBe("c minor");
    expect(relativeOf(1, "minor")).toBe("G major");
  });
  it("key→sig confirmations spell the accidentals in order", () => {
    expect(sigSpelling(-3)).toBe("B♭ · E♭ · A♭");
    expect(sigSpelling(2)).toBe("F♯ · C♯");
    expect(sigSpelling(0)).toBe("no sharps or flats");
  });
  it("tonic pcs land where the wave expects", () => {
    expect(majorTonicPc(0)).toBe(0);
    expect(majorTonicPc(1)).toBe(7);
    expect(majorTonicPc(-1)).toBe(5);
    expect(majorTonicPc(-5)).toBe(1);
  });
  it("admission walks the key wave: C's atoms before G/F's, sig→key before key→sig", () => {
    expect(compareAdmission(keys({ sig: 0, dir: "keyToSig" }), keys({ sig: 1 }))).toBeLessThan(0);
    expect(compareAdmission(keys({ sig: 0 }), keys({ sig: 0, dir: "keyToSig" }))).toBeLessThan(0);
  });
});

describe("choice grading (03 §3/§6) — symbolic, re-gradeable", () => {
  const spec = { expectedSym: "A♭ major", windowMs: 5000, promptAtMs: 1000 };
  it("right within the window → Good", () => {
    const g = gradeChoice(spec, "A♭ major", 3200);
    expect(g.rating).toBe(3);
    expect(g.latencyMs).toBe(2200);
  });
  it("right but slow → Hard (the one generous window, F1 §Grading)", () => {
    expect(gradeChoice(spec, "A♭ major", 7500).rating).toBe(2);
  });
  it("wrong → Again, with the symbolic pair preserved verbatim", () => {
    const g = gradeChoice(spec, "E♭ major", 2000);
    expect(g.rating).toBe(1);
    expect(g.errorEvents[0]).toMatchObject({ type: "substitution", expectedSym: "A♭ major", playedSym: "E♭ major" });
  });
});

describe("knowledge atoms carry no gate (02 §1, F1 §Grading)", () => {
  const good = (): GradeResult => ({ rating: 3, latencyMs: 900, errorEvents: [], clean: true, inWindow: true });
  it("graduated in-window reps never arm a tier when the rep is not gateable", () => {
    let c = afterTeach(newCard("k1", 0));
    for (let i = 0; i < 8; i++) ({ card: c } = applyRep(c, good(), `t${i}`, { servedCount: i * 25, nowMs: 1_000_000 + i * 60_000 }, false, null, false));
    expect(c.step).toBe("graduated");   // FSRS and steps run exactly as ever
    expect(c.tier).toBe(0);             // …but the window never tightens
    expect(c.gateStreak).toBe(0);
    expect(windowFor(c)).toBe(5000);
  });
});
