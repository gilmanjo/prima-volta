# F3 · Intervals — *engine A*

**Trains:** interval construction on the keyboard and recognition on the staff — the chunk-vocabulary substrate of reading (experts read intervals and contours, not note names).

**Mockup:** [mockups/F3-intervals.html](mockups/F3-intervals.html)

## Params

```
{ size: 2nd … 8ve            (beyond-the-octave: parked),
  quality: dim | m | M | P | aug   (valid combinations per size),
  direction: up | down | —,   // identity — descending is its own skill; null on harmonic staff-cue
                              //   pairs (a stacked engraving has no direction, 02 §2)
  anchor: named note | staff-rendered pair,
  form: melodic | harmonic,
  clef: treble | bass | grand   (staff-cue only; grand = engraved pairs spanning bass↔treble),
  register (render-only, not identity),
  cue: name | staff,  answer: midi | IntervalSelector,
  hand: RH | LH                 (midi answers only) }
```

## Variants

| Variant | Prompt → answer |
|---|---|
| `name→midi` | "M6 ↑ from G3" → play both notes (anchor highlighted at low tiers; from memory higher). Melodic order enforced; harmonic = both inside the 80ms spread window |
| `staff→midi` | Two engraved notes → play them, exact octave |
| `staff→IntervalSelector` | Interval pair engraved → name it on the **IntervalSelector**: a size row (2–8) and a fixed quality row (dim · m · M · P · aug — all five always shown; combinations invalid for the size sit inert, so the layout never shifts). Knowledge-only staple, and where quality spelling is graded (MIDI can't see m6 vs enharmonic equivalents; the selector can). The tritone accepts aug4 or dim5 unless the engraving disambiguates |

## Tier ladder

| Tier | Content |
|---|---|
| T1 | Construct from white-key anchors |
| T2 | All anchors (incl. black-key starts); the anchor highlight fades out over the tier |
| T3 | Harmonic form (simultaneous, 80ms spread) — the two-finger grab, precursor to chord stacks |
| T4 | Speeded (flash-timed, converging with F8) |

The ladder describes **construction** (execution). The **ID (selector) variant is tierless** — knowledge atoms admitting alongside, with no ladder to climb. Beyond-the-octave (compound intervals) is **parked** — revisit when passage textures start demanding wide grabs.

## Grading

Rehearsal mode. Both notes correct required; melodic order enforced; direction is identity (an atom is "m7 down", not "m7") — except harmonic staff-cue pairs, which are dir-less (stacked, no temporal order; name-cue harmonic keeps direction: which side of the anchor is the skill) — while anchors are instance variety — T1→T2 widens the anchor pool, a gate-style step (02 §1). Enharmonic MIDI equivalence per 03 §7 — spelling knowledge lives in the selector variant.

## Prescribes for

Leap errors in passages (`leap>5th` tags), contour misreads, harmonic-interval misgrabs in chordal textures.

## Open questions

None standing.
