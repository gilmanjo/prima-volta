"use client";
// Engraved key signature — Bravura Text glyphs on a hand-positioned staff (12 §2: F1's
// signatures are text glyphs, never scores; music glyphs = Bravura/SMuFL, SIL OFL, log #23).
// Bravura Text renders glyph ink ABOVE the text baseline (ordinary text registration, not
// staff-position registration) — so each glyph carries a fixed baseline offset from its
// staff position, derived from measured ink centers against Bravura's designed bounding
// boxes and verified against correct engraving in-browser (log #83; em = 4·SP). Positions
// are the universal order: sharps F C G D A E · flats B E A D G C, per clef.
import { memo } from "react";

const SP = 6;              // staff space; staff height = 4·SP = em size
const TOP = 8;             // y of the top line
const STEP = SP / 2;       // one diatonic step
const DY = { sharp: 10, flat: 9, gClef: 3.5, fClef: 15.5 }; // baseline below the glyph's staff position

// Diatonic steps below the TOP LINE for each accidental, in order (index = count − 1).
const POS = {
  treble: { sharp: [0, 3, -1, 2, 5, 1], flat: [4, 1, 5, 2, 6, 3] },   // top line = F5
  bass: { sharp: [2, 5, 1, 4, 7, 3], flat: [6, 3, 7, 4, 8, 5] },      // top line = A3
};
const CLEF = {
  treble: { glyph: "", step: 6, dy: DY.gClef },  // G clef on G4 (2nd line)
  bass: { glyph: "", step: 2, dy: DY.fClef },    // F clef on F3 (4th line)
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
      <text x={6} y={TOP + CLEF[clef].step * STEP + CLEF[clef].dy} fontSize={SP * 4} fill={ink}
        style={{ fontFamily: '"Bravura Text", serif' }}>{CLEF[clef].glyph}</text>
      {Array.from({ length: n }, (_, i) => (
        <text key={i} x={30 + i * 10} y={TOP + steps[i] * STEP + (sig >= 0 ? DY.sharp : DY.flat)} fontSize={SP * 4} fill={ink}
          style={{ fontFamily: '"Bravura Text", serif' }}>{glyph}</text>
      ))}
    </svg>
  );
});
