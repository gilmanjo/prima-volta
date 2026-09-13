// Replica refold (10 §5: D1 stores LOGS, never projections — a new device pulls the review
// stream and refolds its cards deterministically). The stored rows reconstruct the fold
// exactly: under 03 §6's maps, inWindow ≡ (rating === 3) for every material kind, and
// applyRep reads nothing else from the grade. servedCount replays as a running index —
// an honest approximation that only shapes practice-local step ripening (04 §2).
import { afterTeach, applyRep, newCard, type DrillCard } from "./scheduler";
import type { GradeResult, Rating } from "./types";

export interface RefoldRow {
  atomId: string;
  attemptId: string;
  rating: Rating;
  latencyMs: number | null;
  derived: boolean;
  parentAttemptId: string | null;
  reviewedAt: number;
}

export function refoldCards(rows: RefoldRow[], gateableOf: (atomId: string) => boolean): Map<string, DrillCard> {
  const cards = new Map<string, DrillCard>();
  const sorted = [...rows].sort((a, b) => a.reviewedAt - b.reviewedAt || (a.attemptId < b.attemptId ? -1 : 1));
  let served = 0;
  for (const r of sorted) {
    const c = cards.get(r.atomId) ?? afterTeach(newCard(r.atomId, r.reviewedAt)); // a review implies the teach happened
    const res: GradeResult = {
      rating: r.rating, latencyMs: r.latencyMs, errorEvents: [],
      clean: r.rating !== 1, inWindow: r.rating === 3,
    };
    const { card } = applyRep(c, res, r.attemptId, { servedCount: served++, nowMs: r.reviewedAt }, r.derived, r.parentAttemptId, gateableOf(r.atomId));
    cards.set(r.atomId, card);
  }
  return cards;
}
