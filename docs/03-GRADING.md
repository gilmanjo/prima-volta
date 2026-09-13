# 03 — Grading

How played MIDI becomes grades, error events, and FSRS ratings. Principles first (§1–2, including the corrected pitch/rhythm philosophy), then mechanics.

## 1. Principles

1. **The keyboard is the answer sheet.** No self-assessment anywhere. (ChessGrimoire's auto-grading discipline, upgraded by MIDI's precision.)
2. **Three axes, always separate: Pitch · Rhythm/Timing · Continuity.** No hidden blend and no fixed supremacy of one axis over another. Any composite (benchmark score) is explicitly defined *from* the axes (07-RATINGS) and never replaces them in the UI.
3. **Hesitations are always data, only sometimes penalty.** Inter-onset outliers are logged as diagnostic signal in every mode (where you slow down = where decoding is expensive = what to prescribe). They reduce a score only in performance mode — and in **pulsed-run material**, where the pulse is the task itself (§6's per-material map), timing is graded as execution rather than penalized as hesitation.
4. **Difficulty holds you at near-perfect.** Each staircase axis serves at the highest position whose rolling clean rate sits in its working band (85–95%): sustained ≥95% promotes out the top, sustained <85% steps down (05 §3's explicit bands — motor-domain numbers, deliberately stricter than classification-learning's ~85%-optimal; rationale in 05 §3). Observed clean rate therefore oscillates between ~87% just after a step and ~97% just before the next — that is the **per-read** experience; the rolling mean the bands act on rides a tighter ~94–95 sawtooth (the sim's step-size probe measures both). Perfect practice is the target, 95 concedes only grader false-negatives (principle 5), and **tempo is the release valve** (rehearsal reads are self-paced). SASR's 80–90% gate and "read 2–3 grades below" describe test placement and leisure reading, not frontier practice. Frequent-error material is stepped down, never tolerated — how the app honors "never drill mistakes."
5. **Grade conservatively; log liberally.** False negatives poison trust in a grader (Piano Marvel deliberately ignores durations for exactly this reason). v1 does not grade durations, articulation, velocity, or pedal — but captures all of it in the raw stream for later.
6. **Raw MIDI is kept for every graded attempt, forever.** Graders improve; data is irreplaceable; re-grading history must always be possible.

## 2. Modes — and the evidence review behind them

### The evidence on pitch vs. continuity

"Stops and hesitations cost more than wrong pitches" is true only in specific contexts — it is not a general law of learning. What the evidence supports:

| Claim | Evidence | Strength |
|---|---|---|
| Rhythm-reading ability is the strongest *predictor* of sight-reading skill among component skills | Elliott 1982 (band musicians; via Hardy's research review); McPherson replications | Solid as a **correlate** — says train rhythm, not "penalize pitch less" |
| Continuity is heavily weighted in sight-reading **assessment** | ABRSM examiner criteria (fluency/continuity explicit); the keep-going instruction is standard test protocol | Solid, but context-specific: it's a norm of the *performance/exam/accompanist* setting, where the ensemble won't stop |
| Human judges' quality ratings of sight-reading are driven mostly by **pitch** accuracy | Huang & Lerch 2019: pitch + alignment features dominate the first principal component of rated performance; tempo stability loads next | Directly supports Jordan's intuition |
| Slowing down / stopping to avoid errors prevents rehearsing mistakes | Core deliberate-practice and piano-pedagogy orthodoxy; error-management literature is mixed on "errorless" extremes but no one disputes that repeatedly executing errors entrenches them | Solid as practice methodology |

Conclusion: **continuity-over-pitch is a property of one performance context, not a law of learning.** Both disciplines are real skills — accurate decoding *and* keeping the pulse under pressure — and they belong to different practice contexts. So the grader has two modes, and material difficulty is tuned so the tension between them rarely binds (principle 4: at the right level you can have both).

### Rehearsal mode *(default: all engine-A/B drills, and the majority of daily passage reads)*

- Self-paced or gentle metronome (visual pulse optional).
- **Pitch graded strictly** — wrong notes are the primary signal.
- Stopping, slowing, self-correcting: **unpenalized**. Slowdowns log as hesitation events for diagnosis; restarts aren't tracked at all (§7 — a mistake is a mistake, and the next read is coming).
- Corrected notes: the correction counts for completion, the initial error still logs (and drives the FSRS rating).
- Purpose: accuracy-first skill building, aligned with slow-practice discipline.

### Performance mode *(benchmark tests, F7 rhythm by nature, and a deliberate minority of passage reads)*

- Locked metronome; count-in; one pass, no stopping.
- All three axes scored; continuity events (stops, restarts, tempo collapse) now cost.
- Purpose: train and measure the keep-going skill on its own terms, in its own labeled context — because real-world sight-reading (accompanying, playing with others, reading through a new piece for enjoyment) eventually demands it.
- The rehearsal:performance mix of passage reads is the user's per-read choice; the starter template (08) carries a **~3:1 default mix**, tunable.

## 3. Capture pipeline

```
Web MIDI 'midimessage' (note-on/off, velocity, timeStamp: performance.now domain)
  → device profile (per keyboard + transport: FP-30X-USB, FP-30X-BLE, FP-90X-USB …)
  → clock correlation: once per practice bout (device connect), metronome tick reference vs MIDI timestamps
  → latency offset applied (measured by the calibration ritual below)
  → normalized NoteEvent { midi, onMs, offMs, velocity } stream → grader
```

- **Calibration ritual** (Settings, ~25s, per device profile): **four count-in clicks, then eight scored** — entrainment needs a runway; nobody hits click one cold (the device spike's lesson). Anticipation outliers (|offset| > 150 ms) drop before the stats; median offset = the profile's latency correction; spread = the profile's jitter, which widens grading windows automatically. (FP-90X · USB via phone Chrome measures ≈ +25 ms offset, ≈ ±25 ms entrained spread — v0 values, re-measured any time.)
- **USB vs Bluetooth:** USB profiles are trusted for performance-mode timing. BLE MIDI (~10–20ms extra, jittery) is accepted for rehearsal mode; if a BLE profile's measured jitter exceeds a threshold, performance-mode reads warn and widen windows rather than silently mis-grading.
- **The profile principle:** anything device-specific — latency offset, jitter, transport trust, the velocity floor — lives in the device profile and *only* there. (The floor earns its keep only on actions that emit ghost touches: the **FP-90X's action gates true brushes in hardware** — a graze produces no note-on at all, the lightest deliberate press reads velocity 1, and real *ppp* lands 1–13 — so its USB profile sets **floor = 0**; filtering there could only eat genuine pianissimo, the false negative §1.5 forbids.) Profiles are swappable per bout and per device; every attempt logs the **raw stream + `profileId`**, and no review row ever bakes a profile value in. Swapping or correcting a profile never touches SRS history, and re-grading under a better profile is always possible (§1.6).
- **Choice answers** (selectors, chip taps, on-screen spelling) bypass the MIDI pipeline: the raw response is the **widget event stream** — selections, corrections, commit, timestamps, and the candidate set shown — logged like raw MIDI and re-gradeable the same way (10 §4's `rawChoiceJson`). Where spelling is the tested skill, the symbolic answer is preserved verbatim (F𝄪 ≠ G forever).
- Sustain pedal (CC64) captured, ignored by v1 grading.

## 4. Matching algorithm

**v1 — windowed matcher (metronome-locked material):**
- Each expected note has a target time on the beat grid. **Association precedes verdict:** played notes match to expected by pitch within a generous **association window** (±half a beat, min 250 ms, scaled like everything else); a match inside the grading window `W` (base W=120 at ♩=60-equivalent, scaled by tempo — proportional to the expected inter-onset interval — widened by device jitter) is on-time, and a match *outside* `W` but inside association is a matched **`early`/`late` timing event** — a timing failure never masquerades as a pitch failure. Repeated pitches associate in score order; each played note associates to at most one expected note (nearest unmatched).
- **Chords:** one simultaneous attack — every expected tone lands within the spread window of the attack's *first* note (80ms base, **widened by the profile's measured jitter like every grading window, §3**), and hands-together material puts **both hands inside that same window** (a chord entered as sequential hands, or a tone at a time, is not the chord). Order inside the window is free; simultaneity is the law, and the judgment never depends on what order the notes are examined in. A tone landing after the window closed = `dropChordTone` — and when timing is the *only* failure, the reconciliation says so ("right tones, not together"), never leaving a correct-keys take looking mis-graded.
- Unmatched played note = `insertion`; unmatched expected note = `deletion`; pitch-adjacent mismatch (≤2 semitones or same staff position) = `substitution` with the expected/played pair kept.
- Octave displacement of a correct pitch-class = `wrongOctave` (distinct from substitution — different diagnosis, often clef/register confusion).
- Timing within-window deltas accumulate into the rhythm axis (signed: early/late).

**v1 — self-paced matcher (rehearsal mode, no grid):** sequence alignment on pitch order only (greedy with 1-note lookahead for v1); **hesitation = IOI > 2× the rolling local median** (v0 — on the device spike's even-scale baseline it caught the one genuine pause with zero false flags across 57 clean intervals; 2.5× missed it); backward jumps to previously-matched positions are detected only so **replayed material is ignored** (no false insertions) — rehearsal has no restart concept, and first-pass errors stand.

**v2 — Needleman-Wunsch note alignment** (Nakamura-style, MIT-licensed prior art): replaces both matchers' edge-case handling, adds robust recovery-after-error tracking, repeats/skips, and free-tempo grading. Specified now so v1's event schema is a strict subset of what v2 emits.

## 5. Error events

```
errorEvent = {
  attemptId, type: substitution | insertion | deletion | wrongOctave | dropChordTone
              | early | late | hesitation | restart | tempoDrift,
  expected?, played?, timingDeltaMs?, beatPos, barPos, hand,
  key, tags[]   // from the canonical registry below
}
```

`restart` is a **performance-mode continuity event only** — rehearsal doesn't track restarts (§7).

**The tag registry (canonical).** One versioned vocabulary; every producer and consumer uses exactly these spellings — no doc coins its own:

- **Surface tags:** `barline` · `accidental` · `accidental:double` · `leap>5th` · `shift:step` / `shift:leap` · `chord-tone:3rd|5th|7th` · `meter:M` (e.g. `meter:6/8`) · `feel:swing` · `handoff` (F6's hand-exchange seam)
- **Namespaced tags:** `rhythm:dotted|syncopation|16ths|triplets` · `key:X` (the specific key; **`key-region:naturals|sharps|flats`** groups it — derived from `key`, usable in rules and emphasis biases) · `ledger:below-bass|above-treble` · `clef:treble|bass|grand-switch` · `figure:scale-run|broken-chord|triad-shape|cadence` · `interval:2nd…8ve` · `texture:arpeggiated|multi-voice` (emitted when the fault site carries more than one voice) · `scale-degree:N` · `scaleType:X` · `quality:X` · `inversion:N`

Hand attribution rides the event's `hand` field, never a tag.

Tags are computed from the score context at grading time (pure function of exercise + position). Together with the event **`type`** and the **`key` field**, they are the prescriber's entire evidence vocabulary (09) — diagnosis rules may key on any of the three — so the taxonomy is versioned and re-runnable over stored raw MIDI.

## 6. Latency, fluency windows, and FSRS ratings (engine-A/B items)

- Latency = prompt-display (or staff-blank, for F8) → first correct onset. Chords: → last tone of the correct chord.
- Per-item-type **fluency windows** anchored to external benchmarks (RCM technique tempi: triads solid HT ♩=66, dominant 7ths broken ♪=72 HS, scales ♪=104 at upper tiers), interpolated per tier. Windows tighten as the item's tier rises — month-six "Good" ≠ month-one "Good". A tier where the window snaps to its anchor is a **fluency gate** (glossary, 00): accuracy rules unchanged, only the clock tightens.
- Rating map (v0), **selected by the material, never by the mode label** (the matcher follows the material too, §4):
  - **Discrete answers** (a chord, a note, an interval): any pitch/execution error → **Again** — corrected included: the correction completes the item, the error still rates it (a motor error is a rep of the wrong program, 05 §3) · clean but over the latency window → **Hard** · clean within it → **Good**.
  - **Pulsed runs** (runs whose cue carries the pulse — staff/keysig-cued scales and arpeggio traversals, F7 lines): any pitch error, **or more than one out-of-window onset → Again** · exactly one out-of-window onset → **Hard** · every onset inside its grid window (§4) → **Good**. The same shape as engine-B aggregation (04 §5) — and why slow, clunky runs can never pass as fluent; gates additionally demand the anchor tempo (02 §1). **The pulse belongs where notation can specify it**: a name-cue prompt cannot say whether the player is on quarters or eighths, so name-cue runs serve self-paced (below) and the metronome arrives with the staff cues.
  - **Self-paced material** (unpulsed rehearsal — name-cue runs included): hesitations and IOI outliers are **diagnostic-only, never rating** (§1.3); pitch errors rate as discrete answers do; latency decides Hard vs Good — **for a run, the latency statistic is the mean inter-onset interval against the tier anchor's per-note budget** (the same ♪ anchors, demanded as pace rather than entrainment).
  - **Easy unused** (runaway-interval guard).
- **Engine-B classes:** the map rates **each instance**; 04 §5 aggregates the instance ratings into the class rep's single review.
- Same-day repeats run in practice-local steps outside FSRS (04-SCHEDULING).

## 7. Edge cases (v1 rulings)

| Case | Ruling |
|---|---|
| Notes played before the count-in ends | Ignored (warm-up touches are normal) |
| First-note grace | Window ×1.5 on the first expected onset in performance mode (reaction, not reading) |
| Simultaneity split between hands | Hand attribution by pitch relative to the score's hand ranges, not a fixed middle-C split |
| Player restarts a passage unprompted | Rehearsal: **not a tracked event** — errors already made stand (a mistake is a mistake, exactly like corrected notes), replayed material is ignored for scoring, and the attempt completes as one take; there's always the next read. Performance: attempt ends, scored as-is |
| Enharmonic MIDI equivalence | MIDI numbers are enharmonic-blind; staff-cue items grade the number (D♯=E♭ accepted); `choice` items are where spelling knowledge is graded |
| Octave policy | Staff-cue: exact octave, always. Name-cue: any octave, always — the cue type defines the register knowledge being tested. **Octave-qualified names** ("A♭3" — F9 streams, F3 anchors) are register cues and grade exact-octave; bare pitch-class symbols (F4 chords, F5 scales) stay any-octave |
| Trailing extra notes after completion | Ignored within the 500ms grace (release flourishes) — but notes landing inside the spread window of completion are part of the *attack* and grade normally (an extra hand is not a flourish); logged beyond the grace |

## 8. Explicitly not graded in v1

Durations/legato, articulation, dynamics/velocity, pedal, fingering (invisible to MIDI), tempo *choice* in rehearsal mode. All captured in raw events except fingering; each is a candidate for later axes once the core grader has earned trust.

## Open questions

None standing. The two formerly parked empirical constants are ratified from the device spike's FP-90X · USB session: the **hesitation threshold** (§4: IOI > 2× rolling local median) and the **velocity floor** (§3: a per-profile value; 0 on the FP-90X · USB, whose action gates true brushes in hardware). The desk FP-30X remains the rig bench for the BLE comparison and cross-device consistency checks; every value re-measures per profile, and re-tuning never touches review data (§3).

*(Staircase feeding is settled in 05 §3: tag-filtered pitch axes fed by both modes, rhythm by performance + F7, continuity never.)*
