# 12 — Roadmap

The attack order — written last, exactly as ground rule 3 demanded, so sequencing follows the design instead of driving it. Every phase below carves the adjudicated suite (00–11, 13); nothing here reshapes a spec. Phases are **scope-bounded, never date-bounded**: the ChessGrimoire schedule taught conservative estimates, and the honest form of conservative is exit criteria without calendar promises. Sizes are relative (S/M/L/XL) and mean effort, not weeks.

## 1. Principles

1. **Playable early, playable always.** The personal tool starts earning practice minutes at the piano as soon as physically possible, and every phase ends with the app *more used*, not merely more built — the motivation flywheel applies to the project itself.
2. **Vertical slices, never layers.** Each phase is a thin end-to-end loop — serve → play → grade → schedule → see — widened family by family. No phase is "build all of X."
3. **Spikes gate constants, not work.** The two measurement spikes run first and close the suite's parked values; nothing unrelated waits on them.
4. **The harness grows with the code** (13 §6's process law): every phase ships its personas, and the sim battery is green before a phase closes. Docs-before-code continues *inside* phases — a deviation discovered while coding goes through the decision log before the code goes anywhere.
5. **Open-source hygiene from commit one** (00 posture): public-grade repo, MIT, secrets discipline, workers.dev behind per-Worker Access.

## 2. The attack order — closing the question log #8 deferred

**Drills → staff → reading → scoreboard.** v0.1's "MVP = drills without notation" was a shipping-speed bet made before the design existed; remade now with the whole suite on paper, it survives — but as a **phasing choice for infrastructure-cost reasons, not a design principle**:

- Engine C is the largest dependency stack in the suite — generator + validators + referee + staircase + StaffView + U3. Leading with it means months of nothing playable, inverting principle 1.
- The name-cue drill loop needs no staff renderer at all (F1's engraved signatures are Bravura-text glyphs, not scores) yet exercises the deepest invariants — capture, grading, FSRS, steps, derived reviews, gate streaks, sync — on the shortest path to daily value: **the starter template minus its reading block**.
- Staff cues are equal atoms (log #8's real point) and arrive one phase later as pure content on the same loop, once StaffView exists to draw them.

The alternative — notation-first for the thesis's sake — was weighed and declined: the thesis is *measured* by reading, but the flywheel is *powered* by daily practice, and the full reading stack lands two phases in regardless.

## 3. Phases

| # | Phase | Size | Builds | Personas shipped | Exit criterion |
|---|---|---|---|---|---|
| **0** | **Instruments & rails** | S–M | Repo (`prima-volta`, MIT) · deployed skeleton (workers.dev + per-Worker Access) · CI rails (typecheck, units, seeder budget, license assert) · seeder → `catalog.json` exact counts · **FP-30X spike** (03's parked constants, device-profile values, persona parameters) · **sim harness, spike life** (05 §5's constants, the step-size probe) | — (the harness itself) | Parked 03/05 constants ratified into the docs; a synthetic year runs deterministically; the skeleton serves |
| **1** | **The drill loop** — engine A, name-cue | L | MidiService (capture, profiles, calibration, clock correlation) · Grader (association-first matcher; discrete + pulsed-run maps) · Scheduler (ts-fsrs, steps, hands-only derived reviews, gate streaks) · replica + batched sync (raw streams durable from rep one) · minimal U2 (reconciliation, Teach) + U1 (rows, drill-down lite) + U7 devices · **F1 · F4 name-cue + knowledge · F5 · F6** | worker · overreacher (drill-grade) · device-biased | Jordan practices the starter template (minus reading) daily on the FP-30X; every rep writes a real review; sim battery green |
| **2** | **The staff** — notation + engine B flash | L | StaffView over VexFlow (Score JSON, bboxes) · staff-cue atoms (**F2** both variants · **F3** · F4 staff→midi + engraving grids · F5 keysig) · **F8** (class scheduling, N-instance aggregation, timer ladder) · **F9** · knowledge-only complete (device-less bouts, `"unavailable"`) · scope chip grids (U7) · Library (U5) | knowledge-only commuter · flat-key-blind (evidence half) | The full default-scope map (~6,100 atoms) live and drillable; knowledge-only works on a phone with no cable |
| **3** | **Reading** — engine C | XL | Generator + validators + Referee (cadence vocabulary) · the staircase (tag-filtered entries, bands, cooldown, collapse, stretch, **readiness gate**) · **F10** (preview ritual, post-read, error map, drill-this) · **F7** (tap grading, register-split two-voice) → rhythm axis · U3 · weekly calibration job | flapper (must be impossible) · crawler · rusher | Daily adaptive reads; axes move on evidence only; golden trajectories established for the roster so far |
| **4** | **The scoreboard & the coach** | L | Ratings (formulas, leagues, U4 radar + history + attribution) · placement + the five-segment monthly benchmark · **F11** · prescriptions layer 1 (16 rules, shelf, outcomes, coach note; U6) · bout summaries · daily outcome job | lapsed chordist (#67's release path) · returner · ideal student | The thesis is measurable — ratings move, the prescription loop closes, the benchmark re-anchors. **The v1 feature set** |
| **5** | **Polish & posture** — closing v1 | M | PWA install + offline hardening (persist-check fallback) · export/backup + the System row · the deferred UI-fidelity pass (preview minis, intersections) · performance · public-repo README/docs pass | — (full roster, nightly) | **v1 tagged.** The LLC question — license once-over, domain + real auth (#63), trademark clearance — becomes *askable*: a posture decision, not a phase |

## 4. Tabled beyond v1 — each with its re-entry condition

**Layer 2, the Claude composer** (09 §4) — un-tables only when the engine is **lived-in**, deliberately unquantified: weeks of real daily practice on the phase 3–4 feature set, the bug reports and tweaks that practice surfaces worked through, and the owner's own judgment that the engine feels settled — then layer-2 scoping begins, not before and not on a metric · the **audio/listening expansion** (hub pin — arrives with the audio cue modality and ear-training unification) · **F12+ pinned families** (Modes · Dynamics · Figures · Chord progressions — each appends, nothing renumbers) · **8va/8vb, compound intervals, contrary-motion/formula patterns** (parked in place with their homes) · **dedicated domain + better-auth** (a pair, #63) · **Stripe / multi-user** (LLC path only) · **Verovio** (never — unchosen on technical fit, #10).

## Open questions

None standing. *(The attack order is ratified — §2 closes log #8's deferred question — and layer 2's gate is the lived-in test in §4, deliberately unquantified.)*
