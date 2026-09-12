# ux/ — per-surface UX specs

One doc per surface (U1–U8), reviewable and rulable independently — the hub with global rules, design language, and the surface index is [../11-UX-SURFACES.md](../11-UX-SURFACES.md).

**Conventions:** every spec assumes the hub's global rules (landscape-first players at ~844×390, the wrong-answer-blocks-for-reconciliation rule, counts honesty, no-debt copy, the top-docked four-tab navigation). Cross-references point at owning docs — behavior is specified once, in its owner (08 for serving, 03 for grading, 07 for ratings); these docs specify *how it looks and feels*.

**Mockups:** built — one page per surface in [mockups/](mockups/) (`U*.html`, self-contained; edit `mockups/src/` and run `node build.mjs` there, never the built files), on the catalog's toolchain (see [../catalog/README.md](../catalog/README.md)). The coverage rule applies — every screen and state a spec proposes has a frame.
