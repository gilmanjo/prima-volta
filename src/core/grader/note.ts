// Single engraved-note grader (F2 §Grading): octave-strict — register identity is the
// point — and enharmonic at the keyboard (MIDI grades the SOUNDING pitch: F𝄪4 accepts the
// G4 key; spelling is the selector variant's business, 03 §3). The discrete map applies.
import type { GradeResult, NoteEvent } from "../types";

export interface NoteSpec {
  midi: number;       // the expected sounding pitch
  spelled: string;    // for the error's expectedSym
  windowMs: number;
  promptAtMs: number;
}

export function gradeSingleNote(spec: NoteSpec, first: NoteEvent): GradeResult {
  const latencyMs = Math.round(first.onMs - spec.promptAtMs);
  if (first.midi === spec.midi) {
    const inWindow = latencyMs <= spec.windowMs;
    return { rating: inWindow ? 3 : 2, latencyMs, errorEvents: [], clean: true, inWindow };
  }
  const samePc = ((first.midi - spec.midi) % 12 + 12) % 12 === 0;
  return {
    rating: 1, latencyMs, clean: false, inWindow: false,
    errorEvents: [{
      type: samePc ? "wrongOctave" : "substitution", // distinct diagnosis (03 §4)
      expectedMidi: spec.midi, playedMidi: first.midi, expectedSym: spec.spelled, tags: [],
    }],
  };
}
