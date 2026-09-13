// Calibration ritual math (03 §3, ratified by the device spike — ported from the rig verbatim):
// four count-in clicks entrain, eight scored clicks measure; each scored click associates to
// the nearest strike inside a generous window; anticipation outliers (|offset| > 150ms) drop
// before the stats; the median offset is the profile's latency, the p84−p16 spread its jitter.
export const RITUAL_COUNT_IN = 4;
export const RITUAL_SCORED = 8;
export const RITUAL_INTERVAL_MS = 600;
export const RITUAL_ASSOC_EARLY_MS = -250;
export const RITUAL_ASSOC_LATE_MS = 350;
export const RITUAL_OUTLIER_MS = 150;

export interface RitualResult {
  offsets: number[];      // kept offsets, ms (strike − click)
  matched: number;        // clicks that found a strike, of RITUAL_SCORED
  dropped: number;        // anticipation outliers removed
  medianMs: number | null;
  spreadMs: number | null; // p84 − p16 (needs > 3 kept offsets, as the rig required)
}

const median = (a: number[]): number => [...a].sort((x, y) => x - y)[a.length >> 1];
const spread = (a: number[]): number | null => {
  if (a.length <= 3) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length * 0.84)] - s[Math.floor(s.length * 0.16)];
};

/** Associate each scored click with its nearest strike inside the window; then stats. */
export function ritualStats(clickTimesMs: number[], strikeTimesMs: number[]): RitualResult {
  const raw: number[] = [];
  for (const ct of clickTimesMs) {
    let best: number | null = null;
    for (const t of strikeTimesMs) {
      const d = t - ct;
      if (d > RITUAL_ASSOC_EARLY_MS && d < RITUAL_ASSOC_LATE_MS && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
    if (best !== null) raw.push(best);
  }
  const kept = raw.filter(o => Math.abs(o) <= RITUAL_OUTLIER_MS);
  return {
    offsets: kept.map(o => +o.toFixed(1)),
    matched: raw.length,
    dropped: raw.length - kept.length,
    medianMs: kept.length ? +median(kept).toFixed(1) : null,
    spreadMs: spread(kept) === null ? null : +spread(kept)!.toFixed(1),
  };
}
