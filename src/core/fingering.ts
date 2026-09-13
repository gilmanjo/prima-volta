// Sourced fingering data (F5/F6 §Grading: sourced, cross-verified, NEVER invented — log #81).
// Absence is legal; invention is not: entries exist only where independent references agree.
//
// MAJOR SCALES (one octave, ascending; descending = same keys reversed) — three sources agree
// per key, including the B♭ RH tiebreak (4-1-2-3…, two sources against one):
//   · https://www.pianoscales.org/major.html
//   · https://piano.org/theory/piano-fingering/
//   · https://www.masterpiano.com/piano-scales
// MINOR SCALE FORMS: the online charts DISAGREE with one another (C♯m/F♯m/B♭m/G♯m RH+LH) —
// no entry ships until print-grade sourcing (ABRSM manual / RCM technique book); they are
// default-off scope, and un-sourced teach states simply show no numerals.
//
// TRIAD ARPEGGIOS (one octave up-down; the cycle plus its own terminal apex digit) — two
// independent sources agree on the pattern system and its exceptions:
//   · https://robertkelleyphd.com/home/teaching/keyboard/keyboard-arpeggio-fingering-chart/
//   · https://www.piano-play-it.com/arpeggios.html
// White-key roots: RH 1-2-3-5 · LH 5-3-2-1. Black-key roots (thumb stays on the white
// members): RH 2-1-2-4 · LH 2-1-4-2. Exceptions: F♯ major and E♭ minor are all-black —
// no white key for the thumb, so they take the white-key pattern; B♭ major LH 3-2-1-3;
// B♭ minor RH 2-3-1-2 · LH 3-2-1-3.
// DOM7/DIM7 ARPEGGIOS: per-key charts not yet sourced — no entry (default-off scope).
import type { ArpAtom, ScaleAtom } from "./catalog";
import { buildRun } from "./runs";

interface HandPair { rh: number[]; lh: number[]; }

const MAJOR_SCALE: Record<number, HandPair> = {
  0:  { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] }, // C
  1:  { rh: [2, 3, 1, 2, 3, 4, 1, 2], lh: [3, 2, 1, 4, 3, 2, 1, 3] }, // D♭
  2:  { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] }, // D
  3:  { rh: [3, 1, 2, 3, 4, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] }, // E♭
  4:  { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] }, // E
  5:  { rh: [1, 2, 3, 4, 1, 2, 3, 4], lh: [5, 4, 3, 2, 1, 3, 2, 1] }, // F
  6:  { rh: [2, 3, 4, 1, 2, 3, 1, 2], lh: [4, 3, 2, 1, 3, 2, 1, 4] }, // F♯
  7:  { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] }, // G
  8:  { rh: [3, 4, 1, 2, 3, 1, 2, 3], lh: [3, 2, 1, 4, 3, 2, 1, 3] }, // A♭
  9:  { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] }, // A
  10: { rh: [4, 1, 2, 3, 1, 2, 3, 4], lh: [3, 2, 1, 4, 3, 2, 1, 3] }, // B♭
  11: { rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [4, 3, 2, 1, 4, 3, 2, 1] }, // B
};

const WHITE_ARP: HandPair = { rh: [1, 2, 3, 5], lh: [5, 3, 2, 1] };
const BLACK_ARP: HandPair = { rh: [2, 1, 2, 4], lh: [2, 1, 4, 2] };

const ARP: Record<string, Record<number, HandPair>> = {
  maj: {
    0: WHITE_ARP, 2: WHITE_ARP, 4: WHITE_ARP, 5: WHITE_ARP, 7: WHITE_ARP, 9: WHITE_ARP, 11: WHITE_ARP,
    1: BLACK_ARP, 3: BLACK_ARP, 8: BLACK_ARP,
    6: WHITE_ARP,                                            // F♯ major: all black — thumb has no white
    10: { rh: [2, 1, 2, 4], lh: [3, 2, 1, 3] },              // B♭ major LH exception
  },
  min: {
    0: WHITE_ARP, 2: WHITE_ARP, 4: WHITE_ARP, 5: WHITE_ARP, 7: WHITE_ARP, 9: WHITE_ARP, 11: WHITE_ARP,
    1: BLACK_ARP, 6: BLACK_ARP, 8: BLACK_ARP,
    3: WHITE_ARP,                                            // E♭ minor: all black — as F♯ major
    10: { rh: [2, 3, 1, 2], lh: [3, 2, 1, 3] },              // B♭ minor exception, both hands
  },
};

/** The ascending-line fingering for one hand of a run atom — null when unsourced. */
export function lineFingering(a: ScaleAtom | ArpAtom, hand: "RH" | "LH"): number[] | null {
  const pair = a.family === "scale"
    ? (a.type === "major" ? MAJOR_SCALE[a.key] : null)
    : ARP[a.basis]?.[a.root] ?? null;
  if (!pair) return null;
  return hand === "LH" ? pair.lh : pair.rh;
}

/** Teach-state numerals (U2): midi → digit label for the run's path keys; null when unsourced.
 *  HT labels both hands; a shared boundary key joins differing digits ("3·4"). */
export function runLabels(a: ScaleAtom | ArpAtom): Record<number, string> | null {
  if (a.hand === "alternating") return null;
  const { slots } = buildRun(a);
  const ascLen = (slots.length + 1) / 2;
  const hands: ("LH" | "RH")[] = a.hand === "HT" ? ["LH", "RH"] : [a.hand];
  const out: Record<number, string> = {};
  for (let h = 0; h < hands.length; h++) {
    const f = lineFingering(a, hands[h]);
    if (!f) return null;
    for (let i = 0; i < ascLen; i++) {
      const midi = slots[i].midis[a.hand === "HT" ? h : 0];
      const d = String(f[i]);
      out[midi] = out[midi] !== undefined && out[midi] !== d ? `${out[midi]}·${d}` : d;
    }
  }
  return out;
}
