# 11 — UX surfaces

Screens, flows, and the touch-first rules that follow from the Android-phone/Chromebook-at-the-instrument decision. **This is a hub**: each surface has its own child spec in [ux/](ux/) — one doc per surface, reviewable and rulable independently (U-numbers, like the catalog's F-numbers).

## Global rules (apply to every surface)

- **Landscape-first at the instrument.** The USB-MIDI adapter takes the phone's bottom port, so a phone propped on the music rest naturally lives in **landscape** (~844×390): the players (U2/U3) are designed landscape-first — the keybed viz wide along the bottom, notation in wide systems — with huge prompt typography and controls in thumb reach, no hover-dependent anything. Tab surfaces work in both orientations (portrait is fine for knowledge-only browsing off the bench). Chromebook gets the landscape layouts with more air; keyboard shortcuts are a bonus, never a requirement.
- **A wrong answer stops the flow — for reconciliation.** Piano inverts ChessGrimoire's never-block rule: chess lets you think toward a different move, but a missed rep here must be *understood* before moving on. On error the player pauses: expected vs played shown side by side (keybed overlay, engraving highlight), with a **replay affordance** where hearing helps (yours vs expected, via smplr). Continue by explicit tap — **or by playing the correct answer, which advances instantly**. Scope: discrete engine-A/B reps only; passages and performance takes never interrupt mid-flight — their reconciliation is the post-read screen (U3).
- **Counts honesty:** any number shown matches what the filler would actually serve (08).
- **No debt anywhere:** no due-count badges, no overdue reds, no guilt copy. Dimness invites; nothing nags. Benchmarks and prescriptions are invitations that expire quietly.
- **Navigation:** four tabs — **Practice** (home: the strength map) · **Ratings** · **Library** · **Settings** — **docked at the top of the screen** (the top edge earns its keep; no dead status space), with the practice player as a full-screen takeover entered from any launcher (a map region, a template's run button, a prescription card, a catalog atom) and exited back to its launcher. The tab is named for what you *do* there; "the strength map" names its content.
- **UI soundfont:** a small, license-clean set of app sounds for the moments the piano isn't sounding — navigation ticks, the correct-answer ding, block transitions, the league shimmer — volume-controlled and mutable (U7). The metronome keeps its own distinct voice.
- **Design enumerations and model nouns never surface in UI copy.** F-numbers, T-numbers, U-numbers, engine letters — and words like **"atom"**, "card", "class", "lattice" — are documentation vocabulary. Users see names and plain words: "Chords", "hands-together", "drills", **"weaknesses"**. (Rank letters and leagues are the deliberate exceptions: they *are* user-facing vocabulary.)
- **No clock in the app chrome** — the phone has one; the status strip carries the device chip, block context, and mode.
- **Theme:** CSS tokens on stock Tailwind, light + dark, one restrained palette.

## Design language v2 — ebony & slate, flat and withholding

**Accent: slate blue** (`#5b7fa6`, hi `#82a6cb`) — chosen from the exploration ([ux/mockups/style-explorations.html](ux/mockups/style-explorations.html), kept as the record). The v2 principles, superseding v1's glow:

- **Flat and withholding:** no glow shadows on chrome, near-solid fills, restrained gradients. The accent is *spent*, not sprayed — primary action, active tab, current ladder position; everything else stays neutral. The keybed's LED states remain the one lit metaphor (they're content, not chrome).
- **Colors mean things:** league chips wear their league's metal (gold, silver, bronze…), never the blanket accent; felt red stays performance/error semantics; green stays correct/trusted. The slate accent is the app's own voice only.
- v1's materials survive: ebony lacquer surfaces, paper score cards, the volta-bracket mark, Instrument Serif / Schibsted Grotesk / Spline Sans Mono, Bravura glyphs. Everything below except the brass accent stands regardless of the pick.

*Ebony piano-lacquer UI* — near-black layered surfaces with soft depth; *paper score cards* — notation on warm engraved-paper panels; **brass** as the single accent (actions, progress, teach-path dots); **felt red** for performance mode and errors; the **volta bracket** as the brand mark (pure SVG). Type: Instrument Serif (brand, big musical prompts) · Schibsted Grotesk (UI) · Spline Sans Mono (numerals, latency, tags). Music glyphs: Bravura Text (SMuFL, SIL OFL) in mockups; production notation is VexFlow's own engraving. Icons come from an established MIT/ISC set (Lucide/Tabler-class) — **bespoke Claude-drawn SVG art is out**: ChessGrimoire and our own mockups proved it reads clunky; SVG is reserved for layout/theme chrome and elements that are basically polygons anyway. Keyboard states render as LED bars in the keybed. **Asset budget: logo + favicon, the one sanctioned raster art** (AI-generated is fine there); any further asset need is adjudicated per case.

## The surfaces

| # | Surface | Covers |
|---|---|---|
| [U1](ux/U1-strength-map.md) | **Strength map** (Home) | Single-column family rows, drill-down (variants · stages · weaknesses), skill-profile ladder, tap-to-drill |
| [U2](ux/U2-practice-player.md) | **Practice player — drills** | Engines A/B: prompt/answer layouts per modality, teach states, feedback, steps, block flow |
| [U3](ux/U3-reading-player.md) | **Reading player** | Engine C: preview ritual, notation-on-phone rules, post-read screen, stretch offers, F11 modes, the benchmark player |
| [U4](ux/U4-summary-history.md) | **Summary, Ratings & History** | Bout summary, league cards, trends, attribution feed, coach notes, benchmark invitations |
| [U5](ux/U5-library.md) | **Library** | Catalog browser (atoms, tiers, admission frontier) + the templates editor |
| [U6](ux/U6-prescriptions.md) | **Prescriptions** | The shelf, evidence view ("why am I drilling this"), outcomes surfacing |
| [U7](ux/U7-settings-devices.md) | **Settings & devices** | Device profiles + calibration ritual, the drill-scope config surface, practice knobs |
| [U8](ux/U8-onboarding-edges.md) | **Onboarding & edge states** | First-run + placement, no-MIDI, disconnects, fully-bright, day-one map |

## Mockups

**Built** — one page per surface in [ux/mockups/](ux/mockups/) (`U*.html`, self-contained: open in any browser; edit `ux/mockups/src/` and run `node build.mjs`, never the built files). Catalog toolchain and design language v2 (slate), with **landscape phone frames** for the players. Same coverage rule as the catalog: every screen and state a spec proposes has a frame, captioned against its spec — the mockups are the easier way to read U1–U8.

## Open questions

None standing at hub level (per-surface questions live in the child docs).
