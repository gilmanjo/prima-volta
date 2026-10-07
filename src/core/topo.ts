// F9 stream sampling (F9 §Mechanics): engine-A sampled targets, seed logged. A rep is one
// stream — notes 8–12 targets, grabs 5–7 — spawning at a random register (the cold find),
// successive targets governed by the span: in-position stays within a fifth of the spawn,
// leap ≤ octave puts 5–12 semitones between finds, the wide tier 13–24. Targets spell on
// the canonical anchors; the staff cue engraves on the hand's home staff.
import type { TopoAtom } from "./catalog";
import { PC_SPELLING, spellNoteName, type SpelledNote } from "./intervals";
import { LETTER_PC, mulberry32 } from "./reading";

export interface TopoTarget {
  midis: number[];               // sounding keys (note: 1 · triad: 3 · tetrad: 4), low → high
  label: string;                 // the name cue ("A♭3" · "A♭3 maj")
  specs: { letter: number; octave: number; inline: number | null }[]; // the staff cue
}

export interface TopoStream { targets: TopoTarget[]; }

// registers: the on-screen keybed's feedback range per hand; the staff cue narrows the LH
// to what the bass staff can carry within a couple of ledgers (F9 §Mechanics)
function boundsFor(a: TopoAtom): [number, number] {
  if (a.hand === "RH") return [57, 84];
  return a.cue === "staff" ? [45, 64] : [45, 72];
}

const SPAN_GAP: Record<TopoAtom["span"], [number, number] | null> = {
  inPosition: null,              // within a fifth of the SPAWN, not of each other
  leapOctave: [5, 12],
  leapWide: [13, 24],
};

// chord stacks as (letterStep, semitones) from the root
const STACKS: Record<string, [number, number][]> = {
  maj: [[2, 4], [4, 7]], min: [[2, 3], [4, 7]], dom7: [[2, 4], [4, 7], [6, 10]],
};

const spellAtMidi = (midi: number): SpelledNote => {
  const pc = ((midi % 12) + 12) % 12;
  const [letter, inline] = PC_SPELLING[pc];
  const octave = (midi - inline - LETTER_PC[letter]) / 12 - 1;
  return { letter, octave, inline, midi };
};

const chordTone = (root: SpelledNote, steps: number, semis: number): SpelledNote => {
  let letter = root.letter + steps;
  let octave = root.octave;
  while (letter > 6) { letter -= 7; octave++; }
  const midi = root.midi + semis;
  const inline = midi - (12 * (octave + 1) + LETTER_PC[letter]);
  return { letter, octave, inline, midi };
};

const toSpec = (n: SpelledNote) => ({ letter: n.letter, octave: n.octave, inline: n.inline === 0 ? null : n.inline });

export function sampleTopoStream(a: TopoAtom, tier: number, seed: number): TopoStream {
  const rnd = mulberry32(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const chord = a.target !== "note";
  const [lo, hi] = boundsFor(a);
  const rootHi = hi - (a.target === "tetrad" ? 10 : chord ? 7 : 0); // the whole stack stays in range
  const length = chord ? 5 + Math.floor(rnd() * 3) : 8 + Math.floor(rnd() * 5);

  const roots: number[] = [lo + Math.floor(rnd() * (rootHi - lo + 1))]; // the cold find
  for (let i = 1; i < length; i++) {
    const prev = roots[i - 1];
    const gap = SPAN_GAP[a.span];
    const pool: number[] = [];
    for (let m = lo; m <= rootHi; m++) {
      if (m === prev) continue; // the next find is always a move
      if (gap === null) { if (Math.abs(m - roots[0]) <= 7) pool.push(m); }
      else { const d = Math.abs(m - prev); if (d >= gap[0] && d <= gap[1]) pool.push(m); }
    }
    roots.push(pool.length ? pick(pool) : prev + (prev > (lo + rootHi) / 2 ? -7 : 7)); // a leap back inward, never a stall
  }

  const targets: TopoTarget[] = roots.map(midi => {
    const root = spellAtMidi(midi);
    if (!chord) return { midis: [midi], label: spellNoteName(root), specs: [toSpec(root)] };
    const quality = a.target === "tetrad" ? "dom7" : pick(["maj", "min"] as const);
    const tones = [root, ...STACKS[quality].map(([s, k]) => chordTone(root, s, k))];
    return {
      midis: tones.map(t => t.midi),
      label: `${spellNoteName(root)} ${quality === "dom7" ? "7" : quality}`,
      specs: tones.map(toSpec),
    };
  });
  return { targets };
}
