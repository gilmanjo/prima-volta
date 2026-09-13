"use client";
// Engraved key signature — Bravura Text glyphs on a hand-positioned staff (12 §2: F1's
// signatures are text glyphs, never scores; music glyphs = Bravura/SMuFL, SIL OFL, log #23).
// SMuFL registration puts a glyph's baseline on its staff position with em = staff height,
// so each accidental is a <text> at its note's y. Positions are the universal engraving
// order: sharps F C G D A E · flats B E A D G C, each on its standard line/space per clef.
import { memo } from "react";

const SP = 6;              // staff space; staff height = 4·SP = em size
const TOP = 8;             // y of the top line
const STEP = SP / 2;       // one diatonic step

// Diatonic steps below the TOP LINE for each accidental, in order (index = count − 1).
const POS = {
  treble: { sharp: [0, 3, -1, 2, 5, 1], flat: [4, 1, 5, 2, 6, 3] },   // top line = F5
  bass: { sharp: [2, 5, 1, 4, 7, 3], flat: [6, 3, 7, 4, 8, 5] },      // top line = A3
};
const CLEF = {
  treble: { glyph: "", step: 6 },  // G clef, baseline on G4 (2nd line)
  bass: { glyph: "", step: 2 },    // F clef, baseline on F3 (4th line)
};

export const Sig = memo(function Sig({
  sig, clef = "treble", ink = "var(--ink)",
}: { sig: number; clef?: "treble" | "bass"; ink?: string }) {
  const n = Math.abs(sig);
  const steps = sig >= 0 ? POS[clef].sharp : POS[clef].flat;
  const glyph = sig >= 0 ? "" : ""; // accidentalSharp · accidentalFlat
  return (
    <svg viewBox="0 0 100 44" className="block h-full w-full select-none">
      {[0, 1, 2, 3, 4].map(i => (
        <line key={i} x1={3} x2={97} y1={TOP + i * SP} y2={TOP + i * SP} stroke={ink} strokeWidth={0.7} opacity={0.85} />
      ))}
      <text x={6} y={TOP + CLEF[clef].step * STEP} fontSize={SP * 4} fill={ink}
        style={{ fontFamily: '"Bravura Text", serif' }}>{CLEF[clef].glyph}</text>
      {Array.from({ length: n }, (_, i) => (
        <text key={i} x={30 + i * 10} y={TOP + steps[i] * STEP} fontSize={SP * 4} fill={ink}
          style={{ fontFamily: '"Bravura Text", serif' }}>{glyph}</text>
      ))}
    </svg>
  );
});
