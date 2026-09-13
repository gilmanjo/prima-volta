// F4 spell laws (F4 §Variants: "tap its notes", octave-free, inversion-blind — log #39).
import { describe, it, expect } from "vitest";
import { gradeSpellTaps } from "../src/core/grader/choice";

const spec = { pcs: [8, 0, 3, 7], symbol: "A♭maj7", windowMs: 5000, promptAtMs: 1000 };
const tap = (midi: number, atMs: number) => ({ midi, atMs });

describe("spell (F4 knowledge)", () => {
  it("the right tones, any octave, any order → Good; latency = the completing tap", () => {
    const g = gradeSpellTaps(spec, [tap(60, 2000), tap(68, 2400), tap(75, 2800), tap(79, 3200)]); // C A♭ E♭ G
    expect(g.rating).toBe(3);
    expect(g.latencyMs).toBe(2200);
  });

  it("an octave duplicate is idempotent selection, never an error", () => {
    const g = gradeSpellTaps(spec, [tap(56, 2000), tap(68, 2100), tap(60, 2500), tap(63, 2900), tap(67, 3300)]);
    expect(g.rating).toBe(3); // A♭3 and A♭4 are one selection
  });

  it("a wrong tone → Again, symbolic pair preserved", () => {
    const g = gradeSpellTaps(spec, [tap(68, 2000), tap(62, 2300)]); // D is not in A♭maj7
    expect(g.rating).toBe(1);
    expect(g.errorEvents[0]).toMatchObject({ type: "substitution", expectedSym: "A♭maj7", playedMidi: 62 });
  });

  it("right but slow → Hard (the one generous knowledge window)", () => {
    const g = gradeSpellTaps(spec, [tap(68, 3000), tap(60, 4000), tap(63, 5000), tap(67, 6500)]);
    expect(g.rating).toBe(2);
    expect(g.clean).toBe(true);
  });
});
