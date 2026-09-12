# F7 · Rhythm — *engine B (classes, generated instances)*

**Trains:** rhythm decoding + steady-pulse execution, isolated from pitch. Rhythm errors are fully graded and assessed here — this family is where rhythm skill is *built*, so passage grading (03) doesn't have to carry that weight alone.

**Mockup:** [mockups/F7-rhythm.html](mockups/F7-rhythm.html)

## Params (class — instances generated fresh per rep)

```
{ meter: 4/4 | 3/4 | 2/4  → +6/8, cut → +3/8 → +9/8, 12/8,
  vocab (nested sets): basic → +eighths → +dotted → +sixteenths
                        → +syncopation → +triplets → +rests-everywhere,
  bars: 1–4,
  tempo,
  feel: straight | swing,   // swing: notated straight 8ths performed long-short — scope-gated
  voices: 1 | 2   // 2 = hands-independence: two simultaneous rhythm lines }
```

**Swing.** The notation stays straight; the *expected grid* moves: off-beat 8ths target the swing point (default 2:1 — the triplet feel — configurable in drill scope; jazz convention flattens toward straight at fast tempi, which can come later as tempo-adaptive ratio). Grading is unchanged mechanically — onsets against the grid — the grid is just swung, and events tag `feel:swing`. Swing classes admit after straight-8th vocab fluency and are a drill-scope toggle.

**Set members are data** (05's ladder cells cite the sets; the fine content lives here): **basic** = ♩ 𝅗𝅥 𝅝 + dotted-half + ties · **eighths** = paired 8ths + upbeat pickups · **dotted** = dotted-♩+♪ figures · **sixteenths** = pairs → full patterns → 32nds (32nds engage at SSS) · **syncopation** = simple → cross-bar (cross-bar at SS) · **triplets** = triplets → 2-vs-3 (2-vs-3 at SSS) · **rests-everywhere** = rests on any beat fraction.

**Meter × vocab validity** (the seeder's pruning rule — data, not schema, v0): compound meters (6/8, 9/8, 12/8) exclude the `triplets` set (the beat already divides in three) and re-read `dotted` (the dotted quarter *is* the beat, not a figure); `cut` shares 2/4's vocabulary read at the half-note pulse; everything else combines freely.

## Mechanics

Notated rhythm (single percussion-style line; two lines for `voices: 2`) → count-in → **tap any key** against the metronome. For `voices: 2` the two lines take **disjoint register regions at a shown split point** — bottom line = keys below it, top line = above, marked on the keybed — so every tap assigns observably (simultaneous taps assign by region). Whether the prescribed hand physically played its region is honor-system, exactly as F9 ("Anki is honor system too"): MIDI sees keys, never hands. Count-in: one bar at ♩≥80, two bars below. Instance = fresh rhythm generated from the class vocab; never repeated.

## Tier ladder

Follows the vocab sets in order; each meter × vocab combination is its own class. 2-voice tiers admit only after 1-voice fluency in the same vocab.

## Grading defaults

**Performance mode by definition** — there is nothing here but timing. Onset deltas vs the beat grid; scaled tolerance windows per 03 §4 (windows scale with tempo and device jitter); per-onset early/late feedback after the take; tempo-drift detection across bars.

## Prescribes for

`rhythm:dotted`, `rhythm:syncopation`, `meter:6/8`, `rhythm:16ths` clusters from passages; tempo-drift patterns. F7 is the **standard prescription target** whenever the passage rhythm axis lags — "your dotted-8th figures rush above 90bpm" materializes as a dotted-vocab class at 92bpm.

## Open questions

None standing. (Rhythm-matching recognition lives in the hub's pinned **audio/listening expansion**.)
