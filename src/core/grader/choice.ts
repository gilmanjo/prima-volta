// Choice-answer grader (03 §3/§6): widget answers bypass the MIDI pipeline — the raw
// response is the widget event stream (rawChoiceJson, 10 §4), symbolic and re-gradeable.
// The discrete map applies: wrong → Again · right-but-slow → Hard · right-in-window → Good.
// v0 widgets commit on tap, so there is no correction path to adjudicate.
import type { GradeResult } from "../types";

export interface ChoiceSpec {
  expectedSym: string;
  windowMs: number;   // F1: one generous window, never tightens (F1 §Grading)
  promptAtMs: number;
  tags?: string[];
}

export interface SpellSpec {
  pcs: number[];      // expected pitch classes (root-position, inversion-blind — log #39)
  symbol: string;     // the chord symbol, for the error's expectedSym
  windowMs: number;
  promptAtMs: number;
}

/** F4's spell variant (§Variants: "tap its notes", octave-free): pitch-class recall on the
 *  on-screen keyboard. A repeated pc is idempotent selection; a wrong pc is the error. */
export function gradeSpellTaps(spec: SpellSpec, taps: { midi: number; atMs: number }[]): GradeResult {
  const want = new Set(spec.pcs);
  const got = new Set<number>();
  const errors: GradeResult["errorEvents"] = [];
  let completeAt: number | null = null;
  for (const t of taps) {
    const pc = ((t.midi % 12) + 12) % 12;
    if (want.has(pc)) {
      got.add(pc);
      if (got.size === want.size && completeAt === null) completeAt = t.atMs;
    } else if (!errors.length) {
      errors.push({ type: "substitution", expectedSym: spec.symbol, playedMidi: t.midi, tags: [] });
    }
  }
  if (completeAt === null && !errors.length) {
    errors.push({ type: "deletion", expectedSym: spec.symbol, tags: [] });
  }
  const latencyMs = completeAt !== null ? Math.round(completeAt - spec.promptAtMs) : null;
  const clean = errors.length === 0 && completeAt !== null;
  const inWindow = clean && latencyMs !== null && latencyMs <= spec.windowMs;
  return { rating: !clean ? 1 : inWindow ? 3 : 2, latencyMs, errorEvents: errors, clean, inWindow };
}

export function gradeChoice(spec: ChoiceSpec, playedSym: string, commitAtMs: number): GradeResult {
  const latencyMs = Math.round(commitAtMs - spec.promptAtMs);
  const clean = playedSym === spec.expectedSym;
  const inWindow = clean && latencyMs <= spec.windowMs;
  return {
    rating: !clean ? 1 : inWindow ? 3 : 2,
    latencyMs,
    errorEvents: clean ? [] : [{ type: "substitution", expectedSym: spec.expectedSym, playedSym, tags: spec.tags ?? [] }],
    clean,
    inWindow,
  };
}
