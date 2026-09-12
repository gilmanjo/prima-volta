# F11 · Eyes-ahead mechanics — *engine C, later phase*

**Trains:** reading ahead of the hands — the expert behavior (eye-hand span of ~4 buffered notes vs ~2 for amateurs). Two mechanics layered onto F10 material; specified now so the generator and renderer are designed with bar-level layout metadata from day 1.

**Mockup:** [mockups/F11-eyes-ahead.html](mockups/F11-eyes-ahead.html)

## Mechanic 1 — Memory flash

1–2 bars shown → blanked → played from memory. The Read Ahead "memory flash," graded via MIDI (a first — Read Ahead itself has no machine grading). Params inherit F10 plus `flashBars`, `displayMs`. Effectively F8 scaled up to musical context; results feed the eye-hand-span stat and **contribute to the 07 Reading rating at minor weight** — the purest span measure.

## Mechanic 2 — Disappearing measures

Each bar **vanishes at your first onset in it** (clock-based vanishing would double-punish hesitation), fading out over ~150ms rather than blinking, forcing the eyes onto the next bar. Params inherit F10 plus `lookaheadBars` (1 → 2 as skill grows). Continuity discipline is inherent (performance mode always) — you cannot re-read what's gone.

## Grading defaults

Memory flash: rehearsal mode, pitch + order. Disappearing measures: performance mode, all three axes; hesitation events at bar boundaries are the signature diagnostic (they mark lookahead failure precisely).

## Dependencies (why this is a later phase)

- Renderer must expose per-bar bounding boxes for blanking (10-ARCHITECTURE `<StaffView>` interface requirement, noted now).
- Generator must emit bar-aligned material with clean bar-boundary figures at low ranks (06).
- The F10 staircase must be calibrated first, since these mechanics ride its difficulty vector.

## Open questions

None standing.
