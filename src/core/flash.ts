// F8 instance sampling (F8 §Mechanics): engine-B classes, each rep N fresh seed-derived
// instances — a figure rendered as a REAL MEASURE (clef, signature per context, time
// signature, rhythm skin) whose notes are diatonic under the signature (no inline marks;
// F2 T2 semantics — the signature APPLIES). Shapes are the mockup's ratified figures:
// interval walks, the triad snowman, 3–5-note scale fragments, broken-chord figures.
import type { FlashAtom } from "./catalog";
import { LETTER_PC, mulberry32, sigEffect } from "./reading";
import { FLASH_DISPLAY_MS } from "./constants";

export interface FlashNote { letter: number; octave: number; midi: number; }

export interface FlashInstance {
  notes: FlashNote[];        // sounding order (chord: low → high)
  chord: boolean;            // triadShape — one whole-bar stacked event
  time: "2/4" | "3/4" | "4/4";
  durs: string[];            // VexFlow duration per sounding event
  sig: number;
  clef: "treble" | "bass";   // grand resolves per instance (the figure appears in either staff)
  keyLabel: string | null;   // the major-key tonic for `key:X` misread tags (null when open)
}

export const flashDisplayMs = (tier: number): number =>
  FLASH_DISPLAY_MS[Math.max(0, Math.min(FLASH_DISPLAY_MS.length - 1, tier))];

/** Each instance's seed derives from the rep seed (04 §5: one seed re-renders all N). */
export const deriveInstanceSeed = (repSeed: number, i: number): number =>
  Math.floor(mulberry32((repSeed + 0x9e3779b9 * (i + 1)) >>> 0)() * 2 ** 31);

// absolute diatonic letter index: L = octave·7 + letter (C4 = 28)
const spellAt = (L: number, sig: number): FlashNote => {
  const letter = ((L % 7) + 7) % 7;
  const octave = Math.floor(L / 7);
  return { letter, octave, midi: 12 * (octave + 1) + LETTER_PC[letter] + sigEffect(letter, sig) };
};

// in-staff ± one ledger, per clef (treble C4..A5 · bass E2..C4), as diatonic indices
const CLEF_RANGE: Record<"treble" | "bass", [number, number]> = { treble: [28, 40], bass: [16, 28] };

const WALK_STEP: Record<string, number> = { second: 1, third: 2, fourth: 3, fifth: 4, sixth: 5 };

export function sampleFlash(a: FlashAtom, tier: number, seed: number): FlashInstance {
  const rnd = mulberry32(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  // −6 stays out: G♭ is scope-gated and F♯ carries the six-accidental slot (the F1 convention)
  const sig = a.keyContext === "open" ? 0
    : a.keyContext === "ks12" ? pick([-2, -1, 1, 2])
    : pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
  const clef: "treble" | "bass" = a.clef === "grand" ? pick(["treble", "bass"]) : a.clef;
  const [lo, hi] = CLEF_RANGE[clef];

  // the figure as relative letter offsets + its rhythm wardrobe (F8 §Params)
  let rel: number[];
  let chord = false;
  let skins: { time: FlashInstance["time"]; durs: string[] }[];
  if (a.pattern in WALK_STEP) {
    const step = WALK_STEP[a.pattern];
    // the whole walk must fit in-staff ± a ledger (13 diatonic letters per clef)
    const ns = [3, 4].filter(n => (n - 1) * step <= hi - lo);
    const n = pick(ns.length ? ns : [3]);
    const up = rnd() < 0.5;
    rel = Array.from({ length: n }, (_, i) => (up ? i : -i) * step);
    skins = n === 3 ? [{ time: "3/4", durs: ["q", "q", "q"] }]
      : [{ time: "4/4", durs: ["q", "q", "q", "q"] }, { time: "2/4", durs: ["8", "8", "8", "8"] }];
  } else if (a.pattern === "triadShape") {
    rel = [0, 2, 4];
    chord = true;
    skins = [{ time: "4/4", durs: ["w"] }, { time: "2/4", durs: ["h"] }];
  } else if (a.pattern === "scaleFragment") {
    const n = pick([3, 4, 5]);
    const up = rnd() < 0.5;
    rel = Array.from({ length: n }, (_, i) => (up ? i : -i));
    skins = n === 3 ? [{ time: "3/4", durs: ["q", "q", "q"] }]
      : n === 4 ? [{ time: "4/4", durs: ["q", "q", "q", "q"] }, { time: "2/4", durs: ["8", "8", "8", "8"] }]
      : [{ time: "3/4", durs: ["8", "8", "8", "8", "q"] }];
  } else if (a.pattern === "brokenChord") {
    rel = rnd() < 0.5 ? [0, 2, 4, 2] : [4, 2, 0, 2];
    skins = [{ time: "2/4", durs: ["8", "8", "8", "8"] }, { time: "4/4", durs: ["q", "q", "q", "q"] }];
  } else {
    throw new Error(`flash pattern not yet sampled: ${a.pattern}`); // cadence awaits 06 §7's shared vocabulary
  }

  const min = Math.min(...rel), max = Math.max(...rel);
  const base = lo - min + Math.floor(rnd() * (hi - max - (lo - min) + 1));
  const Ls = rel.map(r => base + r);
  const notes = (chord ? [...Ls].sort((x, y) => x - y) : Ls).map(L => spellAt(L, sig));
  return {
    notes, chord, ...pick(skins), sig, clef,
    // the key as its SIGNATURE spells it (−5 = D♭, never C♯) — the key:X tag and the strip read this
    keyLabel: sig === 0 ? null : KEY_LABELS[sig + 6],
  };
}

// major-key names per signature, −6…6 (the flat side spells flat: 5♭ = D♭, not C♯)
const KEY_LABELS = ["G♭", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯"];
