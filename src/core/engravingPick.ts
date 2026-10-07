// F4 name→engraving candidates (F4 §Variants): the sanctioned distractor-based exception —
// the correct voicing, two other inversions of the same chord, and its neighbor quality
// over the same bass. Seed-deterministic; the seed logs so any grid re-renders (02 §1).
import { chordStaffNotes, type ChordAtom, type ChordStaffNote } from "./catalog";
import { mulberry32 } from "./reading";

const NEIGHBOR: Record<string, string> = {
  maj: "min", min: "maj", dim: "min", aug: "maj",
  maj7: "m7", dom7: "m7", m7: "dom7", m7b5: "dim7", dim7: "m7b5",
};

export interface EngravingPickInstance {
  cells: { id: string; notes: ChordStaffNote[] }[];
  correctId: "correct";
}

export function sampleEngravingPick(a: Pick<ChordAtom, "root" | "quality" | "inversion">, seed: number): EngravingPickInstance {
  const rnd = mulberry32(seed);
  const inv = a.inversion ?? 0;
  const tones = chordStaffNotes(a, "treble");
  const otherInvs = Array.from({ length: tones.length }, (_, i) => i).filter(i => i !== inv);
  for (let i = otherInvs.length - 1; i > 0; i--) { // seeded shuffle, take two
    const j = Math.floor(rnd() * (i + 1));
    [otherInvs[i], otherInvs[j]] = [otherInvs[j], otherInvs[i]];
  }
  const cells = [
    { id: "correct", notes: tones },
    ...otherInvs.slice(0, 2).map(i => ({ id: `inv${i}`, notes: chordStaffNotes({ ...a, inversion: i }, "treble") })),
    { id: "neighbor", notes: chordStaffNotes({ root: a.root, quality: NEIGHBOR[a.quality] ?? "min", inversion: inv }, "treble") },
  ];
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return { cells, correctId: "correct" };
}
