// F3 instance sampling (F3 §Grading: "anchors are instance variety — T1→T2 widens the
// anchor pool, a gate-style step"): engine-A atoms with seeded targets, like F2. The card's
// tier drives the pool — tier 0 white-key anchors (highlighted), tier 1 all twelve (from
// memory). TT is one atom whose SPELLING samples per instance (A4 or d5 letters); the
// engraving then disambiguates the selector answer (F3 §Variants).
import type { IntervalAtom } from "./catalog";
import { LETTER_PC, LETTERS, mulberry32 } from "./reading";

export const KIND_SEMITONES: Record<string, number> = {
  m2: 1, M2: 2, m3: 3, M3: 4, P4: 5, TT: 6, P5: 7, m6: 8, M6: 9, m7: 10, M7: 11, P8: 12,
};
// letter steps per kind; TT resolves per instance (A4 = 3 steps · d5 = 4 steps)
const KIND_STEPS: Record<string, number> = {
  m2: 1, M2: 1, m3: 2, M3: 2, P4: 3, P5: 4, m6: 5, M6: 5, m7: 6, M7: 6, P8: 7,
};
// canonical anchor spellings for the all-anchors pool (PC_NAMES' choices)
const PC_SPELLING: [number, number][] = // pc → [letter, inline]
  [[0, 0], [0, 1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];

export interface SpelledNote { letter: number; octave: number; inline: number; midi: number; }

export interface IntervalInstance {
  anchor: SpelledNote;
  target: SpelledNote;
  /** the instance's quality label — the kind, except TT which spells A4 or d5 */
  label: string;
  size: number;                 // 2–8
  quality: "dim" | "m" | "M" | "P" | "aug";
}

const spell = (letter: number, octave: number, inline: number): SpelledNote =>
  ({ letter, octave, inline, midi: 12 * (octave + 1) + LETTER_PC[letter] + inline });

export function spellNoteName(n: SpelledNote): string {
  const g: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "", 1: "♯", 2: "𝄪" };
  return `${LETTERS[n.letter]}${g[n.inline]}${n.octave}`;
}

/** Engraving spec for a SpelledNote. StaffView's contract (F2's): null = no glyph, 0 = an
 *  explicit ♮ — and ♮ only exists to cancel. An isolated open-key pair has nothing to
 *  cancel (letters differ; P8 restates its own accidental per octave), so 0 maps to null. */
export const staffSpec = (n: SpelledNote): { letter: number; octave: number; inline: number | null } =>
  ({ letter: n.letter, octave: n.octave, inline: n.inline === 0 ? null : n.inline });

// the teach names the result in words (U2 §Teach: named, never scripted)
const QUALITY_WORD: Record<IntervalInstance["quality"], string> = {
  dim: "diminished", m: "minor", M: "major", P: "perfect", aug: "augmented",
};
const SIZE_WORD: Record<number, string> = {
  2: "second", 3: "third", 4: "fourth", 5: "fifth", 6: "sixth", 7: "seventh", 8: "octave",
};
export const intervalWords = (i: Pick<IntervalInstance, "size" | "quality">): string =>
  `${i.quality === "aug" ? "an" : "a"} ${QUALITY_WORD[i.quality]} ${SIZE_WORD[i.size]}`;

function kindParts(kind: string, ttAsDim5: boolean): { size: number; quality: IntervalInstance["quality"]; steps: number } {
  if (kind === "TT") return ttAsDim5 ? { size: 5, quality: "dim", steps: 4 } : { size: 4, quality: "aug", steps: 3 };
  const q = kind[0] === "P" ? "P" : (kind[0] as "m" | "M");
  return { size: Number(kind[1]), quality: q, steps: KIND_STEPS[kind] };
}

/** Build the target a given letter-step and semitone count away; inline = whatever the
 *  spelling demands (𝄪/𝄫 legal; anything beyond is a sampler bug, asserted in tests). */
function targetFrom(anchor: SpelledNote, steps: number, semis: number, dirUp: boolean): SpelledNote {
  const s = dirUp ? steps : -steps;
  let letter = anchor.letter + s;
  let octave = anchor.octave;
  while (letter > 6) { letter -= 7; octave++; }
  while (letter < 0) { letter += 7; octave--; }
  const wantMidi = anchor.midi + (dirUp ? semis : -semis);
  const inline = wantMidi - (12 * (octave + 1) + LETTER_PC[letter]);
  return spell(letter, octave, inline);
}

export function sampleInterval(a: IntervalAtom, tier: number, seed: number): IntervalInstance {
  const rnd = mulberry32(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const { size, quality, steps } = kindParts(a.kind, a.kind === "TT" ? rnd() < 0.5 : false);
  const semis = KIND_SEMITONES[a.kind];
  const dirUp = a.dir !== "down"; // harmonic staff pairs (dir null) stack upward

  let anchor: SpelledNote;
  if (a.cue === "staff") {
    // render inside the staff ± a ledger: anchor from D4..C5 (treble) / F2..E3 (bass), inward-safe
    const clef = a.clef === "bass" ? "bass" : "treble";
    const pool: [number, number][] = clef === "treble"
      ? [[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [0, 5]]
      : [[3, 2], [4, 2], [5, 2], [6, 2], [0, 3], [1, 3], [2, 3]];
    const [l, o] = pick(pool);
    anchor = spell(l, o, tier === 1 ? pick([-1, 0, 0, 1]) : 0);
  } else {
    // name-cue registers per hand (03 §7: an octave-qualified name is a register cue — exact)
    const octave = a.hand === "LH" ? 3 : 4;
    if (tier === 1) {
      const [l, i] = pick(PC_SPELLING);
      anchor = spell(l, octave, i);
    } else {
      anchor = spell(pick([0, 1, 2, 3, 4, 5, 6]), octave, 0); // T1: white-key anchors
    }
  }
  const target = targetFrom(anchor, steps, semis, a.form === "harmonic" && a.cue === "staff" ? true : dirUp);
  return { anchor, target, label: a.kind === "TT" ? (quality === "dim" ? "d5" : "A4") : a.kind, size, quality };
}
