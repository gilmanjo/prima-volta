# spikes/ — measurement instruments

**Local-only, never deployed, never imported by `src/`** (ground rule 2; 13 §8). These exist to close the suite's parked empirical values before the code that consumes them.

- **[staircase-sim/](staircase-sim/sim.mjs)** — the sim harness in its spike life (05 §5): runs the named scenarios (worker · overreacher · flapper check · crawler · returner) against the documented band controller and prints verdicts plus the **step-size probe** (observed sawtooth span vs the 3–5-point calibration target vs 03 §1.4's ~87–97 prose). `node spikes/staircase-sim/sim.mjs`
- **[device-rig/](device-rig/index.html)** — the device measurement rig (03's parked constants, per keyboard × transport): the 8-click latency/jitter calibration ritual, a velocity-floor probe, and a hesitation-baseline run, with JSON export. **The FP-90X · USB session is the load-bearing one** (the practice instrument); the desk FP-30X validates the rig, supplies the BLE comparison, and cross-checks that two devices give consistent hesitation baselines. Two ways to run it (Web MIDI needs a secure context):
  - **At the desk:** `node spikes/device-rig/serve.mjs` → http://localhost:8477 in Chrome.
  - **At the living-room FP-90X:** open **https://gilmanjo.github.io/prima-volta/spikes/device-rig/** in Android Chrome with the phone on the keyboard's USB — no laptop needed. (Pages mirrors the repo; the rig still never ships *in the app*, which is ground rule 2's actual line.)

When the constants settle, scenario replays graduate into the test layer (`sim/`, 13 §8); this folder stays a lab bench.
