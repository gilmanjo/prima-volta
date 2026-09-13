// The discrete rating map, as ruled (03 §6 / R1) — these are laws, not preferences.
import { describe, it, expect } from "vitest";
import { gradeDiscreteChord, splitHands } from "../src/core/grader/discrete";
import type { NoteEvent, Pc } from "../src/core/types";

const n = (midi: number, onMs: number): NoteEvent => ({ midi, onMs, vel: 60 });
const CMAJ: Pc[] = [0, 4, 7];
const spec = (over: Partial<Parameters<typeof gradeDiscreteChord>[0]> = {}) =>
  ({ pcs: CMAJ, hand: "RH" as const, windowMs: 5000, promptAtMs: 0, ...over });

describe("discrete grader (03 §4/§6/§7)", () => {
  it("clean within window → Good; latency = last completing tone", () => {
    const g = gradeDiscreteChord(spec(), [n(60, 900), n(64, 920), n(67, 940)]);
    expect(g.primary.rating).toBe(3);
    expect(g.primary.latencyMs).toBe(940);
    expect(g.primary.inWindow).toBe(true);
  });

  it("clean but over the window → Hard (clean-slow is never Again)", () => {
    const g = gradeDiscreteChord(spec({ windowMs: 800 }), [n(60, 900), n(64, 920), n(67, 940)]);
    expect(g.primary.rating).toBe(2);
    expect(g.primary.clean).toBe(true);
  });

  it("a wrong note then correction → Again (the error still rates it — R1)", () => {
    const g = gradeDiscreteChord(spec(), [n(61, 500), n(60, 700), n(64, 720), n(67, 730)]);
    expect(g.primary.rating).toBe(1);
    expect(g.primary.errorEvents.some(e => e.type === "substitution")).toBe(true);
    expect(g.primary.latencyMs).toBe(730); // completion still measured
  });

  it("doubling an expected pitch class is never an error (name-cue = pitch classes, 03 §7)", () => {
    const g = gradeDiscreteChord(spec(), [n(48, 900), n(60, 905), n(64, 920), n(67, 940)]); // doubled C
    expect(g.primary.rating).toBe(3);
  });

  it("any octave satisfies a name cue", () => {
    const g = gradeDiscreteChord(spec(), [n(72, 900), n(76, 920), n(79, 930)]);
    expect(g.primary.rating).toBe(3);
  });

  it("a tone landing after the spread window logs dropChordTone and rates Again", () => {
    const g = gradeDiscreteChord(spec(), [n(60, 500), n(64, 520), n(67, 900)]); // 3rd tone 400ms late
    expect(g.primary.errorEvents.some(e => e.type === "dropChordTone")).toBe(true);
    expect(g.primary.rating).toBe(1);
  });

  it("never completed → deletions, Again, null latency", () => {
    const g = gradeDiscreteChord(spec(), [n(60, 500), n(64, 520)]);
    expect(g.primary.rating).toBe(1);
    expect(g.primary.latencyMs).toBeNull();
    expect(g.primary.errorEvents.filter(e => e.type === "deletion").length).toBe(1);
  });

  it("trailing notes within the grace after completion are ignored (03 §7)", () => {
    const g = gradeDiscreteChord(spec(), [n(60, 900), n(64, 910), n(67, 920), n(59, 1100)]);
    expect(g.primary.rating).toBe(3);
  });

  it("HT: hands split at the largest gap; embedded results judge each hand on its own window (02 §3)", () => {
    const notes = [n(48, 900), n(52, 905), n(55, 910), n(72, 950), n(76, 960), n(79, 1000)];
    expect(splitHands(notes).LH.length).toBe(3);
    const g = gradeDiscreteChord(spec({ hand: "HT" }), notes, { LH: "lh1", RH: "rh1", embeddedWindowMs: 5000 });
    expect(g.primary.rating).toBe(3);
    expect(g.embedded.get("lh1")!.inWindow).toBe(true);
    expect(g.embedded.get("rh1")!.inWindow).toBe(true);
  });

  it("HT with one flawed hand → primary Again; the flawed hand's embedded result is dirty (writes nothing down)", () => {
    const notes = [n(48, 900), n(53, 905), n(55, 910), n(72, 950), n(76, 960), n(79, 970)]; // LH has an F
    const g = gradeDiscreteChord(spec({ hand: "HT" }), notes, { LH: "lh1", RH: "rh1" });
    expect(g.primary.rating).toBe(1);
    expect(g.embedded.get("lh1")!.clean).toBe(false);
    expect(g.embedded.get("rh1")!.clean).toBe(true); // the clean hand still earns its credit
  });

  it("embedded clean-but-slow is NOT in-window (clean-but-slow writes nothing downward, 02 §3)", () => {
    const notes = [n(48, 3000), n(52, 3010), n(55, 3020), n(72, 3050), n(76, 3060), n(79, 3070)];
    const g = gradeDiscreteChord(spec({ hand: "HT", windowMs: 5000 }), notes, { LH: "lh1", RH: "rh1", embeddedWindowMs: 900 });
    expect(g.primary.rating).toBe(3);
    expect(g.embedded.get("lh1")!.clean).toBe(true);
    expect(g.embedded.get("lh1")!.inWindow).toBe(false);
  });
});
