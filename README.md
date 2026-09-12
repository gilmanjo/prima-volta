# Prima Volta

*The first time through.* A personal piano fluency & sight-reading trainer: true spaced repetition on musical micro-skills answered on a MIDI keyboard, generated sight-reading under an adaptive per-axis difficulty staircase, mistake-pattern diagnosis, and a quota-free practice surface.

**Status: docs-complete, implementation at Phase 0.** This project was designed docs-before-code: the entire app is specified in [docs/](docs/README.md) — fourteen documents, all adjudicated — before any product code. The [decision log](docs/00-OVERVIEW.md#decision-log) is the dated record of every design ruling; the docs themselves carry no edit history by rule.

**View it rendered:** the mockups and figures are self-contained HTML, served live via GitHub Pages — [design figures](https://gilmanjo.github.io/prima-volta/docs/figures/figures.html) · [exercise mockups F1–F11](https://gilmanjo.github.io/prima-volta/docs/catalog/mockups/F4-chords.html) · [UX surfaces U1–U8](https://gilmanjo.github.io/prima-volta/docs/ux/mockups/U1-strength-map.html) — or browse the [PNG snapshot gallery](docs/snapshots/README.md) inline on GitHub.

- **[docs/](docs/README.md)** — the design suite (00 overview → 13 testing), with reading order and status
- **[docs/figures/](docs/figures/figures.html)** — concept diagrams + outcome charts computed by seeded mini-simulations of the documented mechanics
- **[docs/catalog/mockups/](docs/catalog/README.md)** and **docs/ux/mockups/** — self-contained HTML mockups of every exercise and surface
- **[seed/](seed/seeder.mjs)** — the pure, deterministic seeder: enumerates the full atom space (7,623 atoms; 6,068 in default scope), asserts the <20k budget, emits `catalog.json`

Stack (per [docs/10-ARCHITECTURE.md](docs/10-ARCHITECTURE.md)): Next.js on Cloudflare Workers, D1 + Drizzle, ts-fsrs, VexFlow, tonal, raw Web MIDI — all interactive compute client-side, the append-only attempt log as the source of truth.

License: [MIT](LICENSE).
