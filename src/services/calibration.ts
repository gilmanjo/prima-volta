"use client";
// The calibration ritual runner (03 §3 · U7): schedules the 4 low + 8 high clicks on the
// audio clock, collects strikes for the duration, and hands the click/strike times to the
// pure stats. The caller owns MIDI wiring on its route; strikes arrive via feedStrike.
import {
  RITUAL_COUNT_IN, RITUAL_INTERVAL_MS, RITUAL_SCORED, ritualStats, type RitualResult,
} from "../core/calibration";
import { audioCtx } from "./uiAudio";

export interface RitualRun {
  /** Feed every note-on's timestamp (performance clock) while the ritual runs. */
  feedStrike(tMs: number): void;
  stop(): void;
  done: Promise<RitualResult>;
}

export function startRitual(onBeat?: (i: number, countIn: boolean) => void): RitualRun {
  const ac = audioCtx();
  const lead = 800;
  const perfNow = performance.now();
  const strikes: number[] = [];
  const clickPerf: number[] = [];
  const timers: number[] = [];

  const click = (atPerfMs: number, freq: number) => {
    if (!ac || ac.state !== "running") return;
    const at = ac.currentTime + Math.max(0, (atPerfMs - performance.now()) / 1000);
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.5, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
    o.start(at); o.stop(at + 0.06);
  };

  for (let k = 0; k < RITUAL_COUNT_IN + RITUAL_SCORED; k++) {
    const atMs = perfNow + lead + k * RITUAL_INTERVAL_MS;
    const countIn = k < RITUAL_COUNT_IN;
    click(atMs, countIn ? 800 : 1200);
    if (!countIn) clickPerf.push(atMs);
    if (onBeat) timers.push(window.setTimeout(() => onBeat(countIn ? k : k - RITUAL_COUNT_IN, countIn), Math.max(0, atMs - performance.now())));
  }
  const endMs = perfNow + lead + (RITUAL_COUNT_IN + RITUAL_SCORED) * RITUAL_INTERVAL_MS + 600;

  let resolve!: (r: RitualResult) => void;
  const done = new Promise<RitualResult>(res => { resolve = res; });
  timers.push(window.setTimeout(() => resolve(ritualStats(clickPerf, strikes)), endMs - performance.now()));

  return {
    feedStrike: t => strikes.push(t),
    stop: () => { for (const t of timers) clearTimeout(t); resolve(ritualStats(clickPerf, strikes)); },
    done,
  };
}
