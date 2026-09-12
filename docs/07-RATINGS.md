# 07 — Ratings & benchmark

The Big Brain Academy-style scoring layer: a numeric rating per skill domain, one composite, and the monthly benchmark that keeps the numbers honest. A first-class feature — ratings exist to **measure the thesis** ("am I learning music faster?") and to make interleaving's feels-worse/works-better bargain visible: retention curves and rating trends over the feel of any single bout.

## 1. Principles

- **Never from FSRS internals.** Stability is a scheduling estimate, not an achievement measure — and partly fiction under transfer. Ratings are computed from *calibrated performance*: staircase positions, fluency-gate attainment, benchmark results.
- **Ratings move on evidence, never on silence.** No decay from mere time passing — the strength map's weak counts grow while you're away; the rating waits to be re-measured. The benchmark is what drags a number down if fluency actually rotted.
- **One number, one source.** Each domain's displayed rating is computed from practice attainment continuously; the benchmark never publishes a competing number — it *re-anchors the sources* (axis positions, calibration constants), and the rating moves through them.
- **Two instruments, two bars.** Practice holds you at near-perfect (05 §3's bands; errors are not rehearsed). The benchmark deliberately runs you *into* failure — it hunts your ceiling, in performance mode, clearly labeled. That is the one context where mistakes are the point, and it's why its staircase promotes at a test-style ≥80 while practice demands 95.

## 2. Domains & scale

Four domains (02 §6's map) plus a composite, all on one scale — **100–1900, SASR-parallel** (Reading matches SASR's range so occasional real-SASR runs cross-check it; the others are constructed identically so numbers feel comparable):

| Domain | Fed by | Continuous source |
|---|---|---|
| **Reading** | F2, F8, F10/F11 (engine C) | The five-axis skill profile (05, span at ½), blended 80/20 with F2+F8 attainment |
| **Keys & Chords** | F1, F3–F6 | Gate/tier attainment across admitted lineages |
| **Rhythm** | F7 + the passage rhythm axis | F7 class attainment + the rhythm axis position |
| **Topography** | F9 | Tier + latency attainment |
| **Composite** | all four | Displayed mean **with the per-domain spread always visible** — the weak domain is never hidden |

**Display: leagues over numbers.** The scale buckets into six **leagues** of 300 points — Bronze (100–399) · Silver (400–699) · Gold (700–999) · Platinum (1000–1299) · Diamond (1300–1599) · Master (1600–1900) — each with divisions **III → II → I** per 100. A domain card leads with the league and subtexts the number: **Gold II · 840**; the composite displays the same way. (Why 1900: the floor is 100 — the **unplaced** state, never zero — and 45 ladder positions × 40 points = an 1800-point climb above it, aimed at SASR's practical top range; SASR publishes no hard ceiling, so the number is derived, and the league headline makes it trivia.) Leagues are a *ratings* vocabulary, deliberately distinct from the lettered difficulty ranks — **letters (B+) say how hard your material is; leagues say how far you've climbed.** League names are display strings: a musical set (Prelude → Étude → Sonatina → Sonata → Rhapsody → Concerto) is a one-line swap if metals ever feel off-brand.

**Figure:** [one scale, three vocabularies — positions, points, leagues](figures/figures.html#ladder-leagues)

## 3. Rating formulas (v0)

- **Position points:** the 45-position ladder (9 ranks × 5 subranks) maps onto the scale at **40 points per position above the 100 floor** — points = 100 + 40 × position, so **F-- = 140, SSS+++ = 1900**; 100 is the unplaced floor (no position yet).
- **Reading** = **80%** the weighted mean of the five axis positions in points (keys, rhythm, texture, range at weight 1; **reading-span at ½** — F11's memory-flash results reach the rating through the span axis, the purest eye-hand-span measure, at minor weight as settled) **+ 20%** knowledge attainment — `100 + 1800 × attainment` over **F2 and F8's fixed default-scope spaces** (~40 items, versioned) — so staff-knowledge drilling moves Reading the way F1 signature work moves Keys & Chords.
- **Keys & Chords** = `100 + 1800 × attainment`, where attainment = the weighted mean, over the **fixed default-scope space of the domain's own families** (F1, F3–F6 — ~6,000 atoms, versioned with the catalog), of each atom's progress: unintroduced 0 → introduced ⅓ → graduated ⅔ → gate held 1 (interpolated across multi-gate lineages; **held, not owned** — 02 §1's release streak steps a rotted card back down, so attainment breathes on evidence). A fixed denominator means expanding drill scope never dents the rating, and early numbers are honestly small — room to grow is the BBA flavor working as intended.
- **Rhythm** = mean of F7 attainment (the same fixed-denominator construction over F7's default-scope classes, ~36) and the rhythm axis's position points.
- **Topography** = attainment over F9's fixed default-scope space (~16 atoms, versioned; tier progress × latency-window achievement).
- **Composite** = the plain mean of the four, displayed with the spread. No weakest-link floor — the visible spread does that job without punishing the number.

Ratings are quiet by construction: positions carry bands + cooldown (05), gates move only on 3-streaks in either direction (02 §1 — a single slow rep touches nothing, and one release is ~0.1 points), attainment moves one atom at a time. A bad evening moves an axis at most one subrank ≈ **≤40 points** on one domain. No additional smoothing in v1.

**Figures:** [ratings emerge — six simulated months](figures/figures.html#ratings) · [the lapsed chordist — how a rotted number honestly falls](figures/figures.html#lapsed)

## 4. The monthly benchmark

**Invited, never due** — surfaced from the map after ~a month (and after 30+ days away, 04 §8); skipping widens calibration uncertainty, costs nothing else.

- **Reading staircase:** generated excerpts (06's pipeline, performance mode, full 20–30s preview ritual), starting **two ranks below** the current Reading positions for a warm entry, stepping one rank per clean excerpt. **Promote at ≥80 composite, stop after three misses** — ceiling found.
- **Per-excerpt scoring** — the one sanctioned blend of the three axes, explicitly composite: percentage of expected notes correct *at the correct time* (pitch ∧ onset-in-window jointly), with performance-mode continuity costs applied. Everything else in the app keeps the axes separate (03 §1.2); this number exists only inside the benchmark.
- **Keys & Chords gauntlet** (short): a timed chord-stream segment — ~12 prompts across the scoped qualities and key regions at gate windows, drawn **staleness-first** over the gate-held atoms (06 §5) so the checkpoint re-verifies exactly the gates that have gone longest unproven.
- **Rhythm segment** (short): a tap staircase of generated rhythm lines (06's F7 pipeline) climbing the vocab/meter ladder from one step below current attainment — promote while onsets stay in-window, stop at the ceiling.
- **Topography segment** (short): a find-the-keys stream (F9 mechanics) at the current tier — leaps and chord grabs scored on accuracy and latency, the cold-start find included.
- **Span probes** (~1 minute): two flash probes (placement's blueprint, 05 §3) — the span axis's own measure, so **all five** reading axes re-anchor on valid evidence, span's purity rule intact (performance reads at length never touch it).
- Every domain gets a measured checkpoint; the segments together (the probes cost a minute) keep the whole benchmark inside ~15 minutes.
- **What it does:** re-anchors the five axis positions (a diverging ceiling adjusts positions, and the rating moves *through* them); anchors 05 §5's calibration; logs every excerpt permanently (the corpus doubles as the calibration set, 06 §5). The gauntlet and topography prompts are **ordinary graded reps** — their misses count toward 02 §1's gate-release streaks, which is how a rotted attainment number actually comes down (§1's drag-down promise, mechanized). Occasional real-SASR runs (Piano Marvel) are welcome cross-checks, never load-bearing.
- **Anti-gaming:** no same-day retries; excerpts never repeat (generated + logged); the invitation returns monthly regardless of results.

## 5. Placement

First run = the benchmark blueprint at reduced length (05 §3: ~6 excerpts + two flash probes, one-glance previews, ~2 minutes). Because the test promotes at 80 while practice sustains 95, **placement seeds each axis one full rank below its measured ceiling** — the working band closes the gap within a few sessions (each subrank step needs its five-entry window plus the cooldown), and over-seeding self-corrects now that every axis can demote. Content read cleanly in the placement excerpts doubles as **readiness evidence** for the seeded swath (05 §3), so a well-placed player's first rank turn isn't held hostage by drills they've already demonstrated.

## 6. Movement, attribution, history

Every rating change traces to a logged event — an axis move, a gate passed, an atom graduated, a benchmark re-anchor — so the history surface can answer "**what moved your rating**" with specifics ("rhythm C+ → C++ · dom7 gates passed in flats"). Surfaces (rendered by 11): per-domain trend lines, deltas since the last benchmark, the attribution feed, and the retention-curve view that makes the interleaving bargain visible.

## Open questions

None standing.
