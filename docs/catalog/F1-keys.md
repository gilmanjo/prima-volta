# F1 · Keys & signatures — *engine A*

*(Pure declarative: signature ↔ key in both directions, both clefs, both modes — answered on general widgets. No tier ladder.)*

**Trains:** instant key knowledge — signature ↔ key mapping in both directions, in both clefs, for major and minor. The declarative bedrock everything else references.

**Mockup:** [mockups/F1-keys.html](mockups/F1-keys.html)

## Params

```
{ signature: 13 (♮, 1–6♯, 1–6♭; G♭/6♭ is real atoms behind its drill-scope toggle, default off —
              with it off, F♯ carries the six-accidental slot, the enharmonic noted in the confirmation),
  mode: major | minor,          // relative pairs share a signature — the prompt carries the mode
  clef: treble | bass,          // part of atom identity in BOTH directions — reading and recalling
                                //   signatures on the bass staff are their own visual memories
  direction: sig→key | key→sig }
```

Atom space: 13 signatures × 2 directions × 2 modes × 2 clefs = **104 flat atoms** (96 with G♭ off), no tiers, no ladder gating. What's *drilled* is chosen by **drill-scope config** (02-ITEM-MODEL): majors + treble on by default (current practice), minors, bass clef, and G♭ toggled on when wanted — no schema change; cards are created lazily and appear at their honest strength. Fully available in knowledge-only mode.

## Variants

| Variant | Prompt → answer |
|---|---|
| `sig→key` | Signature engraved (treble or bass) → tap the key on the **KeyPicker** wheel, which shows **only the prompted mode's ring** — a full-size ring of majors or of minors, never both before the answer (the other ring would be a free hint). The relative pairing is revealed with the confirmation |
| `key→sig` | Key name (major or minor) → tap the signature on the **SignaturePicker**: a grid of twelve engraved mini-signatures (thirteen with G♭ in scope) rendered in the item's clef, ordered by accidental count (sharps, then flats) — visual glyph matching builds signature memory, which count-style answers wouldn't. Confirmation spells the accidentals in order |

**Widget principle** (adopted here, proposed everywhere): full option space, never sampled distractors. The KeyPicker's radial major/minor alignment quietly teaches relative pairs; the SignaturePicker grid *is* a signatures reference chart you answer on.

## Grading

Rehearsal mode. Accuracy + one generous latency window (no tier tightening — fluency pressure on keys comes from F4/F5/F6 latencies in those keys). FSRS per atom as usual.

## Prescribes for

`key:X` error clusters anywhere in the app; accidental errors in passages in key X; slow F4/F5/F6 latencies concentrated in a key region; bass-clef signature misses when F10 grand-staff reading stumbles at key changes.

## Open questions

None standing.
