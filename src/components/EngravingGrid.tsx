"use client";
// F4 name→engraving (F4 §Variants): pick the correct engraving from a small grid of
// candidate staves — the sanctioned distractor-based exception (candidates: the chord's
// other inversions and its neighbor quality). Cells render tiny StaffView stacks; the
// reveal outlines the correct cell. Clef-blind: candidates engrave in treble.
import { memo } from "react";
import { StaffView } from "./StaffView";
import type { ChordStaffNote } from "../core/catalog";

export interface EngravingCell { id: string; notes: ChordStaffNote[]; }

export const EngravingGrid = memo(function EngravingGrid({
  cells, reveal, onPick,
}: {
  cells: EngravingCell[];
  reveal?: string | null;      // the correct cell's id, outlined in teach/reconcile
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid h-full grid-cols-2 content-center gap-2 px-2">
      {cells.map(c => (
        <button key={c.id} onClick={() => onPick(c.id)}
          className={`overflow-hidden rounded-md border bg-[var(--panel)] ${
            reveal === c.id ? "border-[var(--good)]" : "border-[var(--border)]"}`}>
          <div className="pointer-events-none h-20">
            <StaffView clef="treble" stream={{ current: c.notes, next: null }} width={200} height={96} />
          </div>
        </button>
      ))}
    </div>
  );
});
