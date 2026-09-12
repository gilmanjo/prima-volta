# F2 · Note reading — *engine A/B boundary*

**Trains:** single-note staff→key mapping — on both single clefs and the grand staff, under accidentals and key signatures, into the ledger-line dead zones where most adult readers silently struggle.

**Mockup:** [mockups/F2-note-reading.html](mockups/F2-note-reading.html)

## Params

```
{ clef: treble | bass | grand,           // grand = both staves live, the note appears in either;
                                          //   a separate atom dimension (clef-switching cost is real)
  band: staff+ledger1-2 | ledger3+   (8va/8vb: tabled as a follow-up add-on),
  keyContext: open (♮) | ks14 (1–4 accidentals) | ksAll,   // signature applies to the staff
  accidental: none | single (♯/♭/♮) | double (𝄪/𝄫),
  cue: staff,  answer: midi | NoteSelector }
```

Register bands, clefs, key contexts, and accidental loads are separate atoms — "ledger lines below the bass staff" and "sharp-key signatures on the grand staff" must each be individually addressable by the prescriber. **keyContext and accidental cross** (02 §2): signature reading is *strategic* — how the staff is generally read in this key — while accidentals are *tactical*, modifying the note in front of you; the crossed contexts are their own atoms, so "doubles under a sharp-minor signature" is individually drillable, exactly as the prescribe-hook below needs.

## Variants

| Variant | Prompt → answer |
|---|---|
| `staff→midi` | Engraved note → play it, octave-strict (register identity is the point) |
| `staff→NoteSelector` | Engraved note → name it on the **NoteSelector** widget: a letter row (C–B), an accidental row (♭ ♮ ♯, once admitted; 𝄪/𝄫 join the row once T4 doubles admit), and a fixed octave row (1–7) — full option space per the widget principle, no sampled choices. Knowledge-only staple; the selector is also where **spelling** is graded (MIDI is enharmonic-blind; the selector isn't: F𝄪 ≠ G) |

## Tier ladder

| Tier | Content |
|---|---|
| T0 | On-staff plus 1–2 ledger lines (one band — includes the middle-C zone on grand staff), per clef |
| T1 | Accidentals (♯/♭/♮ inline) |
| T2 | Key signatures — the signature applies to the staff: the F line *is* F♯ in D major with no inline mark; inline accidentals now appear as genuine alterations |
| T3 | Deep ledger lines (3+) |
| T4 | Double accidentals (𝄪/𝄫) |
| T5 | Speeded — flash-timed display, converging with F8's mechanics |

Crossed atoms admit once **both** of their dimensions have entered (the later tier governs): signatures-with-alterations behind T2, doubles-under-signatures behind T4; keyContext widens ks14 → ksAll as a wave within the ladder.

## Grading

Rehearsal mode; octave-strict always (staff-cue); latency per tier. MIDI grades the sounding pitch (F𝄪4 accepts the G4 key); the NoteSelector variant is where the spelling itself is graded. At T5 the display timer becomes the difficulty knob (F8-style).

## Prescribes for

`ledger:below-bass` / `ledger:above-treble` clusters, `clef:bass` lag vs treble, grand-staff clef-switch hesitations, `accidental` and `key:X` misreads in passages, double-accidental stumbles in sharp-minor contexts.

## Open questions

None standing.
