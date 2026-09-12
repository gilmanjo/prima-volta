# 01 — Exercise catalog (hub)

Every exercise the app can serve, organized as families of parameterized items. This hub holds the shared dimensions, the modality matrix, and the admission summary; **each family's full spec lives in [catalog/](catalog/), one doc per family, each with an HTML mockup of its exercise screen(s)** (open the mockup files in any browser).

| Family | Spec | Mockup |
|---|---|---|
| F1 · Keys & signatures | [catalog/F1-keys.md](catalog/F1-keys.md) | [F1 mockup](catalog/mockups/F1-keys.html) |
| F2 · Note reading | [catalog/F2-note-reading.md](catalog/F2-note-reading.md) | [F2 mockup](catalog/mockups/F2-note-reading.html) |
| F3 · Intervals | [catalog/F3-intervals.md](catalog/F3-intervals.md) | [F3 mockup](catalog/mockups/F3-intervals.html) |
| F4 · Chords | [catalog/F4-chords.md](catalog/F4-chords.md) | [F4 mockup](catalog/mockups/F4-chords.html) |
| F5 · Scales | [catalog/F5-scales.md](catalog/F5-scales.md) | [F5 mockup](catalog/mockups/F5-scales.html) |
| F6 · Arpeggios | [catalog/F6-arpeggios.md](catalog/F6-arpeggios.md) | [F6 mockup](catalog/mockups/F6-arpeggios.html) |
| F7 · Rhythm | [catalog/F7-rhythm.md](catalog/F7-rhythm.md) | [F7 mockup](catalog/mockups/F7-rhythm.html) |
| F8 · Staff flash | [catalog/F8-staff-flash.md](catalog/F8-staff-flash.md) | [F8 mockup](catalog/mockups/F8-staff-flash.html) |
| F9 · Topography | [catalog/F9-topography.md](catalog/F9-topography.md) | [F9 mockup](catalog/mockups/F9-topography.html) |
| F10 · Sight-reading passages | [catalog/F10-passages.md](catalog/F10-passages.md) | [F10 mockup](catalog/mockups/F10-passages.html) |
| F11 · Eyes-ahead mechanics | [catalog/F11-eyes-ahead.md](catalog/F11-eyes-ahead.md) | [F11 mockup](catalog/mockups/F11-eyes-ahead.html) |

*Numbering follows pedagogical order (declarative → reading → execution → time → integration) and is frozen — future families append.*

## 1. The dimensions

Every item is a point in this space:

| Dimension | Values | Notes |
|---|---|---|
| **Family** | F1–F11 | Determines the skill being trained |
| **Cue modality** | `name` (text/chord symbol) · `staff` (engraved notation) · `keysig` (signature glyph) · `audio` (later) | Same musical content, different decoding skill. **Name-cue trains symbol→hand; staff-cue trains staff→hand — different skills, scheduled as different atoms** |
| **Answer modality** | `midi` (play it) · `choice` (tap an option) · `tap` (rhythm on any key) | `choice` items need no instrument → knowledge-only mode |
| **Grading mode** | `rehearsal` · `performance` | See 03-GRADING §2. Family defaults in each spec |
| **Context** | at-instrument · knowledge-only | Derived: `midi`/`tap` ⇒ at-instrument; `choice` ⇒ either |

**Modality matrix** (● = specified, ○ = plausible later, — = doesn't make sense):

| Family | name→midi | staff→midi | name→choice | staff→choice | keysig→midi | keysig→choice | tap |
|---|---|---|---|---|---|---|---|
| F1 Keys & signatures | — | — | ● | — | — | ● | — |
| F2 Note reading | — | ● | — | ● | — | — | — |
| F3 Intervals | ● | ● | ○ | ● | — | — | — |
| F4 Chords | ● | ● | ● | ● | — | — | — |
| F5 Scales | ● | ○ | — | — | ● | — | — |
| F6 Arpeggios | ● | ○ | — | — | — | — | — |
| F7 Rhythm | — | — | — | ○ | — | — | ● |
| F8 Staff flash | — | ● | — | ○ | — | — | — |
| F9 Topography | ● | ● | — | — | — | — | — |
| F10 Passages | — | ● | — | — | — | — | — |
| F11 Eyes-ahead | — | ● | — | — | — | — | — |

**Metric-context rule**: any *run* of notes — three or more in sequence — is engraved as a real measure: time signature, rhythm values, barline. Single notes, interval pairs, and chord stacks may stand alone — as do F9's self-paced single-target streams (a follow-the-target queue has no meter to notate). Reading chunks live in metric context, so that's where they're drilled (F8 is the main consumer; any future run-of-notes surface, e.g. F5 staff-cue scale reading, inherits the rule).

**The F4/F6 boundary** (so consolidation doesn't blur it): F4 `broken` = chord tones sequenced **in position** (≤1 octave, no thumb crossing); F6 arpeggios = **multi-octave traversal** with crossings and hand travel. F6's one-octave tier is the deliberate bridge between them.

**Shared answer widgets** *(adopted for F1, proposed everywhere)*: choice answers are given on general widgets presenting the **full option space**, never 3–4 sampled distractors — no distractor design, honest chance rates, reusable components. Current roster: **KeyPicker** (circle-of-fifths wheel; majors outer ring, minors inner, relative pairs aligned), **SignaturePicker** (grid of engraved mini-signatures, clef-aware — visual glyph matching), the on-screen keyboard as **NotePicker** (F4's spelling variant), full root/quality/inversion rows (F4 ID), the **NoteSelector** (F2 — letter + accidental + octave rows), the **IntervalSelector** (F3 — size + quality rows). One sanctioned exception: **engraving-pick** variants (F4 `name→engraving`) are inherently distractor-based, because the space of candidate engravings is unbounded.

**Drill-scope config** *(designed in 02-ITEM-MODEL)*: every family carries user-facing scope settings — which keys, modes, clefs, qualities, hands are *drilled*. Scope is orthogonal to admission: **admitted = available, scope = opted-in**; scope-excluded atoms are simply hidden, their strength decaying silently (no debt, no suspension machinery — 02 §3). F1 is the first consumer (minors + bass clef exist in the schema day one, toggled on when wanted).

**Mockup coverage rule**: every variant and tier a spec proposes has a corresponding frame in its family's mockup page — spec/mockup parity is part of doc review. "Later" (○) modality-matrix entries are not proposals and have no frames.

## 2. Admission (summary — rules live in 05-DIFFICULTY §2)

There is no global unlock table and no scalar user level. Admission is local, two ways: **family-local** — each family's own ladder (tier order × the key wave) is walked by frontier-on-pull as that family is practiced, self-limiting since the next wave admits only as the previous wave's atoms hold strength; and **reading-coupled** — an engine-C difficulty axis entering a rank admits the *next* rank's feeder vocabulary in its drill families, so passages never demand cold content. Every family's first rung is available from day one; drill scope decides what's visible.

## 3. Cross-family open questions

None standing. (Minor-wave timing is settled: minors enter **after major fluency, by default** — which the design already expresses as the minor scope defaults (02 §5) shipping off for scale forms, generation, and reading contexts; flipping them on is the user's act, not a scheduling event. F1's minors are structural from day one, scope-gated like everything else.)

## 4. Parked family candidates

Pinned, not designed — each would append as F12+ if promoted (numbering is frozen):

- **Modes** — dorian/mixolydian/etc. *execution* is already reachable as F5 scale-type data; a family would add the recognition/theory side (mode ID from staff or sound, characteristic-tone drills).
- **Dynamics** — reading and performing dynamics/articulation. Blocked on grading scope: velocity and duration are deliberately ungraded in v1 (03 §8); this family is the natural home when that changes.
- **Figures** — execution vocabulary of common figuration (Alberti, waltz bass, broken octaves, turns/ornaments). F8 trains *reading* figures as chunks and F4 T4 covers in-position broken forms; this would train fluent *execution* of the accompaniment patterns themselves.
- **Chord progressions / Roman-numeral analysis** — see or hear a progression → identify numerals; play I–IV–V⁶₄–V⁷–I in key X (the RCM cadence requirements); re-homes the parked `degree→note` idea. The largest candidate — likely the first to promote once harmony matters.
- **Audio/listening expansion** *(a theme, not a family)* — the parked audio cue modality (hear it → play it), rhythm-matching recognition (F7), and ear-training unification with F1–F4's listening counterparts. Perfect Ear covers this ground today; bundle these as one future wave if unified stats ever earn it.

*(Family-specific open questions live at the bottom of each catalog/ doc.)*
