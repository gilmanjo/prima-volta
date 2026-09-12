# U3 · Reading player — engine C (F10/F11) and the benchmark

The passage-reading flow: preview → read → post-read. Also the four-segment benchmark player, which reuses these bones.

**Mockup:** [mockups/U3-reading-player.html](mockups/U3-reading-player.html)

## Notation on a landscape phone (~844×390 — the load-bearing rules)

- **Paginate, never scroll** — pages of whole systems, bar-group aligned (F11-compatible by construction). Landscape width means wide systems and few breaks; the rules below are the floor, not the target.
- Minimum staff size: systems break so staves never shrink below legible engraving (~7mm staff height); grand staff fits landscape naturally — one system per page band if ever needed.
- **Auto page-turn:** when the playhead enters the last bar of a page, the next page is already rendered and turns automatically; a ghost preview of the next system's first bar sits at the page bottom so the eyes have somewhere to go (span axis in action).
- Playhead: a subtle beat cursor in rehearsal; none in performance below SS (reading ahead is the skill, not following a ball).

## The read flow (F10)

1. **Mode choice** — one tap, defaulting to the block's mix (rehearsal ~3 of 4): paper vs felt-red framing for the whole flow.
2. **Preview ritual** — full score shown, scan-timer ring (20–30s), and **one** scan question as a bottom sheet (key on the KeyPicker · meter chips · largest-leap on the IntervalSelector). Keys stay inert until answered.
3. **Count-in → one pass.** Rehearsal: gentle metronome, stopping tolerated, restarts untracked (03 §7). Performance: locked pulse, UI silent during the take.
4. **Post-read screen** (immediately): the **three axes reported separately** — Pitch · Rhythm · Continuity — never blended; the **error map** on the score (colored noteheads at fault sites) with tag chips; **"drill this"** one-tap on any highlighted cluster (09's instant path); **Replay my take** (smplr playback of the performed MIDI); next-read button.
5. **Stretch offer** (~1 in 5): a small card — "Stretch read: rhythm one subrank up?" — accept/skip, no pressure copy.

## F11 modes

- **Vanishing notation** (the F11 mechanic): each bar **vanishes at your first onset in it**, fading ~150ms — never blinking — forcing the eyes onto the next bar; `lookaheadBars` (1 → 2) sets how far ahead the demand sits. Same pagination; per-bar bboxes from the renderer.
- **Memory flash:** fragment shown → blanked → played from memory; the exposure comes from the class's own `displayMs` (its difficulty knob, F8/F11) — `practice.flashAnswerTimeoutS` bounds only the answer wait, never the exposure.

## The benchmark player (07)

Same bones, five segments with intro cards: Reading staircase (full preview ritual per excerpt) → Keys & Chords gauntlet (U2's layout, timed) → Rhythm tap staircase → Topography stream → two quick span flashes (~1 min). A progress rail shows segment position; the ceiling reveal and league movement land on one results screen at the end — one tasteful moment, no confetti storm. Entered only via invitation cards (U4); a placement run is this player at reduced length with one-glance previews.

## Open questions

None standing. (Ruled: the page turns at last-bar entry; the rehearsal beat cursor stays, on by default.)
