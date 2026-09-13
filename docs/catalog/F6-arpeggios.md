# F6 · Arpeggios — *engine A*

*(Distinct from F4 `broken`: arpeggios traverse registers with thumb crossings and hand travel — RCM treats scales, chords, and arpeggios as separate technique elements for exactly this reason. Shares grading machinery with F5 scales; separate atoms, separate prescriptions.)*

**Trains:** chord-tone traversal across the keyboard — crossings, register confidence, and the internalization of chord tones as a *terrain* rather than a hand position. Feeds reading of arpeggiated textures and general technique.

**Mockup:** [mockups/F6-arpeggios.html](mockups/F6-arpeggios.html)

## Params

```
{ root: 12,
  basis: maj | min | dom7 | dim7        (RCM's arpeggio set; maj7/m7 later),
  octaves: 1 | 2 | 3 | 4,
  hand: RH | LH | HT | alternating (T6),
  direction: asc | desc | up-down,
  startInversion: root                   (inversion starts parked — separate atoms when they come, per 02 §1),
  cue: name (staff later),  answer: midi,
  tempoTier }
```

## Variants

| Variant | Prompt → answer |
|---|---|
| `name→midi` | "G major arpeggio · 2 octaves · RH · up-down · ♪=72" → play it against the metronome pulse |
| `staff→midi` *(later)* | The arpeggio engraved → play — merges into F10-style reading once notation lands |

## Tier ladder

| Tier | Content | Anchor |
|---|---|---|
| T1 | 1 octave up-down, HS, triads | The F4-bridge tier; gentle tempo (v0: ♩=60, one note per beat, 4/4 frame) |
| T2 | 2 octaves HS, triads | RCM mid-level pacing |
| T3 | 2 octaves HT, triads | |
| T4 | dom7 / dim7, HS then HT | |
| T5 | 3–4 octaves + speed gates | RCM anchor ♪=80+ |
| T6 | **Alternating hands** — LH and RH leapfrog octave by octave | The capstone; the handoff seam is the graded skill |

**Anchor notation:** as F5's — ♪=N means notes as eighths against a quarter-note click at ♩=N, two per beat; learning tiers play one note per beat.

## Grading defaults

Rehearsal mode with metronome (arpeggios are inherently pulsed). Graded: note order (strict), completeness, **evenness** (IOI coefficient of variation — bad crossings show up here even though MIDI can't see fingers), tempo adherence at gate tiers. Turnaround ruling: top note played **once** at the apex of up-down (standard practice). Latency = prompt → first onset; total duration vs tempo gate.

Fingering itself is ungradeable — evenness is the proxy. **Alternating (T6):** the handoff seam is the diagnostic — the inter-onset gap across each hand exchange is tracked and tagged `handoff`; evenness must survive the exchange. Teach states will display **standard fingerings sourced from established references** (RCM/ABRSM syllabi, published fingering charts) — a research task; we do not invent fingerings.

## Prescribes for

Arpeggiated/broken-chord textures in F10 passages (`texture:arpeggiated` tags), chord-tone gaps at register boundaries, `shift:leap` hesitations (shared with F9), key regions where traversal is slow.

## Open questions

None standing here. Contrary motion is parked; inversion-start arpeggios will be **separate atoms** — ratified in 02 §1's identity rule.
