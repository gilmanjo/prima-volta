# 04 — Scheduling

**The seam with 08: 04 computes, 08 chooses.** This doc owns per-card state math — how FSRS is configured and adapted, what a graded rep does to memory state, how derived reviews are written, and the pure functions (serving priority, interleaving constraints) that 08's block-filler consumes. Everything about *what gets served while the user practices* is 08's; everything about *what a rep does to state* is here.

## 1. FSRS configuration

- **ts-fsrs (FSRS-6)** behind the `Scheduler` interface (10) — swappable for a weakness-weighted round-robin if class-level scheduling (engine B) underperforms. Review logs decide, not dogma.
- **Desired retention 0.85**, per-user tunable (0.75–0.95). Drill-app convention; fluency decays on a different curve than recall, and transfer effects (F10 reading quietly maintains F4 chords) make long stability numbers partly fiction — 0.85 keeps upkeep honest without over-serving. This is the retention *scheduling* knob and is deliberately unrelated to 05 §3's execution bands (the three-error-rates distinction lives there).
- **Maximum interval ~120 days**, spot-checked by monthly benchmarks (07): when benchmark performance contradicts high modeled stability in an area, the calibration note flags it — measurement first, never automatic punishment.
- **Rating ladder:** Again / Hard / Good per 03 §6's map; **Easy unused** (runaway-interval guard).
- Default parameters until the optimizer runs (§7). Per-card state = atom + FSRS state + `tier` (02 §1).

## 2. Practice-local steps — same-day repeats live outside FSRS

FSRS models day-scale memory; same-day repetition is practice mechanics (ChessGrimoire's learning-steps lesson, adopted wholesale):

- **Engine A, new card:** teach state (ungraded) → first graded rep. Good → one **confirm step** later in the bout (≥10 minutes or ≥20 served items later, whichever comes first) → graduates to FSRS under the **1-day graduating-interval cap**. Again/Hard → an **again-now step** (a few items later), then the confirm step.
- **Lapse** (Again on a graduated card): one again-now relearn step, then FSRS reschedules from its lapse state.
- **Engine B, class:** a single confirm step at introduction; thereafter one rep per serving, instances fresh every time (§5).
- **Steps are practice work, not clock work:** a due step is servable whenever its area is next practiced and its delay has elapsed — never a notification, never debt. Stopping before steps drain is normal; unconfirmed steps simply stay weak and count among the area's weak pool on the map (08).
- **Un-elapsed steps never block practice.** The filler bypasses them (08 §4) and serves the weak pool, the frontier, or upkeep instead — and because delays are **item-denominated with a clock fallback** (≥20 items *or* ≥10 minutes), hitting an area hard ripens its steps sooner, not later. Steps can be momentarily unavailable; the area never is.

## 3. What a rep writes

Every genuine graded rep writes exactly one review row, wherever it happened — template block, free drill, thirty seconds of noodling. Teach states and previews write nothing (no recall occurred). `review_logs` is append-only: rating, latency, `errorSummary`, `instanceSeed` (engine B), the card's `tier` at grading time, and `derived` + parent attempt id where applicable. Raw MIDI persists separately (03 §1.6), so history is forever re-gradeable.

## 4. Derived-review mechanics (applying 02 §3)

On grading a rep of atom A:

1. Look up A's subsumption edges (seed data; hands-only in v0).
2. For each subsumed atom B, grade the embedded sub-performance from the captured MIDI *as if B were drilled directly* — including B's current tier window.
3. **Clean-in-window → write a derived Good** carrying the achieved tempo/latency; it counts toward B's gate advancement (3 consecutive in-window, 02 §1). Anything less → write nothing. Improvement-only, always.
4. Derived rows update scheduling state like any review; the optimizer never fits on them (§7).

## 5. Engine-B reps: instances and aggregation

A class rep serves **N fresh instances** (N=3; N=5 at gate tiers), generated seed-deterministically (02 §1). Each instance is rated by 03 §6's map; aggregation to the class rep's one rating: **all instances Good → Good · exactly one below Good → Hard · more than one → Again.** The rep seed is logged (each instance's seed derives from it, so one seed re-renders all N); `errorSummary` carries per-instance detail for the prescriber.

## 6. Serving math — exported to 08

Pure functions; the policy that calls them lives in 08.

- **`servingPriority(card, ctx)`** = `max(0, Rtarget − R)`, shaped by stakes: a **prescription boost** (+0.5 while an active prescription targets the atom, 09) and a **gate-pending boost** (+0.2 when the card is one rep from advancing its gate). **Lineage collapsing:** a subsuming lineage exposes only its frontier card (02 §3); atoms beneath it carry priority 0 unless the whole lineage decays — then the *lowest* weak atom surfaces as the cheapest repair. Steps outrank everything (§2 drains first).
- **Interleaving constraints** (a checker, not a policy): **never the same item twice in a row**; never three consecutive items sharing a root; never three sharing a quality; random root order by default; in multi-family areas no family takes more than ~two-thirds of any rolling ten serves. **A user-scoped tiny area is exempt** (08 §4's sovereignty rule): when the block's pool cannot satisfy a constraint, the constraint yields — the user asked for exactly this. The same-item rule is why a struggling relearn step can never boomerang back-to-back while anything else is servable — its "a few items later" (§2) means *other* items.
- **Interference guard:** two **confusable atoms** never admit in the same wave while either has stability under ~7 days, and are kept ≥3 items apart in serving at low stability. The confusable set starts narrow (seed data): same root, quality neighbors (m7 vs dom7, maj7 vs m7); the F♯/G♭ enharmonic pair (F1). It widens only from observed confusion tags, never speculation. The admission half of this rule is a live-stability check, so it is exported (`admissionOk`, §9) and consulted by 08 §4's frontier step — the static seed ladder alone can't enforce it.

## 7. Parameter optimization

When enough direct reviews exist (~1,000+ per group), fit FSRS parameters per-user. Derived rows are **masked from the fitting objective, never dropped from the replayed history**: the optimizer replays each card's full review sequence — derived rows included, as the state updates they genuinely were — but only direct rows contribute outcome samples to the loss. (Dropping them entirely would misattribute post-derived retention to unaided memory: a derived Good on day 20 between direct reviews on days 1 and 21 is state the fit must see, even though it may never be a fitting sample.) If the fitting library can't separate replay from loss, sequences containing derived rows between direct reviews are excluded instead. Engine-A atoms and engine-B classes are logged as **separate parameter groups from day one** and split at optimization time; they share defaults until then. A refit never rewrites history — only future scheduling.

## 8. Long absences

Nothing special happens, by construction: retrievability decays, the map dims, and weakest-first ranking is *relative* — a mostly-dim map serves exactly like a mostly-bright one, bottom-up in whatever area is chosen. There is no backlog to clear because there is no backlog (00: due = dimming, never debt). After a fixed 30 days away, the app *invites* a benchmark re-anchor (07) — invited, never due. The sim spike (05 §5) includes a return-after-absence scenario verifying that steps (item-paced, with their clock fallback) and the frontier (pull-only) behave.

## 9. Module boundary

`Scheduler` (10 owns signatures): `applyRep(attempt) → stateChange + derivedWrites` · `servingPriority(card, ctx)` · `interleaveOk(history, candidate)` · `admissionOk(candidates)` (the §6 interference guard) · `dueSteps(area)` · `optimize(logs)`. DOM-free, deterministic, smoke-testable.

## Open questions

None standing.
