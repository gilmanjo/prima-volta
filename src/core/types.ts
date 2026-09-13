// Shared core types (02 §2 vocabulary; 03's event shapes). DOM-free by law (10 §1.2).

export type Pc = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export type Hand = "RH" | "LH" | "HT";
export type Mode = "rehearsal" | "performance";

/** One captured note-on, profile-normalized. Times are ms in the attempt's own clock. */
export interface NoteEvent {
  midi: number;
  onMs: number;
  vel: number;
}

export type Rating = 1 | 2 | 3; // Again · Hard · Good — Easy unused (03 §6, runaway-interval guard)

export type ErrorType =
  | "substitution" | "insertion" | "deletion" | "wrongOctave" | "dropChordTone"
  | "early" | "late" | "hesitation" | "restart" | "tempoDrift";

export interface ErrorEvent {
  type: ErrorType;
  expectedMidi?: number;
  playedMidi?: number;
  expectedSym?: string;
  playedSym?: string;
  timingDeltaMs?: number;
  hand?: Hand;
  tags: string[]; // 03 §5's canonical registry only
}

export interface GradeResult {
  rating: Rating;
  latencyMs: number | null;
  errorEvents: ErrorEvent[];
  clean: boolean;          // no error events
  inWindow: boolean;       // clean AND latency within the card's current window
}

/** The grader's full output for one rep: the primary judgment plus embedded per-hand results (02 §3). */
export interface GradedAttempt {
  primary: GradeResult;
  embedded: Map<string, GradeResult>; // subsumed atomId → its own-terms result
}

export interface CatalogAtom {
  id: string;
  family: string;
  inDefault: boolean;
  [k: string]: unknown;
}
