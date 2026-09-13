# F4 · Chords — *engine A*

*(One family for triads and seventh chords — identical param shape; a quality order and the key wave carry admission.)*

**Trains:** chord-shape retrieval and execution — the "grab any chord instantly" skill, in both decoding directions (symbol→hand and staff→hand) and both recognition directions (staff→name, name→engraving).

**Mockup:** [mockups/F4-chords.html](mockups/F4-chords.html)

## Params

```
{ root: 12,
  quality: maj | min | dim | aug | maj7 | 7 | m7 | m7♭5 | dim7   (parked: 6, m6, sus4, 7sus4, add9),
  inversion: root | 1st | 2nd | 3rd(sevenths only),
  hand: RH | LH | HT,
  form: blocked | broken,      // broken = in-position figure; multi-octave traversal is F6
  cue: name | staff,  answer: midi | choice }
```

**Quality order** (admission sequencing; scope stays per-quality, 02 §5): **maj → min → maj7 → 7 → m7 → dim → m7♭5 → dim7 → aug** — each quality's atoms enter along the key wave before the next quality begins. (The old `triads-core`-style sets are gone; they served the deleted unlock table.)

**Name-cue notation:** proper chord symbols with **slash notation for inversions** — "A♭maj7/C" (1st inversion), "B♭/F" (2nd) — the notation lead sheets actually use. The subtext never repeats what the symbol already says (quality, inversion); it carries only hand and form ("RH · blocked").

## Variants

| Variant | Prompt → answer |
|---|---|
| `name→midi` | "A♭maj7/C · LH · blocked" → play it (blocked or broken per tier). **Any octave** — the symbol names pitch classes, not registers |
| `staff→midi` | Engraved chord → play it — trains stack-reading; a separate atom from name-cue. **Exact octave** — the staff names registers |
| `staff→choice` | Engraved chord → identify **root + quality + inversion** on full-option rows (root: 12 chips, black keys dual-labeled C♯/D♭; quality: the scoped set; inversion: all). Distractor-free per the widget principle. **Clef is identity** — treble and bass engravings are separate atoms (02 §2) |
| `name→engraving` | Chord symbol → pick the correct engraving from a small grid of candidate staves. Inherently distractor-based (candidates: other inversions of the same chord, neighbor qualities, accidental traps) — the sanctioned exception to the widget principle, because the option space is unbounded. Clef-blind: candidates render in treble |
| `name→choice` (spelling) | "F♯dim7 → tap its notes" on the on-screen keyboard — spelling recall, knowledge-only mode, octave-free |

## Tier ladder (execution only)

**The ladder describes execution** — what it means to progress is playing demands rising. Tiers apply per quality; each quality climbs independently, staggered along the key wave (05 §2). **Knowledge variants (identify · spell · engraving-pick) are tierless flat atoms**: they admit on the same quality × key wave, but there is no ladder to climb — nothing about identifying a chord "progresses" the way playing one does.

| Tier | Content |
|---|---|
| T1 | Root position, blocked, HS |
| T2 | Inversions, blocked, HS |
| T3 | HT — same inversion both hands (mixed/contrary voicings: parked) |
| T4 | Broken forms (up, down, up-down, down-up; in position) |
| T5 | Fluency gates |
| T6 | Random-inversion streams ("A♭/E♭ → A♭ → A♭/C" as one timed item — cycling inversions of one chord; its own atom shape, 02 §2) |

**Fluency gate (T5):** nothing about the task changes except the clock. Until T5, the latency window for a **Good** rating is generous (learning pace); at the gate it derives from an external tempo anchor — RCM technique requirements: solid triads HT ♩=66+, broken sevenths ♪=72 HS — so "Good" means grabbing the chord within ~one beat at that anchor. Accuracy rules are identical; a slow correct answer rates **Hard** and the card keeps drilling.

## Grading

Rehearsal mode. Blocked: **one simultaneous attack** — every tone inside the 80ms spread window of the attack's first note, both hands in that same window for hands-together (sequential hands or a tone at a time never pass, 03 §4); a tone landing after the window closes logs `dropChordTone` (the tag behind "misses the 7th in flat keys"). **The slash bass is graded**: each hand's lowest tone must be the inversion's bass — the right tones voiced over the wrong bass log `inversion:N` (playing root position for C/G is an error; the voicing *is* the skill). **Each expected tone sounds once per hand**: extra keys are insertions — hands stay honor-system (MIDI can't see them), but note counts don't. Broken: order + evenness. Latency = prompt → last tone.

**Octave policy:** staff-cue exact octave, always; name-cue any octave, always — the cue type defines what register knowledge is being tested, so the policy never shifts by tier.

## Prescribes for

`quality:X` confusions (m7 vs 7 the classic), `inversion:N` weaknesses, `chord-tone:7th` deletions, `key-region:flats/sharps` latency clusters; chord-tone deletions in F10 passages.

## Open questions

None standing. (Alberti and other accompaniment figurations remain F10-texture territory — and the pinned Figures family's, if promoted.)
