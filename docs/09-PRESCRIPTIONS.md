# 09 — Diagnostics & prescriptions

The differentiator: error events become diagnoses, diagnoses become tomorrow's practice, and **outcomes are measured** — a loop, not a suggestion box. Two layers: deterministic evidence rules (always on, pure — **the v1 product**; v1 runs them in the analysis jobs, so an offline stretch simply serves the standing shelf and fresh diagnoses arrive with the next sync's run) and an LLM composer (Claude, async, under a strict contract — **designed here, deliberately tabled**: prescriptions only work when the engine under them is rock solid, and the ChessGrimoire schedule taught conservative estimates; a phasing input for 12). The tag taxonomy (03 §5) is the shared vocabulary of the whole layer — versioned, and re-runnable over stored raw MIDI after upgrades.

## 1. Evidence inputs

All aggregated; the composer never sees raw MIDI or audio (unnecessary and expensive):

- **`error_events`** (03 §5) — tag rates vs *personal baseline*, recency-weighted (~14-day half-life), minimum N per rule.
- **`review_logs`** — latency clusters by key region and family, rating streaks, gate stalls.
- **`skill_profile`** — the five axis positions *and promotion-window progress*, so the prescriber can pre-pave (an axis nearing promotion with unpulled feeder atoms is itself evidence — 05 §2).
- **Ratings & attainment** (07) — trends and the per-domain spread.
- **Past prescriptions + outcomes** — the loop's memory.
- **Card strength state** — the map's weak pool per lineage (rule 16's lineage-decay evidence; a fold over `review_logs`, not new state).

## 2. Layer 1 — deterministic diagnosis

A diagnosis is a rule template instantiated by evidence, scored by **effect size × N × recency**. The v0 catalog (thresholds are tunable constants, versioned with the rule set):

| # | Evidence pattern | Prescription |
|---|---|---|
| 1 | Accidental-tag errors in a key region ≥2× baseline | F1/F2 signature drills in region + `key-region` bias to 06 |
| 2 | `chord-tone:7th` deletions cluster | F4 sevenths — spell + play — in the offending keys |
| 3 | Ledger-band errors (`ledger:below-bass` …) | F2 deep-ledger atoms in that band |
| 4 | Hesitations at `barline` tags | F8 `scaleFragment`/`cadence` classes; F11 material once live |
| 5 | Meter-specific rhythm cluster (`meter:6/8` …) | F7 class at that meter × the offending vocab |
| 6 | `rhythm:dotted` / `rhythm:syncopation` cluster | The F7 class at a tempo just below the failure point |
| 7 | `shift:leap` latency cluster | F9 leap tiers |
| 8 | `wrongOctave` cluster | F9 + F2 register work in the confused band |
| 9 | Inversion confusions (F4 id/substitution patterns) | F4 inversion atoms + engraving-pick |
| 10 | Quality-pair confusions (m7 ↔ dom7 substitutions) | Paired F4 drills, honoring 04's confusable spacing |
| 11 | Hand asymmetry (LH error rate ≫ RH, same content) | LH-scoped versions of the content |
| 12 | Systematic early/late bias, *uniform across content* | Suspect the device, not the player: recalibration suggestion (03 §3) before any drill |
| 13 | Tempo drift direction under length (rush/drag) | F7 at longer bars, metronome-forward |
| 14 | Gate stall (repeated out-of-window at a gate) | The same card laddered from a slower tempo |
| 15 | Axis nearing promotion — or promotion earned but held by the readiness gate (05 §3) — with feeder drills unpulled or ungraduated | Pre-paving nudge: the feeder drills, surfaced early ("ready to climb — these are the gate") |
| 16 | A whole hand-lineage left to decay | The lowest weak atom — the cheapest repair (02 §3) |

Anti-noise rules: **max 3 concurrent prescriptions**; minimum evidence N per rule; multi-bout support required (one bad evening never reshapes the week — rule 12 is the lone exception: a single bout's *uniform* bias suffices, served at the next job run); a declined prescription stays gone for 2 weeks unless its evidence worsens.

## 3. Prescription spec & lifecycle

```
Prescription = { id, source: rule | composer | drill-this,
                 kind: atoms | generationBias | mixed,
                 targets: atomIds[] | { area, scopeFilter },  emphasisTags[],
                 rationale: { diagnosisId, evidenceSentence },   // explainability is mandatory
                 createdAt, expiresAt (~7d shelf life; acceptance switches to the 14-day active window) }
```

- **Materialization** (08 §8): a suggested block on the shelf — accept and the filler executes it; decline and it expires quietly. While active: +0.5 serving boost on its targets (04 §6); its `emphasisTags` bias generation strictly *within* rank (06 §6). Never auto-inserted, never gating.
- **Explainability:** every prescription displays its evidence sentence — the "why am I drilling this" view (11) is a first-class screen, not a tooltip.
- **The instant path:** F10's post-read **"drill this"** tap builds a prescription directly from that read's error cluster — same schema, pre-accepted (the user just asked), same outcome tracking, no shelf.
- **Outcome measurement** (what makes it a loop): acceptance opens a **14-day active window** — the +0.5 boost runs over it, and the target tag's rate and latency are compared against the prior baseline → outcome ∈ improved · unchanged · worsened · insufficient-data, logged to `prescription_outcomes`. Improved → retired with credit shown ("that dotted-rhythm drill paid off"). Unchanged or worsened → **the pattern is simply surfaced to the user** ("still seeing 6/8 barline hesitations — the drills haven't moved it yet"); the prescription expires normally, the evidence keeps counting, and no automatic escalation machinery exists in v1 — pointing out the pattern is the intervention. Outcomes remain the loop's memory either way.

**Figure:** [a prescription closes its loop](figures/figures.html#prescription-loop)

## 4. Layer 2 — the composer (designed, **tabled**)

**Not in v1.** Everything below is the ratified design for when layer 2 un-tables — nothing in v1 depends on it, because the fallback path (rule-mapped defaults, deterministic coach note) *is* v1. Un-tabling is a roadmap decision (12), gated on the underlying engine being rock solid.

- **Async only, always.** Runs weekly, plus a light after-bout pass when acute evidence appears (budget-permitting) — the ratified cadence. Never in the grading, rendering, or serving path — the app is whole with the API down.
- **Input:** the aggregated evidence digest (§1), active/expired prescriptions with outcomes, skill profile, last week's hypothesis-tag results. **Output, all schema-validated structured data:** (a) prescription selections/compositions — drill specs that may reference *only* real atom ids, valid emphasis tags, and in-scope, in-rank content; anything failing validation is **dropped, not served**, falling back to the rule-mapped default every diagnosis carries; (b) the **coach note** (natural language, §5); (c) **hypothesis tags** — requests for targeted telemetry next week ("watching your 6/8 barlines"), **user-visible** — the loop earns trust by showing its homework; a confirmed hypothesis becomes a diagnosis.
- **Ops:** prompts and schemas versioned in the repo; an eval set of recorded evidence fixtures with expected-reasonable outputs (CI checks schema validity and target realism, not exact wording); hard budget cap stops the composer and never touches layer 1; local dev runs deterministic-only with no API key. Route design, secrets, and caps live in 10.
- Cost posture: pennies per month at personal cadence; per-user cost modelable for the LLC path.

## 5. The coach note — three bullets, deterministic in v1

Weekly, landing in the history surface (08 §6). v1 is a **template-built three-bullet note**, no AI required:

1. **What moved** — from 07's attribution feed ("rhythm C+ → C++ · dom7 gates passed in flats").
2. **What's weak** — the top standing diagnosis with its evidence sentence.
3. **What's prescribed / what paid off** — the shelf and any retired-with-credit outcomes.

Tone rules: report, never scold; cite evidence, never vibes; **no practice-volume commentary, ever** — volume is the user's business (00's quota-free rule). When layer 2 un-tables, the composer writes prose over the same three-slot structure — more sophisticated feedback arrives with the bandwidth for it, not before.

## 6. Module boundary & tests

`Diagnostics` (pure, 10 owns signatures): `diagnose(evidenceWindow) → ranked candidates with strength scores` — golden evidence fixtures in CI. `Composer` (server job, **tabled with layer 2**): `compose(digest) → validated outputs` — schema contract tests + the eval fixture set. Tables: `prescriptions`, `prescription_outcomes` (v1), `hypothesis_tags` (layer 2, tabled) — DDL in 10.

## Open questions

None standing.
