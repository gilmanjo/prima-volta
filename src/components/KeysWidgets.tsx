"use client";
// F1's answer widgets (F1 §Variants — full option space, never sampled distractors):
// the KeyPicker wheel (fifths order, ONLY the prompted mode's ring) and the
// SignaturePicker grid (twelve engraved mini-signatures, count-ordered, in the item's clef).
import { memo } from "react";
import { keyNameOf } from "../core/catalog";
import { Sig } from "./Sig";

export type PickState = "correct" | "wrong";

// Fifths order, C at the top: C G D A E B F♯ · D♭ A♭ E♭ B♭ F
const WHEEL_SIGS = [0, 1, 2, 3, 4, 5, 6, -5, -4, -3, -2, -1];
// Count order, sharps then flats (F1 §Variants): ♮ · 1–6♯ · 1–5♭ (G♭ rides its toggle)
const GRID_SIGS = [0, 1, 2, 3, 4, 5, 6, -1, -2, -3, -4, -5];

export const KeyWheel = memo(function KeyWheel({
  mode, states = {}, onPick,
}: { mode: "major" | "minor"; states?: Record<number, PickState>; onPick: (sig: number) => void }) {
  return (
    // the wheel is a square fit to the SMALLER container dimension (portrait clipped it, log #83);
    // the parent widget zone declares container-type: size
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative" style={{ width: "min(96cqw, 96cqh)", height: "min(96cqw, 96cqh)" }}>
        {WHEEL_SIGS.map((sig, i) => {
          const th = (i / 12) * 2 * Math.PI;
          const st = states[sig];
          return (
            <button key={sig} onClick={() => onPick(sig)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1.5 text-[15px] leading-none ${
                st === "correct" ? "border-[var(--good)] bg-[var(--good)] text-white"
                : st === "wrong" ? "border-[var(--felt)] text-[var(--felt)]"
                : "border-[var(--border)] bg-[var(--panel)] text-[var(--ink)]"}`}
              style={{ left: `${50 + 42 * Math.sin(th)}%`, top: `${50 - 42 * Math.cos(th)}%` }}>
              {keyNameOf(sig, mode).replace(` ${mode}`, "")}
            </button>
          );
        })}
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[12px] uppercase tracking-wide text-[var(--muted)]">
          {mode}
        </span>
      </div>
    </div>
  );
});

export const SigGrid = memo(function SigGrid({
  clef, states = {}, onPick,
}: { clef: "treble" | "bass"; states?: Record<number, PickState>; onPick: (sig: number) => void }) {
  return (
    // portrait gets 3×4 so the engraved cells stay readable (log #83)
    <div className="grid h-full grid-cols-3 grid-rows-4 gap-1.5 landscape:grid-cols-6 landscape:grid-rows-2">
      {GRID_SIGS.map(sig => {
        const st = states[sig];
        return (
          <button key={sig} onClick={() => onPick(sig)}
            className={`min-h-0 rounded-md border p-0.5 ${
              st === "correct" ? "border-[var(--good)] bg-[var(--good)]/15"
              : st === "wrong" ? "border-[var(--felt)] bg-[var(--felt)]/10"
              : "border-[var(--border)] bg-[var(--panel)]"}`}>
            <Sig sig={sig} clef={clef} />
          </button>
        );
      })}
    </div>
  );
});
