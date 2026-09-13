// F2 instance sampling (02 §1: engine-A atoms with SAMPLED targets — seeded variety, no
// N-instance aggregation; the seed is logged so any rep can be re-displayed). Pure and
// deterministic: same atom + seed → same instance, forever (03 §1.6's re-grade spirit).
import type { ReadingAtom } from "./catalog";
import type { Pc } from "./types";

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_PC: number[] = [0, 2, 4, 5, 7, 9, 11];
const ACC_GLYPH: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "♮", 1: "♯", 2: "𝄪" };
// sharps order F C G D A E B · flats order B E A D G C F, as letter indices
const SHARP_LETTERS = [3, 0, 4, 1, 5, 2, 6];
const FLAT_LETTERS = [6, 2, 5, 1, 4, 0, 3];

export interface ReadingInstance {
  letter: number;            // 0–6 = C–B
  octave: number;            // scientific octave of the letter
  inline: number | null;     // inline accidental −2..+2 (0 = ♮); null = the signature governs
  eff: number;               // the EFFECTIVE accidental (inline, else the signature's)
  sig: number;               // key signature (0 when keyContext is open)
  clef: "treble" | "bass";   // grand resolves to the sampled staff
  midi: number;              // the SOUNDING pitch (octave-strict — register identity is the point)
  spelled: string;           // symbolic name, verbatim forever ("F𝄪4" ≠ "G4", 03 §3)
}

// Diatonic sampling pools per clef × band, as [letter, octave] spans (F2 §Params: staff
// plus 1–2 ledger either side; ledger3 = the deep zones beyond).
const POOLS: Record<"treble" | "bass", Record<"staff12" | "ledger3", [number, number][]>> = {
  treble: {
    staff12: span(5, 3, 0, 6),                    // A3 … C6
    ledger3: [...span(0, 3, 3, 3), ...span(2, 6, 5, 6)], // C3–F3 · E6–A6
  },
  bass: {
    staff12: span(0, 2, 2, 4),                    // C2 … E4
    ledger3: [...span(3, 1, 6, 1), ...span(4, 4, 0, 5)], // F1–B1 · G4–C5
  },
};

function span(l0: number, o0: number, l1: number, o1: number): [number, number][] {
  const out: [number, number][] = [];
  let l = l0, o = o0;
  for (;;) {
    out.push([l, o]);
    if (l === l1 && o === o1) return out;
    l++;
    if (l > 6) { l = 0; o++; }
  }
}

export const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** What the signature does to a letter: −1, 0, or +1. */
export function sigEffect(letter: number, sig: number): number {
  if (sig > 0) return SHARP_LETTERS.slice(0, sig).includes(letter) ? 1 : 0;
  if (sig < 0) return FLAT_LETTERS.slice(0, -sig).includes(letter) ? -1 : 0;
  return 0;
}

/** Canonical sounding spelling: the letter with its EFFECTIVE accidental (inline overrides
 *  the signature; ♮/no-effect shows nothing). Under D major, the unmarked F line spells F♯4 —
 *  the T2 lesson — and that exact string is what the selector must produce (03 §3). */
export function spellSounding(letter: number, octave: number, inline: number | null, sig: number): string {
  const eff = inline !== null ? inline : sigEffect(letter, sig);
  return `${LETTERS[letter]}${eff === 0 ? "" : ACC_GLYPH[eff]}${octave}`;
}

export function sampleReading(a: ReadingAtom, seed: number): ReadingInstance {
  const rnd = mulberry32(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const clef = a.clef === "grand" ? pick(["treble", "bass"] as const) : a.clef;
  const [letter, octave] = pick(POOLS[clef][a.band]);
  const sig = a.keyContext === "open" ? 0
    : a.keyContext === "ks14" ? pick([-4, -3, -2, -1, 1, 2, 3, 4])
    : pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]);
  const fromSig = sigEffect(letter, sig);
  let inline: number | null = null;
  if (a.accidental === "single") {
    // ♮ is only a real alteration when the signature touches this letter (T2 semantics)
    inline = pick(fromSig !== 0 ? [-1, 0, 1] : [-1, 1]);
  } else if (a.accidental === "double") {
    inline = pick([-2, 2]);
  }
  const eff = inline !== null ? inline : fromSig;
  const midi = 12 * (octave + 1) + LETTER_PC[letter] + eff; // C4 = 60; may cross the octave edge (B♯, C♭)
  return { letter, octave, inline, eff, sig, clef, midi, spelled: spellSounding(letter, octave, inline, sig) };
}

export { LETTER_PC };
export type { Pc };
