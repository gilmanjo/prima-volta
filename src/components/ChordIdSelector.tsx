"use client";
// F4 staff→choice (F4 §Variants): root + quality + inversion, each on its full option row —
// no sampled distractors (the widget principle). The 3rd-inversion cell sits inert under a
// triad quality (and triad-only qualities sit inert once 3rd is picked): the layout never
// shifts. Order-free; the answer commits when all three are chosen.
import { memo, useState } from "react";

const ROOT_LABELS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
// the scoped qualities in lead-sheet dress (aug waits behind its toggle)
const QUALITIES: { q: string; label: string; tetrad: boolean }[] = [
  { q: "maj", label: "maj", tetrad: false }, { q: "min", label: "m", tetrad: false }, { q: "dim", label: "dim", tetrad: false },
  { q: "maj7", label: "maj7", tetrad: true }, { q: "dom7", label: "7", tetrad: true }, { q: "m7", label: "m7", tetrad: true },
  { q: "m7b5", label: "m7♭5", tetrad: true }, { q: "dim7", label: "dim7", tetrad: true },
];
const INVERSIONS = ["root", "1st", "2nd", "3rd"];

export interface ChordIdReveal { root: number; quality: string; inversion: number; }

export const ChordIdSelector = memo(function ChordIdSelector({
  reveal, onCommit,
}: {
  reveal?: ChordIdReveal | null;
  onCommit: (sym: { root: number; quality: string; inversion: number }) => void;
}) {
  const [root, setRoot] = useState<number | null>(null);
  const [quality, setQuality] = useState<string | null>(null);
  const [inv, setInv] = useState<number | null>(null);

  const isTetrad = (q: string | null) => q !== null && (QUALITIES.find(x => x.q === q)?.tetrad ?? false);
  const commitWith = (r: number | null, q: string | null, i: number | null) => {
    if (r !== null && q !== null && i !== null) {
      onCommit({ root: r, quality: q, inversion: i });
      setRoot(null); setQuality(null); setInv(null);
    }
  };

  const cell = (active: boolean, revealed: boolean, inert: boolean) =>
    `rounded-md border py-2 text-center text-[13px] leading-none ${
      revealed ? "border-[var(--good)] text-[var(--good)]"
      : inert ? "border-[var(--border)] text-[var(--muted)] opacity-40"
      : active ? "border-[var(--accent-hi)] bg-[var(--accent)]/20 text-[var(--ink)]"
      : "border-[var(--border)] bg-[var(--panel)] text-[var(--ink)]"}`;

  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-2">
      {[0, 6].map(row => (
        <div key={row} className="grid grid-cols-6 gap-1.5">
          {ROOT_LABELS.slice(row, row + 6).map((label, i) => {
            const pc = row + i;
            return (
              <button key={pc} onClick={() => { setRoot(pc); commitWith(pc, quality, inv); }}
                className={cell(root === pc, reveal?.root === pc, false)}>{label}</button>
            );
          })}
        </div>
      ))}
      <div className="grid grid-cols-8 gap-1.5">
        {QUALITIES.map(({ q, label, tetrad }) => {
          const inert = inv === 3 && !tetrad;
          return (
            <button key={q} disabled={inert}
              onClick={() => { setQuality(q); commitWith(root, q, inv); }}
              className={cell(quality === q, reveal?.quality === q, inert)}>{label}</button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {INVERSIONS.map((label, i) => {
          const inert = i === 3 && quality !== null && !isTetrad(quality);
          return (
            <button key={label} disabled={inert}
              onClick={() => { setInv(i); commitWith(root, quality, i); }}
              className={cell(inv === i, reveal?.inversion === i, inert)}>{label}</button>
          );
        })}
      </div>
    </div>
  );
});
