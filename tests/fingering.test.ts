// Fingering data integrity (F5/F6 §Grading, log #81): sourced entries only, and the
// transcription obeys the physical laws the sources state — most importantly the thumb
// rule, which catches copy errors that digit-eyeballing misses.
import { describe, it, expect } from "vitest";
import { lineFingering, runLabels } from "../src/core/fingering";
import { buildRun } from "../src/core/runs";
import type { ArpAtom, ScaleAtom } from "../src/core/catalog";
import type { Pc } from "../src/core/types";

const BLACK = new Set([1, 3, 6, 8, 10]);
const PCS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as Pc[];

const scale = (key: Pc, hand: "RH" | "LH" | "HT" = "RH", type = "major"): ScaleAtom =>
  ({ id: `s${key}${hand}${type}`, family: "scale", inDefault: true, type, key, hand, cue: "name" }) as ScaleAtom;
const arp = (root: Pc, basis: string, hand: "RH" | "LH" | "HT" = "RH"): ArpAtom =>
  ({ id: `a${root}${basis}${hand}`, family: "arp", inDefault: true, basis, root, hand, start: "root" }) as ArpAtom;

const ascMidis = (a: ScaleAtom | ArpAtom, hand: "RH" | "LH"): number[] => {
  const one = { ...a, hand } as ScaleAtom | ArpAtom;
  const { slots } = buildRun(one);
  return slots.slice(0, (slots.length + 1) / 2).map(s => s.midis[0]);
};

describe("major scales — all 12 keys, both hands, sourced", () => {
  for (const key of PCS) for (const hand of ["RH", "LH"] as const) {
    it(`key ${key} ${hand}: 8 digits, 1–5, thumb never on a black key`, () => {
      const f = lineFingering(scale(key, hand), hand)!;
      expect(f).not.toBeNull();
      expect(f.length).toBe(8);
      expect(f.every(d => d >= 1 && d <= 5)).toBe(true);
      const midis = ascMidis(scale(key, hand), hand);
      for (let i = 0; i < 8; i++) if (f[i] === 1) expect(BLACK.has(midis[i] % 12)).toBe(false);
    });
  }
});

describe("triad arpeggios — sourced pattern system and its exceptions", () => {
  for (const basis of ["maj", "min"]) for (const root of PCS) for (const hand of ["RH", "LH"] as const) {
    const allBlack = (basis === "maj" && root === 6) || (basis === "min" && root === 3);
    it(`${basis} on ${root} ${hand}: 4 digits${allBlack ? " (all-black — thumb on black is legal here)" : ", thumb on white"}`, () => {
      const f = lineFingering(arp(root, basis, hand), hand)!;
      expect(f).not.toBeNull();
      expect(f.length).toBe(4);
      if (!allBlack) {
        const midis = ascMidis(arp(root, basis, hand), hand);
        for (let i = 0; i < 4; i++) if (f[i] === 1) expect(BLACK.has(midis[i] % 12)).toBe(false);
      }
    });
  }

  it("dom7/dim7 are not yet sourced — no entry, never invented", () => {
    expect(lineFingering(arp(7, "dom7"), "RH")).toBeNull();
    expect(lineFingering(arp(0, "dim7"), "LH")).toBeNull();
  });
});

describe("teach labels (runLabels)", () => {
  it("C major RH: the exact sourced digits on the path keys", () => {
    expect(runLabels(scale(0))).toEqual({ 60: "1", 62: "2", 64: "3", 65: "1", 67: "2", 69: "3", 71: "4", 72: "5" });
  });

  it("HT joins differing digits at the shared boundary key (B♭: LH top 3 · RH bottom 4)", () => {
    const l = runLabels(scale(10, "HT"))!;
    expect(l[70]).toBe("3·4");
    expect(l[58]).toBe("3"); // LH tonic
    expect(l[82]).toBe("4"); // RH top
  });

  it("HT with agreeing boundary digits shows one (C major: 1)", () => {
    expect(runLabels(scale(0, "HT"))![60]).toBe("1");
  });

  it("unsourced material labels nothing: minor scales, dom7 arps", () => {
    expect(runLabels(scale(9, "RH", "minorNatural"))).toBeNull();
    expect(runLabels(arp(7, "dom7"))).toBeNull();
  });
});
