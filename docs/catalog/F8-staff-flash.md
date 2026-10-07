# F8 · Staff flash patterns — *engine B*

**Trains:** chunk recognition — seeing a figure as one object rather than serial notes. The Piano Safari / Richman visual-perception mechanic; the app's most direct lever on eye-hand span.

**Mockup:** [mockups/F8-staff-flash.html](mockups/F8-staff-flash.html)

## Params (class)

```
{ pattern: second…sixth | triadShape | scaleFragment | brokenChord | cadence,
                                       // 02's PatternFam; cadence draws the shared vocabulary (06 §7)
  clef: treble | bass | grand,        // grand = figure appears in either staff (clef-switch cost, as F2)
  register,
  keyContext: open | ks12 | ksAll,     // ks12 = signatures to 2 accidentals;
                                       // the signature is engraved and APPLIES (F2 T2 semantics)
  meter + rhythm skin: drawn from a small metric wardrobe (2/4, 3/4, 4/4; quarters/8ths, whole-bar chords),
                                       // every figure renders as a real measure — the hub's metric-context rule
  displayMs: 2000 → 400 }              // the within-class difficulty knob — the tier ladder IS the timer
```

## Mechanics

Figure flashes for `displayMs` — engraved as a full measure with clef, signature (per context), time signature, and rhythm — then the staff blanks and you play it. The rhythm skin is *context, not test*: grading is pitch + order only (F7 owns rhythm), but chunks are seen the way music presents them. Instance = fresh rendering of the class (different notes and skin, same pattern shape), never repeated. Progression follows the Piano Safari intervallic sequence: unison/2nds → 3rds → 5ths → 4ths → 6ths+; the shape families admit after the interval walks, in their own order (triad shapes → scale fragments → broken-chord figures → cadences), each sweeping clef × context as everywhere.

**The rep is 04 §5's**: N fresh instances back to back (N=3; the rep that would complete a gate's earn streak serves N=5 — the perfect-practice bar), one aggregate rating, one review row carrying the rep seed (each instance's seed derives from it) and per-instance detail in `errorSummary`, logged in parameter group **B**.

## Tier ladder

Display time shrinks as the class matures (2000 → 1200 → 800 → 600 → 400ms) — **each rung advance is a gate** (symmetric 3-streak, held not owned, 02 §1) — then the key context widens (open → 1–2 accidental signatures → all) and the timer partially resets: **a wider-context class admits at the 1200ms rung**, not 2000 — the shapes are old, only the reading context is new. Each (family × clef × keyContext) is a class; bass, grand, and signature contexts are drill-scope toggles like everywhere else.

## Grading defaults

Rehearsal mode. Pitch + order strict, read under the signature (a ♮-where-♯-belongs logs a `key:X` misread, as F2 T2); **latency from blank → first *correct* onset (03 §6) is the eye-hand-span proxy metric** and a first-class 07 stat. No metronome. The staff goes **blank** after the flash (no pattern mask), and a soft answer timeout (`flashAnswerTimeoutS`, default 8 s — a different knob from `displayMs`, which is the exposure and the difficulty) rates Again and moves on — practice never stalls.

**Per-instance rating** (03 §6's discrete map): a clean instance rates against the **generous learning answer window** (5 s from the blank — `displayMs` is the difficulty; the clock never tightens). Any pitch/order error, or the timeout, rates the instance **Again** — and **the figure re-engraves for a breath with the expected tones named** before the next instance: the staff was blank when the miss happened, so the miss must be *seen*. The rep's aggregate verdict (04 §5) never blocks: an Again rep states itself and moves on — the re-shows were the teaching, and reconciliation's flow-stop is engine-A's shape, not the class rep's.

## Prescribes for

Slow-decode diagnoses: when passage hesitations cluster on a pattern shape (`figure:broken-chord`, `interval:6th` tags), that shape's flash class gets prescribed at the user's current display tier — in the clef and key context where the stumble happened.

## Open questions

None standing. Cadence shapes enter as **shared generation heuristics across F8/F10/F11** (one cadential vocabulary in 06 — flash figures, passage endings, and eyes-ahead material all draw from it) rather than a standalone family.
