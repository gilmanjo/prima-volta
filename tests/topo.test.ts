// F9 laws (F9 §Mechanics/§Grading): seeded streams with the span governing successive
// finds, canonical spelling, the flow-stop on a wrong find, the grab's spread, the
// wrongOctave + shift:leap signature, and the median-vs-budget stream rating.
import { describe, it, expect } from "vitest";
import { compareAdmission, type TopoAtom } from "../src/core/catalog";
import { sampleTopoStream } from "../src/core/topo";
import { evalTopoPrompt, summarizeTopoStream } from "../src/core/grader/topo";

const atom = (o: Partial<TopoAtom> = {}): TopoAtom =>
  ({ id: `t${JSON.stringify(o)}`, family: "topo", inDefault: true, target: "note", span: "inPosition", hand: "RH", cue: "name", ...o }) as TopoAtom;

const n = (midi: number, onMs: number) => ({ midi, onMs, vel: 60 });

describe("stream sampling (F9 §Mechanics)", () => {
  it("deterministic per seed; lengths 8–12 for notes, 5–7 for grabs", () => {
    for (let seed = 0; seed < 40; seed++) {
      const s = sampleTopoStream(atom({}), 0, seed);
      expect(sampleTopoStream(atom({}), 0, seed)).toEqual(s);
      expect(s.targets.length).toBeGreaterThanOrEqual(8);
      expect(s.targets.length).toBeLessThanOrEqual(12);
      const g = sampleTopoStream(atom({ target: "triad" }), 0, seed);
      expect(g.targets.length).toBeGreaterThanOrEqual(5);
      expect(g.targets.length).toBeLessThanOrEqual(7);
      expect(g.targets.every(t => t.midis.length === 3)).toBe(true);
    }
  });

  it("in-position stays within a fifth of the spawn; leap ≤ octave puts 5–12 semis between finds", () => {
    for (let seed = 0; seed < 60; seed++) {
      const pos = sampleTopoStream(atom({}), 0, seed);
      const spawn = pos.targets[0].midis[0];
      for (const t of pos.targets) expect(Math.abs(t.midis[0] - spawn)).toBeLessThanOrEqual(7);
      const leap = sampleTopoStream(atom({ span: "leapOctave" }), 0, seed);
      for (let i = 1; i < leap.targets.length; i++) {
        const d = Math.abs(leap.targets[i].midis[0] - leap.targets[i - 1].midis[0]);
        expect(d).toBeGreaterThanOrEqual(5);
        expect(d).toBeLessThanOrEqual(12);
      }
    }
  });

  it("registers honor the hand and the staff cue's bass band; spelling stays single-accidental", () => {
    for (let seed = 0; seed < 60; seed++) {
      for (const t of sampleTopoStream(atom({ span: "leapOctave" }), 0, seed).targets)
        for (const m of t.midis) { expect(m).toBeGreaterThanOrEqual(57); expect(m).toBeLessThanOrEqual(84); }
      for (const t of sampleTopoStream(atom({ hand: "LH", cue: "staff", span: "leapOctave" }), 0, seed).targets)
        for (const m of t.midis) { expect(m).toBeGreaterThanOrEqual(45); expect(m).toBeLessThanOrEqual(64); }
      for (const t of sampleTopoStream(atom({ target: "triad", span: "leapOctave" }), 0, seed).targets)
        for (const s of t.specs) expect(Math.abs(s.inline ?? 0)).toBeLessThanOrEqual(1);
    }
  });

  it("labels spell the canonical anchors (name-cue text targets)", () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++)
      for (const t of sampleTopoStream(atom({ span: "leapOctave" }), 0, seed).targets) seen.add(t.label);
    expect([...seen].some(l => l.includes("♭") || l.includes("♯"))).toBe(true); // black keys are the terrain
    for (const l of seen) expect(l).toMatch(/^[A-G][♭♯]?\d$/);
  });
});

describe("prompt grading (F9 §Grading)", () => {
  it("a wrong find flaws the prompt; wrong octave is the signature failure with shift:leap", () => {
    const ev = evalTopoPrompt({ midis: [68], spreadMs: 105, leap: true }, [n(80, 2000)]); // A♭4 for A♭3
    expect(ev.status).toBe("flawed");
    if (ev.status === "flawed") {
      expect(ev.errorEvents[0].type).toBe("wrongOctave");
      expect(ev.errorEvents[0].tags).toContain("shift:leap");
    }
    const sub = evalTopoPrompt({ midis: [68], spreadMs: 105, leap: false }, [n(67, 2000)]);
    if (sub.status === "flawed") expect(sub.errorEvents[0].type).toBe("substitution");
  });

  it("the grab: all tones inside the spread, any order; rolled grabs are timing-only", () => {
    const spec = { midis: [60, 64, 67], spreadMs: 105, leap: false };
    expect(evalTopoPrompt(spec, [n(64, 2000), n(60, 2040)]).status).toBe("pending");
    const clean = evalTopoPrompt(spec, [n(64, 2000), n(60, 2040), n(67, 2080)]);
    expect(clean.status).toBe("clean");
    if (clean.status === "clean") expect(clean.completedAtMs).toBe(2080);
    const rolled = evalTopoPrompt(spec, [n(60, 2000), n(64, 2100), n(67, 2300)]);
    expect(rolled.status).toBe("flawed");
    if (rolled.status === "flawed") { expect(rolled.timingOnly).toBe(true); expect(rolled.errorEvents[0].type).toBe("dropChordTone"); }
    // chatter never flaws (03 §7)
    expect(evalTopoPrompt(spec, [n(64, 2000), n(64, 2020), n(60, 2040), n(67, 2080)]).status).toBe("clean");
  });

  it("the stream rating: flawed → Again; clean → median vs budget; cold and worst reported", () => {
    const flawed = summarizeTopoStream([900, 1100], [{ type: "substitution", tags: [] }], 5000);
    expect(flawed.rating).toBe(1);
    expect(flawed.stats.accuracyPct).toBe(67);
    const good = summarizeTopoStream([1800, 700, 900, 1200, 800], null, 5000);
    expect(good.rating).toBe(3);
    expect(good.latencyMs).toBe(900);          // the median
    expect(good.stats.coldMs).toBe(1800);      // the first find, reported separately
    expect(good.stats.worstMs).toBe(1800);
    expect(good.inWindow).toBe(true);          // ≡ rating 3 (the refold invariant)
    const slow = summarizeTopoStream([5200, 5400, 5600], null, 5000);
    expect(slow.rating).toBe(2);
    expect(slow.inWindow).toBe(false);
  });
});

describe("admission (the tier ladder's order — target slowest, then span, cue, hand)", () => {
  const before = (a: TopoAtom, b: TopoAtom) => expect(compareAdmission(a, b)).toBeLessThan(0);
  it("notes sweep their spans before the first grab; name before staff; RH before LH", () => {
    before(atom({}), atom({ span: "leapOctave" }));
    before(atom({ span: "leapWide" }), atom({ target: "triad" }));
    before(atom({}), atom({ cue: "staff" }));
    before(atom({}), atom({ hand: "LH" }));
  });
});
