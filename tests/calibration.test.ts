// Calibration ritual laws (03 §3, ratified by the device spike): association window,
// the 150ms anticipation drop, median → latency, p84−p16 spread → jitter.
import { describe, it, expect } from "vitest";
import {
  RITUAL_COUNT_IN, RITUAL_INTERVAL_MS, RITUAL_OUTLIER_MS, RITUAL_SCORED, ritualStats,
} from "../src/core/calibration";

const clicks = Array.from({ length: 8 }, (_, k) => 10_000 + k * 600);

describe("the calibration ritual (03 §3)", () => {
  it("the ritual shape is the ratified one: 4 count-in + 8 scored at 600ms", () => {
    expect(RITUAL_COUNT_IN).toBe(4);
    expect(RITUAL_SCORED).toBe(8);
    expect(RITUAL_INTERVAL_MS).toBe(600);
    expect(RITUAL_OUTLIER_MS).toBe(150);
  });

  it("an entrained run: median offset = latency, p84−p16 = jitter", () => {
    const offsets = [20, 25, 30, 18, 28, 22, 35, 24];
    const r = ritualStats(clicks, clicks.map((c, i) => c + offsets[i]));
    expect(r.matched).toBe(8);
    expect(r.dropped).toBe(0);
    expect(r.medianMs).toBe(25);        // upper median of the sorted offsets
    expect(r.spreadMs).toBe(10);        // p84 (30) − p16 (20)
  });

  it("anticipation outliers beyond ±150ms drop before the stats", () => {
    const r = ritualStats(clicks, [clicks[0] - 200, ...clicks.slice(1).map(c => c + 25)]);
    expect(r.matched).toBe(8);          // the early strike still associates…
    expect(r.dropped).toBe(1);          // …but drops as an anticipation outlier
    expect(r.offsets.length).toBe(7);
    expect(r.medianMs).toBe(25);
  });

  it("strikes outside the association window never match; each click takes its nearest", () => {
    const r = ritualStats(clicks, [clicks[0] - 300, clicks[1] + 400, clicks[2] + 40, clicks[2] + 120]);
    expect(r.matched).toBe(1);          // clicks 0 and 1 find nothing in-window
    expect(r.offsets).toEqual([40]);    // click 2 takes the nearer of its two candidates
  });

  it("too few kept offsets yields no spread (the rig demanded > 3)", () => {
    const r = ritualStats(clicks.slice(0, 3), clicks.slice(0, 3).map(c => c + 20));
    expect(r.medianMs).toBe(20);
    expect(r.spreadMs).toBeNull();
  });
});
