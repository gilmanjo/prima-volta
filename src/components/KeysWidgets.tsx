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

// The wheel geometry, straight from the ratified mockup (_kbd.js keywheel): a segmented
// annulus — twelve 30° wedges with small gaps, labels at mid-radius, the mode named at
// the hub. KEY NAMES ONLY — no accidental-count sublabels (F1 §Variants, log #86: a count
// label lets the answer be counted off the engraving instead of recalled).
// One scaling SVG: always a circle, any orientation.
const C = 130, R1 = 66, R2 = 122, RL = (R1 + R2) / 2 + 3;
const pt = (r: number, aDeg: number): [number, number] => {
  const a = ((aDeg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const wedgePath = (i: number): string => {
  const a0 = i * 30 - 15 + 1.4, a1 = i * 30 + 15 - 1.4;
  const [x0o, y0o] = pt(R2, a0), [x1o, y1o] = pt(R2, a1);
  const [x0i, y0i] = pt(R1, a0), [x1i, y1i] = pt(R1, a1);
  return `M ${x0o} ${y0o} A ${R2} ${R2} 0 0 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${R1} ${R1} 0 0 0 ${x0i} ${y0i} Z`;
};
export const KeyWheel = memo(function KeyWheel({
  mode, states = {}, onPick,
}: { mode: "major" | "minor"; states?: Record<number, PickState>; onPick: (sig: number) => void }) {
  return (
    <svg viewBox="0 0 260 260" className="mx-auto block h-full w-full">
      {WHEEL_SIGS.map((sig, i) => {
        const st = states[sig];
        const [lx, ly] = pt(RL, i * 30);
        return (
          <g key={sig} onClick={() => onPick(sig)} className="cursor-pointer">
            <path d={wedgePath(i)}
              fill={st === "correct" ? "rgba(88,181,115,0.18)" : st === "wrong" ? "rgba(178,58,51,0.14)" : "var(--panel2)"}
              stroke={st === "correct" ? "var(--good)" : st === "wrong" ? "var(--felt)" : "var(--border)"}
              strokeWidth={st ? 1.6 : 1} />
            <text x={lx} y={ly + 5} textAnchor="middle" pointerEvents="none"
              fill={st === "wrong" ? "var(--felt)" : "var(--ink)"}
              fontSize={mode === "major" ? 15 : 13}
              fontWeight={mode === "major" ? 700 : 500}
              fontStyle={mode === "major" ? "normal" : "italic"}>
              {keyNameOf(sig, mode).replace(` ${mode}`, "")}
            </text>
          </g>
        );
      })}
      <text x={C} y={C + 4} textAnchor="middle" fill="var(--muted)" fontSize={11}
        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{mode}</text>
    </svg>
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
