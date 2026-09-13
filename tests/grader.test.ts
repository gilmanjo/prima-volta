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

  it("an extra key on an already-sounded pc is an insertion — the drill asks for the chord once per hand (log #74)", () => {
    const g = gradeDiscreteChord(spec(), [n(48, 900), n(60, 905), n(64, 920), n(67, 940)]); // doubled C
    expect(g.primary.rating).toBe(1);
    expect(g.primary.errorEvents.some(e => e.type === "insertion")).toBe(true);
  });

  it("playing hands-together cannot pass a single-hand atom (six notes ≠ three)", () => {
    const both = [n(48, 900), n(52, 905), n(55, 910), n(60, 950), n(64, 960), n(67, 970)];
    const g = gradeDiscreteChord(spec({ hand: "RH" }), both);
    expect(g.primary.rating).toBe(1);
  });

  it("same-key retriggers (device chatter) fold to one note", () => {
    const g = gradeDiscreteChord(spec(), [n(60, 900), n(60, 902), n(64, 920), n(67, 940)]);
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

  it("the slash bass is graded: right tones over the wrong bass = an inversion error (Jordan's C/G report)", () => {
    const secondInv: Pc[] = [7, 0, 4]; // C/G — bass first
    const wrong = gradeDiscreteChord(spec({ pcs: secondInv, inversion: 2 }), [n(60, 900), n(64, 910), n(67, 920)]); // played root position
    expect(wrong.primary.rating).toBe(1);
    expect(wrong.primary.errorEvents.some(e => e.tags.includes("inversion:2"))).toBe(true);
    const right = gradeDiscreteChord(spec({ pcs: secondInv, inversion: 2 }), [n(55, 900), n(60, 910), n(64, 920)]); // G below
    expect(right.primary.rating).toBe(3);
  });

  it("HT close-position chords an octave apart split correctly (score-based, not largest-gap)", () => {
    const cg = [n(43, 900), n(48, 905), n(52, 910), n(55, 950), n(60, 960), n(64, 970)]; // C/G in both hands
    const split = splitHands(cg, [7, 0, 4]);
    expect(split.LH.map(x => x.midi)).toEqual([43, 48, 52]);
    const g = gradeDiscreteChord(spec({ pcs: [7, 0, 4], hand: "HT", inversion: 2 }), cg);
    expect(g.primary.rating).toBe(3);
  });

  it("HT: embedded results judge each hand on its own window (02 §3)", () => {
    const notes = [n(48, 900), n(52, 905), n(55, 910), n(72, 950), n(76, 960), n(79, 1000)];
    expect(splitHands(notes, CMAJ).LH.length).toBe(3);
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
