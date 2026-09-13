// Pulsed-run grader (03 §4 v1 windowed matcher · 03 §6 pulsed map): scales, arpeggio
// traversals — the pulse is part of the material. Association precedes verdict: played
// notes match to expected by pitch within ±half a beat (min 250ms), so a late onset is a
// TIMING event and never masquerades as a pitch failure. Rating map (03 §6): any pitch
// error, or more than one out-of-window onset → Again · exactly one → Hard · all inside
// their grid windows → Good. Hesitations are not a pulsed concept (03 §1.3 — the grid IS
// the timing judgment); evenness (IOI CV) rides along as diagnostic, never rating.
import { ASSOC_MIN_MS, GRID_W_BASE_MS } from "../constants";
import type { ErrorEvent, GradeResult, NoteEvent } from "../types";
import type { RunSlot } from "../runs";

export interface PulsedRunSpec {
  slots: RunSlot[];
  t0Ms: number;      // clock time of beat 0 (set by the count-in)
  beatMs: number;
  windowMs: number;  // the grid window W, tempo-scaled + jitter-widened (gridWindowMs)
  promptAtMs: number;
}

export interface PulsedOutcome {
  result: GradeResult;
  evennessCv: number | null;   // IOI coefficient of variation over matched onsets (diagnostic)
  outOfWindow: number;
}

/** 03 §4: W = 120ms at ♩=60-equivalent, scaled by tempo, widened by device jitter. */
export function gridWindowMs(beatMs: number, jitterMs: number): number {
  return GRID_W_BASE_MS * (beatMs / 1000) + jitterMs;
}

interface Slot { midi: number; tMs: number; matched: NoteEvent | null; resolved: boolean; }

export function gradePulsedRun(spec: PulsedRunSpec, notesIn: NoteEvent[]): PulsedOutcome {
  const assocMs = Math.max(spec.beatMs / 2, ASSOC_MIN_MS);
  const expected: Slot[] = spec.slots.flatMap(s =>
    s.midis.map(midi => ({ midi, tMs: spec.t0Ms + s.beat * spec.beatMs, matched: null, resolved: false })));
  const endMs = expected.length ? expected[expected.length - 1].tMs : spec.t0Ms;
  // notes before the first beat's association reach were count-in fidgets, not the run
  const played = notesIn
    .filter(n => n.onMs >= spec.t0Ms - assocMs && n.onMs <= endMs + assocMs)
    .sort((a, b) => a.onMs - b.onMs)
    .map(n => ({ n, used: false }));

  // pass 1 — exact-pitch association, score order, nearest unmatched (03 §4)
  for (const e of expected) {
    let best: { n: NoteEvent; used: boolean } | null = null, bestD = Infinity;
    for (const p of played) {
      if (p.used || p.n.midi !== e.midi) continue;
      const d = Math.abs(p.n.onMs - e.tMs);
      if (d <= assocMs && d < bestD) { best = p; bestD = d; }
    }
    if (best) { best.used = true; e.matched = best.n; e.resolved = true; }
  }

  const errors: ErrorEvent[] = [];
  let outOfWindow = 0;
  for (const e of expected) {
    if (!e.matched) continue;
    const dt = e.matched.onMs - e.tMs;
    if (Math.abs(dt) > spec.windowMs) {
      outOfWindow++;
      errors.push({ type: dt < 0 ? "early" : "late", expectedMidi: e.midi, playedMidi: e.matched.midi, timingDeltaMs: Math.round(dt), tags: [] });
    }
  }

  // pass 2 — wrongOctave: right pc, wrong register (03 §4's distinct diagnosis)
  for (const e of expected) {
    if (e.resolved) continue;
    const p = played.find(p => !p.used && p.n.midi !== e.midi && ((p.n.midi - e.midi) % 12 + 12) % 12 === 0
      && Math.abs(p.n.onMs - e.tMs) <= assocMs);
    if (p) { p.used = true; e.resolved = true; errors.push({ type: "wrongOctave", expectedMidi: e.midi, playedMidi: p.n.midi, tags: [] }); }
  }
  // pass 3 — substitution: pitch-adjacent (≤2 semitones) unmatched pair (03 §4)
  for (const e of expected) {
    if (e.resolved) continue;
    const p = played.find(p => !p.used && Math.abs(p.n.midi - e.midi) <= 2
      && Math.abs(p.n.onMs - e.tMs) <= assocMs);
    if (p) { p.used = true; e.resolved = true; errors.push({ type: "substitution", expectedMidi: e.midi, playedMidi: p.n.midi, tags: [] }); }
  }
  for (const e of expected) if (!e.resolved) errors.push({ type: "deletion", expectedMidi: e.midi, tags: [] });
  for (const p of played) if (!p.used) errors.push({ type: "insertion", playedMidi: p.n.midi, tags: [] });

  const pitchErrors = errors.filter(e => e.type === "substitution" || e.type === "insertion" || e.type === "deletion" || e.type === "wrongOctave").length;
  const rating = pitchErrors > 0 || outOfWindow > 1 ? 1 : outOfWindow === 1 ? 2 : 3;

  // evenness: IOI CV over on-pitch matched onsets, in expected order (diagnostic only)
  const onsets = expected.filter(e => e.matched).map(e => e.matched!.onMs);
  let evennessCv: number | null = null;
  if (onsets.length >= 3) {
    const iois: number[] = [];
    for (let i = 1; i < onsets.length; i++) iois.push(onsets[i] - onsets[i - 1]);
    const mean = iois.reduce((a, b) => a + b, 0) / iois.length;
    if (mean > 0) evennessCv = Math.sqrt(iois.reduce((a, b) => a + (b - mean) ** 2, 0) / iois.length) / mean;
  }

  const first = played.find(p => p.used);
  return {
    result: {
      rating,
      latencyMs: first ? Math.round(first.n.onMs - spec.promptAtMs) : null, // first-onset delta (F6)
      errorEvents: errors,
      clean: pitchErrors === 0,               // no wrong notes (timing judged separately here)
      inWindow: pitchErrors === 0 && outOfWindow === 0, // Good-level: every onset in its window
    },
    evennessCv,
    outOfWindow,
  };
}
