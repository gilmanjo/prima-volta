// F9 grading (F9 §Grading · 03 §6): the stream is one attempt. A wrong find — or a grab
// with an extra tone or outside the jitter-widened spread — stops the flow and rates it
// Again (the discrete law). A clean stream rates Good vs Hard by its MEDIAN per-target
// latency against the generous learning budget; the cold find and worst leap are stats.
// Wrong-octave is the signature failure: wrongOctave + shift:leap on the leap tiers.
import type { GradeResult, NoteEvent } from "../types";

export interface TopoPromptSpec {
  midis: number[];     // the target's keys (1, 3 or 4)
  spreadMs: number;    // grab simultaneity (03 §4, base + jitter)
  leap: boolean;       // the span tags shift:leap
}

export type TopoPromptEval =
  | { status: "pending" }
  | { status: "clean"; completedAtMs: number }
  | { status: "flawed"; errorEvents: GradeResult["errorEvents"]; timingOnly: boolean };

/** Evaluate one prompt's accumulated events (chatter-collapsed per 03 §7). */
export function evalTopoPrompt(spec: TopoPromptSpec, events: NoteEvent[]): TopoPromptEval {
  const seq = [...events].sort((x, y) => x.onMs - y.onMs)
    .filter((n, i, xs) => i === 0 || n.midi !== xs[i - 1].midi);
  if (!seq.length) return { status: "pending" };
  const want = new Set(spec.midis);
  const leapTags = spec.leap ? ["shift:leap"] : [];
  for (const n of seq) {
    if (want.has(n.midi)) continue;
    const samePc = spec.midis.some(m => ((n.midi - m) % 12 + 12) % 12 === 0);
    const expected = samePc ? spec.midis.find(m => ((n.midi - m) % 12 + 12) % 12 === 0) : spec.midis[0];
    return {
      status: "flawed", timingOnly: false,
      errorEvents: [{ type: samePc ? "wrongOctave" : "substitution", expectedMidi: expected, playedMidi: n.midi, tags: leapTags }],
    };
  }
  const firstOn = new Map<number, number>();
  for (const n of seq) if (!firstOn.has(n.midi)) firstOn.set(n.midi, n.onMs);
  if (firstOn.size < want.size) return { status: "pending" };
  const ons = [...firstOn.values()];
  const completedAtMs = Math.max(...ons);
  if (want.size > 1 && completedAtMs - Math.min(...ons) > spec.spreadMs) {
    return { status: "flawed", timingOnly: true, errorEvents: [{ type: "dropChordTone", tags: leapTags }] };
  }
  return { status: "clean", completedAtMs };
}

export interface TopoStats { accuracyPct: number; medianMs: number | null; coldMs: number | null; worstMs: number | null; }

/** The stream's one review (F9 §Grading): flawed → Again · clean → median vs the budget. */
export function summarizeTopoStream(
  promptLatencies: number[], flaw: GradeResult["errorEvents"] | null, budgetMs: number,
): GradeResult & { stats: TopoStats } {
  const sorted = [...promptLatencies].sort((x, y) => x - y);
  const medianMs = sorted.length
    ? Math.round(sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : null;
  const stats: TopoStats = {
    accuracyPct: Math.round(100 * promptLatencies.length / Math.max(1, promptLatencies.length + (flaw ? 1 : 0))),
    medianMs,
    coldMs: promptLatencies.length ? Math.round(promptLatencies[0]) : null,
    worstMs: promptLatencies.length ? Math.round(Math.max(...promptLatencies)) : null,
  };
  const clean = flaw === null;
  const inWindow = clean && medianMs !== null && medianMs <= budgetMs;
  return {
    rating: !clean ? 1 : inWindow ? 3 : 2,
    latencyMs: medianMs,
    errorEvents: flaw ?? [],
    clean, inWindow,
    stats,
  };
}
