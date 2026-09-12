# Prima Volta — GPT document-audit feedback

Prepared September 11, 2026, from the earlier read-only audit; relevant source passages rechecked on that date.

This is a handoff for Claude to assess and address before implementation. It preserves the nine main findings and four smaller specification gaps from the document audit. HTML, screenshot, styling, and visual-layout feedback is excluded. The project documents themselves have not been changed by this audit.

The findings concern places where the written contracts cannot yet produce the intended behavior consistently. Suggested resolutions are proposals, not additional user decisions. Resolve each issue in its owning document, then align dependent interfaces, schemas, catalog specs, and examples. If an existing rule already resolves a finding, cite that rule rather than adding another mechanism. Ask Jordan about consequential unresolved product choices instead of silently deciding them.

## Requirements Jordan clarified during the audit

1. **Timing must matter for scales and arpeggios.** Asked about correct notes with a hesitation in a rehearsal scale/arpeggio, Jordan answered:

   > Hard to say exactly. Is tempo part of the atom? I think tempo should be a part of it, in which case, Again for timing errors. Otherwise how can one progress on scales if it is always passable with very slow, clunky note playing?

   The intended outcome is that required-tempo execution errors cannot pass as fluent playing. The current model already tightens tempo through gates on the same atom. Whether tempo should instead enter atom identity was raised tentatively, not settled; do not silently turn this answer into a requirement for a separate card at every BPM. Specify the grading behavior and the representation explicitly.

2. **Benchmarks can lower every domain rating.** Jordan's answer was: “Yes, benchmarks can lower every domain.” This includes Keys & Chords and Topography, not only ratings with a demotable reading-axis contribution. This does not, by itself, authorize erasing historical achievements or demoting earned gates.

3. **Ordinary passages must await demonstrated readiness.** Asked whether merely making feeder drills available was enough to permit their content in passages, Jordan answered: “No—passages must wait for demonstrated readiness.” Admission alone does not satisfy this requirement. The precise evidence threshold, and whether successful placement can supply that evidence, remain unspecified.

## Main findings

### 1. Passage admission does not enforce demonstrated readiness

**Sources:** [05 §2 — admission](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/05-DIFFICULTY.md:34>), [06 §2 — generation request](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/06-GENERATION.md:22>), [08 §4 — engine-C serving](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/08-SESSIONS.md:37>).

Entering a reading-axis rank admits the next rank's feeder vocabulary. The text concludes that passages therefore never demand cold content. However, making a drill available does not require the user to practice it or demonstrate the corresponding skill. A rhythm promotion can introduce 6/8 into passages even if the admitted 6/8 drills have never been attempted.

The generation request contains axis positions, bars, tempo, hands, practice mode, and emphasis tags. It carries no readiness constraint. The generator is also deliberately forbidden from reading user state directly.

**Resolution needed:** Define the evidence that establishes readiness for each relevant content class. Have the serving layer supply the resulting allowed content to the pure generator, or specify an equivalent explicit enforcement boundary. Define what happens when the requested difficulty has insufficient ready content. Separately specify diagnostic placement/benchmark behavior, which deliberately seeks a ceiling; do not accidentally make those tests unable to probe unfamiliar material. Do not equate placement-based admission with readiness without a ruling.

**Acceptance example:** Admitted-but-unpracticed 6/8 content cannot enter an ordinary passage solely because the rhythm axis advanced. The documented readiness rule must explain what evidence would permit it.

### 2. Pitch matching, timing errors, and rehearsal SRS grading conflict

**Sources:** [03 §1 — hesitation principle](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/03-GRADING.md:9>), [03 §2 — rehearsal](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/03-GRADING.md:29>), [03 §4 — matcher](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/03-GRADING.md:59>), [03 §6 — rating map](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/03-GRADING.md:92>), [02 §1 — gates](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/02-ITEM-MODEL.md:16>).

Two related seams need resolution:

- **Alignment uses the grading window as an association limit.** A correct pitch played 200 ms late with a 120 ms window is unmatched under the stated algorithm. The unmatched rules then produce an insertion/deletion pair, so a timing failure becomes a pitch failure as well. The claimed separation of pitch and timing scores is lost. The specification does not explain how an out-of-window correct note becomes a matched `late` event.
- **Diagnostic events and penalizing events are conflated.** Rehearsal includes all engine-A/B drills and says stopping/slowing is unpenalized. Yet every hesitation is logged as an error event, §6 says any error event produces Again, and run material requires every onset inside a beat-grid window. Those rules yield different grades for the same run.

**Resolution needed:** Separate note association from the timing verdict, including a deterministic rule for repeated pitches, missing notes, and genuinely extra notes. Specify which events affect pitch, timing, continuity, and the SRS grade for each material type. Preserve Jordan's requirement that required-tempo scale/arpeggio errors produce Again; explicitly distinguish those runs from self-paced passage rehearsal and genuinely clean-but-slow discrete answers eligible for Hard. Specify how rehearsal timing requirements select a matcher rather than relying on the mode label alone.

**Acceptance examples:** A correctly ordered but late note can lower timing without being invented as a pitch error; a timing failure in a tempo-required scale cannot earn Good or advance its gate; a diagnostic hesitation in an explicitly self-paced task follows its own stated penalty rule.

### 3. Rating and benchmark formulas lack several promised evidence paths

**Sources:** [07 §§1–4 — rating principles, formulas, benchmark](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/07-RATINGS.md:5>), [05 §3 — axis evidence](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/05-DIFFICULTY.md:44>), [05 §6 — continuity example](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/05-DIFFICULTY.md:74>), [10 — Ratings interface](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:99>).

Three gaps occur between the stated behavior and the available inputs:

- **Downward benchmark corrections:** Keys & Chords derives from introduced/graduated/gate attainment; Topography derives from tier/latency attainment. Gates are expressly monotone. The benchmark's documented re-anchor changes reading-axis positions and calibration, but no operation translates a poor Keys & Chords or Topography result into a lower rating. Jordan explicitly confirmed that every domain can fall after a benchmark.
- **Reading-span re-anchoring:** The monthly benchmark promises to re-anchor all five reading axes. Its four listed segments contain no F8 flash or F11 span probe. The span rules explicitly exclude ordinary performance reads as span evidence. Placement includes two flash probes, but the monthly blueprint does not specify an equivalent measurement.
- **Continuity in ordinary ratings:** 05 says continuity feeds ratings, not the staircase, and its worked example sends a rehearsal continuity score to Reading. The Reading formula is 80% axis positions plus 20% F2/F8 attainment; neither it nor `Ratings.compute(profile, attainment)` accepts continuity evidence. Continuity's presence in the benchmark composite does not implement the promised ordinary-practice path.

**Resolution needed:** Define the measured state and update formulas through which benchmark evidence can lower each domain. Distinguish current demonstrated fluency from historical gate achievement if both must coexist. Supply valid span evidence in the monthly benchmark or explicitly narrow its re-anchor promise. Add the intended continuity-to-rating path, or obtain a ruling to remove that promise and update its consumers.

**Acceptance examples:** A poor Topography benchmark lowers Topography through a reproducible calculation while elapsed time alone does not; every re-anchored axis has a valid measurement source; the worked continuity example produces the documented rating effect.

### 4. Two-voice rhythm has no observable mapping from taps to hands

**Sources:** [F7 — mechanics](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/catalog/F7-rhythm.md:27>), [03 §7 — hand attribution](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/03-GRADING.md:107>), [06 §1 — score representation](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/06-GENERATION.md:12>).

F7 permits any key for each rhythm line and describes voice 2 as any key played by the other hand. MIDI identifies pitches and timestamps, not the player's physical hand. Marking the expected lines RH/LH does not identify which hand generated an arbitrary incoming tap. The ordinary pitch-range attribution rule does not supply a concrete input split for these percussion-style lines.

**Resolution needed:** Choose an observable assignment: for example, two designated keys, disjoint keyboard regions, or a brief per-hand target assignment. Specify how the prompt communicates it and how the grader handles simultaneous taps. This can remain pitch-independent as a learning exercise while still using pitch as an input-channel identifier. MIDI cannot verify that the assigned key was physically played with the prescribed hand; do not promise that it can.

**Acceptance example:** Given only the stored request and MIDI stream, both rhythm lines can be graded deterministically without guessing the player's hands.

### 5. The grading and raw-attempt contracts do not represent choice answers

**Sources:** [10 — Grader interface](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:64>), [10 §4 — attempts and errors](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:149>), [03 §7 — spelling knowledge](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/03-GRADING.md:109>), [F4 — choice variants](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/catalog/F4-chords.md:24>).

The catalog includes key/signature selections, note/interval selectors, chord root-quality-inversion answers, spelling answers, and engraving choices. The public grader accepts only `RawMidiEvent[]`; attempts persist only `rawMidi` as the raw response, and error rows expose only expected/played MIDI values. MIDI cannot express all these answer types or preserve enharmonic spelling where spelling is the tested skill.

The derived `gradeJson` is not a substitute for the original answer. Without a stored choice response and its timing/context, the promise that every graded attempt can be re-graded is false for knowledge-only practice.

**Resolution needed:** Give the grader and attempt log an explicit modality-aware raw-response contract. Preserve submitted answers, relevant correction/commit events and timestamps, and enough prompt/candidate identity to reconstruct what was answered. Extend error payloads where MIDI-valued errors are insufficient. Keep the resulting grade usable by the same scheduler.

**Acceptance example:** A wrong chord-quality selection followed by a correction can be re-graded from stored raw inputs, including the initial error and completion latency, without synthesizing meaningless MIDI notes.

### 6. Dropping derived reviews from optimizer input loses intervening practice

**Sources:** [02 §3 — derived evidence](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/02-ITEM-MODEL.md:100>), [04 §4 — scheduling updates](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/04-SCHEDULING.md:33>), [04 §7 — optimizer](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/04-SCHEDULING.md:48>), [10 — optimizer signature](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:77>).

Excluding positive-only derived outcomes from fitting is reasonable. But the current `optimize(directRows)` contract appears to remove those rows from the history entirely even though they update scheduling state.

Example: direct single-hand review on day 1; hands-together practice gives that single-hand atom a derived Good on day 20; another direct single-hand review occurs on day 21. A naive direct-only replay sees a 20-day interval without the day-20 state update. It can attribute the day-21 result to unaided retention across that interval, skewing the fitted model.

**Resolution needed:** Distinguish the history needed to reconstruct practice/state from the outcome samples allowed to contribute to the fitting objective. Verify what the chosen optimizer supports. Options include retaining intervening state updates while masking derived outcomes, or excluding affected fitting sequences if that separation is unsupported. Merely deleting rows is not enough to justify the claim that derived credit cannot skew fitting.

**Acceptance example:** The day-1/day-20/day-21 history cannot be fitted as if the day-20 practice never occurred.

### 7. Rating-event writes are not defined as idempotent across refolds and replicas

**Sources:** [10 §3 — rating-event writer](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:58>), [10 §4 — ULIDs and rating_events](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:145>), [10 §5 — sync and repair](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:208>).

The client fold writes a `rating_events` row whenever a projection move changes a rating. Every replica folds logs, new devices rebuild history, and repair explicitly refolds. Fresh client-generated ULIDs make repeated transmission of one row idempotent, but do not deduplicate independently generated rows for the same historical rating change.

Without a replay rule, pulling an event on another device or rebuilding a projection can append the same attribution again. Offline histories merged later also require a rule for attribution deltas computed under a different preceding history.

**Resolution needed:** Specify which event creation occurs only at original practice time and which occurs during replay. Give attribution events a deterministic causal identity and appropriate uniqueness/reconciliation semantics, or make the attribution feed a rebuildable projection. “One writer” must identify the actual ownership/replay policy, not just the module name.

**Acceptance example:** Record practice on one device, sync to a second, rebuild both, and merge offline logs: each causal rating change appears once, with a delta consistent with the documented fold order.

### 8. The minor-content policy has no complete config-to-generation path

**Sources:** [02 §5 — scope](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/02-ITEM-MODEL.md:135>), [05 §1 — minor scope](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/05-DIFFICULTY.md:27>), [06 §1–2 — score and request](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/06-GENERATION.md:12>), [F10 — practice mode](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/catalog/F10-passages.md:7>).

The minor wave across F5/F8/F10 is described as a scope-default flip. F5 has explicit scale-type toggles, but F8's scope contains only pattern, clef, and signature context; there is no corresponding F10 scope field in the config. The passage request has no explicit permitted tonal-mode content. Its existing `mode` means rehearsal/performance.

Separately, `Score.meta.key: Sig` records a signature, which cannot distinguish relative major/minor tonalities such as C major and A minor. That distinction matters to generation, scan questions, diagnosis, and deterministic re-grading.

**Resolution needed:** Define whether minor enablement is shared or per family, and how it reaches F8/F10 generation without reading ambient user state. Represent tonic/tonal mode separately from signature and practice mode where required. Update the config, request, stored score, and relevant consumers together; do not introduce a toggle with no downstream enforcement.

**Acceptance example:** Two otherwise identical users with minor content off versus on get the documented difference in eligible flash/passage material. A stored A-minor score is distinguishable from C major without guessing from its notes.

### 9. Knowledge-only practice and empty blocks lack a complete lifecycle

**Sources:** [08 §4–7 — filler, templates, bouts, knowledge-only](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/08-SESSIONS.md:26>), [U8 — disconnect behavior](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/ux/U8-onboarding-edges.md:19>), [10 §4 — bout schema](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:177>).

Three related cases are not fully specified:

- Bouts open on MIDI device detection, but knowledge-only practice can happen without any device. There is no documented opening trigger for that case, despite attempts, learning steps, and summaries requiring a bout. The device profile/clock-correlation fields also need explicit semantics when MIDI is absent.
- 08 says disconnect closes the bout; U8 says the bout stays open until the idle timeout. These are different rules for summaries, reconnects, and switching to knowledge-only work.
- The starter template includes scales, arpeggios, and reading. In knowledge-only mode those blocks have no eligible content. The filler falls back to upkeep when nothing is weak, but upkeep cannot select a bright atom from an empty pool. A user-facing skip control does not define what `next()` returns for an unavailable block.

**Resolution needed:** Define bout start/end independently of mandatory MIDI presence, reconcile disconnect semantics, and define the no-eligible-content result for templates and directly scoped blocks. Specify whether unavailable blocks are skipped, paused with a choice, or handled another way; distinguish an empty area from a fully practiced one.

**Acceptance examples:** A no-device launch can produce a graded choice attempt with a valid bout and summary. Disconnect/reconnect follows one rule. Running the starter template without MIDI never requests a nonexistent scale item or labels an empty pool “polishing.”

## Smaller specification gaps

### 10. Flash exposure and response timeout share the wrong setting reference

**Sources:** [U3 — memory flash](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/ux/U3-reading-player.md:25>), [F8 — timeout](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/catalog/F8-staff-flash.md:31>), [F11 — display duration](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/catalog/F11-eyes-ahead.md:9>), [02 — practice settings](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/02-ITEM-MODEL.md:157>).

U3 takes memory-flash timing from `practice.flashTimeoutS`. That setting is the default eight-second answer timeout, while F8/F11 use `displayMs` for how long notation remains visible. These control different phases. Name and route them separately so increasing the response deadline cannot accidentally extend the exposure that defines the exercise's difficulty.

### 11. The canonical tag registry is incomplete for its declared consumers

**Sources:** [03 §5 — registry](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/03-GRADING.md:85>), [05 §3 — texture routing](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/05-DIFFICULTY.md:44>), [00 decision 32 — handoff tag](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/00-OVERVIEW.md:118>).

The registry says every producer and consumer uses its exact vocabulary. It omits the adopted F6 `handoff` tag and gives no concrete spellings for the multi-voice/hand-attribution tags that route texture errors. Define those entries and their emission predicates, or explicitly supersede the references with existing fields/tags. Do not leave each consumer to invent its own vocabulary.

### 12. An append-only calibration table has a one-row-per-knob primary key

**Sources:** [10 §4 — job-authored row policy](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:169>), [10 §4 — knob_calibration](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:187>).

Job-authored `knob_calibration` rows are declared append-only, but `knob` alone is the primary key. The second weekly fit for the same knob must either fail insertion or overwrite history. Choose versioned fit rows with a suitable identity and a current-value selection rule, or explicitly make this an updated configuration table and document the consequences for historical replay.

### 13. Persistent browser storage is requested, not guaranteed by installation

**Source:** [10 §5 — replica persistence](<C:/Users/repti/Documents/Claude/Projects/prima-volta/docs/10-ARCHITECTURE.md:210>).

The text assumes requesting `navigator.storage.persist()` at PWA installation guarantees the replica cannot be evicted under storage pressure. The API resolves to a boolean and the browser may decline the request; see [MDN's StorageManager.persist() contract](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

Check the actual result, distinguish granted persistence from best-effort storage, and qualify the offline-durability claim accordingly. Recovery must account for unsynced local practice if persistence was not granted. This does not require replacing the local-first architecture.

## Closure criteria

For each finding, record the resolution and the owning passages changed, or cite the existing rule that disproves it. Keep unresolved product decisions visible. The acceptance examples above describe behavior the eventual implementation must support; they are not a request to start implementation or add a test scaffold during this documentation pass.

---

## Closure record (2026-09-11, adjudicated by Jordan — decision log #68)

**Clarified requirements:** #1 is honored by finding 2's resolution (the per-material rating map). #2 was independently mechanized by Jordan's symmetric-streak ruling (log #67) — note that ruling *does* demote earned gates (3 consecutive out-of-window reps release a gate to graduated), superseding this audit's no-demotion caveat. #3 is honored by finding 1's resolution.

| # | Verdict | Resolution (owning passages) |
|---|---|---|
| 1 | Valid | **Readiness gate at the staircase** (05 §3): rank promotions (never subrank) wait until the entering rank's feeder content is graduated or was read cleanly in placement/benchmark excerpts; earned-but-held promotions surface via 09 rule 15; the generator stays pure (05 §2, §6; 07 §5; 09 §2 r15) |
| 2 | Valid | **Association precedes verdict** (03 §4: ±half-beat association window; matched-but-late = `early`/`late`, never a fabricated insertion+deletion) + **per-material rating map** (03 §6: discrete / pulsed-run / self-paced; pulsed runs mirror engine-B aggregation — >1 out-of-window onset → Again; 03 §1.3 amended) |
| 3 | Valid | Downward path = log #67's gate-release streaks (07 §4 notes benchmark prompts are ordinary reps); **span probes added** as a fifth ~1-minute benchmark segment (07 §4, U3); **continuity-to-ordinary-rating promise retired** (05 §3, 05 §6 — continuity lives in the per-read display and the benchmark composite only) |
| 4 | Valid | Two-voice lines take **disjoint register regions at a shown split point**; taps assign by region; physical hands are honor-system as F9 (F7 §Mechanics; mockup caption) |
| 5 | Valid | Modality-aware raw contract: `attempts.rawMidi? \| rawChoiceJson?` (widget event stream — selections, corrections, commit, timestamps, candidate set), `Grader.grade` accepts either, `error_events` gains `expectedSym`/`playedSym` (10 §3–§4; 03 §3) |
| 6 | Valid | Derived rows are **masked from the fitting loss, never dropped from the replayed history**; library-unsupported → affected sequences excluded (04 §7; 02 §3; 10 `optimize(history)`) |
| 7 | Valid | `rating_events` reclassified as a **rebuildable projection** keyed by cause (refId × domain) — derived wherever needed, never synced, structurally dedup'd (10 §3, §4) |
| 8 | Valid | `scope.minorContent` added (02 §5) → request `tonalities` pool (06 §2, F10 §Params); `Score.meta` gains `tonic + tonalMode` (06 §1) |
| 9 | Valid | Bouts open on device detect **or first graded attempt** (`profileId`/`clockCorrJson` nullable); **disconnect never closes a bout** — the idle timeout does (08 §6 now matches U8); `BlockFiller.next` gains `"unavailable"`, distinct from "polishing" (08 §4/§7/§9; 10 §3–§4) |
| 10 | Valid | `practice.flashAnswerTimeoutS` (answer wait) split from per-class `displayMs` (exposure/difficulty) — 02 §5, F8 §Grading, U3, U7 |
| 11 | Valid | Registry gains `handoff` and `texture:multi-voice` (+ emission predicate); hand attribution declared as the event's `hand` field (03 §5; 05 §3) |
| 12 | Valid | `knob_calibration` versioned: `id` PK, current = latest `fittedAt` per knob (10 §4) |
| 13 | Valid | `persist()` result checked; declined → "storage: best-effort" in the System row + more eager push until granted (10 §5) |
