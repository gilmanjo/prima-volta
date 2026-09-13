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

// Practice-local steps (04 §2) — item-denominated with a clock fallback.
export const CONFIRM_AFTER_ITEMS = 20;
export const CONFIRM_AFTER_MS = 10 * 60_000;
export const AGAIN_NOW_AFTER_ITEMS = 3;
export const GRADUATING_CAP_DAYS = 1;

export const GATE_STREAK = 3;              // 02 §1 — earn AND release on 3-streaks (log #67)

export const POOL_THIN = 4;                // 08 §4 — frontier pulls when the weak pool thins below this
export const TRICKLE_PER_10MIN = 5;        // 08 §4 — default appetite

export const INTERLEAVE_RUN = 3;           // 04 §6 — never 3 consecutive sharing root or quality
