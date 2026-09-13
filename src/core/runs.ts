// Expected-run builder for pulsed material (F5 scales · F6 arpeggios, T1 form):
// one octave, up-down, top note once at the apex (the ruled turnaround), one note per beat.
// Registers are the T1 home positions: RH from C4+key, LH an octave below; HT parallel.
import type { ArpAtom, ScaleAtom, ScaleType } from "./catalog";

/** One grid slot: the note(s) due on this beat (two for HT — one per hand). */
export interface RunSlot { beat: number; midis: number[]; }
export interface Run {
  slots: RunSlot[];
  pathMidis: number[]; // distinct keys of the whole path (teach display, live lighting)
  noteCount: number;
}

// Interval patterns per scale type (type data, F5 §Params). Melodic minor descends
// through the natural form — the standard exercise definition, not an invention.
const SCALE_STEPS: Record<ScaleType, { asc: number[]; descAsc?: number[] }> = {
  major: { asc: [2, 2, 1, 2, 2, 2, 1] },
  minorNatural: { asc: [2, 1, 2, 2, 1, 2, 2] },
  minorHarmonic: { asc: [2, 1, 2, 2, 1, 3, 1] },
  minorMelodic: { asc: [2, 1, 2, 2, 2, 2, 1], descAsc: [2, 1, 2, 2, 1, 2, 2] },
  chromatic: { asc: Array(12).fill(1) },
};

const ARP_IVS: Record<string, number[]> = { maj: [0, 4, 7], min: [0, 3, 7], dom7: [0, 4, 7, 10], dim7: [0, 3, 6, 9] };

const line = (base: number, steps: number[]): number[] => {
  const out = [base]; let m = base;
  for (const s of steps) { m += s; out.push(m); }
  return out;
};

/** Ascend `up`, descend `down` (defaults to `up`) — apex sounded once. */
const upDown = (up: number[], down = up): number[] => [...up, ...down.slice(0, -1).reverse()];

export function buildRun(a: ScaleAtom | ArpAtom): Run {
  let rhSeq: number[];
  if (a.family === "scale") {
    const def = SCALE_STEPS[a.type];
    const base = 60 + a.key;
    rhSeq = upDown(line(base, def.asc), def.descAsc ? line(base, def.descAsc) : undefined);
  } else {
    const base = 60 + a.root;
    rhSeq = upDown([...ARP_IVS[a.basis].map(iv => base + iv), base + 12]);
  }
  const lhSeq = rhSeq.map(m => m - 12);
  const seqs = a.hand === "HT" ? [lhSeq, rhSeq] : a.hand === "LH" ? [lhSeq] : [rhSeq];
  return {
    slots: rhSeq.map((_, i) => ({ beat: i, midis: seqs.map(s => s[i]) })),
    pathMidis: [...new Set(seqs.flat())].sort((x, y) => x - y),
    noteCount: seqs.reduce((n, s) => n + s.length, 0),
  };
}
