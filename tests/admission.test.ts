// Admission nesting (05 §2, log #79): difficulty is the SLOWEST axis — the frontier meets
// every key at its simple form before any key's demand modifications admit. These pin the
// exact pathologies of Jordan's field report: C-everything before a simple B, and HT
// arriving directly after HS of the same key.
import { describe, it, expect } from "vitest";
import { compareAdmission, type ArpAtom, type ChordAtom, type ScaleAtom } from "../src/core/catalog";

const chord = (o: Partial<ChordAtom>): ChordAtom =>
  ({ id: `c${JSON.stringify(o)}`, family: "chord", inDefault: true, root: 0, quality: "maj", inversion: 0, hand: "RH", form: "blocked", cue: "name", answer: "midi", ...o }) as ChordAtom;
const scale = (o: Partial<ScaleAtom>): ScaleAtom =>
  ({ id: `s${JSON.stringify(o)}`, family: "scale", inDefault: true, type: "major", key: 0, hand: "RH", cue: "name", ...o }) as ScaleAtom;
const arp = (o: Partial<ArpAtom>): ArpAtom =>
  ({ id: `a${JSON.stringify(o)}`, family: "arp", inDefault: true, basis: "maj", root: 0, hand: "RH", start: "root", ...o }) as ArpAtom;

const before = (a: Parameters<typeof compareAdmission>[0], b: Parameters<typeof compareAdmission>[1]) =>
  expect(compareAdmission(a, b)).toBeLessThan(0);

describe("chords — every key at root-position HS before any difficulty modification", () => {
  it("a simple B major admits before C major's first inversion", () => {
    before(chord({ root: 11 }), chord({ inversion: 1 }));
  });
  it("even the last wave's root (F♯) admits before C major hands-together", () => {
    before(chord({ root: 6 }), chord({ hand: "HT" }));
  });
  it("every quality's root admits before the first inversion anywhere (dim7 root < maj inversion)", () => {
    before(chord({ quality: "dim7" }), chord({ inversion: 1 }));
  });
  it("the stage order (log #80): broken < inversions < HT; stacked mods after their singles", () => {
    before(chord({ root: 11 }), chord({ form: "broken" }));                    // all roots before broken
    before(chord({ form: "broken", root: 6 }), chord({ inversion: 1 }));       // all broken before inversions
    before(chord({ inversion: 2, root: 6 }), chord({ inversion: 1, form: "broken" })); // singles before stacks
    before(chord({ inversion: 1, form: "broken", root: 6 }), chord({ hand: "HT" }));   // every HS form before any HT
  });
  it("hands-separate siblings walk adjacently per key: C-RH < C-LH < G-RH", () => {
    before(chord({}), chord({ hand: "LH" }));
    before(chord({ hand: "LH" }), chord({ root: 7 }));
  });
});

describe("scales — the hand axis is the slowest (HT never follows HS of the same key directly)", () => {
  it("B major RH admits before C major hands-together", () => {
    before(scale({ key: 11 }), scale({ hand: "HT" }));
  });
  it("RH · LH adjacent per key, then the wave: C-RH < C-LH < G-RH", () => {
    before(scale({}), scale({ hand: "LH" }));
    before(scale({ hand: "LH" }), scale({ key: 7 }));
  });
});

describe("arpeggios — the F6 ladder's stages, each sweeping the wave (log #80)", () => {
  it("sevenths HS admit before any triad HT — hands-together is the heavier modification", () => {
    before(arp({ basis: "min", root: 6 }), arp({ basis: "dom7" }));  // triads HS sweep first
    before(arp({ basis: "dim7", root: 6 }), arp({ hand: "HT" }));    // ALL HS before the first HT
  });
  it("triads HT before sevenths HT; alternating dead last", () => {
    before(arp({ hand: "HT", root: 6 }), arp({ basis: "dom7", hand: "HT" }));
    before(arp({ basis: "dim7", hand: "HT", root: 6 }), arp({ hand: "alternating" }));
  });
});
