# F9 · Keyboard topography — *engine A*

**Trains:** finding keys without looking down (Richman's keyboard-orientation track) — the enabler of eyes-stay-on-score, and the physical half of eye-hand span.

**Mockup:** [mockups/F9-topography.html](mockups/F9-topography.html)

## Params

```
{ target: note | triad | tetrad,
  span: in-position | leap ≤ octave | leap > octave,
  hand: RH | LH,
  streamLength: 5–15,
  startRegister: random within the tier's span, per rep,
  cue: name | staff,  answer: midi }
```

## Variants

| Variant | Prompt → answer |
|---|---|
| `name→midi` | Targets stream as text ("C4 … A♭3 … F5 …") — the **pure-topography isolate**: finding keys with zero decoding load. The remediation tool when the weakness is motor, not reading |
| `staff→midi` | Targets stream on a rolling staff — current note full-ink, next note ghosted. The **composite skill**: continuous staff→hand under travel, the bridge between F2's isolated items and F10's passages. Self-paced at entry tiers (the next target appears on the correct hit); timed feed at T4. A single-target queue, so exempt from the metric-context rule |

## Mechanics

You keep eyes forward and play each target as it appears; leap tiers force repositioning by feel. **Starting position varies every rep** — the stream spawns at a random register within the tier's span; there is no home position to camp on, and the first target is always a cold find. **Honor system by design**: not-looking isn't enforced (no camera, ever); looking down shows up as latency anyway, which is the measured outcome.

**Stream shape** (sampled per rep, seed logged — 02 §1): note streams draw **8–12 targets**, grab streams **5–7**, within the 5–15 param. In-position keeps every target **within a fifth of the spawn**; leap ≤ octave puts successive targets **5–12 semitones** apart, the wide tier 13–24 — a leap tier never serves a step. Targets spell on the canonical anchors (the F3 pool); **the staff cue engraves on the hand's home staff** (RH treble · LH bass), current target full-ink, next ghosted, no time signature (the single-target queue is exempt from the metric-context rule). A grab's simultaneity is the jitter-widened spread (03 §4), any finger order.

## Tier ladder

| Tier | Content |
|---|---|
| T0 | Single notes near position |
| T1 | Leaps within the octave |
| T2 | Cross-keyboard leaps |
| T3 | Chord grabs (triads; tetrads in a later admission wave) |
| T4 | Speed streams (inter-prompt interval shrinks) |

## Grading defaults

Rehearsal mode. Per-prompt accuracy + latency; **first-target latency reported separately** (the cold-start find-from-nowhere stat); stream summary = accuracy % + median latency + worst-leap latency + cold start. Wrong-octave errors are the signature failure and tag as `wrongOctave` + `shift:leap`.

**Rating (03 §6, entry tiers — the stream is one attempt):** a wrong find, or a grab with an extra tone or outside the spread, **stops the flow and rates the attempt Again** — the discrete law; reconciliation shows expected against played on the keybed, continued by the correct find (a grab re-grabbed together) or a tap. A **clean stream** rates Good vs Hard by its **median per-target latency** against the generous learning budget (5 s): T4's timed feed is the clock that tightens, and its misses-scroll-past pressure arrives with it — until then the card's gate rung stays reserved for it. The verdict line reads **median over budget with the cold find alongside** ("median 0.9s / 5.0s · cold 1.8s").

## Prescribes for

Long inter-onset gaps on position shifts in passages (`shift:leap` tags — shared vocabulary with F6), wrong-octave errors in F2/F10.

## Open questions

None standing. (The honor system stays — Anki runs on one too; latency exposes looking anyway.)
