"use client";
// The metronome voice (U2 §3): count-in clicks low, run beats high, bar-starts accented —
// the same low/high ritual grammar the calibration rig entrained (03 §3). All clicks are
// scheduled up front on the audio clock; UI beat callbacks ride setTimeout on the perf clock.
import { COUNT_IN_ONE_BAR_BPM, RUN_BEATS_PER_BAR } from "../core/constants";
import { audioCtx } from "./uiAudio";

export interface RunClock {
  t0Ms: number;   // performance-clock time of run beat 0 (the beat after the count-in)
  endMs: number;  // performance-clock time of the last run beat
  stop(): void;
}

/** Count-in length per the ruled grammar: one bar at ♩≥80, two bars below (U2 §3). */
export function countInBeats(beatMs: number): number {
  const bpm = 60000 / beatMs;
  return (bpm >= COUNT_IN_ONE_BAR_BPM ? 1 : 2) * RUN_BEATS_PER_BAR;
}

export function startRunClock(opts: {
  beatMs: number;
  runBeats: number;
  onBeat?: (beatInBar: number, isCountIn: boolean) => void;
}): RunClock {
  const ac = audioCtx();
  const lead = 250; // breathing room before click one
  const perfNow = performance.now();
  const cIn = countInBeats(opts.beatMs);
  const t0Ms = perfNow + lead + cIn * opts.beatMs;
  const endMs = t0Ms + (opts.runBeats - 1) * opts.beatMs;
  const timers: number[] = [];
  const nodes: OscillatorNode[] = [];

  const click = (atPerfMs: number, freq: number, gain: number) => {
    if (!ac || ac.state !== "running") return;
    const at = ac.currentTime + Math.max(0, (atPerfMs - performance.now()) / 1000);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = freq;
    o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.start(at); o.stop(at + 0.07);
    nodes.push(o);
  };

  for (let i = 0; i < cIn + opts.runBeats; i++) {
    const atMs = perfNow + lead + i * opts.beatMs;
    const isCountIn = i < cIn;
    const beatInBar = i % RUN_BEATS_PER_BAR;
    click(atMs, isCountIn ? 800 : 1200, beatInBar === 0 ? 0.12 : 0.07);
    if (opts.onBeat) {
      timers.push(window.setTimeout(() => opts.onBeat!(beatInBar, isCountIn), Math.max(0, atMs - performance.now())));
    }
  }

  return {
    t0Ms, endMs,
    stop() {
      for (const t of timers) clearTimeout(t);
      for (const o of nodes) { try { o.stop(); } catch { /* already stopped */ } }
    },
  };
}
