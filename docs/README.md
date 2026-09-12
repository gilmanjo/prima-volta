# Prima Volta — design documentation suite

*("The first time through." Name checked 2026-09-08 — no software collision; see 00 §Naming.)*

A piano fluency & sight-reading trainer. This folder is the **source of truth**: the app gets fully specified here — exercises, configuration, grading, difficulty, scheduling, scoring, practice templates, prescriptions, architecture — before any code is written. The published artifact ("Prima Vista v0.1", 2026-08-29) remains as the market-survey and initial-decision snapshot; where this folder disagrees with it, this folder wins.

## Ground rules

1. **Docs before code.** We pore over these until the webapp is completely understood on paper.
2. **Spikes are local-only** — measurement instruments (e.g., MIDI latency on real devices), never deployed, never load-bearing for design.
3. **Phasing is decided last.** 12-ROADMAP is written only when the suite is stable, so sequencing follows the design instead of driving it.
4. Every doc keeps a **Decisions** section (settled, with rationale) separate from **Open questions** (genuinely undecided). Jordan's review turns the latter into the former.
5. **Docs carry no edit history** — no dated annotations, strikethroughs, or "revised per review" notes; just make the edits. The dated record lives solely in 00-OVERVIEW's decision log.

## Reading order & status

| # | Doc | Covers | Status |
|---|---|---|---|
| 00 | [OVERVIEW](00-OVERVIEW.md) | Vision, posture, platform, glossary, decision log | **Draft v0** |
| 01 | [EXERCISE-CATALOG](01-EXERCISE-CATALOG.md) | Hub: dimensions, modality matrix, admission summary → per-family specs + mockups in [catalog/](catalog/) | **Draft v0** |
| 02 | [ITEM-MODEL](02-ITEM-MODEL.md) | Atom identity, type schemas, enumeration & livability, drill scope | **Draft v0** |
| 03 | [GRADING](03-GRADING.md) | Capture, matching, modes, axes, error taxonomy | **Draft v0** |
| 04 | [SCHEDULING](04-SCHEDULING.md) | FSRS config, steps, derived reviews, serving math | **Draft v0** |
| 05 | [DIFFICULTY](05-DIFFICULTY.md) | The authoritative ladder (ranks F→SSS), admission rules, staircase, calibration | **Draft v0** |
| 06 | [GENERATION](06-GENERATION.md) | Passage/pattern generator, pianism validators, conformance | **Draft v0** |
| 07 | [RATINGS](07-RATINGS.md) | Per-domain scores & composite (Big Brain Academy-style), benchmark test | **Draft v0** |
| 08 | [SESSIONS → Practice & templates](08-SESSIONS.md) | Strength map, free practice, user-authored templates, block-filler | **Draft v0** |
| 09 | [PRESCRIPTIONS](09-PRESCRIPTIONS.md) | Diagnostics, evidence schema, AI-in-prod contract | **Draft v0** |
| 10 | [ARCHITECTURE](10-ARCHITECTURE.md) | Stack, modules & interfaces, data model, sync, platform, licensing | **Draft v0** |
| 11 | [UX-SURFACES](11-UX-SURFACES.md) | Hub: global rules, design language → per-surface specs U1–U8 in [ux/](ux/) | **Draft v0** |
| 13 | [TESTING](13-TESTING.md) | Test pyramid, the simulation harness, personas, invariants, golden trajectories, drift discipline *(reads before 12 — numbered after to keep 12-ROADMAP's identity)* | **Draft v0** |
| 12 | [ROADMAP](12-ROADMAP.md) | Attack order, phases with exit criteria, beyond-v1 tabling — written last, as ruled | **Draft v0** |

**Figures:** [figures/figures.html](figures/figures.html) — concept diagrams plus **computed hypothetical outcomes**: seeded mini-simulations of the documented mechanics (the band controller, three climbers, the sawtooth, rating ramps, the lapsed chordist, a prescription closing its loop). Edit `figures/src/`, run `node build.mjs` — never the built file.
