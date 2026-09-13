// Bout lifecycle laws (08 §6): the idle clock is the ONLY closer, and a stale bout closes
// at its last activity — idle time never counts as practice. Plus the starter template's
// ruled shape (08 §5).
import { describe, it, expect } from "vitest";
import { boutDecision } from "../src/core/bout";
import { BOUT_IDLE_MS } from "../src/core/constants";
import { STARTER_TEMPLATE } from "../src/core/template";

describe("bouts (08 §6)", () => {
  const cur = { id: "b1", openedAt: 1000, lastActivityAt: 50_000 };

  it("activity within the idle window continues the same bout", () => {
    const d = boutDecision(cur, 50_000 + BOUT_IDLE_MS, "b2");
    expect(d.kind).toBe("continue");
    expect(d.current.id).toBe("b1");
    expect(d.current.lastActivityAt).toBe(50_000 + BOUT_IDLE_MS);
  });

  it("beyond ~20 idle minutes the bout rotates — the stale one closes AT ITS LAST ACTIVITY", () => {
    const d = boutDecision(cur, 50_000 + BOUT_IDLE_MS + 1, "b2");
    expect(d.kind).toBe("rotate");
    if (d.kind === "rotate") {
      expect(d.closeAt).toBe(50_000); // idle time never counts as practice
      expect(d.current.id).toBe("b2");
    }
  });

  it("no current bout: the first graded attempt opens one", () => {
    const d = boutDecision(undefined, 9_000, "b1");
    expect(d.kind).toBe("rotate");
    if (d.kind === "rotate") expect(d.closeAt).toBeNull();
  });

  it("the idle constant is the ruled ~20 minutes", () => {
    expect(BOUT_IDLE_MS).toBe(20 * 60_000);
  });
});

describe("the starter template (08 §5 — real basic by design)", () => {
  it("four blocks, the ruled bounds, reading last", () => {
    const b = STARTER_TEMPLATE.blocks;
    expect(b.map(x => x.name)).toEqual(["Keys & chords", "Scales", "Arpeggios", "Reading"]);
    expect(b[0].boundMinutes).toBe(10);
    expect(b[1].boundMinutes).toBe(5);
    expect(b[2].boundMinutes).toBe(5);
    expect(b[3].boundCount).toBe(4);
    expect(b[0].families).toContain("keys");
    expect(b[0].families).toContain("chord");
  });
});
