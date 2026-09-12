# U2 · Practice player — drills (engines A/B)

One screen, four zones, every drill modality. Entered from any launcher; exits back to it. The block-filler (08 §4) drives what appears; this doc is how it looks and feels.

**Mockup:** [mockups/U2-practice-player.html](mockups/U2-practice-player.html)

## The four zones (landscape ~844×390)

1. **Status strip** (top edge): block name at the left; **the mode chip, always present, right-aligned beside the device chip** (paper "Rehearsal" / felt-red "Performance"; teach reps carry a neutral **"Teach"** chip instead — never ambiguous, never colliding with the title) · progress dots for bounded blocks (count-honest).
2. **Prompt zone** (upper left, huge — one glance): chord symbols and key names in Instrument Serif ("A♭maj7/C" with subtext "LH · blocked"); engraved prompts on paper score cards (VexFlow); F9 target streams on the rolling staff (current full-ink, next ghosted).
3. **Feedback + metronome zone** (upper right): verdicts, latency chip, metronome pulse dots + BPM when pulsed; count-in renders here (one bar ≥80, two below).
4. **Keybed viz** (full width along the bottom — landscape's payoff): LED states expected · played · correct · wrong for midi answers; the **widget roster** replaces it for choice answers (KeyPicker wheel, SignaturePicker grid, NoteSelector, IntervalSelector, root/quality/inversion rows — full option space, per 01); "tap any key" affordance for F7.

## Rep flow (rehearsal) — errors stop for reconciliation

Answer → instant verdict. Correct = green LED sweep + latency chip (Spline Mono) + the UI ding, straight on. **Error = the flow stops** (hub rule): felt-red on the offending keys, **expected vs played side by side on the keybed** (engraving highlighted for staff cues), and a **replay affordance** where hearing helps — yours vs expected via smplr (chords, intervals). Continue by tap — **or by playing the correct answer, which advances instantly and is the reconciliation working as intended.** The card's rating already took the hit (03); the pause is for understanding, not punishment.

## Player copy & display rules

- Chord symbols render as **one continuous run at one size** — "A♭maj7/C" exactly as a lead sheet prints it; the slash bass is never shrunk, raised, or accent-colored.
- **Metronome dots are the beats of the bar** (two for 6/8, three for 3/4, four for 4/4), current beat lit — never a decorative strip of pips.
- The keybed carries **no note-name labels** during drills. Teach states show **fingering numerals on the path dots** (sourced, never invented) — the sequence of a scale is obvious and isn't numbered.
- The **metronome strip exists only when the item is pulsed** — a free-tempo drill shows none.
- The latency chip shows **milliseconds after an answer, never status words** ("paused", "reconcile" and kin are banned).

## Teach states (ungraded, rehearsal context — always)

New-material introduction: the fingering path on the keybed, name + engraving side by side, a neutral **Teach** chip, "Play it once" → converts to the first graded rep. No timer, no grade — and never inside a performance flow.

## Steps, transitions, polishing

- A step re-serve carries a small "confirming" chip so a repeat never feels like a bug.
- **Block transitions:** a centered interstitial — "up next" label, the block name large, its bound ("5 minutes · weakest first"), the template progress dots, and one line placing you ("Scales done · Reading after"). Auto-advances, tappable, skippable.
- **Polishing:** when the filler enters upkeep mode, a quiet banner — "everything here is steady — polishing" — with a frontier offer if appetite allows.
- Bounded blocks end with a soft chime + auto-advance; open blocks run until the user leaves (nothing is ever "abandoned").

## Performance-mode differences

Felt-red chip, locked metronome, count-in mandatory, no mid-take feedback and **no mid-take blocking** — continuity is being measured, so the UI stops talking; reconciliation lands after the take.

## Open questions

None standing. (Error handling settled by the hub's reconciliation rule.)
