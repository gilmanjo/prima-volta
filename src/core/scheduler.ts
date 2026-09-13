// Scheduler (04 — computes; 08 chooses). Owns per-card state math: the practice-local step
// machine (04 §2), FSRS application (04 §1/§3), derived-review mechanics (04 §4, improvement-only),
// gate streaks in both directions (02 §1, log #67), and the pure serving exports (04 §6).
// The Scheduler never sees MIDI; the Grader never sees FSRS (10 §3).
import {
  createEmptyCard, fsrs, generatorParameters, Rating as FRating, type Card as FsrsCard, type Grade,
} from "ts-fsrs";
import {
  AGAIN_NOW_AFTER_ITEMS, CHORD_GATE_WINDOW_MS, CHORD_LEARN_WINDOW_MS, CONFIRM_AFTER_ITEMS,
  CONFIRM_AFTER_MS, GATE_STREAK, GRADUATING_CAP_DAYS, INTERLEAVE_RUN, MAX_INTERVAL_DAYS,
  RETENTION_TARGET,
} from "./constants";
import type { GradeResult, GradedAttempt, Rating } from "./types";

// learning/relearning steps are OURS (04 §2's practice-local machine replaces them wholesale),
// so FSRS runs without its own: graduation lands straight in Review state.
const F = fsrs(generatorParameters({
  request_retention: RETENTION_TARGET,
  maximum_interval: MAX_INTERVAL_DAYS,
  learning_steps: [],
  relearning_steps: [],
}));

export type Step = "teach" | "learn" | "againNow" | "confirm" | "graduated";

export interface DrillCard {
  atomId: string;
  step: Step;
  stepDueItems: number | null;  // area servedCount threshold (item-denominated, 04 §2)
  stepDueMs: number | null;     // the clock fallback
  fsrs: FsrsCard | null;        // null until graduation — steps live outside FSRS (04 §2)
  tier: 0 | 1;                  // F4 v1: 0 = learning window · 1 = the T5 fluency gate
  gateStreak: number;           // signed: + consecutive in-window · − consecutive out (02 §1, #67)
  introducedAt: number;
  lastReviewAt: number | null;
}

export interface ReviewRow {
  atomId: string;
  attemptId: string;
  rating: Rating;
  latencyMs: number | null;
  tier: number;
  derived: boolean;
  parentAttemptId: string | null;
  paramGroup: "A" | "B";
  reviewedAt: number;
}

export function windowFor(card: DrillCard): number {
  return card.tier === 1 ? CHORD_GATE_WINDOW_MS : CHORD_LEARN_WINDOW_MS; // 03 §6 v0 anchors
}

export function newCard(atomId: string, now: number): DrillCard {
  return { atomId, step: "teach", stepDueItems: null, stepDueMs: null, fsrs: null, tier: 0, gateStreak: 0, introducedAt: now, lastReviewAt: null };
}

/** Teach state served and completed (ungraded — writes nothing, 04 §3). */
export function afterTeach(card: DrillCard): DrillCard {
  return { ...card, step: "learn", stepDueItems: 0, stepDueMs: 0 }; // servable immediately
}

const toF = (r: Rating): Grade => (r === 1 ? FRating.Again : r === 2 ? FRating.Hard : FRating.Good);

function applyGateStreak(card: DrillCard, res: GradeResult): DrillCard {
  // In-window at current demand extends the earn streak; wrong-or-slow extends the release streak.
  let s = res.inWindow ? (card.gateStreak >= 0 ? card.gateStreak + 1 : 1)
                       : (card.gateStreak <= 0 ? card.gateStreak - 1 : -1);
  let tier = card.tier;
  if (s >= GATE_STREAK && tier === 0) { tier = 1; s = 0; }        // earned: demand tightens (02 §1)
  else if (s <= -GATE_STREAK && tier === 1) { tier = 0; s = 0; }  // released: held, not owned (#67)
  return { ...card, gateStreak: s, tier };
}

export interface AreaCtx { servedCount: number; nowMs: number; }

/** Apply one graded rep of this card. Returns the new card + the review row to append. */
export function applyRep(
  card: DrillCard, res: GradeResult, attemptId: string, ctx: AreaCtx, derived = false, parentAttemptId: string | null = null,
): { card: DrillCard; row: ReviewRow } {
  const row: ReviewRow = {
    atomId: card.atomId, attemptId, rating: res.rating, latencyMs: res.latencyMs,
    tier: card.tier, derived, parentAttemptId, paramGroup: "A", reviewedAt: ctx.nowMs,
  };
  let c: DrillCard = { ...card, lastReviewAt: ctx.nowMs };
  c = applyGateStreak(c, res);

  const confirmDue = () => { c.step = "confirm"; c.stepDueItems = ctx.servedCount + CONFIRM_AFTER_ITEMS; c.stepDueMs = ctx.nowMs + CONFIRM_AFTER_MS; };
  const againNowDue = () => { c.step = "againNow"; c.stepDueItems = ctx.servedCount + AGAIN_NOW_AFTER_ITEMS; c.stepDueMs = ctx.nowMs + 2 * 60_000; };

  switch (card.step) {
    case "learn":
      if (res.rating === 3) confirmDue(); else againNowDue();
      break;
    case "againNow":
      if (res.rating === 1) againNowDue(); // another error re-queues the relearn rep —
      else confirmDue();                   // errors never fast-track "then the confirm step" (04 §2)
      break;
    case "confirm":
      if (res.rating === 3) {
        // graduate to FSRS under the 1-day cap (04 §2)
        let f = createEmptyCard(new Date(ctx.nowMs));
        f = F.next(f, new Date(ctx.nowMs), FRating.Good).card;
        const cap = ctx.nowMs + GRADUATING_CAP_DAYS * 86_400_000;
        if (f.due.getTime() > cap) f = { ...f, due: new Date(cap) };
        c.step = "graduated"; c.fsrs = f; c.stepDueItems = null; c.stepDueMs = null;
      } else againNowDue();
      break;
    case "graduated": {
      const f = F.next(c.fsrs!, new Date(ctx.nowMs), toF(res.rating)).card;
      c.fsrs = f;
      if (res.rating === 1) againNowDue(); // one relearn step; FSRS already took the lapse (04 §2)
      break;
    }
    case "teach":
      // a graded rep on a teach-state card shouldn't happen; treat as learn
      if (res.rating === 3) confirmDue(); else againNowDue();
      break;
  }
  return { card: c, row };
}

/** Derived-review mechanics (04 §4): improvement-only — clean-in-the-subsumed-card's-window or nothing. */
export function applyDerived(
  subsumed: DrillCard, embedded: GradeResult, parentAttemptId: string, attemptId: string, ctx: AreaCtx,
): { card: DrillCard; row: ReviewRow } | null {
  if (!(embedded.clean && embedded.inWindow)) return null; // failure writes nothing downward (02 §3)
  const good: GradeResult = { ...embedded, rating: 3 };
  return applyRep(subsumed, good, attemptId, ctx, true, parentAttemptId);
}

// ---- pure serving exports (04 §6; the filler is the caller — 08) ----

export function retrievability(card: DrillCard, nowMs: number): number {
  if (card.step !== "graduated" || !card.fsrs) return 0; // step-phase cards are maximally weak
  const r = F.get_retrievability(card.fsrs, new Date(nowMs), false);
  return typeof r === "number" ? r : 0;
}

export function servingPriority(card: DrillCard, nowMs: number): number {
  const base = Math.max(0, RETENTION_TARGET - retrievability(card, nowMs));
  const gatePending = Math.abs(card.gateStreak) === GATE_STREAK - 1 ? 0.2 : 0; // one rep from a gate move
  return base + gatePending;
}

export function stepRipe(card: DrillCard, ctx: AreaCtx): boolean {
  if (card.step !== "againNow" && card.step !== "confirm") return false;
  return (card.stepDueItems !== null && ctx.servedCount >= card.stepDueItems)
      || (card.stepDueMs !== null && ctx.nowMs >= card.stepDueMs); // items OR clock (04 §2)
}

export interface ServedIdentity { root?: unknown; quality?: unknown; }

export function interleaveOk(recent: ServedIdentity[], candidate: ServedIdentity): boolean {
  const lastTwo = recent.slice(-(INTERLEAVE_RUN - 1));
  if (lastTwo.length < INTERLEAVE_RUN - 1) return true;
  const allSameRoot = lastTwo.every(r => r.root !== undefined && r.root === candidate.root);
  const allSameQuality = lastTwo.every(r => r.quality !== undefined && r.quality === candidate.quality);
  return !(allSameRoot || allSameQuality);
}
