// Scheduler laws (04 §2/§4/§6 · 02 §1/§3 · log #67), pinned.
import { describe, it, expect } from "vitest";
import {
  afterTeach, applyDerived, applyRep, interleaveOk, newCard, servingPriority, stepRipe, windowFor,
} from "../src/core/scheduler";
import type { GradeResult } from "../src/core/types";

const good = (lat = 800): GradeResult => ({ rating: 3, latencyMs: lat, errorEvents: [], clean: true, inWindow: true });
const slow = (lat = 4000): GradeResult => ({ rating: 2, latencyMs: lat, errorEvents: [], clean: true, inWindow: false });
const again = (): GradeResult => ({ rating: 1, latencyMs: 900, errorEvents: [{ type: "substitution", tags: [] }], clean: false, inWindow: false });
const ctx = (servedCount = 0, nowMs = 1_000_000) => ({ servedCount, nowMs });

describe("steps (04 §2)", () => {
  it("teach → learn → Good → confirm, ripening by items OR clock", () => {
    let c = afterTeach(newCard("a1", 0));
    expect(c.step).toBe("learn");
    ({ card: c } = applyRep(c, good(), "t1", ctx(5)));
    expect(c.step).toBe("confirm");
    expect(stepRipe(c, ctx(6, 1_000_100))).toBe(false);       // neither elapsed
    expect(stepRipe(c, ctx(25, 1_000_100))).toBe(true);       // item-denominated: heavy practice ripens sooner
    expect(stepRipe(c, ctx(6, 1_000_000 + 11 * 60_000))).toBe(true); // clock fallback
  });

  it("confirm + Good graduates to FSRS under the 1-day cap", () => {
    let c = afterTeach(newCard("a1", 0));
    ({ card: c } = applyRep(c, good(), "t1", ctx(0)));
    ({ card: c } = applyRep(c, good(), "t2", ctx(25)));
    expect(c.step).toBe("graduated");
    expect(c.fsrs).not.toBeNull();
    expect(c.fsrs!.due.getTime()).toBeLessThanOrEqual(1_000_000 + 86_400_000);
  });

  it("Again on learn → againNow (a few items later) → then confirm", () => {
    let c = afterTeach(newCard("a1", 0));
    ({ card: c } = applyRep(c, again(), "t1", ctx(0)));
    expect(c.step).toBe("againNow");
    expect(stepRipe(c, ctx(3, 1_000_001))).toBe(true);
    ({ card: c } = applyRep(c, good(), "t2", ctx(3)));
    expect(c.step).toBe("confirm");
  });

  it("lapse on a graduated card: FSRS takes the Again and one relearn step queues", () => {
    let c = afterTeach(newCard("a1", 0));
    ({ card: c } = applyRep(c, good(), "t1", ctx(0)));
    ({ card: c } = applyRep(c, good(), "t2", ctx(25)));
    ({ card: c } = applyRep(c, again(), "t3", ctx(30, 2_000_000)));
    expect(c.step).toBe("againNow");
    expect(c.fsrs!.lapses).toBeGreaterThanOrEqual(1);
  });
});

describe("gate streaks — held, not owned, graduated reps only (02 §1, logs #67/#75)", () => {
  const graduate = () => {
    let c = afterTeach(newCard("a1", 0));
    ({ card: c } = applyRep(c, good(), "g1", ctx(0)));          // learn (step-phase)
    ({ card: c } = applyRep(c, good(), "g2", ctx(25)));         // confirm → graduated
    return c;
  };

  it("step-phase reps never arm a gate — month-one Good stays month-one (03 §6)", () => {
    let c = afterTeach(newCard("a1", 0));
    for (const t of ["t1", "t2", "t3"]) ({ card: c } = applyRep(c, good(), t, ctx(0)));
    // three identical Goods: learn + confirm were step-phase (no gate touch);
    // only the third — played on the graduated card — opened the streak
    expect(c.tier).toBe(0);
    expect(c.gateStreak).toBe(1);
    expect(windowFor(c)).toBe(5000);
  });

  it("3 consecutive in-window GRADUATED reps earn the gate; the window tightens", () => {
    let c = graduate();
    for (const t of ["t3", "t4", "t5"]) ({ card: c } = applyRep(c, good(), t, ctx(30)));
    expect(c.tier).toBe(1);
    expect(windowFor(c)).toBe(900);
  });

  it("at the gate, 3 consecutive out-of-window reps — wrong OR slow — release it; one slow rep does nothing", () => {
    let c = graduate();
    for (const t of ["t3", "t4", "t5"]) ({ card: c } = applyRep(c, good(), t, ctx(30)));
    ({ card: c } = applyRep(c, slow(), "s1", ctx(30)));
    expect(c.tier).toBe(1); // a single slow rep touches nothing
    ({ card: c } = applyRep(c, good(600), "g", ctx(30)));
    expect(c.gateStreak).toBe(1); // an in-window rep breaks the release streak
    ({ card: c } = applyRep(c, slow(), "s2", ctx(30)));
    ({ card: c } = applyRep(c, again(), "s3", ctx(31)));
    // the Again queued a relearn step — step-phase reps never touch the gate streak
    const lapsesBefore = c.fsrs!.lapses;
    ({ card: c } = applyRep(c, good(600), "relearn", ctx(35)));   // againNow → confirm
    expect(c.gateStreak).toBe(-2);
    ({ card: c } = applyRep(c, good(600), "confirm2", ctx(60)));  // relearn complete → graduated, FSRS intact
    expect(c.step).toBe("graduated");
    expect(c.fsrs!.lapses).toBe(lapsesBefore);                    // never reset by re-graduation
    ({ card: c } = applyRep(c, slow(), "s4", ctx(61)));           // graduated, out-of-window → third strike
    expect(c.tier).toBe(0); // released — re-earn the same way
  });
});

describe("derived reviews — improvement-only, hands-only (02 §3 / 04 §4)", () => {
  const graduated = () => {
    let c = afterTeach(newCard("lh", 0));
    ({ card: c } = applyRep(c, good(), "t1", ctx(0)));
    ({ card: c } = applyRep(c, good(), "t2", ctx(25)));
    return c;
  };

  it("a clean-in-window embedded result writes a derived Good that advances scheduling", () => {
    const c = graduated();
    const before = c.fsrs!.reps;
    const out = applyDerived(c, good(700), "parent1", "att1", ctx(30, 2_000_000));
    expect(out).not.toBeNull();
    expect(out!.row.derived).toBe(true);
    expect(out!.row.parentAttemptId).toBe("parent1");
    expect(out!.card.fsrs!.reps).toBe(before + 1);
  });

  it("clean-but-slow (out of the subsumed card's window) writes nothing downward", () => {
    expect(applyDerived(graduated(), slow(), "p", "a", ctx(0))).toBeNull();
  });

  it("a flawed embedded result writes nothing downward", () => {
    expect(applyDerived(graduated(), again(), "p", "a", ctx(0))).toBeNull();
  });
});

describe("serving exports (04 §6)", () => {
  it("weaker cards outrank stronger; one-rep-from-a-gate adds the +0.2 boost", () => {
    let weak = afterTeach(newCard("w", 0));
    expect(servingPriority(weak, 0)).toBeGreaterThan(0.8); // step-phase = maximally weak
    ({ card: weak } = applyRep(weak, good(), "t1", ctx(0)));
    ({ card: weak } = applyRep(weak, good(), "t2", ctx(25))); // graduated (streak untouched by steps)
    ({ card: weak } = applyRep(weak, good(), "t3", ctx(30)));
    ({ card: weak } = applyRep(weak, good(), "t4", ctx(31)));
    expect(weak.gateStreak).toBe(2);
    expect(servingPriority(weak, 1_000_000)).toBeGreaterThanOrEqual(0.2); // gate-pending bonus present
  });

  it("interleave: never a third consecutive same root or quality; sovereignty is the filler's bypass", () => {
    const rec = [{ root: 0, quality: "maj" }, { root: 0, quality: "min" }];
    expect(interleaveOk(rec, { root: 0, quality: "dim" })).toBe(false); // third same root
    expect(interleaveOk(rec, { root: 5, quality: "maj" })).toBe(true);
    const recQ = [{ root: 2, quality: "m7" }, { root: 9, quality: "m7" }];
    expect(interleaveOk(recQ, { root: 4, quality: "m7" })).toBe(false); // third same quality
  });
});
