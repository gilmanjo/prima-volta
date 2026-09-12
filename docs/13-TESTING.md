# 13 — Testing & simulation

How we know the machine does what the paper says — and keeps doing it. The suite's laws are spread across eleven docs; this doc makes them **executable**: a layered test strategy whose centerpiece is a **simulation harness** that drives the real engine stack with synthetic players over months of virtual practice, observing what actually emerges — ratings, vended atoms, staircase moves, prescriptions — so that future features and changes can never *inadvertently* transform long-term behavior. Drift becomes visible, reviewable, and deliberate, or it fails CI.

**The honesty line, up front: the sim proves the machine, not the pedagogy.** A synthetic player demonstrates that the system behaves as designed *given* a learner; whether real learners work this way is validated by live evidence — benchmarks, the calibration job (05 §5), and Jordan's own hands. The sim can never confirm the thesis; it can guarantee the thesis is being faithfully executed.

## 1. The pyramid (aggregating what the docs already named)

| Layer | What | Owned by | Runs |
|---|---|---|---|
| **L1 — Unit & property** | Module laws: grader matchers/tags/edge rulings, per-material rating map, steps/derived/priority math, band/cooldown/collapse/stretch arithmetic (05 §6's worked examples as fixtures), referee = rank semantics, seeder budget <20k, diagnosis rule fixtures, license assert | 02–09 (10 §9's table) | Every push |
| **L2 — Golden seeds** | `generate(request, seed)` snapshot corpus + property tests (validators pass, conformance within bands, determinism) | 06 §9 | Every push |
| **L3 — Sim invariants** | The constitution mechanized: always-true properties over any simulated trace (§5.1) | this doc | Every push (short battery) |
| **L4 — Trajectories & scenarios** | Golden long-horizon summaries per persona + named scenario acceptance criteria (§5.2–5.3) | this doc | Short battery per push; full roster nightly |
| **L5 — Live calibration** | Not tests: predicted-vs-observed knob fits, benchmark re-anchors, SASR cross-checks | 05 §5, 07 §4 | In production, forever |

Dormant until layer 2 un-tables: the composer's schema-contract and eval-fixture suites (09 §4).

## 2. The simulation harness

One loop, everything real except the human and the clock:

```
virtual clock ──▶ habit model (persona): opens a bout? runs which template/block?
                       │
                       ▼
              BlockFiller.next ──────────────▶ Generator ⇄ Referee   (engine-C requests)
                       │ item / teach / request        │ Score
                       ▼                               ▼
              player model PERFORMS: ground-truth skill state → onsets + latencies
              (or widget choice events) with persona-biased error injection
                       │
                       ▼
                 Grader ──▶ Scheduler · Staircase ──▶ logs (attempts · reviews · errors · entries)
                       │
              on their real cadences: Ratings folds · Diagnostics (weekly job) · outcomes (daily)
              benchmarks/placement when invited, per the persona's acceptance policy
```

- **Real code, virtual time.** The harness imports the same pure core the app ships (10 §1.2 is what makes this possible); only MidiService, audio, and the UI are absent, and every module takes `now` as an input — no wall clock anywhere in core, which this harness both requires and proves. One master seed derives every stream; a year of practice runs in seconds and is bit-for-bit reproducible.
- **The ground-truth learner is deliberately not FSRS.** Each persona carries an independent memory model — per-atom true strength with exponential decay, practice-dependent stabilization, per-family/axis learning rates, motor-speed curves — from which error probability and latency derive. Using FSRS as the ground truth would make the scheduler grade its own homework; using a different model means the sim can also *measure* how well FSRS tracks a learner it didn't define (a calibration probe, §5.4).
- **Choice answers are simulated too** (widget event streams with decision latencies and occasional mis-taps), so knowledge-only personas exercise the full G5 contract.
- **Prescriptions get a scripted acceptance policy** per persona (accept-all · decline-all · accept-when-it-names-my-weakness), so the 09 loop closes without a human.
- A **figures gallery** ([figures/](figures/figures.html)) storyboards this harness in miniature: concept diagrams plus seeded mini-sim trajectories of the documented constants — the band controller at work, three climbers, the oscillation sawtooth, rating ramps, the lapsed chordist's release path, a prescription closing its loop.

## 3. Personas — versioned seed data, not code

Each persona is a parameter file (learning rates, error biases by tag/family, latency curves, habit model, acceptance policy). The starting roster — the four ratified staircase scenarios plus the behaviors the suite's laws exist to handle:

| Persona | Exercises |
|---|---|
| **The worker** (~90% clean at frontier) | The working band as home: holds, improves, promotes on schedule — the baseline golden |
| **The overreacher** (~80%) | Demotion honesty: must step down promptly, never oscillate |
| **The flapper** | Anti-flapping invariant: adjacent-subrank gaps wider than the hold band must be impossible after calibration |
| **The crawler** | Slow-but-clean climbs stay legitimate; the tempo-floor lever's evidence |
| **The returner** | 90 days away: no backlog, invite-not-debt, steps and frontier behave (04 §8) |
| **The flat-key-blind** | The prescription loop end-to-end: accidental errors in flats → rule 1 fires → accepted → drilled → tag rate falls → retired with credit |
| **The rusher** | Tempo-drift diagnosis (rule 13); pulsed-run map severity |
| **The device-biased** (+35 ms uniform) | Rule 12: recalibration suggested, drills *not* prescribed — the machine blames the device, not the player |
| **The knowledge-only commuter** | No instrument ever: bouts open on first attempt, unavailable-vs-polishing, Reading moves through the 20% attainment share |
| **The lapsed chordist** | Stops drilling chords for six months: K&C holds on silence, then the benchmark gauntlet's misses release gates and the number honestly falls (#67) |
| **The weekender / the binger** | Step ripening, interleave and confusable guards under lumpy schedules |
| **The ideal student** | The ceiling sanity run: nothing pathological at the top; SSS+++ is reachable |

Parameters are pre-spike guesses; the device spike's measured error/latency distributions (FP-90X · USB load-bearing) retune them, and live logs retune them again. Personas version like constants — a retune regenerates goldens deliberately (§6).

## 4. Observables — the trace

A run emits one **trace**: per virtual day, the **serving tape** (every vended atom, teach state, and generation request, with outcomes), review rows, staircase entries and moves (readiness holds included), admissions (frontier pulls and pre-paving), gate advances *and releases*, per-domain ratings with their attribution causes, prescription lifecycles, coach-note contents, benchmark and placement results.

The trace is distilled into a **run summary** — the golden artifact: weekly ratings vector per domain, each axis's position path, admissions per family, prescriptions fired/accepted/retired/expired with outcomes, gate statistics, serving-mix distribution. Raw traces stay local (they're huge and churn-prone); summaries are small, stable, and live in the repo where a diff means something.

## 5. Assertions

### 5.1 Invariants — the constitution, mechanized (any persona, any seed)

Violations are bugs by definition; each cites its law:

- Nothing out-of-scope is ever served; unintroduced atoms are served only as teach states via admission (02 §5, 08 §4).
- Steps outrank the pool; un-elapsed steps never block an area (04 §2).
- Interleave constraints hold — except in user-scoped tiny areas, where sovereignty wins (04 §6).
- Frontier pulls respect the pool-thin threshold, appetite, seed order, and `admissionOk` (08 §4).
- No rank promotion without a ≥95 window mean **and** readiness; no move inside a cooldown; collapse fires only on 3-consecutive-<70 (05 §3).
- Stretch reads help, never hurt: below-threshold stretches touch no window (05 §3).
- Derived reviews are improvement-only, in-window-only, and never release a gate (02 §3, §1).
- Gate advances and releases each require their 3-streak; a single slow rep changes nothing (02 §1).
- Every vended read passes the referee at its request **and** contains no unready content (05 §4, §3).
- Ratings never move on a day with no evidence; every change has exactly one attribution cause, exactly once, across any refold (07 §1, §6; 10's projection rule).
- Prescriptions: ≤3 concurrent, declined stays gone 2 weeks, expiry/active windows compose (09).
- Swapping or correcting a device profile changes no review row, ever (03 §3).
- Replaying any logged attempt from its stored raw response reproduces its grade bit-for-bit (03 §1.6; graderVersion pinned).

### 5.2 Scenario acceptance — named behaviors with pass criteria

Each persona above carries explicit criteria (the overreacher steps down within N reads; the flat-key-blind's `accidental`+flats rate drops ≥X% within the outcome window and the prescription retires with credit; the lapsed chordist's K&C falls only *after* benchmark evidence, never on silence; the readiness gate holds a rhythm promotion until the 6/8 classes graduate — then releases it within a session). Criteria are qualitative bounds, robust across the seed ensemble.

### 5.3 Golden trajectories — the drift tripwire

The canonical seed's run summary per persona is committed **exactly**. Any change that shifts one — a constant, a serving tweak, a new feature — fails CI until the goldens are regenerated *in the same change*, making the diff the review surface: "the worker reaches rhythm C+ nine days earlier; K&C unchanged; two more prescriptions fire in month two." Nothing about long-term behavior can change silently; that is this doc's reason to exist. **Golden runs include the monthly benchmarks and day-one placement** — they are part of long-term behavior, and #67's gate-release path exercises only through them; dedicated scenarios still isolate them when a failure needs a narrower lens.

### 5.4 Calibration probes — the harness's spike life

The pre-code tuning runs 05 §5 already owns: band-edge sweeps, the step-size probe (the ~87–97 oscillation vs the 3–5-point step target), the crawler's tempo-floor check, FSRS-vs-ground-truth tracking error. Outputs are constants and knob weights, not pass/fail.

## 6. Drift discipline

- **Goldens regenerate only deliberately**, in the same change that moved them, with the summary diff visible in review. CI fails on unregenerated drift and on any invariant violation.
- **Process law: a feature that touches serving, grading, difficulty, ratings, or prescriptions ships with the persona (or criterion) that observes it** — the roster grows with the product, so new behavior is born watched.
- Seed ensemble: **one canonical seed** for exact goldens + **four robustness seeds** for §5.2's qualitative criteria (flaky-by-seed = a real sensitivity finding, not a retry).

## 7. CI tiers

| Tier | Battery | When |
|---|---|---|
| Push | L1 + L2 + invariants + 3 personas × 8 virtual weeks | Every push (~seconds to low minutes) |
| Nightly | Full roster × 12 virtual months × 5 seeds | Scheduled |
| Local | `sim --persona <name> --weeks N --trace` for interactive inspection | The dev tool for designing any feature — watch what it does to a year of practice *before* writing the docs' numbers into code |

## 8. Two lives, one harness (ground rule 2, reconciled)

**Spike-stage** (pre-code): the harness is a local-only measurement instrument tuning 05's constants — never deployed, never load-bearing, exactly as ground rule 2 demands. **Test-stage** (from first code onward): personas freeze, criteria pin, and the same harness graduates into `sim/` as a first-class dev-time test layer — imported by tests only, never by `src/`, never in the bundle. 10 §3's directory and §9's table defer to this doc for everything behavioral.

## 9. What this deliberately does not test

The pedagogy (L5 and real practice own truth); UI rendering beyond 10 §9's scripted-MIDI player smoke; VexFlow/tonal internals; real-device timing (the device spike owns reality); the Claude composer (tabled — its contract suite sleeps with it).

## Open questions

None standing.
