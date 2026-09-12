# spikes/ — measurement instruments

**Local-only, never deployed, never imported by `src/`** (ground rule 2; 13 §8). These exist to close the suite's parked empirical values before the code that consumes them.

- **[staircase-sim/](staircase-sim/sim.mjs)** — the sim harness in its spike life (05 §5): runs the named scenarios (worker · overreacher · flapper check · crawler · returner) against the documented band controller and prints verdicts plus the **step-size probe** (observed sawtooth span vs the 3–5-point calibration target vs 03 §1.4's ~87–97 prose). `node spikes/staircase-sim/sim.mjs`
- **[fp30x-rig/](fp30x-rig/index.html)** — the FP-30X measurement rig (03's parked constants): the 8-click latency/jitter calibration ritual, a velocity-floor probe, and a hesitation-baseline run, with JSON export. Web MIDI needs a secure context: `node spikes/fp30x-rig/serve.mjs` then open http://localhost:8477 in Chrome with the keyboard connected over USB.

When the constants settle, scenario replays graduate into the test layer (`sim/`, 13 §8); this folder stays a lab bench.
