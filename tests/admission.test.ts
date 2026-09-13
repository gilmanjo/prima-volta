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
  it("the tier order itself holds: inversions < HT < broken for the same chord", () => {
    before(chord({ inversion: 2 }), chord({ hand: "HT" }));
    before(chord({ hand: "HT" }), chord({ form: "broken" }));
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

describe("arpeggios — the F6 ladder's stages, each sweeping the wave", () => {
  it("the last minor-triad HS key admits before the first triad HT", () => {
    before(arp({ basis: "min", root: 6 }), arp({ hand: "HT" }));
  });
  it("triads HT before sevenths HS; alternating dead last", () => {
    before(arp({ basis: "min", hand: "HT", root: 6 }), arp({ basis: "dom7" }));
    before(arp({ basis: "dim7", hand: "HT", root: 6 }), arp({ hand: "alternating" }));
  });
});
