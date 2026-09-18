// Interval-pair grader (F3 §Grading): both notes correct, exact octaves; melodic ORDER
// enforced (the anchor sounds first — direction is identity); harmonic = both inside the
// spread window (the two-finger grab, T3), jitter-widened like every window (03 §3).
// Enharmonic at the keyboard per 03 §7 — spelling lives in the selector variant.
import type { GradeResult, NoteEvent } from "../types";

export interface IntervalSpec {
  anchorMidi: number;
  targetMidi: number;
  form: "melodic" | "harmonic";
  windowMs: number;   // latency window (v1: the F3 gate widens the ANCHOR POOL, not the clock)
  spreadMs: number;   // harmonic simultaneity (base + jitter)
  promptAtMs: number;
}

export function gradeIntervalPair(spec: IntervalSpec, notes: NoteEvent[]): GradeResult {
  const errors: GradeResult["errorEvents"] = [];
  const sorted = [...notes].sort((a, b) => a.onMs - b.onMs);
  const last = sorted[sorted.length - 1];
  const latencyMs = last ? Math.round(last.onMs - spec.promptAtMs) : null;

  if (spec.form === "melodic") {
    // order enforced: anchor first, target second
    if (sorted[0]?.midi !== spec.anchorMidi) {
      errors.push({ type: "substitution", expectedMidi: spec.anchorMidi, playedMidi: sorted[0]?.midi, tags: ["order"] });
    } else if (sorted[1]?.midi !== spec.targetMidi) {
      const samePc = sorted[1] !== undefined && ((sorted[1].midi - spec.targetMidi) % 12 + 12) % 12 === 0;
      errors.push({ type: samePc ? "wrongOctave" : "substitution", expectedMidi: spec.targetMidi, playedMidi: sorted[1]?.midi, tags: [] });
    }
  } else {
    const want = new Set([spec.anchorMidi, spec.targetMidi]);
    const got = new Set(sorted.map(n => n.midi));
    for (const m of want) if (!got.has(m)) errors.push({ type: "deletion", expectedMidi: m, tags: [] });
    for (const n of sorted) if (!want.has(n.midi)) errors.push({ type: "substitution", playedMidi: n.midi, tags: [] });
    if (!errors.length && sorted.length >= 2 && sorted[1].onMs - sorted[0].onMs > spec.spreadMs) {
      errors.push({ type: "dropChordTone", tags: [] }); // not together — the grab is the skill
    }
  }
  const clean = errors.length === 0 && sorted.length >= 2;
  if (!clean && errors.length === 0) errors.push({ type: "deletion", expectedMidi: spec.targetMidi, tags: [] });
  const inWindow = clean && latencyMs !== null && latencyMs <= spec.windowMs;
  return { rating: !clean ? 1 : inWindow ? 3 : 2, latencyMs, errorEvents: errors, clean, inWindow };
}
