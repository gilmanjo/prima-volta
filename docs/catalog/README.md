# catalog/ — per-family exercise specs

One doc per family (full spec: trains, params, variants, tier ladder, grading defaults, prescription hooks, open questions) plus an HTML mockup per family in [mockups/](mockups/) — they render the actual exercise screens at phone width (390px, the at-instrument target per 11-UX) and carry **design language v1** (ebony lacquer / paper score cards / brass / felt red — see 11-UX).

**Coverage rule:** every variant and tier a spec proposes has a corresponding frame in its mockup page, grouped under labeled sections — review a family by scrolling its mockup top to bottom against its spec. ("Later" ○ entries in the hub matrix are not proposals and have no frames.)

**Notation standard:** score panels render with an **embedded VexFlow** (CDN script in the built pages) — real engraving in the review medium, and a dogfood of the production renderer. Hand-drawn SVG staves survive only on previously approved static panels; any new or revised score panel uses `vf()` (see `src/_kbd.js`).

Mockups are **self-contained** — double-click any `F*.html` into a browser and it renders fully (network needed only for the CDN fonts and VexFlow), no server, no sibling files. They are built artifacts: edit `mockups/src/` (`_style.css`, `_kbd.js`, `F*.body.html`) and run `node build.mjs` from `mockups/` to regenerate all eleven — never hand-edit the built files. They're communication artifacts, not production code; when a screen's design is contested, we iterate the mockup before touching the spec.

Shared dimensions, modality matrix, and admission summary: [../01-EXERCISE-CATALOG.md](../01-EXERCISE-CATALOG.md).
