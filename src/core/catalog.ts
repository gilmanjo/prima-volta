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

export type ScaleType = "major" | "minorNatural" | "minorHarmonic" | "minorMelodic" | "chromatic";

export interface ScaleAtom extends CatalogAtom {
  family: "scale";
  type: ScaleType;
  key: Pc;
  hand: "RH" | "LH" | "HT";
  cue: "name" | "keysig";
}

export interface ArpAtom extends CatalogAtom {
  family: "arp";
  basis: "maj" | "min" | "dom7" | "dim7";
  root: Pc;
  hand: "RH" | "LH" | "HT" | "alternating";
  start: "root";
}

export interface KeysAtom extends CatalogAtom {
  family: "keys";
  sig: number;                 // −6 … +6 (−6 = G♭, behind its scope toggle)
  mode: "major" | "minor";
  clef: "treble" | "bass";
  dir: "sigToKey" | "keyToSig";
}

/** The playable-atom union the filler and player serve. */
export type DrillAtom = ChordAtom | ScaleAtom | ArpAtom | KeysAtom;

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

/** Sortable admission key for F4 play/knowledge atoms (lower = admits earlier).
 *  The nesting (05 §2, logs #79/#80): difficulty is the SLOWEST axis, and modifications
 *  compose by severity — broken (+1) < inversions (+2) < HT (+4, the heaviest: every
 *  hands-separate form precedes any hands-together). Within a stage: quality order ×
 *  the key wave; hands-separate siblings walk adjacently per key. */
export function chordAdmissionKey(a: ChordAtom): number[] {
  const q = QUALITY_ORDER.indexOf(a.quality);
  const w = waveOf(a.root);
  // Stages (F4 ladder): 1 root blocked HS · 2 broken · 3 inversions · 4 broken inversions ·
  // 5+ HT forms · 9 streams. Knowledge = tierless flat atoms, riding once root play exists (log #52).
  const tier =
    a.stream ? 9 :
    a.answer !== "midi" ? 1.5 :
    1 + (a.form === "broken" ? 1 : 0) + ((a.inversion ?? 0) > 0 ? 2 : 0) + (a.hand === "HT" ? 4 : 0);
  const hand = a.hand === "RH" ? 0 : a.hand === "LH" ? 1 : 2;
  const cue = a.cue === "staff" ? 1 : 0;
  return [tier, q, a.inversion ?? 0, w, cue, hand];
}

const SCALE_TYPE_ORDER: ScaleType[] = ["major", "minorNatural", "minorHarmonic", "minorMelodic", "chromatic"];
const ARP_BASIS_ORDER = ["maj", "min", "dom7", "dim7"]; // F6: triads (T1) before sevenths (T4)
const HAND_ORDER = { RH: 0, LH: 1, HT: 2, alternating: 3 };

/** Admission key for F5 atoms (05 §2's nesting): the hand axis is the SLOWEST — hands-separate
 *  sweeps every type × key (RH · LH adjacent per key) before any hands-together atom admits. */
export function scaleAdmissionKey(a: ScaleAtom): number[] {
  const stage = a.hand === "HT" ? 1 : 0;
  return [stage, SCALE_TYPE_ORDER.indexOf(a.type), waveOf(a.key), HAND_ORDER[a.hand], a.cue === "keysig" ? 1 : 0];
}

/** Admission key for F6 atoms — the ladder's stages, each sweeping the full wave
 *  (F6 §Admission nesting, log #80): triads HS → sevenths HS → triads HT → sevenths HT →
 *  alternating. Every hands-separate stage precedes any hands-together. */
export function arpAdmissionKey(a: ArpAtom): number[] {
  const basisIdx = ARP_BASIS_ORDER.indexOf(a.basis);
  const seventh = basisIdx >= 2 ? 1 : 0;
  const stage = a.hand === "alternating" ? 4 : (a.hand === "HT" ? 2 : 0) + seventh;
  return [stage, basisIdx, waveOf(a.root), HAND_ORDER[a.hand]];
}

/** Admission key for F1 atoms (tierless): the key wave, then direction/clef/mode. */
export function keysAdmissionKey(a: KeysAtom): number[] {
  return [waveOf(majorTonicPc(a.sig)), a.dir === "keyToSig" ? 1 : 0, a.clef === "bass" ? 1 : 0, a.mode === "minor" ? 1 : 0];
}

const FAMILY_ORDER: Record<string, number> = { keys: 0, chord: 1, scale: 2, arp: 3 };

function admissionKey(a: DrillAtom): number[] {
  const fam = FAMILY_ORDER[a.family] ?? 9;
  if (a.family === "keys") return [fam, ...keysAdmissionKey(a)];
  if (a.family === "scale") return [fam, ...scaleAdmissionKey(a)];
  if (a.family === "arp") return [fam, ...arpAdmissionKey(a)];
  return [fam, ...chordAdmissionKey(a)];
}

export function compareAdmission(a: DrillAtom, b: DrillAtom): number {
  const ka = admissionKey(a), kb = admissionKey(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const d = (ka[i] ?? 0) - (kb[i] ?? 0);
    if (d !== 0) return d;
  }
  return a.id < b.id ? -1 : 1;
}

/** The interleave identity (04 §6): what "same root / same quality" means per family. */
export function identityOf(a: DrillAtom): { root: unknown; quality: unknown } {
  if (a.family === "keys") return { root: majorTonicPc(a.sig), quality: a.dir };
  if (a.family === "scale") return { root: a.key, quality: a.type };
  if (a.family === "arp") return { root: a.root, quality: a.basis };
  return { root: a.root, quality: a.quality };
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

const SCALE_LABEL: Record<ScaleType, string> = {
  major: "major", minorNatural: "natural minor", minorHarmonic: "harmonic minor",
  minorMelodic: "melodic minor", chromatic: "chromatic",
};
const ARP_LABEL: Record<string, string> = { maj: "major", min: "minor", dom7: "dominant 7th", dim7: "diminished 7th" };

// ---- F1 key/signature vocabulary (proper spellings; sig indexed −6…+6 via [sig+6]) ----
const MAJOR_KEYS = ["G♭", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E", "B", "F♯"];
const MINOR_KEYS = ["e♭", "b♭", "f", "c", "g", "d", "a", "e", "b", "f♯", "c♯", "g♯", "d♯"];
const SHARPS_ORDER = ["F♯", "C♯", "G♯", "D♯", "A♯", "E♯"];
const FLATS_ORDER = ["B♭", "E♭", "A♭", "D♭", "G♭", "C♭"];

export function majorTonicPc(sig: number): Pc {
  return (((sig * 7) % 12) + 12) % 12 as Pc;
}

/** The key a signature names, in the prompted mode ("A♭ major" / "f minor"). */
export function keyNameOf(sig: number, mode: "major" | "minor"): string {
  return mode === "major" ? `${MAJOR_KEYS[sig + 6]} major` : `${MINOR_KEYS[sig + 6]} minor`;
}

/** The relative partner, revealed at confirmation (F1 §Variants). */
export function relativeOf(sig: number, mode: "major" | "minor"): string {
  return keyNameOf(sig, mode === "major" ? "minor" : "major");
}

/** The signature's accidentals, spelled in order (key→sig confirmation, F1 §Variants). */
export function sigSpelling(sig: number): string {
  if (sig === 0) return "no sharps or flats";
  const src = sig > 0 ? SHARPS_ORDER : FLATS_ORDER;
  return src.slice(0, Math.abs(sig)).join(" · ");
}

/** The prompt title, per family — plain words, never model nouns (hub rule). */
export function atomTitle(a: DrillAtom): string {
  if (a.family === "keys") return keyNameOf(a.sig, a.mode);
  if (a.family === "scale") return `${PC_NAMES[a.key]} ${SCALE_LABEL[a.type]}`;
  if (a.family === "arp") return `${PC_NAMES[a.root]} ${ARP_LABEL[a.basis]} arpeggio`;
  return chordSymbol(a);
}

export { QUALITY_ORDER, PC_NAMES };
