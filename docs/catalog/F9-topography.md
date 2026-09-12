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

## Prescribes for

Long inter-onset gaps on position shifts in passages (`shift:leap` tags — shared vocabulary with F6), wrong-octave errors in F2/F10.

## Open questions

None standing. (The honor system stays — Anki runs on one too; latency exposes looking anyway.)
