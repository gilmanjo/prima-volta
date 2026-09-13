// The catalog module: typed access over the seeder's output (02 §7 — seed data, never DB rows).
import catalogJson from "../../seed/catalog.json";
import type { CatalogAtom, Pc } from "./types";

export interface ChordAtom extends CatalogAtom {
  family: "chord";
  root: Pc;
  quality: string;
  inversion?: number;
  hand?: "RH" | "LH" | "HT";
  form?: "blocked" | "broken";
  cue?: "name" | "staff";
  answer: "midi" | "id" | "engraving" | "spell";
  stream?: boolean;
}

const atoms = (catalogJson as { atoms: CatalogAtom[] }).atoms;
const byId = new Map(atoms.map(a => [a.id, a]));

export const catalog = {
  atoms,
  byId: (id: string) => byId.get(id),
  family: (name: string) => atoms.filter(a => a.family === name),
  defaults: (name: string) => atoms.filter(a => a.family === name && a.inDefault),
};

// ---- admission order (05 §2: family-local — quality order × key wave × tier order) ----
// The wave: the ladder's key column flattened to a per-root index (majors; minors ride scope).
const QUALITY_ORDER = ["maj", "min", "maj7", "dom7", "m7", "dim", "m7b5", "dim7", "aug"]; // log #52
const KEY_WAVE_PCS: Pc[][] = [[0], [7, 5], [2], [10], [9, 3], [4, 8], [11, 1], [6]]; // C · G,F · D · B♭ · A,E♭ · E,A♭ · B,D♭ · F♯/G♭
const waveOf = (pc: Pc) => KEY_WAVE_PCS.findIndex(w => w.includes(pc));

/** Sortable admission key for F4 play/knowledge atoms (lower = admits earlier). */
export function chordAdmissionKey(a: ChordAtom): number[] {
  const q = QUALITY_ORDER.indexOf(a.quality);
  const w = waveOf(a.root);
  // Tier order (F4): T1 root blocked HS → T2 inversions → T3 HT → T4 broken → (T5 gate, in-card) → T6 streams.
  // Knowledge variants are tierless flat atoms admitting on the same quality × wave (log #52).
  const tier =
    a.stream ? 6 :
    a.answer !== "midi" ? 2.5 :             // knowledge rides alongside, after root-position play exists
    a.form === "broken" ? 4 :
    a.hand === "HT" ? 3 :
    (a.inversion ?? 0) > 0 ? 2 : 1;
  const hand = a.hand === "RH" ? 0 : a.hand === "LH" ? 1 : 2;
  const cue = a.cue === "staff" ? 1 : 0;
  return [q, w, tier, a.inversion ?? 0, cue, hand];
}

export function compareAdmission(a: ChordAtom, b: ChordAtom): number {
  const ka = chordAdmissionKey(a), kb = chordAdmissionKey(b);
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
  return a.id < b.id ? -1 : 1;
}

/** Hands-only subsumption (02 §3): the RH/LH siblings an HT play-atom subsumes. */
export function subsumedBy(a: ChordAtom): ChordAtom[] {
  if (a.family !== "chord" || a.answer !== "midi" || a.hand !== "HT" || a.stream) return [];
  return (catalog.family("chord") as ChordAtom[]).filter(s =>
    s.answer === "midi" && !s.stream && (s.hand === "RH" || s.hand === "LH") &&
    s.root === a.root && s.quality === a.quality && s.inversion === a.inversion &&
    s.form === a.form && s.cue === a.cue);
}

// ---- chord spelling (name-cue prompts + expected pitch classes) ----
const Q_INTERVALS: Record<string, number[]> = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  maj7: [0, 4, 7, 11], dom7: [0, 4, 7, 10], m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9],
};
const PC_NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const Q_SYMBOL: Record<string, string> = {
  maj: "", min: "m", dim: "dim", aug: "aug", maj7: "maj7", dom7: "7", m7: "m7", m7b5: "m7♭5", dim7: "dim7",
};

/** Expected pitch classes in sounding order for an inversion (name-cue: any octave, 03 §7). */
export function chordPcs(a: ChordAtom): Pc[] {
  const ivs = Q_INTERVALS[a.quality];
  const inv = a.inversion ?? 0;
  const rotated = [...ivs.slice(inv), ...ivs.slice(0, inv)];
  return rotated.map(iv => (((a.root + iv) % 12) as Pc));
}

/** Lead-sheet symbol, slash bass for inversions — one continuous run (log #57/#58). */
export function chordSymbol(a: ChordAtom): string {
  const root = PC_NAMES[a.root];
  const base = root + (Q_SYMBOL[a.quality] ?? a.quality);
  const inv = a.inversion ?? 0;
  if (!inv) return base;
  return `${base}/${PC_NAMES[chordPcs(a)[0]]}`;
}

export { QUALITY_ORDER, PC_NAMES };
