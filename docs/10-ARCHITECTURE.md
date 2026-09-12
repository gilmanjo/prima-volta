# 10 — Architecture

How the paper becomes a program: stack, module boundaries, data model, sync, platform, licensing. This doc **aggregates the suite** — every module below was named by the doc that owns its laws (02–09, 11), and where a number or rule is cited the owning doc stays authoritative. Nothing here invents behavior.

## 1. Stance — six rules that shape everything below

1. **All interactive compute is client-side.** Generation, engraving, MIDI capture, grading, audio — the entire practice loop runs in the browser. The server is durability, weekly analysis jobs, and the (tabled) Claude route; Workers-CPU-class problems are designed out, and practice never waits on a network round-trip.
2. **Pure logic modules, thin components** (ChessGrimoire's drill-flow lesson, applied from day 1). Every law in 02–09 lives in DOM-free, deterministic TypeScript, importable identically by a Vitest test, a Workers cron, and a React component. Components render state and forward events; they never own rules.
3. **The logs are the source of truth; everything derived is a projection.** The suite legislated the ingredients — raw MIDI kept forever (03 §1.6), `review_logs` append-only (04 §3), refits never rewrite history (04 §7), profiles never bake into reviews (03 §3) — and architecture takes the last step: card state, staircase positions, attainment, and ratings are **deterministic folds over the logs plus versioned seed data**. Rebuildable at will, which makes derived-state bugs repairable, re-grading real, and sync near-trivial (§5).
4. **Determinism end to end; zero AI in the runtime path.** `generate(request, seed)` is pure (06), the referee is pure (05 §4), the grader is a pure function of raw stream × profile × score (03), the seeder is pure (02 §7), and v1 ships with layer 2 tabled (09 §4). Same inputs, same outputs, forever.
5. **Device-profile isolation** (03 §3): device-specific values live exclusively in swappable profiles; attempts log the raw stream + `profileId`; raw MIDI plus a corrected profile equals a full re-grade.
6. **Repo hygiene is public-grade from day 1** (00 posture): permissive-only dependencies (§8), redistribution-clean assets, secrets only in `wrangler secret` / `.dev.vars`, personal practice data never in the repo, `userId` on every table with auth deferred.

## 2. Stack (settled)

ChessGrimoire's proven path, product shape fresh:

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js** (App Router, TypeScript, Tailwind) | Interactive components behind `next/dynamic` `ssr:false` (known pothole) |
| Hosting | **OpenNext → Cloudflare Workers** | Deploy after migrations, never before (§4) |
| Database | **D1 + Drizzle**, dual driver (better-sqlite3 locally) | Writes batched by the sync client (§5) |
| Auth | **better-auth deferred; `userId` day 1** | Per-Worker Cloudflare Access guards the workers.dev URL until then (§6) |
| SRS | **ts-fsrs** (FSRS-6) behind `Scheduler` | Swappable by design (04 §1) |
| Notation | **VexFlow 5** behind the app-owned **`<StaffView>`** | The one renderer; the mockups already dogfood it (00 log #28) |
| Theory | **tonal v6** | Spelling, keys, chord math at generation time (06 §1) |
| Audio | **smplr + Salamander** (CC-BY, attributed) for replay & reconciliation · lookahead-scheduled **Web Audio metronome** · the small **UI soundfont** (11) | Three voices, one service |
| MIDI | **Raw Web MIDI** | No wrapper library; the capture pipeline is 03 §3 |
| Tests | **Vitest** on the pure core; the suites of §9 | |

## 3. The module map

### The spine — one graded rep, end to end

```
BlockFiller.next(block, ctx)                                (08 chooses)
     │ item / teach                │ generationRequest
     ▼                             ▼
  player UI (U2/U3)          Generator ⇄ Referee            (06 proposes, 05 §4 verifies)
     │ prompt                      │ Score
     ├──────── StaffView · Keybed · widgets                 (thin components)
     ▼
MidiService ── raw NoteEvents + profileId ──▶ Grader        (03: match, tag, rate)
                                                │ GradedAttempt (primary + embedded hands)
              ┌─────────────────────────────────┤
              ▼                                 ▼
     Scheduler.applyRep                  Staircase.applyEntry
     (FSRS state, gates,                 (tag-filtered axis
      derived rows — 04)                  entries, bands — 05 §3)
              │                                 │
              └───── append to the logs ────────┘
        attempts · review_logs · error_events · axis_entries
                        │ (background, batched)
                        ▼
                sync push → D1 (§5)
```

**Figure:** [one rep through the spine, drawn](figures/figures.html#spine)

Ratings (07) and Diagnostics (09) read the logs and projections asynchronously — they are never in this loop. The benchmark is a **block type** (08 §3) and placement is the same player at reduced length (07 §5, U8) — orchestrated over this same spine, not separate engines. The v1 coach note is a template function inside Diagnostics (09 §5); the **bout summary** is the same kind of fold, computed client-side at bout close (08 §6); and the attribution feed (`rating_events`) is **derived by the fold, not written** — a rebuildable projection keyed by its cause, so replicas and refolds reproduce it identically and can never double-count it.

### Public interfaces (the signatures the docs promised)

```ts
// The pure core — DOM-free, deterministic, unit-testable (§1.2)
interface Grader {                                   // 03 — raw MIDI → judgment
  grade(x: { expected: Score | DrillPrompt; raw: RawMidiEvent[] | ChoiceEvent[];   // the modality's raw response
             profile?: DeviceProfile; clockCorr?: ClockCorr;                       // absent on choice answers
             mode: Mode; windows: Map<AtomId, TierWindow> }): GradedAttempt;
             // windows: the primary card's and each subsumed card's own tier window (04 §4)
  // GradedAttempt = { rating, latencyMs, axes: { pitch, rhythm, continuity },
  //                   errorEvents[], embedded: Map<atomId, EmbeddedResult> }   // hands-only lattice (02 §3)
}
interface Scheduler {                                // 04 §9 — computes
  applyRep(g: GradedAttempt): { cardChanges: CardChange[]; derivedRows: ReviewRow[] };
  servingPriority(card: Card, ctx: ServeCtx): number;
  interleaveOk(recent: ServedItem[], candidate: Card): boolean;
  admissionOk(candidates: Card[]): Card[];             // the interference guard (04 §6)
  dueSteps(area: AreaFilter): Step[];
  optimize(history: ReviewRow[]): OptimizerRun;      // full history: derived rows replay as the state
                                                     // updates they were, but are masked from the loss (04 §7)
}
interface Staircase {                                // 05 §3 — engine C's skill state
  entriesFor(g: GradedAttempt): AxisEntry[];         // tag-filtered per-read percentages
  applyEntry(e: AxisEntry): AxisMove | null;         // bands 95/85, cooldown, collapse, stretch half-weight
  positions(): SkillProfile;
}
interface Referee {                                  // 05 §4 — the single source of rank semantics
  difficulty(score: Score): PerAxisVector;
  conforms(score: Score, request: GenRequest): Verdict;  // categorical-exact + tolerance-banded
}
interface Generator {                                // 06 §9 — pure
  generate(request: GenRequest, seed: string): Score;
  validate(score: Score): Violation[];               // playability only — no rank numbers of its own
}
interface BlockFiller {                              // 08 §9 — chooses
  next(block: BlockSpec, ctx: BoutCtx): Item | Teach | GenerationRequest | "polishing" | "unavailable";
                                                     // unavailable = no eligible content in this context
                                                     // (e.g. an at-instrument block with no device, 08 §4)
}
interface Diagnostics {                              // 09 §6 — pure over aggregates, never raw MIDI
  diagnose(w: EvidenceWindow): Diagnosis[];          // ranked by effect × N × recency
  coachNote(week: EvidenceWindow): [string, string, string];   // 09 §5's three deterministic bullets
}
interface Ratings {                                  // 07 — never FSRS internals
  attainment(cards: Card[], catalog: Catalog): Attainment;     // fixed-denominator (07 §3)
  compute(profile: SkillProfile, attainment: Attainment): RatingsView;  // leagues derive at display
}

// Browser services — the impure shell
interface MidiService {                              // 03 §3
  devices(): DeviceInfo[];
  open(profileId: string): AsyncIterable<RawMidiEvent>;  // raw; normalization is a pure fn of (raw, profile, clockCorr)
  clockCorrelate(): ClockCorr;                       // once per bout, at device connect
  calibrate(): CalibrationResult;                    // the 8-click ritual → profile values
}
interface AudioService { metronome(spec: MetroSpec): Handle; play(notes: NoteEvent[]): void; ui(s: UiSound): void }
// <StaffView score cursor highlights onLayout/>     — renders 06 §1's Score; reports per-bar bboxes (F11 blanking)
// Composer — server job, tabled with layer 2 (09 §4): compose(digest) → schema-validated outputs
```

### Import rules (dependency direction — enforced by lint, not convention)

| Module | May import | Must never import |
|---|---|---|
| `Referee` | seed constants only | anything else — it *is* the rank semantics |
| `Generator` | Referee, tonal, seed vocabulary | user state, FSRS, DOM |
| `Grader` | seed windows, profile types | Scheduler/FSRS — it proposes ratings, never schedules |
| `Scheduler` | ts-fsrs, lattice + ladder seed | raw MIDI — **the Scheduler never sees MIDI; the Grader never sees FSRS** |
| `Staircase` | band constants | anything FSRS — passages aren't cards |
| `BlockFiller` | Scheduler's exports, admission ladders | FSRS internals directly (04 computes, 08 chooses) |
| `Ratings` | Staircase positions, attainment | FSRS internals (07 §1) |
| `Diagnostics` | aggregated views | raw MIDI (09 §1) |
| components / app | any core module, services | — (core never imports components; services never import core state) |

### Directory shape

```
src/core/        catalog · grader · scheduler · staircase · referee · generator · filler · diagnostics · ratings
src/services/    midi · audio · store (replica + sync client)
src/components/  StaffView · Keybed · widgets (KeyPicker, SignaturePicker, NoteSelector, IntervalSelector) · chrome
src/app/         the tab surfaces (U1–U8) · players · api/sync · api/compose (paper only, §6)
src/jobs/        calibration-fit · prescriptions+coach-note · outcomes      (Workers cron; imports core)
seed/            the seeder and its outputs (catalog.json, constants.json — §4)
sim/             the simulation harness + personas + trace/summary assertions (13) — dev-time only:
                 imported by tests, never by src/, never in the bundle
spikes/          measurement instruments (the harness in its spike life, the FP-30X latency rig) —
                 local-only, never deployed, never imported by src/ (ground rule 2; 13 §8)
```

## 4. Data model (DDL v0)

Three storage classes, one schema. **Logs** are append-only and never UPDATEd; **config** is small, editable, synced last-write-wins; **projections** are rebuildable folds that live in the device replica (IndexedDB) — D1 never stores them, and server jobs refold from logs on demand. Every table carries `userId` (elided below). Ids are client-generated ULIDs (sortable, idempotent push).

```sql
-- LOGS ─ append-only, synced by union (§5) ─────────────────────────────────────────────
attempts         (id PK, boutId, kind 'drill'|'read'|'benchmark'|'placement', atomId?,
                  requestJson?, seed?, scoreJson?,     -- generated material: all three stored (06)
                  mode, profileId?,                    -- null on knowledge-only attempts
                  rawMidi? BLOB, rawChoiceJson?,       -- exactly one per attempt (03 §1.6/§3): the MIDI
                                                       -- stream, or the widget event stream (selections,
                                                       -- corrections, commit, timestamps, candidate set) —
                                                       -- both kept forever, both re-gradeable
                  graderVersion, tagsVersion,          -- makes every grade re-derivable & re-runnable
                  gradeJson, startedAt)
review_logs      (id PK, atomId, attemptId, rating, latencyMs,
                  tier,                                -- the card's tier at grading time (02 §1)
                  derived BOOL, parentAttemptId?,      -- improvement-only lattice credit (02 §3)
                  instanceSeed?,                       -- engine B (04 §5)
                  errorSummaryJson, paramGroup 'A'|'B', reviewedAt)
error_events     (id PK, attemptId, type, expectedMidi?, playedMidi?, expectedSym?, playedSym?,
                  timingDeltaMs?, beatPos, barPos, hand, key)
                                                       -- *Sym: symbolic values where MIDI can't express the
                                                       -- skill (spelling, quality picks — 03 §3/§7)
error_event_tags (errorEventId, tag)                   -- one row per 03 §5 tag: the prescriber's query surface
axis_entries     (id PK, axis, entryPct, rank, subrank,        -- position served when the entry landed
                  kind 'read'|'f7'|'f8'|'f11'|'stretch', weight, attemptId, at)
benchmarks       (id PK, kind 'placement'|'monthly', startedAt, resultJson)
                                                       -- excerpts themselves are attempts(kind='benchmark')

-- CONFIG & STATE ─ user-edited rows sync LWW by updatedAt; job-authored rows
--   (coach_notes, prescription_outcomes, optimizer_runs, knob_calibration, calibration_flags)
--   are append-only and only sync down ───────────────────────────────────────────────
users            (id PK, createdAt)
device_profiles  (id PK, name, transport 'USB'|'BLE', latencyMs, jitterMs, velocityFloor,
                  perfTrusted, calibratedAt)           -- 03 §3; the velocity floor is a profile value
scope_config     (userId PK, json, updatedAt)          -- exactly 02 §5's shape
templates        (id PK, name, blocksJson, updatedAt)  -- 08 §5: user-authored data
bouts            (id PK, deviceProfileId?, clockCorrJson?, openedAt, closedAt?, summaryJson?)
                                                       -- both null on knowledge-only bouts (08 §6); clock
                                                       -- correlation measured at device connect (03 §3) — kept,
                                                       -- so every grade stays re-derivable; summary folded at close
prescriptions    (id PK, source 'rule'|'composer'|'drill-this', kind, targetsJson, emphasisTags,
                  rationaleJson, status 'shelf'|'accepted'|'declined'|'expired'|'retired',
                  createdAt, expiresAt)                -- 09 §3's schema, verbatim
prescription_outcomes (prescriptionId PK, outcome, deltaJson, measuredAt)
coach_notes      (id PK, bullets Json, weekOf)         -- 09 §5; job-authored, syncs down
optimizer_runs   (id PK, paramGroup 'A'|'B', paramsJson, fittedOn, effectiveAt)
                                                       -- 04 §7; makes FSRS folds era-exact forever
knob_calibration (id PK, knob, weight, evidenceJson, fittedAt) -- 05 §5's weekly fits, versioned append-only;
                                                               -- current value = latest fittedAt per knob
calibration_flags(id PK, knob, source 'resample'|'fit', detailJson, at)   -- 06 §4 → 05 §5
sync_devices     (replicaId PK, lastSeq, leaseUntil?, leasedBoutId?)      -- server-side only (§5)
-- hypothesis_tags (id PK, tag, note, weekOf, status 'watching'|'confirmed'|'dropped')
--   — tabled with layer 2 (09 §4); the row shape is here so un-tabling is a migration-free flag-flip

-- PROJECTIONS ─ replica-side (IndexedDB), rebuildable, checksummed (§5) ───────────────
cards            (atomId PK, fsrsJson, tier, gateStreak, status 'introduced'|'graduated'|'gateHeld',
                  stepStateJson, introducedAt, lastReviewAt)
                                                       -- gateStreak runs both directions: gates are
                                                       -- held, not owned (02 §1's symmetric streak)
skill_profile    (axis PK, rank, subrank, windowJson, cooldownLeft, movedAt)   -- 05 §3's controller state
attainment       (domain PK, value, computedAt)        -- 07 §3's caches; cheap to refold
rating_events    (causeRefId+domain PK, delta, cause, at)      -- 07 §6's attribution feed — a rebuildable
                                                       -- projection of the fold, keyed by its cause, so refolds
                                                       -- and replicas reproduce it identically and never duplicate
                                                       -- it; derived wherever needed (client UI, server jobs),
                                                       -- never synced
```

**What is deliberately *not* in the database:** atoms, admission ladders, subsumption edges, confusable sets, fluency-window anchors, latency bands, staircase constants, the feeder map, the cadence vocabulary (06 §7), and the melodic transition-weight tables (06 §2). All of it is **seed data** (02 §7) — generated by the pure seeder into `catalog.json` + `constants.json`, versioned per family, shipped with the app. The DB stores only what a user did and where they stand; a catalog update is a deploy, not a migration.

**Migration discipline.** Drizzle flow: `db:generate` → apply to remote D1 → deploy (order is load-bearing). A `familyVersion` bump ships its old→new mapping table and migrates only that family's cards (02 §1); `review_logs` rows are never rewritten. `graderVersion`/`tagsVersion` on attempts mean a grader or taxonomy upgrade is an optional batch re-grade job over stored raw MIDI, never a schema event.

**Sizing honesty** (heavy use: ~100 graded reps/day): a few hundred thousand log rows/year; raw MIDI dominates bytes at ~2–4 KB per drill attempt (more per read) → order 100–200 MB/year. D1's 10 GB is years of headroom; R2 archival of old blobs is the escape hatch, not a v1 concern. The **replica** (§5) stays far smaller: a ~30-day raw-MIDI window (~10 MB, constant), the blob-free logs (~30–40 MB/year, dominated by read score JSON), and the projections (~2 MB) — **~50–80 MB after a heavy first year**, against a per-origin browser allowance of up to ~60% of free disk. Indices: `review_logs(atomId, reviewedAt)` · `error_event_tags(tag)` · `attempts(boutId)` · `axis_entries(axis, at)`.

## 5. Sync & offline — the replica story

The design lands where §1.3 points: because every log is append-only with client-generated ids, sync is **set union plus deterministic refold** — no CRDTs, no field merges, no conflict UI.

- **Every device runs a replica**: IndexedDB holding the logs (minus old raw-MIDI blobs), config, projections, and an outbox. The UI reads only the replica — the whole practice loop (§3) is replica-local, so **a dead zone at the piano changes nothing**. `navigator.storage.persist()` is requested at install and **its boolean result is checked** — granted means the replica can't be evicted; declined means best-effort storage, so the System row says so (U7) and the sync client pushes more eagerly (smaller batches, shorter idle) until granted. Chrome typically grants installed PWAs, but the API may decline — the design never assumes it.
- **Writes are local-first, pushed in batches**: events append to the outbox and projections update immediately; the sync client ships batches to `POST /api/sync` on block transitions, ~25–50 accumulated events, ~30 s of idle, or bout close — whichever comes first, as a single D1 batch statement (the row-at-a-time cost answer). Push is idempotent by ULID; the server assigns a global sequence.
- **Pull** on app open and after each push ack: "events since seq N" plus LWW config. Raw-MIDI blobs older than ~30 days stay server-side; the replica fetches one on demand (replay-my-take of an old attempt is the only consumer).
- **The one-pianist invariant, guarded by a lease**: the only real conflict is two devices practicing at once — physically implausible for one player at one piano. Opening a bout takes a lease (`replicaId`, TTL ~25 min, heartbeated) when online; a second device seeing a held lease warns and may proceed anyway — union merge still converges, and projections refold in `(clientTs, id)` order exactly as they would have live.
- **Repair is refold**: projections carry checksums; any divergence rebuilds from the local log (a year of heavy practice refolds in well under a second); still divergent → repull the log range. There is no state that cannot be regenerated from the logs plus seed data.
- **New-device boot needs connectivity once** (pull the log sans blobs — ~30–40 MB per year of history at rest in the replica, single-digit MB on the wire gzipped, §4); everything after, including placement and benchmarks, works offline.
- **Backup & export**: Settings → one-tap full export (JSON: logs + config; blobs optional), because it's the user's data and the posture is open source. Every replica is additionally a live second copy.

## 6. Server surface — routes, jobs, the tabled Claude route, observability

The server is deliberately tiny: `/api/sync` (§5), the cron jobs, and one paper route.

- **Hostname & access control, interim**: the app serves from its **`workers.dev` URL** — a dedicated domain and real auth are a *paired* later decision, taken only if the project ever warrants them (the domain check's findings stay on record in 00 log #61). Until then, **Cloudflare Access is enabled on the Worker itself** (the policy binds to the Worker, not a hostname — it covers the workers.dev URL and preview URLs alike, the allowlist is one email, and `ctx.access.getIdentity()` reaches the code) — public-grade hygiene with zero auth built. `userId` is already on every row, so flipping real auth on later is a gate, not a migration.
- **Jobs** (Workers cron, importing the same pure core, folding from D1 logs on demand): weekly **knob-calibration fit** (05 §5) · weekly **prescriptions + coach note** (09 §2, §5 — layer 1, fully deterministic) · daily **outcome measurement** (09 §3). Job outputs are ordinary rows (`knob_calibration`, `prescriptions`, `coach_notes`, `prescription_outcomes`) that sync down like everything else. The app is whole if every job silently stops — jobs sharpen, they never gate.
- **The Claude route — paper only, tabled with layer 2 (09 §4).** The contract, so un-tabling is a flag-flip and not a refactor: `POST /api/compose`, invoked by the weekly cron (plus the acute after-bout pass, budget permitting); input is the aggregated evidence digest (09 §1 — never raw MIDI); `ANTHROPIC_API_KEY` via `wrangler secret`, model pinned in config; output schema-validated server-side (zod) with invalid items **dropped, never served** — the rule-mapped defaults always stand; results are rows (`prescriptions` with `source:'composer'`, `coach_notes`, `hypothesis_tags`); a D1 monthly budget counter no-ops the route at its cap; the digest hash keys idempotency; local dev without a key runs deterministic-only by construction. **Nothing ships in v1.**
- **Observability for a userbase of one (decided): a status row, not Sentry ceremony.** Settings (U7) carries a one-row **System** entry: sync state (replica seq vs server seq, outbox depth), last backup age, last run of each job, app + catalog versions, D1 usage. "Prod is broken" = sync lag over a day, a job overdue, or D1 near quota — all visible in that row; debugging is `wrangler tail`. Nothing pages; the pianist notices, which is the correct alerting channel for this userbase.

## 7. Platform matrix & PWA

| Platform | Role |
|---|---|
| **Android Chrome** (phone, landscape at the instrument) | Primary player target (11's landscape-first rules) |
| **ChromeOS Chrome** (Chromebook) | Second at-instrument target; same layouts with more air |
| **Windows desktop** | Development + desk FP-30X testing |
| **iOS / iPadOS** | No Web MIDI → **knowledge-only mode** (08 §7), permanently; recognition drills work fine |

**PWA: yes (decided — cheap and it earns its keep at the piano).** Installable manifest; service worker precaches the app shell, `catalog.json` + `constants.json`, the UI soundfont, and a mid-register subset of the replay samples (a few MB — enough for reconciliation playback offline; full sample quality streams when online). Combined with §5's replica, an installed phone practices fully offline. No push notifications — nothing in the design nags, so nothing needs the permission.

## 8. Licensing & assets

**Posture: open source under MIT** (00 — chosen over Apache-2.0's patent grant for minimalism: a solo project with near-zero patent surface; the grant argument returns only if contributor scale ever makes it relevant). Consequences, settled:

- **Permissive-only in the bundle.** A GPL dependency would force copyleft onto our license choice, so the exclusion stands (for the opposite reason it did under the closed posture). GPL projects (sightread.dev, PianoBooster) remain ideas only.
- **LGPL discipline** (corrected in 00 log #10): unmodified LGPL-3 libraries are usable with separable-module discipline — dynamically imported as their own files, never inlined/minified into our bundle, license text shipped, source pointer provided, swap-ability preserved. **Verovio stays unchosen on technical fit** (WASM heft, MEI-centricity, awkward per-note feedback for generated micro-scores); VexFlow stands.
- **Shipped assets, redistribution-clean:** Bravura/SMuFL music font (SIL OFL) · UI icons from an MIT/ISC set (Lucide/Tabler-class) · Salamander samples (CC-BY, attributed in-app and in the repo) · the logo/favicon as the one sanctioned raster (11).
- Dependency licenses asserted in CI (§9) so a transitive copyleft can't slip in silently.
- Not-a-lawyer note: the professional once-over happens at LLC promotion, not before.

## 9. Testing & CI

**The strategy itself is 13's** — the pyramid, the simulation harness, personas, behavioral invariants, golden trajectories, and the drift discipline all live there. This section homes the named suites and the CI order:

| Suite | From | What it asserts |
|---|---|---|
| Seeder budget | 02 §7 | Exact enumeration printed; full space <20k atoms; ladders/edges/confusables well-formed |
| Golden-seed corpus | 06 §9 | Fixed seeds → snapshot scores; regressions are diffs |
| Property tests | 06 §9 | Request grid × many seeds: validators pass, `difficulty(score)` within bands, determinism holds |
| Referee units | 05 §4 | The executable statement of what each rank means |
| Staircase units | 05 §3, §6 | Band/cooldown/collapse/stretch arithmetic — **05 §6's worked examples are fixtures** |
| Grader units | 03 §4–§7 | Matchers, tags, edge-case rulings, embedded-hands extraction |
| Scheduler units | 04 | Steps, derived-row rules, priority/interleave/confusable math |
| Diagnosis fixtures | 09 §6 | Golden evidence windows → expected rule firings |
| Composer contract | 09 §4 | Schema validity + target realism over eval fixtures — **dormant until layer 2 un-tables** |
| License assert | §8 | No copyleft in the production dependency graph |
| Player smoke | 11 | A thin Playwright pass over the players with a scripted fake MIDI stream |

The **simulation harness** (13) lives twice: spike-stage in `spikes/` — local-only per ground rule 2, tuning 05 §5's constants before code — then test-stage in `sim/`, where frozen personas become the behavioral regression layer (invariants + golden trajectories, 13 §5–§6). CI runs on GitHub Actions: typecheck → unit suites → seeder assert → license assert → sim short battery (13 §7) → migrations → deploy (in that order).

## Open questions

None standing. *(Repo, license, hostname, and the sync design are all settled — 00 log #61–#64. The discarded sync alternatives, for the record: online-required practice — one dead zone at the piano kills a bout — and full CRDT multi-device, merge machinery for a conflict one pianist can't physically produce.)*
