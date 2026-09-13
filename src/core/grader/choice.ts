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
