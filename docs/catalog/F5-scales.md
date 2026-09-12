# F5 · Scales — *engine A*

*(Scales are their own technique element — RCM: scales / chords / arpeggios — not an arpeggio variant: stepwise traversal with crossings is its own motor pattern, and per-key scale fluency is the terrain knowledge that makes runs in real music playable. Shares F6's grading machinery; separate atoms, separate prescriptions.)*

**Trains:** key topography *in motion* — executing the scale of any key with correct notes, smooth crossings, evenness, and eventually speed. The execution complement to F1's declarative key knowledge; pairs with F8's scale-fragment *reading* classes.

**Mockup:** [mockups/F5-scales.html](mockups/F5-scales.html)

## Params

```
{ scaleType: major | minor-natural | minor-harmonic | minor-melodic | chromatic
             (modes, pentatonic, blues, …: later — a new type is data, not schema),
  key: 12   (chromatic: 12 starting notes),
  octaves: 1 | 2 | 4,
  hands: RH | LH | HT (parallel),
  direction: up-down (standard; asc/desc-only for remediation),
  cue: name | keysig,  answer: midi,
  tempoTier }
```

**Scale types are plug-and-play.** Each type is a data entry — interval pattern, sourced fingering, scope defaults, **and its own gate anchors** (the tempo marks its T4/T5 fluency gates demand: minor forms inherit major's RCM marks, chromatic and any future type declare their own) — and **drill-scope config (02)** chooses which types are drilled; majors on by default, everything else toggled on when wanted, with FSRS state surviving any toggle. The `keysig` cue is only valid for types a signature implies (major and the minors). Contrary motion and formula patterns are **parked**; when wanted, they slot in as a `motion` param on the type data — no schema change.

## Variants

| Variant | Prompt → answer |
|---|---|
| `name→midi` | "A♭ major · 2 octaves · HT · ♪=88" → play up-down against the pulse |
| `keysig→midi` | Signature engraved **with the mode named in the prompt** ("Play the harmonic minor scale of this key") → play it. Mode must be in the prompt — a signature alone is ambiguous between relative major and minor, exactly as in F1's sig→key. A separate atom from name-cue |

## Tier ladder

| Tier | Content | Anchor |
|---|---|---|
| T1 | 1 octave, HS | Gentle tempo; doubles as teach state (path shown on first encounter per key) |
| T2 | 2 octaves, HS | |
| T3 | 2 octaves, HT parallel | Adds the hand-alignment stat (onset delta per degree, as F6 T3) |
| T4 | Tempo gates, HS | ♪=80 (v0 anchor, tunable) |
| T5 | 4 octaves + HT gate | ♪=104 (RCM upper-level anchor) |

Keys enter along the ladder's key axis (05), the same staggering F4's quality order rides — C/G/F first, flat/sharp regions later. Tiers apply per scale type; the anchor tempos shown are major's values, which each type's data entry inherits or overrides.

**Viewport policy (T5 and any scrolled view):** the visible window follows the **expected path** — beat-indexed to where the hand should be — never the played keys. Leading the hand supports reading ahead; chasing input would jitter on every error.

## Grading

Rehearsal mode with metronome (scales are inherently pulsed; shares F6's machinery): note order strict against the type's degrees — a wrong note is a `substitution` tagged `scale-degree:N` + `key:X` + `scaleType`; completeness; **evenness** (IOI coefficient of variation — the crossing-quality proxy); tempo adherence at gate tiers; HT alignment from T3. Turnaround: top note once. Fingering is invisible to MIDI — evenness exposes bad crossings. Teach states will display **standard fingerings sourced from established references** (RCM/ABRSM syllabi, published charts — e.g., the B♭/E♭/A♭ major RH thumb rules) — a research task; we do not invent fingerings.

## Prescribes for

`key:X` fluency gaps (with F4/F6 latencies, the third leg of per-key evidence); scale-run textures in passages (`figure:scale-run` tags — when F8 reading of runs is fine but execution stumbles, F5 is the prescription, and vice versa); accidental errors concentrated in key X; harmonic-minor ♯7 stumbles once minor passages exist.

## Open questions

None standing.
