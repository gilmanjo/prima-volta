// The block-filler (08 §4 — chooses; consumes 04's exports). One item at a time:
// steps first → weakest next → frontier on pull → polishing; "unavailable" when the
// context can't serve the area at all. Tiny-area sovereignty bypasses interleaving (04 §6).
import { compareAdmission, identityOf, type DrillAtom } from "./catalog";
import { POOL_THIN, RETENTION_TARGET, TRICKLE_PER_10MIN } from "./constants";
import {
  interleaveOk, newCard, retrievability, servingPriority, stepRipe,
  type AreaCtx, type DrillCard, type ServedIdentity,
} from "./scheduler";

export type FillerResult =
  | { kind: "teach"; atom: DrillAtom; card: DrillCard }
  | { kind: "item"; atom: DrillAtom; card: DrillCard }
  | { kind: "polishing" }
  | { kind: "unavailable" };

export interface FillerState {
  cards: Map<string, DrillCard>;
  recentServed: ServedIdentity[];         // rolling identity window for interleaving (04 §6)
  admittedThisWindow: { atMs: number }[]; // trickle bookkeeping (08 §4)
}

export interface BlockSpec {
  /** Servable atoms in this area, in admission order candidates included (capability-filtered by the app). */
  pool: DrillAtom[];
  /** Tiny-area sovereignty (08 §4): a user-scoped block serves on demand, constraints yield. */
  userScoped?: boolean;
  appetite?: "off" | "trickle" | "eager";
}

export function next(block: BlockSpec, state: FillerState, ctx: AreaCtx): FillerResult {
  const appetite = block.appetite ?? "trickle";
  const cardsOf = (a: DrillAtom) => state.cards.get(a.id);
  const passesInterleave = (a: DrillAtom) =>
    interleaveOk(state.recentServed, { id: a.id, ...identityOf(a) });

  const introduced = block.pool.map(a => ({ a, c: cardsOf(a) })).filter(x => x.c) as { a: DrillAtom; c: DrillCard }[];

  // The cascade runs twice (04 §6's yield, made AREA-WIDE, log #88): first under the
  // interleaving constraints; only when NOTHING in the whole area can serve do the
  // constraints yield — a branch never yields locally while a later branch could serve
  // (the fix for a struggling relearn step boomeranging back-to-back).
  const attempt = (constrained: boolean): FillerResult | null => {
    const filt = <T extends { a: DrillAtom }>(xs: T[]): T[] => (constrained ? xs.filter(x => passesInterleave(x.a)) : xs);

    // 1 · steps first (un-elapsed steps are skipped, never waited on — 04 §2)
    const ripe = filt(introduced.filter(x => stepRipe(x.c, ctx)));
    if (ripe.length) return { kind: "item", atom: ripe[0].a, card: ripe[0].c };

    // servable learn-phase cards count as the weak pool's weakest members
    const weak = introduced.filter(x =>
      x.c.step === "learn" || (x.c.step === "graduated" && retrievability(x.c, ctx.nowMs) < RETENTION_TARGET));

    // 2 · frontier on pull — when the servable weak pool thins (08 §4); first pass only
    const frontierAllowed = appetite !== "off" && (appetite === "eager" || trickleOk(state, ctx.nowMs));
    if (constrained && weak.length < POOL_THIN && frontierAllowed) {
      const unintroduced = block.pool.filter(a => !cardsOf(a)).sort(compareAdmission);
      if (unintroduced.length) {
        const atom = unintroduced[0];
        const card = newCard(atom.id, ctx.nowMs);
        state.cards.set(atom.id, card);
        state.admittedThisWindow.push({ atMs: ctx.nowMs });
        return { kind: "teach", atom, card };
      }
    }

    // 3 · weakest next
    const ranked = filt(weak).sort((p, q) => servingPriority(q.c, ctx.nowMs) - servingPriority(p.c, ctx.nowMs));
    if (ranked.length) return { kind: "item", atom: ranked[0].a, card: ranked[0].c };

    // 4 · upkeep
    const bright = filt(introduced.filter(x => x.c.step === "graduated"))
      .sort((p, q) => retrievability(p.c, ctx.nowMs) - retrievability(q.c, ctx.nowMs));
    if (bright.length) return { kind: "item", atom: bright[0].a, card: bright[0].c };

    // 4b · step timing yields under user demand (08 §4's sovereignty — the cold-start fix, log #74)
    const stepPhase = filt(introduced.filter(x => x.c.step !== "graduated"))
      .sort((p, q) => (p.c.stepDueItems ?? 0) - (q.c.stepDueItems ?? 0));
    if (stepPhase.length) return { kind: "item", atom: stepPhase[0].a, card: stepPhase[0].c };
    return null;
  };

  const served = attempt(true) ?? attempt(false);
  if (served) return served;
  if (introduced.length === 0 && block.pool.length === 0) return { kind: "unavailable" };
  if (introduced.length) return { kind: "polishing" };
  return { kind: "unavailable" };
}

function trickleOk(state: FillerState, nowMs: number): boolean {
  const windowStart = nowMs - 10 * 60_000;
  state.admittedThisWindow = state.admittedThisWindow.filter(e => e.atMs >= windowStart);
  return state.admittedThisWindow.length < TRICKLE_PER_10MIN;
}

export function noteServed(state: FillerState, atom: DrillAtom): void {
  state.recentServed.push({ id: atom.id, ...identityOf(atom) });
  if (state.recentServed.length > 10) state.recentServed.shift();
}
