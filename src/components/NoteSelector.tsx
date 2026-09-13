"use client";
// The NoteSelector (F2 §Variants): a letter row, an accidental row (𝄪/𝄫 join once doubles
// admit — the row grows, per the doc), and a fixed octave row 1–7. Full option space, never
// sampled choices. Selection: letter first, accidental optional (♮ preselected), the octave
// tap commits. Spelling is symbolic forever (F𝄪 ≠ G, 03 §3).
import { memo, useState } from "react";
import { LETTERS } from "../core/reading";

const ACCS: { v: number; g: string }[] = [
  { v: -2, g: "𝄫" }, { v: -1, g: "♭" }, { v: 0, g: "♮" }, { v: 1, g: "♯" }, { v: 2, g: "𝄪" },
];
const OCTAVES = [1, 2, 3, 4, 5, 6, 7];

export interface NoteSelectorReveal { letter: number; inline: number | null; octave: number; }

export const NoteSelector = memo(function NoteSelector({
  doubles, reveal, onCommit,
}: {
  doubles: boolean;                       // 𝄪/𝄫 join the row once T4 doubles have admitted
  reveal?: NoteSelectorReveal | null;     // teach/reconcile: the correct cells outlined
  onCommit: (sym: { letter: number; acc: number; octave: number }) => void;
}) {
  const [letter, setLetter] = useState<number | null>(null);
  const [acc, setAcc] = useState<number>(0);
  const accs = doubles ? ACCS : ACCS.filter(a => Math.abs(a.v) < 2);
  const revealAcc = reveal ? (reveal.inline ?? 0) : null;

  const cell = (active: boolean, revealed: boolean) =>
    `rounded-md border px-0 py-2 text-center text-[15px] leading-none ${
      revealed ? "border-[var(--good)] text-[var(--good)]"
      : active ? "border-[var(--accent-hi)] bg-[var(--accent)]/20 text-[var(--ink)]"
      : "border-[var(--border)] bg-[var(--panel)] text-[var(--ink)]"}`;

  return (
    <div className="flex h-full flex-col justify-center gap-2 px-2">
      <div className="grid grid-cols-7 gap-1.5">
        {LETTERS.map((l, i) => (
          <button key={l} onClick={() => setLetter(i)} className={cell(letter === i, reveal?.letter === i)}>{l}</button>
        ))}
      </div>
      <div className={`grid gap-1.5 ${doubles ? "grid-cols-5" : "grid-cols-3"}`}>
        {accs.map(a => (
          <button key={a.v} onClick={() => setAcc(a.v)} className={cell(acc === a.v, revealAcc === a.v)}>{a.g}</button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {OCTAVES.map(o => (
          <button key={o}
            onClick={() => { if (letter !== null) { onCommit({ letter, acc, octave: o }); setLetter(null); setAcc(0); } }}
            className={cell(false, reveal?.octave === o)}>{o}</button>
        ))}
      </div>
    </div>
  );
});
