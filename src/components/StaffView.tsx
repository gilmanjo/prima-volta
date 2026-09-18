"use client";
// StaffView — the production engraver (VexFlow, MIT; 10 §1's chosen renderer), P2's opener.
// v1 surface: one stave, a clef, an optional key signature, one note with an optional
// inline accidental. Ink follows the app's tokens (light on ebony).
import { useEffect, useRef } from "react";
import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import { LETTERS } from "../core/reading";

// VexFlow wants ASCII major-key names, indexed by sig + 6
const VF_KEYS = ["Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#"];
const VF_ACC: Record<number, string> = { [-2]: "bb", [-1]: "b", 0: "n", 1: "#", 2: "##" };

export interface StaffNoteSpec { letter: number; octave: number; inline?: number | null; }

export function StaffView({
  clef, sig = 0, letter, octave, inline = null, second = null, form = "melodic", width = 320, height = 150,
}: {
  clef: "treble" | "bass";
  sig?: number;
  letter: number;      // 0–6 = C–B
  octave: number;
  inline?: number | null;
  /** a second note makes a pair: melodic = side by side · harmonic = stacked (F3) */
  second?: StaffNoteSpec | null;
  form?: "melodic" | "harmonic";
  width?: number;
  height?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = "";
    try {
      const renderer = new Renderer(el, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();
      const INK = { fillStyle: "#e8eaee", strokeStyle: "#e8eaee" };
      ctx.setFillStyle(INK.fillStyle);
      ctx.setStrokeStyle(INK.strokeStyle);
      const stave = new Stave(4, 24, width - 10);
      stave.addClef(clef);
      if (sig !== 0) stave.addKeySignature(VF_KEYS[sig + 6]);
      stave.setContext(ctx).draw();
      const key = (n: StaffNoteSpec) => `${LETTERS[n.letter].toLowerCase()}/${n.octave}`;
      const first: StaffNoteSpec = { letter, octave, inline };
      let notes: StaveNote[];
      if (second && form === "harmonic") {
        // one stacked grab — keys low-to-high, accidentals per key ("h", never "h." — the trap)
        const [lo, hi] = [first, second].sort((a, b) => (a.octave * 7 + a.letter) - (b.octave * 7 + b.letter));
        const n = new StaveNote({ clef, keys: [key(lo), key(hi)], duration: "w" });
        if (lo.inline != null) n.addModifier(new Accidental(VF_ACC[lo.inline]), 0);
        if (hi.inline != null) n.addModifier(new Accidental(VF_ACC[hi.inline]), 1);
        notes = [n];
      } else if (second) {
        notes = [first, second].map(s => {
          const n = new StaveNote({ clef, keys: [key(s)], duration: "h" });
          if (s.inline != null) n.addModifier(new Accidental(VF_ACC[s.inline]), 0);
          return n;
        });
      } else {
        const n = new StaveNote({ clef, keys: [key(first)], duration: "w" });
        if (inline !== null) n.addModifier(new Accidental(VF_ACC[inline]), 0);
        notes = [n];
      }
      // stems, flags and ledger lines draw from the NOTE's style, not the context's —
      // without this the first stemmed duration ships black ink on the ebony ground
      for (const n of notes) { n.setStyle(INK); n.setStemStyle(INK); n.setLedgerLineStyle(INK); }
      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.setStrict(false);
      voice.addTickables(notes);
      new Formatter().joinVoices([voice]).format([voice], width - 140);
      voice.draw(ctx, stave);
      const svg = el.querySelector("svg");
      if (svg) { svg.style.width = "100%"; svg.style.height = "100%"; svg.setAttribute("viewBox", `0 0 ${width} ${height}`); svg.removeAttribute("width"); svg.removeAttribute("height"); }
    } catch {
      el.textContent = "…"; // engraving failure never blanks the player
    }
  }, [clef, sig, letter, octave, inline, second, form, width, height]);
  return <div ref={host} className="h-full w-full" />;
}
