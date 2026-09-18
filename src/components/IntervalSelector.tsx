"use client";
// The IntervalSelector (F3 §Variants): a size row (2–8) and a FIXED quality row — all five
// always shown; combinations invalid for the selected size sit inert, so the layout never
// shifts. Selection order-free; the answer commits when both halves are chosen.
import { memo, useState } from "react";

const SIZES = [2, 3, 4, 5, 6, 7, 8];
const QUALITIES: ("dim" | "m" | "M" | "P" | "aug")[] = ["dim", "m", "M", "P", "aug"];
// valid combos in the drilled vocabulary: P{4,5,8} · m/M{2,3,6,7} · dim5 · aug4 (the tritone)
const VALID: Record<string, number[]> = { P: [4, 5, 8], m: [2, 3, 6, 7], M: [2, 3, 6, 7], dim: [5], aug: [4] };

export interface IntervalReveal { size: number; quality: string; }

export const IntervalSelector = memo(function IntervalSelector({
  reveal, onCommit,
}: {
  reveal?: IntervalReveal | null;
  onCommit: (sym: { size: number; quality: string }) => void;
}) {
  const [size, setSize] = useState<number | null>(null);
  const [quality, setQuality] = useState<string | null>(null);

  const commitWith = (s: number | null, q: string | null) => {
    if (s !== null && q !== null) { onCommit({ size: s, quality: q }); setSize(null); setQuality(null); }
  };
  const validPair = (s: number | null, q: string | null) =>
    s === null || q === null || VALID[q].includes(s);

  const cell = (active: boolean, revealed: boolean, inert: boolean) =>
    `rounded-md border py-2.5 text-center text-[15px] leading-none ${
      revealed ? "border-[var(--good)] text-[var(--good)]"
      : inert ? "border-[var(--border)] text-[var(--muted)] opacity-40"
      : active ? "border-[var(--accent-hi)] bg-[var(--accent)]/20 text-[var(--ink)]"
      : "border-[var(--border)] bg-[var(--panel)] text-[var(--ink)]"}`;

  return (
    <div className="flex h-full flex-col justify-center gap-2 px-2">
      <div className="grid grid-cols-7 gap-1.5">
        {SIZES.map(s => {
          const inert = quality !== null && !VALID[quality].includes(s);
          return (
            <button key={s} disabled={inert}
              onClick={() => { setSize(s); commitWith(s, validPair(s, quality) ? quality : null); }}
              className={cell(size === s, reveal?.size === s, inert)}>{s}</button>
          );
        })}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {QUALITIES.map(q => {
          const inert = size !== null && !VALID[q].includes(size);
          return (
            <button key={q} disabled={inert}
              onClick={() => { setQuality(q); commitWith(validPair(size, q) ? size : null, q); }}
              className={cell(quality === q, reveal?.quality === q, inert)}>{q}</button>
          );
        })}
      </div>
    </div>
  );
});
