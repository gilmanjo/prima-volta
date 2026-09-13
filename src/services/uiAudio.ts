"use client";
// The UI soundfont, v0 (11's rule): a few synthesized cues for the moments the piano isn't
// sounding — license-clean by construction, quiet, and mutable later via U7.
let ac: AudioContext | null = null;

export function ensureAudio(): void {
  try {
    if (!ac) ac = new AudioContext();
    if (ac.state === "suspended") void ac.resume();
  } catch { /* no audio context — cues simply stay silent */ }
}

function blip(freq: number, delay: number, dur: number, gain = 0.1, type: OscillatorType = "sine"): void {
  if (!ac || ac.state !== "running") return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  o.connect(g); g.connect(ac.destination);
  const at = ac.currentTime + delay;
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.start(at); o.stop(at + dur + 0.02);
}

export const ui = {
  tick(): void { ensureAudio(); blip(880, 0, 0.045, 0.05); },                        // next item
  good(): void { ensureAudio(); blip(660, 0, 0.08); blip(990, 0.07, 0.11); },        // clean, in window
  hard(): void { ensureAudio(); blip(660, 0, 0.11); },                               // clean, over window
  err(): void { ensureAudio(); blip(150, 0, 0.16, 0.13, "triangle"); },              // reconciliation stop
};

/** The shared context, for the metronome (a separate voice, 11's soundfont ruling). */
export function audioCtx(): AudioContext | null { ensureAudio(); return ac; }
