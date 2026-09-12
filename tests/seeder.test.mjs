// The enumeration IS the spec: these exact counts are 02 §4's table, asserted forever.
import { describe, it, expect } from "vitest";
import { buildCatalog, BUDGET } from "../seed/seeder.mjs";

const EXPECTED = {
  "F1 Keys": [104, 24],
  "F2 Reading": [108, 36],
  "F3 Intervals": [420, 204],
  "F4 Chords": [6192, 5604],
  "F5 Scales": [324, 72],
  "F6 Arpeggios": [192, 72],
  "F7 Rhythm": [166, 36],
  "F8 Flash": [81, 4],
  "F9 Topography": [36, 16],
};

describe("seeder (02 §4 exact enumeration)", () => {
  const { rows, totalFull, totalDefault, atoms } = buildCatalog();

  it("matches every family row exactly", () => {
    for (const r of rows) {
      expect(EXPECTED[r.family], r.family).toBeDefined();
      expect([r.full, r.default], r.family).toEqual(EXPECTED[r.family]);
    }
    expect(rows.length).toBe(Object.keys(EXPECTED).length);
  });

  it("totals 7,623 full / 6,068 default, inside the <20k budget", () => {
    expect(totalFull).toBe(7623);
    expect(totalDefault).toBe(6068);
    expect(totalFull).toBeLessThan(BUDGET);
  });

  it("atom ids are unique and deterministic", () => {
    expect(new Set(atoms.map(a => a.id)).size).toBe(atoms.length);
    const again = buildCatalog();
    expect(again.atoms[100].id).toBe(atoms[100].id);
  });

  it("harmonic staff-cue intervals are dir-less (log #66); name-cue harmonic keeps dir", () => {
    const harmStaff = atoms.filter(a => a.family === "interval" && a.form === "harmonic" && a.cue === "staff");
    expect(harmStaff.length).toBeGreaterThan(0);
    expect(harmStaff.every(a => a.dir === null)).toBe(true);
    const harmName = atoms.filter(a => a.family === "interval" && a.form === "harmonic" && a.cue === "name");
    expect(harmName.every(a => a.dir === "up" || a.dir === "down")).toBe(true);
  });

  it("F7 honors the three validity rules", () => {
    const f7 = atoms.filter(a => a.family === "rhythm");
    const compound = new Set(["6/8", "9/8", "12/8"]);
    expect(f7.some(a => compound.has(a.meter) && a.vocab === "triplets")).toBe(false);
    expect(f7.some(a => a.feel === "swing" && (a.vocab === "basic" || compound.has(a.meter)))).toBe(false);
  });

  it("Reading's knowledge denominator (F2+F8 default scope) is exactly 40 (07 §3)", () => {
    const n = atoms.filter(a => (a.family === "reading" || a.family === "flash") && a.inDefault).length;
    expect(n).toBe(40);
  });
});
