// Bout lifecycle (08 §6): a bout = contiguous practice. Opens on device detect or the first
// graded attempt; ~20 idle minutes is the ONLY closer (disconnect never closes — cable bumps
// are normal); profileId and clock correlation stay null for knowledge-only practice (10 §4).
import { BOUT_IDLE_MS } from "./constants";

export interface BoutRow {
  id: string;
  openedAt: number;
  closedAt: number | null;
  profileId: string | null;
  clockCorrJson: string | null;
}

export interface CurrentBout { id: string; openedAt: number; lastActivityAt: number; }

export type BoutDecision =
  | { kind: "continue"; current: CurrentBout }
  | { kind: "rotate"; closeAt: number | null; current: CurrentBout }; // closeAt = stale bout's last activity

/** Pure: given the tracked current bout and now, continue it or rotate to a fresh one.
 *  A stale bout closes AT ITS LAST ACTIVITY — idle time never counts as practice. */
export function boutDecision(cur: CurrentBout | undefined, nowMs: number, newId: string): BoutDecision {
  if (cur && nowMs - cur.lastActivityAt <= BOUT_IDLE_MS) {
    return { kind: "continue", current: { ...cur, lastActivityAt: nowMs } };
  }
  return {
    kind: "rotate",
    closeAt: cur ? cur.lastActivityAt : null,
    current: { id: newId, openedAt: nowMs, lastActivityAt: nowMs },
  };
}
