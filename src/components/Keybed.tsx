"use client";
// The keybed — the one lit metaphor (11): LED states are content, never chrome.
// No note-name labels during drills (log #57).
import { memo } from "react";

export type KeyState = "ok" | "exp" | "err";
const BLACK = new Set([1, 3, 6, 8, 10]);
const FILL: Record<KeyState, string> = { ok: "var(--good)", exp: "var(--accent-hi)", err: "var(--felt)" };

export const Keybed = memo(function Keybed({
  from = 45, to = 84, states = {},
}: { from?: number; to?: number; states?: Record<number, KeyState> }) {
  const whites: number[] = [];
  for (let m = from; m <= to; m++) if (!BLACK.has(m % 12)) whites.push(m);
  const W = 100 / whites.length;
  const whiteIndex = new Map(whites.map((m, i) => [m, i]));
  const blacks: { m: number; x: number }[] = [];
  for (let m = from; m <= to; m++) {
    if (!BLACK.has(m % 12)) continue;
    const leftWhite = whiteIndex.get(m - 1);
    if (leftWhite === undefined) continue;
    blacks.push({ m, x: (leftWhite + 1) * W - W * 0.32 });
  }
  return (
    <svg viewBox="0 0 100 15" preserveAspectRatio="none" className="block h-full w-full select-none">
      {whites.map((m, i) => (
        <rect key={m} x={i * W + 0.06} y={0} width={W - 0.12} height={15} rx={0.35}
          fill={states[m] ? FILL[states[m]] : "#e9e6dd"} stroke="#0e1218" strokeWidth={0.12}
          opacity={states[m] ? 0.95 : 1} />
      ))}
      {blacks.map(({ m, x }) => (
        <rect key={m} x={x} y={0} width={W * 0.64} height={9.2} rx={0.3}
          fill={states[m] ? FILL[states[m]] : "#161a20"} stroke="#0a0d12" strokeWidth={0.1} />
      ))}
    </svg>
  );
});
