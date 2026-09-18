"use client";
// The spelling chips (F4 §Variants name→choice): the twelve pitch classes on the same
// full-option chip row staff→choice rules — black keys dual-labeled. Taps accumulate
// octave-free and the page commits at the chord's tone count; piano-key targets are
// never a phone answer surface (U2 §4).
import { memo } from "react";
import type { KeyState } from "./Keybed";

const PC_LABELS = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];

export const SpellChips = memo(function SpellChips({
  states, onTap,
}: {
  /** pc (0–11) → chip state: exp = revealed tone · ok = tapped tone · err = the wrong tap */
  states: Record<number, KeyState>;
  onTap: (pc: number) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-2">
      {[0, 6].map(row => (
        <div key={row} className="grid grid-cols-6 gap-1.5">
          {PC_LABELS.slice(row, row + 6).map((label, i) => {
            const pc = row + i;
            const st = states[pc];
            return (
              <button key={pc} onClick={() => onTap(pc)}
                className={`rounded-md border py-3 text-center text-[14px] leading-none ${
                  st === "ok" ? "border-[var(--good)] bg-[var(--good)]/15 text-[var(--good)]"
                  : st === "err" ? "border-[var(--felt)] bg-[var(--felt)]/10 text-[var(--felt)]"
                  : st === "exp" ? "border-[var(--good)] text-[var(--good)]"
                  : "border-[var(--border)] bg-[var(--panel)] text-[var(--ink)]"}`}>
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});
