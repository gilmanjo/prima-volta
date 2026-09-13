# 02 — Item & config model

The formal type system behind the catalog: how atoms are identified, related, enumerated, versioned, and scoped. The catalog (01) says *what* each exercise is; this doc says *what exactly gets scheduled*, how tiers relate, and proves the space is livable.

## 1. The identity rule

An **atom** is the smallest unit with its own strength (FSRS card). The rule for what belongs in an atom's identity, distilled from the catalog reviews:

> **Identity = anything that makes a distinct memory.** Clef (both directions, per F1), register band, key context, quality, inversion, direction (descending is its own skill, per F3), cue modality (name→hand vs staff→hand are different decodings), answer modality where the skill differs (play vs name+spell), hand, and form. **Not identity:** concrete renderings (engine-B instances), broken-figure direction (up/down/up-down/down-up rotate within one broken atom as variety — F6's arpeggio traversal direction likewise), F3 construction anchors (instances), and anything the ladder merely *tightens* rather than changes.

### Two kinds of tier

The catalog's tier ladders mix two mechanics, now named:

- **Admission tiers** introduce *new atoms* (F4 T2 admits inversion atoms; T3 admits HT atoms; T4 admits broken atoms; T6 admits stream atoms; F6 T4 admits dom7/dim7 bases; F6 inversion-start arpeggios, when they come, are new atoms by this rule).
- **Gate tiers** advance *existing cards* — the card's `tier` field steps up and its **demand tightens**: the fluency window snaps to a tempo anchor (F4 T5, F5 T4–T5, F6 T5, F2 T5 / F8's shrinking display), the **extent grows** (F5 T2/T5's and F6 T2/T5's octave growth — the first octave of a 4-octave scale *is* the 1-octave scale, played, so octave progression lives in-card and needs no separate atoms and no propagation), or the **instance pool widens** (F3 T2's all-anchors). Same memory, stricter demand; no new cards, and `review_logs` records the tier per row so history stays interpretable. **A gate advances on 3 consecutive in-window reps** of the card at its current demand — derived rows count (§3), but **graduated reps only**: practice-local step reps (04 §2) never touch a gate in either direction. Gates are spaced-evidence territory — a card cannot meet its anchor-tempo demand in its first bout, so month-one Good stays month-one (03 §6). And gates are **held, not owned**: the mirror streak releases them — **3 consecutive out-of-window reps** at the current demand (wrong *or* slow) step the card's tier back down, to be re-earned the same way. One slow rep is nothing; `gateStreak` runs both directions; derived rows are improvement-only (§3) and can never release. **Knowledge atoms carry no gate at all**: they are tierless flat atoms (log #52) graded against one generous window that never tightens (F1 §Grading) — their reps neither arm nor release anything.

### Identity serialization

An atom's id is the stable hash of its canonical form:

```
atomId = hash(canonical({ family, cue, answer, ...identityParams, familyVersion }))
```

- Params serialize in a fixed key order with closed enum values; unknown keys reject.
- `familyVersion` is **per family** and bumps only on *incompatible* redefinitions of that family's identity dimensions (adding an enum value — a scale type, a quality — is compatible and does not bump). A bump therefore migrates only the family actually redefined, never the whole space.
- Migration policy: a bump ships a mapping table old→new for the family's surviving atoms; cards follow the mapping; orphans keep their history but leave the map. `review_logs` rows are never rewritten.

### Engine-B classes

A class atom's identity **excludes the instance**: `{family, patternFamily, clef, keyContext, …}`. The concrete rendering's `instanceSeed` is logged on the review, never hashed into identity. Instance generation must be seed-deterministic so any logged rep can be re-displayed. (F2 and F9 are **engine-A atoms with sampled targets** — the concrete note or stream is seeded variety (06 §5), logged the same way, but with no N-instance aggregation: 04 §5 applies to F7/F8 classes only.)

## 2. Type definitions (authoritative)

### Shared enums

```ts
type Pc         = 0|1|2|3|4|5|6|7|8|9|10|11;          // pitch class; display spelling resolves from key context
type Sig        = -6|-5|-4|-3|-2|-1|0|1|2|3|4|5|6;     // negatives = flats, positives = sharps.
                                                        // −6 (G♭) is real atoms behind the drill-scope toggle;
                                                        // with it off, +6 (F♯) carries the six-accidental slot.
type Mode       = "major" | "minor";
type Clef       = "treble" | "bass" | "grand";
type Hand       = "RH" | "LH" | "HT";
type Quality    = "maj"|"min"|"dim"|"aug"|"maj7"|"dom7"|"m7"|"m7b5"|"dim7";
type Inv        = 0 | 1 | 2 | 3;                        // 3 only for sevenths
type IntervalId = "m2"|"M2"|"m3"|"M3"|"P4"|"TT"|"P5"|"m6"|"M6"|"m7"|"M7"|"P8";  // TT accepts aug4/dim5
type ScaleType  = "major"|"minorNatural"|"minorHarmonic"|"minorMelodic"|"chromatic"; // extensible data
type Meter      = "4/4"|"3/4"|"2/4"|"6/8"|"3/8"|"9/8"|"12/8"|"cut";
type Vocab      = "basic"|"eighths"|"dotted"|"sixteenths"|"syncopation"|"triplets"|"restsFull"; // nested sets
type PatternFam = "second"|"third"|"fourth"|"fifth"|"sixth"|"triadShape"|"scaleFragment"|"brokenChord"|"cadence";
type Span       = "inPosition" | "leapOctave" | "leapWide";
type ArpBasis   = "maj" | "min" | "dom7" | "dim7";
```

### Atom families

```ts
type F1 = { family:"keys";     sig:Sig; mode:Mode; clef:"treble"|"bass"; dir:"sigToKey"|"keyToSig" };
type F2 = { family:"reading";  clef:Clef; band:"staff12"|"ledger3";
            keyContext:"open"|"ks14"|"ksAll"; accidental:"none"|"single"|"double";
            answer:"midi"|"selector" };
            // keyContext × accidental CROSS — both identity: signature reading is *strategic*
            //   (how the staff is generally read in this key), accidentals are *tactical*
            //   (modification of the note in front of you). 𝄪 under a sharp signature = its own atom.
type F3 = { family:"interval"; kind:IntervalId; dir:"up"|"down"|null; form:"melodic"|"harmonic";
            cue:"name"|"staff"; clef:Clef|null; hand:"RH"|"LH"|null; answer:"midi"|"selector" };
            // clef: staff-cue only (grand included — engraved pairs may span bass↔treble); null on name cue.
            // hand: midi answers only; null on selector (naming needs no hand). name→selector doesn't exist.
            // dir: null on {form:"harmonic", cue:"staff"} — a stacked pair has no direction;
            //   name-cue harmonic keeps it (which side of the anchor is the skill).
type F4 = { family:"chord";    root:Pc; quality:Quality; inversion:Inv; hand:Hand;
            form:"blocked"|"broken"; cue:"name"|"staff"; answer:"midi" }
        | { family:"chord";    root:Pc; quality:Quality; inversion:Inv; clef:"treble"|"bass"; answer:"id" }
        | { family:"chord";    root:Pc; quality:Quality; inversion:Inv; answer:"engraving" }
        | { family:"chord";    root:Pc; quality:Quality; answer:"spell" }   // octave-free pitch-class set: inversion-blind by the identity rule
        | { family:"chord";    root:Pc; quality:Quality; hand:Hand; stream:true; answer:"midi" };
            // T6 random-inversion streams: one timed item cycling inversions of ONE chord;
            // inversion order and stream length are instance variety, not identity.
type F5 = { family:"scale";    type:ScaleType; key:Pc; hand:Hand; cue:"name"|"keysig" };  // octaves/tempo advance via gates
type F6 = { family:"arp";      basis:ArpBasis; root:Pc; hand:Hand|"alternating"; start:"root" };
type F7 = { family:"rhythm";   meter:Meter; vocab:Vocab; voices:1|2; feel:"straight"|"swing" };  // class
type F8 = { family:"flash";    pattern:PatternFam; clef:Clef; keyContext:"open"|"ks12"|"ksAll" }; // class
            // ks12 = signatures to 2 accidentals (F8's gentler widening; F2's ks14 runs to 4).
type F9 = { family:"topo";     target:"note"|"triad"|"tetrad"; span:Span; hand:"RH"|"LH"; cue:"name"|"staff" };
// F10/F11 are engine-C generation requests, not atoms — skill_profile axes own their state (05).
```

## 3. The subsumption lattice — how tiers relate

Tier relations come in two kinds, and the distinction drives serving and credit:

- **Subsuming** (A ⊐ B): a successful rep of A *necessarily contains* a gradeable rep of B. The v0 subsumption set, deliberately narrow and honest — **hands only**: `HT ⊐ RH, LH` for the same F4 chord / F5 scale / F6 arpeggio (per-hand onsets are graded separately anyway — the embedded sub-reps are directly measurable). Octave extent is *not* an edge: octaves advance in-card as gate progression (§1), so there is nothing separate to maintain.
- **Sibling** (no relation): different memories, no credit flows — blocked vs broken, name-cue vs staff-cue, inversions vs root, F2 content stages, F3 melodic vs harmonic, F9 spans, **F6 alternating** (the handoff replaces the thumb crossing, so a clean alternating rep contains no single-hand traversal — it fails the necessarily-contains test), and the `answer` modality itself (F2/F3 `selector` vs `midi` are separate atoms: naming a note and playing it are different recalls, and the knowledge-only/at-instrument split depends on the distinction). Siblings drill independently, full stop.

### Evidence propagation (derived reviews) — improvement-only

A graded rep on A can write **honest derived reviews** to the atoms it subsumes, under an asymmetric rule:

- **Success propagates.** If the embedded sub-performance in the captured MIDI is clean on its own terms (each hand's own onsets, rating Good as if drilled directly — at a gated card that means **within the card's current tier window**: clean-but-slow writes nothing), a derived review is written to the subsumed atom, carrying the achieved tempo/latency — so passing an HS gate tempo *inside* an HT rep credits the HS gate too, and counts toward its 3-in-window advancement (§1).
- **Failure does not.** A stumble under the harder condition writes nothing downward: dual-task load contaminates the evidence (an LH slip while managing the RH says little about LH-alone), so the parent atom takes the hit on its own card and the subsumed atoms are simply not touched.

Derived rows are flagged `derived: true` with the parent attempt id — real, positive-only evidence, distinguishable forever. Practicing C/E hands-together can only ever *brighten* the C/E single-hand atoms; it never dims them. **Scheduling consumes derived rows like any review; parameter fitting does not** — the optimizer replays derived rows as the state updates they were but masks them from the fitting loss (04 §7; the flag partitions), so improvement-only credit can never skew the memory model that schedules it.

### Serving policy

- A **subsuming lineage** (a chord, scale, or arpeggio across hands) is served at its **frontier**: the highest admitted atom whose strength is below target. Propagation keeps the atoms beneath it bright without direct drilling; they get served directly only if the whole lineage is left to decay (then the *lowest* weak atom is the cheapest repair) or a prescription targets them.
- **Siblings** are ranked and served independently, weakest-first, like any other atoms.
- Higher tiers therefore never *replace* lower atoms and drilling isn't uniformly random across tiers — lineages climb, siblings coexist.

### Scope is visibility, nothing more

With decay and propagation doing the work, there is no suspension or retirement machinery. Drill-scope config (§5) is a **visibility filter**: out-of-scope atoms aren't shown or served (cards are created lazily on first entry into scope); toggling scope off hides atoms, whose strength simply keeps decaying in silence; toggling back on shows them at their honest, decayed strength. No debt, no states to manage.

## 4. Enumeration — is the space livable?

v0 estimates (rounded; the seeder prints exact counts and asserts the budget in CI):

| Family | Full atom space | In default scope | Notes |
|---|---|---|---|
| F1 Keys | 104 | 24 | 13 sigs (−6 real) × mode × clef × dir; majors + treble default |
| F2 Reading | 108 | 36 | clef × band × keyContext × accidental × answer; treble default, bass/grand toggles |
| F3 Intervals | 420 | 204 | kinds × dir × form (harmonic staff pairs are dir-less); × hand on midi, × clef on staff cue (grand = cross-staff); 3 valid modality pairs |
| F4 Chords | **~6,200** | ~5,600 | the giant, incl. T6 stream atoms; see below |
| F5 Scales | ~324 | ~72 | 5 types × 12 keys × hands × cues (chromatic has no keysig cue) |
| F6 Arpeggios | ~192 | ~72 | maj/min default; 7ths/alternating admit later |
| F7 Rhythm | 166 classes | 36 | meters × vocab × voices × feel; pruned per F7's validity rules (compound×triplets · swing×basic · swing×compound) |
| F8 Flash | ~80 classes | ~4 | patterns × clefs × contexts (open/ks12/ksAll) |
| F9 Topography | 36 | ~16 | targets × spans × hands × cues |
| **Total** | **7,623** | **6,068** | exact, printed and asserted by `seed/seeder.mjs` |

**The livability target is the hypothetical maximum, not the defaults.** Defaults are a convenience; the design must be comfortable with *everything toggled on* — and it is, because the quota-free model makes a fully open map merely a larger dim territory: frontier-on-pull serves only what's practiced, subsumption keeps hand-lineages maintained from the top, and ~7,600 atoms is trivial engineering-wise (rows and seed data). **The default column is pure scope arithmetic** — what is *visible* with the default toggles — not what a user meets: experienced breadth is paced by the admission frontier regardless, so a wide in-scope map costs nothing. The CI assertion guards the **full-space** enumeration against silent explosion (budget: <20k atoms) rather than policing default breadth. Descriptively, at 15–20 minutes of drilling (~100+ graded reps) the frontier advances ~10–20 atoms when pushed — depth is entirely at the user's pace.

## 5. Drill-scope config

Per-family visibility settings, at the granularity a pianist actually thinks in — **individual values, not bundles** (the old `triads-core`-style sets are gone entirely: F4 admission simply follows a quality order along the key wave, 05 §2):

```ts
scope: {
  keysGlobal: Pc[],                       // default: all 12 — shared key filter
  minorContent: false,                    // the F8/F10/F11 minor wave (05 §1): gates the minor
                                          //   *generation vocabulary*; F5's minor types toggle separately
  keys:    { modes:{ major:true, minor:false }, clefs:{ treble:true, bass:false }, gFlat:false },
  reading: { clefs:{ treble:true, bass:false, grand:false } },
  chord:   { qualities:{ maj:true, min:true, dim:true, aug:false,
                         maj7:true, dom7:true, m7:true, m7b5:true, dim7:true },
             inversions:{ root:true, first:true, second:true, third:true },
             hands:{ RH:true, LH:true, HT:true },
             forms:{ blocked:true, broken:true },
             cues:{ name:true, staff:true } },
  interval:{ kinds: IntervalId[] /* default: all 12 */, forms:{ melodic:true, harmonic:true },
             clefs:{ treble:true, bass:false, grand:false }, hands:{ RH:true, LH:true } },
  scale:   { types:{ major:true, minorNatural:false, minorHarmonic:false, minorMelodic:false, chromatic:false } },
  arp:     { bases:{ maj:true, min:true, dom7:false, dim7:false }, alternating:false },
  rhythm:  { meters: Meter[] /* default: 4/4, 3/4, 2/4 */,
             vocab: Vocab[]  /* default: all but restsFull */, swing:false, voices2:true },
  flash:   { patterns: PatternFam[] /* default: second…fifth */,
             clefs:{ treble:true, bass:false, grand:false },
             contexts:{ open:true, ks12:false, ksAll:false } },
  topo:    { targets:{ note:true, triad:true, tetrad:false },
             spans:{ inPosition:true, leapOctave:true, leapWide:false } },
  practice:{ flashAnswerTimeoutS: 8, swingRatio: 2.0, previewSeconds: 25 },
            // the flash *answer wait* — never the exposure (displayMs is per-class difficulty state, F8/F11)
}
```

Defaults mirror current practice: majors, treble, all keys, and **eight of nine chord qualities** (maj, min, dim triads; all five sevenths — only aug waits behind its toggle). Everything else is a toggle whose atoms wait invisibly. The **minor wave** across F5/F8/F10 is a scope-default flip (`minorContent` plus F5's type toggles), not a scheduling event — the flag reaches generation as the request's `tonalities` pool (06 §2), never as ambient state.

## 6. Domains & axes

Each atom carries derived, non-identity groupings: **domain** (07 ratings: Keys & Chords ← F1, F3–F6 · Reading ← F2, F8 — engine-C reading (F10/F11) feeds the Reading rating through 07 directly, not as atoms · Rhythm ← F7 · Topography ← F9) and **key region** (natural/sharp/flat bands feeding the prescriber's `key:X` / `key-region:*` evidence — 03 §5's registry). Derived at seed time from identity — never stored as independent state.

## 7. Seed data & versioning

The atom space ships as generated seed data (`catalog.json`, built from these schemas), versioned per family with `familyVersion`. The seeder is pure and deterministic; its output includes §4's table with exact counts, asserting in CI that the **full-space** enumeration stays within budget (<20k atoms) — guarding the hypothetical maximum against silent combinatorial explosion, per §4; default breadth is a convenience, not a CI concern. The subsumption edges (§3) and **each family's admission ladder (tier order × key wave — the data 05 §2's family-local rule walks)** are seed data too — generated from the same rules, so the lattice and the admission order are inspectable, not implicit.

## Open questions

None standing.
