// Refold laws (10 §5: logs = truth, projections refold): a card refolded from its stored
// review rows equals the card the live fold produced — inWindow ≡ (rating === 3) makes the
// stored rows a complete reconstruction (03 §6).
import { describe, it, expect } from "vitest";
import { refoldCards, type RefoldRow } from "../src/core/refold";
import { afterTeach, applyRep, newCard, type DrillCard } from "../src/core/scheduler";
import type { GradeResult } from "../src/core/types";

const res = (rating: 1 | 2 | 3, lat = 800): GradeResult =>
  ({ rating, latencyMs: lat, errorEvents: [], clean: rating !== 1, inWindow: rating === 3 });

const strip = (c: DrillCard) => JSON.parse(JSON.stringify(c)) as unknown;

describe("replica refold (10 §5)", () => {
  it("a lived card and its refold are identical — graduation, lapse, relearn, gates included", () => {
    const ratings: (1 | 2 | 3)[] = [3, 3, 3, 3, 3, 1, 3, 3, 2, 3];
    let live = afterTeach(newCard("a1", 0));
    const rows: RefoldRow[] = [];
    ratings.forEach((r, i) => {
      const out = applyRep(live, res(r), `t${i}`, { servedCount: i, nowMs: 1_000_000 + i * 3_600_000 });
      live = out.card;
      rows.push({ atomId: "a1", attemptId: out.row.attemptId, rating: out.row.rating, latencyMs: out.row.latencyMs,
        derived: out.row.derived, parentAttemptId: out.row.parentAttemptId, reviewedAt: out.row.reviewedAt });
    });
    const refolded = refoldCards(rows, () => true).get("a1")!;
    // the teach instant is never logged (teach writes nothing, 04 §3) — refold anchors
    // introducedAt at the first review; everything the scheduler acts on must be identical
    expect(strip({ ...refolded, introducedAt: 0 })).toEqual(strip({ ...live, introducedAt: 0 }));
    expect(refolded.step).toBe(live.step);
    expect(refolded.fsrs!.lapses).toBe(live.fsrs!.lapses);
  });

  it("knowledge atoms refold without gates (02 §1) — a long Good streak still tier 0", () => {
    const rows: RefoldRow[] = Array.from({ length: 9 }, (_, i) => ({
      atomId: "k1", attemptId: `t${i}`, rating: 3 as const, latencyMs: 900,
      derived: false, parentAttemptId: null, reviewedAt: 1_000_000 + i * 3_600_000,
    }));
    const c = refoldCards(rows, () => false).get("k1")!;
    expect(c.step).toBe("graduated");
    expect(c.tier).toBe(0);
    expect(c.gateStreak).toBe(0);
  });

  it("derived rows replay as state (G6): the subsumed card's refold includes them", () => {
    const rows: RefoldRow[] = [
      { atomId: "lh", attemptId: "t0", rating: 3, latencyMs: 800, derived: false, parentAttemptId: null, reviewedAt: 1_000_000 },
      { atomId: "lh", attemptId: "t1", rating: 3, latencyMs: 800, derived: false, parentAttemptId: null, reviewedAt: 1_003_600_000 },
      { atomId: "lh", attemptId: "t2", rating: 3, latencyMs: 700, derived: true, parentAttemptId: "p1", reviewedAt: 1_007_200_000 },
    ];
    const c = refoldCards(rows, () => true).get("lh")!;
    expect(c.step).toBe("graduated");
    expect(c.fsrs!.reps).toBe(2); // graduation + the derived row both advanced FSRS
  });
});
