// Staircase sim — spike life (05 §5, 13 §8). Local-only instrument; never imported by src/.
// Implements 05 §3's controller verbatim (bands 95/85, 10-entry window act-at-5, 3-entry
// cooldown, 3-consecutive-<70 collapse exempt from act-at-5) against a simple ground-truth
// learner (13 §2 — deliberately not FSRS), runs the named scenarios, prints verdicts and
// the STEP-SIZE PROBE. Constants below are 05's v0 values; tune here, then ratify in docs.
// Usage: node spikes/staircase-sim/sim.mjs [--step 4] [--seeds 5]

const BANDS = { promote: 95, demoteBelow: 85, collapse: 70 };
const WINDOW = 10, ACT_AT = 5, COOLDOWN = 3;
const argOf = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? Number(process.argv[i + 1]) : d; };
const STEP = argOf("--step", 4);       // clean-rate cost per subrank (calibration target: 3–5)
const SEEDS = argOf("--seeds", 5);

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gaussian(rnd) { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"], SUBS = ["--", "-", "+", "++", "+++"];
const posName = p => RANKS[Math.floor(p / 5)] + SUBS[p % 5];

function run(persona, seed, reads) {
  const rnd = mulberry32(seed);
  let pos = persona.pos0, skill = persona.skill0(STEP), win = [], cool = 0, c70 = 0;
  const trace = [];
  for (let i = 0; i < reads; i++) {
    if (persona.pause && i >= persona.pause[0] && i < persona.pause[1]) { skill *= persona.decay ?? 1; continue; } // absence: no reads
    const gap = Math.max(0, pos * STEP - skill);
    const clean = Math.min(100, Math.max(40, 100 - gap + gaussian(rnd) * persona.sigma));
    skill = Math.min(persona.cap ?? 300, skill + persona.rate);
    let ev = null;
    c70 = clean < 70 ? c70 + 1 : 0;
    if (cool > 0) { cool--; }
    else {
      win.push(clean); if (win.length > WINDOW) win.shift();
      if (c70 >= 3 && pos > 0) { pos--; win = []; cool = COOLDOWN; c70 = 0; ev = "collapse"; }
      else if (win.length >= ACT_AT) {
        const m = win.reduce((a, b) => a + b, 0) / win.length;
        if (m >= BANDS.promote && pos < 44) { pos++; win = []; cool = COOLDOWN; ev = "promote"; }
        else if (m < BANDS.demoteBelow && pos > 0) { pos--; win = []; cool = COOLDOWN; ev = "demote"; }
      }
    }
    trace.push({ i, clean, mean: win.length ? win.reduce((a, b) => a + b, 0) / win.length : null, pos, ev });
  }
  return trace;
}

const PERSONAS = {
  worker:      { pos0: 8, skill0: s => 8 * s - 2 * s, rate: 0.35, sigma: 2.2 },
  overreacher: { pos0: 14, skill0: s => 14 * s - 19, rate: 0.30, sigma: 2.5 },
  crawler:     { pos0: 4, skill0: s => 4 * s - 1.5 * s, rate: 0.12, sigma: 1.2 },
  returner:    { pos0: 8, skill0: s => 8 * s - 2 * s, rate: 0.35, sigma: 2.2, pause: [60, 100], decay: 0.985 },
};

const summarize = tr => {
  const active = tr.filter(d => d);
  return {
    end: active.at(-1).pos,
    promotions: active.filter(d => d.ev === "promote").length,
    demotions: active.filter(d => d.ev === "demote" || d.ev === "collapse").length,
    meanClean: active.reduce((a, d) => a + d.clean, 0) / active.length,
  };
};

console.log(`staircase sim — STEP=${STEP} (target 3–5) · bands ${BANDS.promote}/${BANDS.demoteBelow}/${BANDS.collapse} · window ${WINDOW} act@${ACT_AT} · cooldown ${COOLDOWN} · ${SEEDS} seeds\n`);

const results = {};
for (const [name, p] of Object.entries(PERSONAS)) {
  const runs = Array.from({ length: SEEDS }, (_, k) => summarize(run(p, 11 + k * 13, 160)));
  const avg = f => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  results[name] = { start: posName(p.pos0), end: posName(Math.round(avg(r => r.end))), promotions: avg(r => r.promotions).toFixed(1), demotions: avg(r => r.demotions).toFixed(1), meanClean: avg(r => r.meanClean).toFixed(1) };
}
console.table(results);

// ---- scenario verdicts (05 §5's acceptance shapes) ----
const v = [];
v.push(["worker holds the band and climbs", Number(results.worker.promotions) >= 5 && Number(results.worker.demotions) === 0]);
v.push(["overreacher steps down promptly, then climbs (no oscillation)", Number(results.overreacher.demotions) >= 1 && Number(results.overreacher.demotions) <= 4 && Number(results.overreacher.promotions) >= 1]);
v.push(["crawler climbs slowly, never demoted (slow-but-clean is legitimate)", Number(results.crawler.demotions) === 0 && Number(results.crawler.promotions) >= 1]);
v.push(["returner resumes without collapse spirals", Number(results.returner.demotions) <= 2]);

// ---- FLAPPER CHECK: adjacent-subrank clean-rate gap must sit under the 10-pt hold band ----
v.push([`flapper impossible: per-subrank step ${STEP} < hold-band width ${BANDS.promote - BANDS.demoteBelow}`, STEP < (BANDS.promote - BANDS.demoteBelow)]);

// ---- STEP-SIZE PROBE (05 §5 / 13 §5.4): observed sawtooth vs the two ratified sentences ----
const full = run(PERSONAS.worker, 11, 160);
const peaks = [], troughs = [];
for (let i = 1; i < full.length; i++) {
  if (full[i].ev !== "promote") continue;
  for (let j = i - 1; j >= 0; j--) if (full[j].mean != null) { peaks.push(full[j].mean); break; }
  for (let j = i + ACT_AT; j < Math.min(i + ACT_AT + 4, full.length); j++) if (full[j].mean != null) { troughs.push(full[j].mean); break; }
}
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
console.log(`\nstep-size probe: observed sawtooth ≈ ${mean(troughs).toFixed(1)} → ${mean(peaks).toFixed(1)} at STEP=${STEP}.`
  + ` 03 §1.4's prose says ~87–97, which needs STEP≈8–10 — but the anti-flapping invariant requires STEP < the 10-pt hold band.`
  + ` Try: node spikes/staircase-sim/sim.mjs --step 8   (expect flapper ✗) — the empirical reconciliation 05 §5 asks for.`);

let fail = 0;
for (const [name, ok] of v) { console.log(`${ok ? "✓" : "✗"} ${name}`); if (!ok) fail++; }
process.exit(fail ? 1 : 0);
