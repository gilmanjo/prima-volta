# 06 — Generation

The seeded, constraint-based generator behind everything that isn't a fixed atom: engine-C passages (F10) and eyes-ahead material (F11), engine-B instances (F7 rhythms, F8 flash figures), benchmark excerpts (07), target sampling for F2/F3/F9 reps, and F4's engraving-candidate grids. **Not ML, not LLM** — a deterministic sampler over the 05 difficulty vector, validated by tonal; LLMs stay out of the runtime path entirely (documented failure modes: measure math, difficulty non-adherence; at most an offline idea source for texture templates, always behind the validators).

**The seam with 05:** the difficulty referee (05 §4) is the **single source of what each rank means**. 06 measures and conforms; it never declares a rank-varying threshold of its own. 06's own validators check *playability*, which has no rank.

**Determinism:** `generate(request, seed) → Score` is pure. Same inputs, same exercise, forever regenerable. The DB stores request + seed + the score JSON per attempt (error-context linking, replay-my-take, re-grading).

## 1. Score representation (the lingua franca)

```
Score = { meta:  { key: Sig, tonic: Pc, tonalMode: Mode,   // a signature can't tell C major from A minor
                                                           //   (F1's own lesson) — tonality is explicit for
                                                           //   scan questions, diagnosis, and re-grading
                   meter: Meter, tempo, bars, hands, requested: PerAxisVector, seed },
          bars: [ { events per voice:
                    { voice, hand, beat, dur, notes: [{ midi, spelled }], kind: note|rest|grace, tie? },
                    bbox? } ] }   // bbox filled by the renderer, consumed by F11 blanking
```

One structure, four consumers: **StaffView** renders it (10); the **grader** derives the expected-note stream and the hand ranges 03 §7 attributes by; **F11** blanks by bar using renderer-reported bboxes; the **referee** computes its feature census from it. Spelling is resolved at generation time from the key context (tonal) — the score carries spelled pitches alongside MIDI numbers, so engraving and enharmonic grading never disagree.

## 2. The passage pipeline (engine C)

Request: `{ perAxis (rank·subrank ×5), bars, tempo, hands, mode, tonalities, emphasisTags[] }` (F10 §Params; tempo defaults from the rhythm position's knob — benchmark and stretch may override; `tonalities` carries drill scope's `minorContent` flag in from the serving layer — ambient user state never reaches the generator). Stages:

1. **Form skeleton** — phrase structure by span rank: single phrase at low ranks; antecedent/consequent (2+2, 4+4) once bars allow; excerpt-style forms at SSS.
2. **Harmonic frame** — functional progressions (I/IV/V/vi pools, inversions entering with the texture rank; secondary chords entering at S and modulation only at SSS, both per the ladder's key column). The final bars always carry a **cadence from the shared vocabulary** (§7). Harmony is scaffolding for musicality, not a difficulty axis.
3. **Texture realization** — a **texture grammar** (not per-hand generation + compatibility check): the grammar emits voice *roles* — melody, held tones, broken-chord accompaniment, chordal support — per the texture rank's row (5-finger → one hand sustains → parallel → independent → melody+accomp → chord streams, the Four Star drift toward repertoire-like material).
4. **Melodic fill** — chord tones anchor strong beats; steps/skips/leaps drawn from per-rank transition weights (hand-tuned tables in v1 — corpus fitting is a calibration-era upgrade; leap ceiling = the range rank's Pitch-column content, read from 05); contour shapes (arch, wave, descent) picked per phrase; no aimless chromatic wander unless the keys rank scopes it.
5. **Rhythm assignment** — per voice, from the rhythm rank's vocab (F7's nested sets — one vocabulary, two consumers), density per the rhythm subrank knob.
6. **Engraving & expression** — key signature per the keys rank; accidental load within its knob; expression marks per §8.
7. **Validate** (§4) → **referee** (§5) → accept, or **reject-and-resample** with a fresh seed (bounded, §5).

## 3. Pianism validators — playability only

The standing critique of SRF-class generators is un-pianistic output; validators are first-class here. They check *physical playability and idiomatic sanity*, and carry **no per-rank numbers of their own** — every rank-varying cap (span, displacement rate, density, accidental count) is read from 05's constants:

- **No impossible overlaps:** hands never demand the same key at the same instant; voices within a hand never collide.
- **Span caps:** per-rank hand span read from 05 (a hard ceiling of a 9th applies always); no double-note runs beyond the rank's texture row.
- **Displacement & repositioning:** displacement-rate cap from the range knob; at low ranks a repositioning leap is preceded by a rest or phrase boundary (the ladder's rests-at-repositions entry, F–D — a referee constant that relaxes with the range rank).
- **Awkwardness floors:** no same-finger-implied consecutive leaps, no voice crossing below rank A (the ladder's texture row — crossing enters at A), no awkward accidental sequences (chromatic clusters the keys rank didn't ask for).

Any violation → resample. Validators never "fix" a score (no post-hoc mutation — it would bypass the referee).

## 4. Difficulty conformance — the referee's client

05 §4 owns `difficulty(score)`. The conformance contract, applied per axis:

- **Categorical content conforms exactly**: only in-pool keys, meters, vocab items, figure classes, and leap classes may appear — one stray 6th at a leaps-to-a-5th rank bounces the score, categorically.
- **Continuous knobs conform within tolerance bands**: IOI density, displacement rate, accidental count, bars.
- **Texture is classified from the notation surface** (voice count, overlap profile, accompaniment census) — never from the template label the generator happened to use. No self-grading by metadata.

**Resample budget:** up to 8 fresh seeds; if a request systematically fails conformance, the generator does *not* ship a nonconforming read — it logs a calibration flag against the offending knob (05 §5's weekly job consumes it) and retries with a different frame/texture selection. The player sees only conforming material.

## 5. Engine-B instances & the other consumers

- **F7 rhythm instances:** 1–4 bars from the class `{meter, vocab, voices, feel}`; percussion-line rendering; `voices:2` = two independent lines with an explicit hand split. Conformance is trivial (the class *is* the pool); instances never repeat (seeded).
- **F8 flash figures:** one figure from the class's `patternFam` in metric context (the hub rule: 3+ notes = a real measure), spelled per `keyContext` (open / ks12 / ksAll), in the class clef. Flash timing is the player's, not the generator's.
- **F11 material:** the F10 pipeline plus bar discipline — bar-aligned figures, no cross-bar suspensions below SS, per-bar bboxes mandatory.
- **Target sampling (F2/F3/F9):** uniform draw within the atom's scope (band, register span, anchor pool), anti-repeat (never the same target twice running), seeded like everything else.
- **F4 engraving grids** (the sanctioned distractor exception): the correct engraving plus candidates drawn from other inversions of the same chord, neighbor qualities, and accidental traps.
- **Benchmark excerpts (07):** the same passage pipeline in performance mode; excerpts are generated fresh per benchmark and **logged permanently** — the accumulating corpus doubles as 05 §5's calibration set. The **Keys & Chords gauntlet** draws its ~12 prompts by the same seeded target sampling — over gate-held F4 atoms across the scoped qualities and key regions, at gate windows, **biased staleness-first** (the least-recently-verified gates sample first, and a missed prompt doesn't verify — so release streaks accumulate at an honest pace instead of a months-long drip). The benchmark's topography stream draws the same way over F9's gate-held atoms.

## 6. Emphasis biasing (09 → 06)

`emphasisTags` reweight sampling *within* the requested vector — `rhythm:dotted` multiplies dotted-cell probability, `key-region:flats` confines the key draw — but can never push content above rank. Prescriptions bias; only stretch reads (05 §3) exceed.

## 7. Scan questions & the cadence vocabulary

- **Scan question** (F10's preview ritual, one per read): generated from the *finished* score — key (from the signature), meter, or largest leap (from the census) — so the question is always answerable and machine-checkable.
- **Cadence vocabulary:** one shared data module of cadential shapes (V–I, IV–V–I, half-cadence hand shapes and endings), consumed three ways — F8's `cadence` pattern family, F10's passage endings, F11's eyes-ahead material. One vocabulary, three surfaces, zero drift.

## 8. Expression content — reading material, not graded material

Dynamics, articulation, pedal marks, and grace notes appear in the ladder's rows but belong to no difficulty axis and no grading axis (03 §8). The v1 position: they are **reading content** — engraved so the eye learns to see them — gated by the **minimum rank across the five axes** (conservative: expression appears only once the whole profile has reached its row), **invisible to the referee**, and ungraded. Grace notes emit as **optional-match** events: credit if played, no penalty if omitted. When 03 §8's later grading axes arrive (velocity, pedal), this section gains a difficulty story; not before.

## 9. Module boundary & tests

`Generator` (10 owns signatures): `generate(request, seed) → Score` (pure) · `validate(score) → Violation[]` · conformance via 05's `difficulty(score)`. Test strategy: a **golden-seed corpus** (fixed seeds, snapshot scores — regressions are diffs); **property tests** over a request grid × many seeds (every accepted score passes validators; `difficulty(score)` sits within bands of the request; determinism holds); the corpus feeds the sim spike's synthetic reader.

## Open questions

None standing.
