// Drill-loop personas (13 §3/§5 — Phase 1 ships: worker · overreacher · device-biased).
// Drives the REAL grader → scheduler → filler over virtual days with a ground-truth learner
// that is deliberately not FSRS (13 §2). Invariants here are the constitution, mechanized.
import { describe, it, expect } from "vitest";
import { catalog, chordPcs, compareAdmission, subsumedBy, type ChordAtom } from "../src/core/catalog";
import { next, noteServed, type FillerState } from "../src/core/filler";
import { gradeDiscreteChord } from "../src/core/grader/discrete";
import { afterTeach, applyDerived, applyRep, retrievability, windowFor, type ReviewRow } from "../src/core/scheduler";
import type { NoteEvent, Pc } from "../src/core/types";

function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const POOL: ChordAtom[] = (catalog.defaults("chord") as ChordAtom[])
  .filter(a => a.answer === "midi" && !a.stream && a.cue === "name" && a.form === "blocked")
  .sort(compareAdmission)
  .slice(0, 60); // maj wave, RH/LH/HT — exercises the lattice

interface Persona { seed: number; learn: number; errBase: number; latBase: number; latSkill: number; offsetMs: number; }
const PERSONAS: Record<string, Persona> = {
  worker: { seed: 5, learn: 0.18, errBase: 0.3, latBase: 2600, latSkill: 2100, offsetMs: 0 },
  overreacher: { seed: 9, learn: 0.05, errBase: 0.55, latBase: 3400, latSkill: 1500, offsetMs: 0 },
  deviceBiased: { seed: 13, learn: 0.18, errBase: 0.3, latBase: 2600, latSkill: 2100, offsetMs: 35 }, // uniform shift (09 r12's shape)
};

function playChord(pcs: Pc[], hand: string, promptAt: number, lat: number, wrong: boolean, rnd: () => number): NoteEvent[] {
  const base = hand === "LH" ? 48 : 60;
  const mk = (list: Pc[], at: number, reg: number): NoteEvent[] =>
    list.map((pc, i) => ({ midi: reg + pc + (pc < list[0] ? 12 : 0), onMs: at + i * 12, vel: 60 }));
  let played = [...pcs];
  if (wrong) played[Math.floor(rnd() * played.length)] = ((played[0] + 1) % 12) as Pc;
  if (hand !== "HT") return mk(played, promptAt + lat, base);
  return [...mk(played, promptAt + lat, 48), ...mk(wrong ? pcs : played, promptAt + lat + 20, 60)]; // error lives in LH
}

function run(p: Persona, days: number, repsPerDay: number) {
  const rnd = mulberry32(p.seed);
  const g = new Map<string, number>(); // ground-truth strength, per atom
  const state: FillerState = { cards: new Map(), recentServed: [], admittedThisWindow: [] };
  const rows: ReviewRow[] = [];
  let served = 0, graduations = 0, againNows = 0, attempts = 0;

  for (let day = 0; day < days; day++) {
    for (const [, s] of g) void s; // (decay below)
    for (const id of g.keys()) g.set(id, g.get(id)! * 0.985); // nightly forgetting
    for (let r = 0; r < repsPerDay; r++) {
      const nowMs = day * 86_400_000 + r * 20_000;
      const res = next({ pool: POOL }, state, { servedCount: served, nowMs });
      if (res.kind === "polishing" || res.kind === "unavailable") continue;
      const atom = res.atom;
      noteServed(state, atom); served++;
      if (res.kind === "teach") {
        g.set(atom.id, 0.35);
        state.cards.set(atom.id, afterTeach(res.card));
        continue;
      }
      const skill = g.get(atom.id) ?? 0.35;
      const wrong = rnd() < p.errBase * (1 - skill);
      const lat = Math.max(250, p.latBase - p.latSkill * skill + rnd() * 400 + p.offsetMs);
      const pcs = chordPcs(atom);
      const notes = playChord(pcs, atom.hand as string, nowMs, lat, wrong, rnd);
      const subs = subsumedBy(atom);
      const graded = gradeDiscreteChord(
        { pcs, hand: atom.hand as "RH" | "LH" | "HT", windowMs: windowFor(res.card), promptAtMs: nowMs },
        notes,
        atom.hand === "HT"
          ? { LH: subs.find(s => s.hand === "LH")?.id, RH: subs.find(s => s.hand === "RH")?.id,
              embeddedWindowMs: 5000 }
          : undefined,
      );
      attempts++;
      const attemptId = `a${attempts}`;
      const before = res.card.step;
      const { card, row } = applyRep(res.card, graded.primary, attemptId, { servedCount: served, nowMs });
      state.cards.set(atom.id, card);
      rows.push(row);
      if (before !== "graduated" && card.step === "graduated") graduations++;
      if (card.step === "againNow") againNows++;
      // lattice: embedded results flow down, improvement-only
      for (const [subId, er] of graded.embedded) {
        const subCard = state.cards.get(subId);
        if (!subCard) continue; // not introduced → nothing to credit (lineages climb, 02 §3)
        const out = applyDerived(subCard, er, attemptId, `${attemptId}:${subId}`, { servedCount: served, nowMs });
        if (out) { state.cards.set(subId, out.card); rows.push(out.row); }
      }
      g.set(atom.id, skill + p.learn * (1 - skill) * (wrong ? 0.35 : 1));
    }
  }
  return { state, rows, served, graduations, againNows };
}

describe("drill-loop personas (13 — real modules, virtual weeks)", () => {
  it("the worker: practices 3 virtual weeks, graduates a real cohort, every rep leaves a row", () => {
    const r = run(PERSONAS.worker, 21, 60);
    expect(r.served).toBeGreaterThan(800);
    expect(r.graduations).toBeGreaterThan(10);
    expect(r.rows.length).toBeGreaterThan(600);
    // constitution: derived rows are improvement-only Goods with a parent (02 §3)
    const derived = r.rows.filter(x => x.derived);
    expect(derived.every(x => x.rating === 3 && x.parentAttemptId)).toBe(true);
    // the map brightens: mean retrievability of graduated cards is honest and nonzero
    const grads = [...r.state.cards.values()].filter(c => c.step === "graduated");
    const meanR = grads.reduce((a, c) => a + retrievability(c, 21 * 86_400_000), 0) / grads.length;
    expect(meanR).toBeGreaterThan(0.5);
  });

  it("the overreacher (drill-grade): heavy relearn churn, never a larger graduated cohort", () => {
    const over = run(PERSONAS.overreacher, 10, 60);
    const work = run(PERSONAS.worker, 10, 60);
    const unique = (r: ReturnType<typeof run>) => [...r.state.cards.values()].filter(c => c.step === "graduated").length;
    expect(over.againNows).toBeGreaterThan(work.againNows * 3); // the churn signature
    expect(unique(over)).toBeLessThanOrEqual(unique(work));     // errors never grow the cohort
    // note: raw `graduations` counts RE-graduations after lapses — churn inflates it by design
  });

  it("the device-biased (+35 ms uniform): the generous learning window absorbs it — grading unchanged", () => {
    const biased = run(PERSONAS.deviceBiased, 10, 60);
    const clean = run(PERSONAS.worker, 10, 60);
    // same seed family, small offset: graduation counts land in the same ballpark (rule 12's
    // detection is a 09 diagnosis for Phase 4 — Phase 1 only proves the offset doesn't distort drills)
    expect(Math.abs(biased.graduations - clean.graduations)).toBeLessThan(clean.graduations * 0.5 + 5);
  });
});
