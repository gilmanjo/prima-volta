# 08 — Practice & templates

How practice actually flows. **The seam with 04: 04 computes, 08 chooses** — this doc owns the surfaces and the serving policy (strength map, free practice, blocks, templates, the block-filler); 04 owns the math they consume.

**The philosophy in one paragraph:** practice is unbounded. No algorithm-bounded sessions, no quotas, no debt. The user practices anything for any duration; every genuine graded rep is evidence wherever it happens (only teach states and previews write nothing). The system's whole job is to make strength visible (the map), serve the weakest thing in whatever area the user chose (the filler), introduce new material only on pull (the frontier), and let the user author their own structure (templates). A mirror of the brain and a good librarian — never a taskmaster.

## 1. The strength map (home)

- **What it shows:** modeled strength, live. Default granularity is **families** (domains are too coarse to invite action); tap into a family → its variants, stages, and weaknesses (U1's drill-down). Engine-C skill renders as its own panel: the five-axis **skill profile** (rank·subrank positions, 05) — ladder positions, not brightness, because passages aren't cards.
- **Strength display:** the *model* is continuous decay (due = weakening, never a binary flag); the *rendering* is quiet — per-family weak counts and worded region summaries at the top, per-atom strength pips in the drill-down (U1: no ambient glow, no debt framing, no red). Unintroduced atoms render outlined and wave-labeled (visibly there, never counted as work); out-of-scope atoms don't render at all (02 §5).
- **Aggregation:** a group's attention signal = stakes-weighted over member R, surfaced as its weak count with weakest members first. Counts-honesty rule (11): any number shown equals what the filler would actually serve.
- **Tap-to-drill:** tapping any region starts free practice scoped to it. The map is a launcher, not a report.

## 2. Free practice

Pick anything — a family, a region, a single atom from the catalog browser, a reading block — and play. Free practice is a one-block ad-hoc template: identical machinery, zero ceremony, reviews written like anywhere else. Thirty seconds of noodling on C♯m7 chords is real evidence and is treated as such.

## 3. Blocks

A **block** = an area selector + an optional bound + mode hints.

- **Area selectors:** family (optionally a tier range) · domain · key region · single atom · "weakest anywhere" · **reading** (engine C, with a mode choice or mix) · **prescription** (09's inbox) · **benchmark** (07, when invited).
- **Bounds:** open-ended (default) · duration ("5 minutes") · count ("10 items", "3 reads").
- **Mode hints:** reading blocks carry a rehearsal:performance mix (starter default ~3:1, 03 §2 — any read's mode is still the user's to flip in the moment); drill blocks may pin the metronome on/off.

## 4. The block-filler

Given a block, the filler picks *the next item*, one at a time:

1. **Steps first** — drain 04 §2's due practice-local steps for the area (un-elapsed steps are skipped, not waited on; their delays are item-denominated, so heavy practice ripens them mid-bout).
2. **Weakest next** — rank the area's in-scope, admitted atoms by 04's `servingPriority`; serve the top candidate that passes 04's interleaving constraints.
3. **Frontier on pull** — when the area's servable weak pool thins below the **pool-thin threshold** (v0: fewer than 4 items below target), admit the next atoms from the family ladder (02 §7 seed order, filtered through 04 §6's interference guard via `admissionOk`; 05 §2's reading-coupled admissions arrive event-driven regardless) and serve their teach states. **Appetite** is user-tunable: off · **trickle** (default — at most ~5 new atoms per 10 minutes of practice in that area) · eager (fill the time).
4. **Upkeep mode** — when nothing sits below target and the frontier is exhausted or off, serve the lowest-R bright atoms and say so: "everything here is steady — polishing." A block never ends itself; the user does.

**Unavailable ≠ polishing:** a block whose area has no eligible content *in the current context* — a scales block with no instrument connected — returns `"unavailable"` (§9): the runner shows a skip card and moves to the next block. "Polishing" remains the everything-steady state of a *servable* pool; the two are never conflated.

**Tiny areas — user sovereignty:** a block scoped to a single atom (or a handful) serves on demand regardless of step timing — the user asked for exactly this, so massed reps are allowed and logged like any evidence; a pending step simply consumes the first rep taken after its delay elapses.

Engine-C blocks bypass 1–4: the filler requests generation at the skill profile's positions (05 §3), alternating modes per the block's mix, with 05's stretch offers riding along.

## 5. Templates

A **template** is a named, ordered list of blocks — user-authored data (JSON; duplicable, editable, shareable later). Running one walks its blocks in order with one-tap skip/extend. Aborting is normal; nothing is owed, and no "abandoned" state exists — whatever went unpracticed just stays weaker.

**Starter template** (ships as editable seed — real basic by design):

| # | Block | Bound |
|---|---|---|
| 1 | Keys & chords (F1/F3/F4), weakest-first | 10 min |
| 2 | Scales (F5) | 5 min |
| 3 | Arpeggios (F6) | 5 min |
| 4 | Reading (F10), rehearsal:performance ~3:1 | 4 reads |

Four blocks, nothing clever. Flash (F8), topography (F9), eyes-ahead, and the prescription inbox are one edit away — the template exists to be edited.

## 6. Bouts, summaries, motivation

- A **bout** = contiguous practice: opens on device detect **or on the first graded attempt** (knowledge-only practice needs no instrument — `profileId` and the clock correlation are simply null, 10 §4), with 03 §3's calibration spot-check when a stale profile connects. It closes on ~20 idle minutes — **disconnect does not close a bout** (cable bumps at the music rest are normal; U8's reconnect flow resumes the same bout, and the idle clock is the only closer). Bouts exist for summaries and step timing (04 §2); they carry no obligations.
- **Summary** (end of bout): what strengthened (atoms crossing above target), reads taken and axis moves, notable error tags, streak — computed client-side at bout close (10 §3), a fold over the bout's own logs. Tone: report, never scold.
- **Motivation surfaces:** the map's weak counts falling, streak (a day counts if *any* graded rep happened; a lapse resets quietly, no guilt copy), rating trends (07), and prescription outcomes ("that dotted-rhythm drill paid off — dotted rhythms down 60%").
- **Bigger rhythms without sessions:** the monthly benchmark is *invited* from the map (07); prescriptions refresh on their own weekly-ish cadence (09) and read bouts, not sessions; the weekly coach note (09) summarizes whatever practice actually happened.

## 7. Knowledge-only mode

A filter, not a mode: with no MIDI device, the map and filler offer only choice-answerable atoms (F1, F2/F3 selectors, F4 id/spell/engraving) — the knowledge half of the skill, drillable anywhere. Identical scheduling, identical evidence; bouts open on the first graded attempt (§6), and templates run normally — at-instrument blocks report `"unavailable"` and skip (§4) while the rest serve. iOS lives here permanently (00 platform).

## 8. Prescriptions as blocks

09's output materializes as suggested blocks on a shelf: accept one and the filler executes its spec (target atoms, generation biases); decline and it quietly expires. Prescriptions never insert themselves into templates and never gate anything.

## 9. Module boundary

`BlockFiller` (10 owns signatures): `next(blockSpec, boutCtx) → item | teach | generationRequest | "polishing" | "unavailable"` — consuming `Scheduler`'s exports (04 §9) and the seed admission ladders (02 §7). DOM-free, deterministic given state.

## Open questions

None standing.
