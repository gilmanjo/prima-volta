# F10 · Sight-reading passages — *engine C*

**Trains:** the integrated skill. Generated 4–20 bar exercises from the difficulty vector (05/06); **never repeated** — repetition polishes repertoire, not reading.

**Mockup:** [mockups/F10-passages.html](mockups/F10-passages.html)

## Params (a generation request, not a scheduled atom)

```
{ perAxis: { keys, rhythm, texture, range, span } rank+subrank   (from skill_profile),
  bars, tempo, hands,
  tonalities: major [, minor],   // from drill scope's minorContent flag, supplied by the serving
                                 //   layer — ambient user state never reaches the generator (06)
  emphasisTags: []   // prescription bias, e.g. "rhythm:dotted", "key-region:flats" (09→06)
  mode: rehearsal | performance }
```

## Mechanics

1. **Preview ritual** (ABRSM-standard 20–30s): scan timer + **one** generated scan question per read — key, meter, or largest leap — answered before the keys unlock. The Harris habit, distilled.
2. Count-in → one pass.
3. **Mode is a practice-level choice** (08): *rehearsal reads* are the daily default (~3 of 4) — gentle metronome, stopping/slowing tolerated and logged, pitch graded strictly; *performance reads* (~1 of 4, plus all benchmark excerpts) — locked pulse, continuity graded. Rationale and evidence review: 03 §2.

## Grading defaults

Three axes always reported separately — **Pitch · Rhythm/Timing · Continuity** — per 03. Error events carry the full tag vocabulary; F10 is the prescriber's primary evidence source. **Immediately after each read**, the post-read screen shows the three axes, the error map on the score (colored noteheads at fault sites), one-tap "drill this" on any highlighted cluster, and **Replay my take** (smplr playback of the performed MIDI). A flawless rehearsal read never converts into a performance read — the modes stay separate.

## Difficulty & progression

Per-axis staircase (05 §3's bands): a sustained ≥95 mean promotes, falling out of the working band demotes; practice serves mostly at-position volume (short one-pass reads) with a stretch read offered roughly 1 in 5 (half credit toward promotion, per 05 §3). Difficulty targeting keeps expected error rate low — the "never drill mistakes" principle made mechanical.

## Open questions

None standing here. (Staircase feeding is settled in 05 §3.)
