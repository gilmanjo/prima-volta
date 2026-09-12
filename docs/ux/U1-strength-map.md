# U1 · Strength map — Home

The decay function made visible, and the app's launcher — the content of the **Practice** tab. Everything practicable is reachable in ≤2 taps from here.

**Mockup:** [mockups/U1-strength-map.html](mockups/U1-strength-map.html)

## Layout (a tab surface — both orientations; portrait order shown, landscape reflows to two columns)

1. **Navigation docked at the top** (hub rule), then a thin device row.
2. **Header block:** one tight row — the composite **league chip in its league's metal** ("Gold II · 862" in gold — never the blanket accent) at the left, **inline with the device chip** at the right (no whitespace-eating extra rows); beneath it, the **explicit streak** — the last seven days as flat squares (practiced = filled, today marked) plus the count. **No clock** — the phone has one.
3. **Reading profile — a real ladder, not tag chips:** five axis rows, each a nine-segment track (F→SSS). Segments take a **single flat color from a green → red → pink ramp** across the nine ranks (position color, one color per oblong chip); climbed segments render muted, the current position full; rank label + trend at the right. Tapping opens a Reading block (U3).
4. **No prescription shelf on the home page** — prescriptions live in the Practice picker's own section (and U6's surfaces), never as home-screen cards.
5. **The families — a single column of generous rows**, fixed pedagogical order. Each row: the **user-facing name** (no F-numbers — design enumerations never surface in UI, hub rule) and a **one-line purpose subtext** — nothing else. Ruled subtexts: Keys & signatures "staff notation recognition" · Note reading "name and play staff notes" · Intervals "build and identify intervals" · Chords "triads and tetrads" · Scales "major, minor, etc." · Arpeggios "broken chord sequences" · Rhythm "timing and duration patterns" · Staff flash "read figures at a glance" · Topography "find keys without looking" · Passages "sight-read fresh music" · Eyes-ahead "play behind, read ahead". A useful per-family graphic may join later; weak counts live in the drill-down.
6. **Practice button** (sticky) → the **picker sheet**, in labeled sections with **no row subtexts**: **Templates** (the starter, the user's own) · **Prescription** (the standing suggestion, runnable directly) · **Free roam** (the weakest-first mix across everything in scope — *chosen, never imposed*). Tapping a family row instead scopes practice to that family.

## Drill-down — structured by what a player chooses

Tap a family row → a sheet (the family subtext is **not** repeated; no prose clutter):

- **Variant buttons with previews** — play and knowledge variants render as tappable **cards, each with a small live preview** demonstrating the exercise (a chord symbol over a mini keybed for "From symbol"; a tiny engraved chord for "From staff"; mini answer chips for "Identify"; expected-key outlines for "Spell"; two candidate staves for "Pick the engraving") plus the weak count. Tap = drill that variant. *(Fallback if previews won't render nicely at this size: plain rows with a one-line explanatory subtext.)*
- **Progression — a node grid, not cramped chips:** stage labels written **once** as readable column headers (blocked · inversions · hands-together · broken · gates · streams), then **one dot row per play variant** — done stages filled, the current stage larger in accent, future hollow. Tapping a node drills that stage — and no instructional copy says so; affordance, not narration. The key wave stays model-internal.
- **Weaknesses** — never "atoms" (hub rule): each row is just the item and its variant ("A♭maj7/C · from symbol · LH") — **no subtext, no meta**; outlined rows are upcoming material.

**Section titles and the family name render large** — sheet headers are titles, not whispers. (The preview minis are placeholders for real rendered thumbnails in production.)

### What each tap starts — one machine, narrower lenses

Every control starts the same block-filler (08 §4) with a narrower area filter; serving rules, steps, and modes never change — only the scope:

| Tap | Scope served |
|---|---|
| **Practice Chords** (footer) | The whole family — all variants, weakest-first, steps first, frontier-on-pull per appetite |
| **A variant button** | That variant only, across all its stages and keys, weakest-first |
| **A progression node** | That variant *at that stage* — its admitted items across keys. Future (hollow) nodes are inert: nothing is admitted there yet |
| **A weakness row** | Exactly that item (user sovereignty, 08 §4): the player serves it immediately and keeps serving it until you leave |

Exit always returns here. **Mock-commentary never ships as UI copy** — explanatory hints belong in captions/specs, not on screens.

## Strength display

- The home list is **withholding**: names and purposes only. Below-target atoms surface as **counts and words in the drill-down** ("18 weak", "Flats — inversions landing") and as flat pips at the atom level — never as ambient glow, never as debt, never red.
- **Unintroduced:** outlined rows/pips labeled "up next" — visibly *there*, never counted as work (the wave stays model-internal).
- **Out of scope:** not rendered (a one-line footer links to scope settings: "some drills hidden by practice scope").

## States

- **Knowledge-only** (no MIDI): banner ("no keyboard — knowledge-only drills"); at-instrument-only families dim to outline with a small keyboard glyph; choice-answerable content stays live (F1, F2/F3 selectors, F4 id/spell/engraving).
- **Day one:** mostly unlit map + seeded skill profile (post-placement) + a single CTA to the starter template.
- (The "everything steady — polishing" state is a **player** message (U2), not a home-page banner — the home never editorializes.)

## Open questions

None standing.
