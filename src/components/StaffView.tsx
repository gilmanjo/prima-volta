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

export function StaffView({
  clef, sig = 0, letter, octave, inline = null, width = 320, height = 150,
}: {
  clef: "treble" | "bass";
  sig?: number;
  letter: number;      // 0–6 = C–B
  octave: number;
  inline?: number | null;
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
      ctx.setFillStyle("#e8eaee");
      ctx.setStrokeStyle("#e8eaee");
      const stave = new Stave(4, 24, width - 10);
      stave.addClef(clef);
      if (sig !== 0) stave.addKeySignature(VF_KEYS[sig + 6]);
      stave.setContext(ctx).draw();
      const note = new StaveNote({ clef, keys: [`${LETTERS[letter].toLowerCase()}/${octave}`], duration: "w" });
      if (inline !== null) note.addModifier(new Accidental(VF_ACC[inline]), 0);
      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.addTickables([note]);
      new Formatter().joinVoices([voice]).format([voice], width - 140);
      voice.draw(ctx, stave);
      const svg = el.querySelector("svg");
      if (svg) { svg.style.width = "100%"; svg.style.height = "100%"; svg.setAttribute("viewBox", `0 0 ${width} ${height}`); svg.removeAttribute("width"); svg.removeAttribute("height"); }
    } catch {
      el.textContent = "…"; // engraving failure never blanks the player
    }
  }, [clef, sig, letter, octave, inline, width, height]);
  return <div ref={host} className="h-full w-full" />;
}
