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
  // chatter law (03 §7): a repeat of the still-current key is never an answer event —
  // consecutive same-key onsets collapse before matching (the pair is two distinct keys)
  const sorted = [...notes].sort((a, b) => a.onMs - b.onMs)
    .filter((n, i, xs) => i === 0 || n.midi !== xs[i - 1].midi);

  if (spec.form === "melodic") {
    const last = sorted[Math.min(sorted.length, 2) - 1];
    const latencyMs = last ? Math.round(last.onMs - spec.promptAtMs) : null;
    // order enforced: anchor first, target second
    if (sorted[0]?.midi !== spec.anchorMidi) {
      errors.push({ type: "substitution", expectedMidi: spec.anchorMidi, playedMidi: sorted[0]?.midi, tags: ["order"] });
    } else if (sorted[1]?.midi !== spec.targetMidi) {
      const samePc = sorted[1] !== undefined && ((sorted[1].midi - spec.targetMidi) % 12 + 12) % 12 === 0;
      errors.push({ type: samePc ? "wrongOctave" : "substitution", expectedMidi: spec.targetMidi, playedMidi: sorted[1]?.midi, tags: [] });
    }
    const clean = errors.length === 0 && sorted.length >= 2;
    if (!clean && errors.length === 0) errors.push({ type: "deletion", expectedMidi: spec.targetMidi, tags: [] });
    const inWindow = clean && latencyMs !== null && latencyMs <= spec.windowMs;
    return { rating: !clean ? 1 : inWindow ? 3 : 2, latencyMs, errorEvents: errors, clean, inWindow };
  }

  // harmonic — the grab: per-key FIRST onsets, so chatter never shrinks the measured spread
  const firstOn = new Map<number, number>();
  for (const n of sorted) if (!firstOn.has(n.midi)) firstOn.set(n.midi, n.onMs);
  const want = new Set([spec.anchorMidi, spec.targetMidi]);
  for (const m of want) if (!firstOn.has(m)) errors.push({ type: "deletion", expectedMidi: m, tags: [] });
  for (const m of firstOn.keys()) if (!want.has(m)) errors.push({ type: "substitution", playedMidi: m, tags: [] });
  if (!errors.length) {
    const spread = Math.abs(firstOn.get(spec.anchorMidi)! - firstOn.get(spec.targetMidi)!);
    if (spread > spec.spreadMs) errors.push({ type: "dropChordTone", tags: [] }); // not together — the grab is the skill
  }
  const clean = errors.length === 0;
  const latencyMs = clean
    ? Math.round(Math.max(firstOn.get(spec.anchorMidi)!, firstOn.get(spec.targetMidi)!) - spec.promptAtMs)
    : sorted.length ? Math.round(sorted[sorted.length - 1].onMs - spec.promptAtMs) : null;
  const inWindow = clean && latencyMs !== null && latencyMs <= spec.windowMs;
  return { rating: !clean ? 1 : inWindow ? 3 : 2, latencyMs, errorEvents: errors, clean, inWindow };
}
