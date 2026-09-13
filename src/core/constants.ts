// v0 tunable constants, single-sourced. Every value cites its owning doc; retuning happens
// here (and only here), never inline at call sites.

export const RETENTION_TARGET = 0.85;      // 04 §1 — the scheduling knob, per-user tunable later
export const MAX_INTERVAL_DAYS = 120;      // 04 §1

export const CHORD_SPREAD_MS = 80;         // 03 §4 — all tones of a blocked chord inside this window
export const TRAILING_GRACE_MS = 500;      // 03 §7 — release flourishes after completion are ignored

// Fluency windows (03 §6): generous learning window until the gate snaps to its anchor.
// F4 gate anchor: solid triads HT ♩=66 ≈ one beat ≈ 909 ms (rounded).
export const CHORD_LEARN_WINDOW_MS = 5000;
export const CHORD_GATE_WINDOW_MS = 900;
export const KNOWLEDGE_WINDOW_MS = 5000;   // F1 §Grading — one generous window, never tightens

export const BOUT_IDLE_MS = 20 * 60_000;   // 08 §6 — the idle clock is the only closer

// F2 single-note reading windows (v1: the T5 flash ladder arrives later; until then the
// gate is the tighter latency window, same shape as F4's).
export const READ_LEARN_WINDOW_MS = 5000;
export const READ_GATE_WINDOW_MS = 900;

// Practice-local steps (04 §2) — item-denominated with a clock fallback.
export const CONFIRM_AFTER_ITEMS = 20;
export const CONFIRM_AFTER_MS = 10 * 60_000;
export const AGAIN_NOW_AFTER_ITEMS = 3;
export const GRADUATING_CAP_DAYS = 1;

export const GATE_STREAK = 3;              // 02 §1 — earn AND release on 3-streaks (log #67)

export const POOL_THIN = 4;                // 08 §4 — frontier pulls when the weak pool thins below this
export const TRICKLE_PER_10MIN = 5;        // 08 §4 — default appetite

export const INTERLEAVE_RUN = 3;           // 04 §6 — never 3 consecutive sharing root or quality

// Pulsed runs (F5/F6 T1 v0: ♩=60, one note per beat, 4/4 frame).
export const RUN_BEAT_MS = 1000;           // F5/F6 tier tables — the v0 learning tempo
export const RUN_BEATS_PER_BAR = 4;
// The gate anchor (F5 T4 "♪=80", ruled): notes as EIGHTHS against a quarter click at ♩=80 —
// two per beat, ~160 notes/min. The metronome always clicks the quarter.
export const RUN_GATE_BEAT_MS = 750;
export const RUN_GATE_NOTES_PER_BEAT = 2;
export const GRID_W_BASE_MS = 120;         // 03 §4 — grid window W at ♩=60-equivalent, tempo-scaled
export const ASSOC_MIN_MS = 250;           // 03 §4 — association floor (±half a beat, min 250ms)
export const COUNT_IN_ONE_BAR_BPM = 80;    // U2 §3 — one bar of count-in at ♩≥80, two below
