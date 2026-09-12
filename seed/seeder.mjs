// Prima Volta — the seeder (02-ITEM-MODEL §2/§4/§5/§7, made executable).
// Pure and deterministic: enumerates the full atom space from the authoritative schemas,
// prints §4's table with EXACT counts, asserts the <20k budget, and emits seed/catalog.json
// (atoms + admission ladders + subsumption rules + confusable seed sets + family versions).
// Usage: node seed/seeder.mjs   (from the repo root; add --quiet to suppress the table)

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "catalog.json");
const BUDGET = 20000; // 02 §4/§7: the CI assertion guards the FULL space, never default breadth

// ---------- shared enums (02 §2, verbatim) ----------
const SIGS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const PCS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MODES = ["major", "minor"];
const CLEFS = ["treble", "bass", "grand"];
const HANDS = ["RH", "LH", "HT"];
const QUALITIES = ["maj", "min", "dim", "aug", "maj7", "dom7", "m7", "m7b5", "dim7"];
const TRIADS = ["maj", "min", "dim", "aug"];
const SEVENTHS = ["maj7", "dom7", "m7", "m7b5", "dim7"];
const INTERVALS = ["m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"];
const SCALE_TYPES = ["major", "minorNatural", "minorHarmonic", "minorMelodic", "chromatic"];
const METERS = ["4/4", "3/4", "2/4", "6/8", "3/8", "9/8", "12/8", "cut"];
const COMPOUND = new Set(["6/8", "9/8", "12/8"]);
const VOCAB = ["basic", "eighths", "dotted", "sixteenths", "syncopation", "triplets", "restsFull"];
const PATTERNS = ["second", "third", "fourth", "fifth", "sixth", "triadShape", "scaleFragment", "brokenChord", "cadence"];
const ARP_BASES = ["maj", "min", "dom7", "dim7"];

// familyVersion is PER FAMILY and bumps only on incompatible identity redefinition (02 §1)
const FAMILY_VERSIONS = { keys: 1, reading: 1, interval: 1, chord: 1, scale: 1, arp: 1, rhythm: 1, flash: 1, topo: 1 };

// ---------- identity serialization (02 §1) ----------
function atomId(atom) {
  const canonical = JSON.stringify(atom, Object.keys(atom).sort());
  return createHash("sha1").update(canonical).digest("hex").slice(0, 16);
}

// ---------- default drill scope (02 §5, verbatim) ----------
const SCOPE = {
  keysGlobal: PCS,
  minorContent: false,
  keys: { modes: { major: true, minor: false }, clefs: { treble: true, bass: false }, gFlat: false },
  reading: { clefs: { treble: true, bass: false, grand: false } },
  chord: {
    qualities: { maj: true, min: true, dim: true, aug: false, maj7: true, dom7: true, m7: true, m7b5: true, dim7: true },
    inversions: { root: true, first: true, second: true, third: true },
    hands: { RH: true, LH: true, HT: true },
    forms: { blocked: true, broken: true },
    cues: { name: true, staff: true },
  },
  interval: { kinds: INTERVALS, forms: { melodic: true, harmonic: true }, clefs: { treble: true, bass: false, grand: false }, hands: { RH: true, LH: true } },
  scale: { types: { major: true, minorNatural: false, minorHarmonic: false, minorMelodic: false, chromatic: false } },
  arp: { bases: { maj: true, min: true, dom7: false, dim7: false }, alternating: false },
  rhythm: { meters: ["4/4", "3/4", "2/4"], vocab: ["basic", "eighths", "dotted", "sixteenths", "syncopation", "triplets"], swing: false, voices2: true },
  flash: { patterns: ["second", "third", "fourth", "fifth"], clefs: { treble: true, bass: false, grand: false }, contexts: { open: true, ks12: false, ksAll: false } },
  topo: { targets: { note: true, triad: true, tetrad: false }, spans: { inPosition: true, leapOctave: true, leapWide: false } },
};

// ---------- family enumerators ----------
const inversionsOf = (q) => (SEVENTHS.includes(q) ? [0, 1, 2, 3] : [0, 1, 2]);

function* f1() { // 13 sigs × mode × clef × dir = 104 (−6 real behind the gFlat toggle)
  for (const sig of SIGS) for (const mode of MODES) for (const clef of ["treble", "bass"]) for (const dir of ["sigToKey", "keyToSig"]) {
    const dflt = SCOPE.keys.modes[mode] && SCOPE.keys.clefs[clef] && (sig !== -6 || SCOPE.keys.gFlat);
    yield [{ family: "keys", sig, mode, clef, dir }, dflt];
  }
}

function* f2() { // clef × band × keyContext × accidental × answer = 108 (keyContext × accidental CROSS — log #66)
  for (const clef of CLEFS) for (const band of ["staff12", "ledger3"])
    for (const keyContext of ["open", "ks14", "ksAll"]) for (const accidental of ["none", "single", "double"])
      for (const answer of ["midi", "selector"])
        yield [{ family: "reading", clef, band, keyContext, accidental, answer }, SCOPE.reading.clefs[clef]];
}

function* f3() { // name→midi · staff→midi · staff→selector; dir null on {form:harmonic, cue:staff} (log #66/R5)
  for (const kind of INTERVALS) for (const form of ["melodic", "harmonic"]) {
    // name→midi (no clef; hand required)
    for (const dir of ["up", "down"]) for (const hand of ["RH", "LH"])
      yield [{ family: "interval", kind, dir, form, cue: "name", clef: null, hand, answer: "midi" }, true];
    // staff cues (clef required; harmonic pairs are dir-less)
    const dirs = form === "harmonic" ? [null] : ["up", "down"];
    for (const dir of dirs) for (const clef of CLEFS) {
      for (const hand of ["RH", "LH"])
        yield [{ family: "interval", kind, dir, form, cue: "staff", clef, hand, answer: "midi" }, SCOPE.interval.clefs[clef]];
      yield [{ family: "interval", kind, dir, form, cue: "staff", clef, hand: null, answer: "selector" }, SCOPE.interval.clefs[clef]];
    }
  }
}

function* f4() { // five arms (02 §2); quality × inversion validity; aug waits behind its toggle
  const qOK = (q) => SCOPE.chord.qualities[q];
  for (const root of PCS) for (const quality of QUALITIES) {
    for (const inversion of inversionsOf(quality)) {
      for (const hand of HANDS) for (const form of ["blocked", "broken"]) for (const cue of ["name", "staff"])
        yield [{ family: "chord", root, quality, inversion, hand, form, cue, answer: "midi" }, qOK(quality)];
      for (const clef of ["treble", "bass"])
        yield [{ family: "chord", root, quality, inversion, clef, answer: "id" }, qOK(quality)];
      yield [{ family: "chord", root, quality, inversion, answer: "engraving" }, qOK(quality)];
    }
    yield [{ family: "chord", root, quality, answer: "spell" }, qOK(quality)]; // inversion-blind
    for (const hand of HANDS)
      yield [{ family: "chord", root, quality, hand, stream: true, answer: "midi" }, qOK(quality)]; // T6 streams
  }
}

function* f5() { // type × key × hand × cue − chromatic keysig (a signature implies no chromatic scale)
  for (const type of SCALE_TYPES) for (const key of PCS) for (const hand of HANDS) for (const cue of ["name", "keysig"]) {
    if (type === "chromatic" && cue === "keysig") continue;
    yield [{ family: "scale", type, key, hand, cue }, SCOPE.scale.types[type]];
  }
}

function* f6() { // basis × root × hand(incl. alternating) × start:root
  for (const basis of ARP_BASES) for (const root of PCS) for (const hand of [...HANDS, "alternating"]) {
    const dflt = SCOPE.arp.bases[basis] && (hand !== "alternating" || SCOPE.arp.alternating);
    yield [{ family: "arp", basis, root, hand, start: "root" }, dflt];
  }
}

// F7 validity (the seeder's pruning rules — F7 §Params, data not schema):
//  · compound meters exclude the triplets set (the beat already divides in three)
//  · swing requires eighths (nothing to swing in `basic`)
//  · swing is invalid in compound meters (no straight 8th pairs to move)
function* f7() {
  for (const meter of METERS) for (const vocab of VOCAB) for (const voices of [1, 2]) for (const feel of ["straight", "swing"]) {
    if (COMPOUND.has(meter) && vocab === "triplets") continue;
    if (feel === "swing" && (vocab === "basic" || COMPOUND.has(meter))) continue;
    const dflt = SCOPE.rhythm.meters.includes(meter) && SCOPE.rhythm.vocab.includes(vocab)
      && (feel !== "swing" || SCOPE.rhythm.swing) && (voices !== 2 || SCOPE.rhythm.voices2) && feel === "straight";
    yield [{ family: "rhythm", meter, vocab, voices, feel }, dflt];
  }
}

function* f8() { // pattern × clef × keyContext (ks12 = signatures to 2 accidentals)
  for (const pattern of PATTERNS) for (const clef of CLEFS) for (const keyContext of ["open", "ks12", "ksAll"]) {
    const dflt = SCOPE.flash.patterns.includes(pattern) && SCOPE.flash.clefs[clef] && SCOPE.flash.contexts[keyContext];
    yield [{ family: "flash", pattern, clef, keyContext }, dflt];
  }
}

function* f9() { // target × span × hand × cue
  for (const target of ["note", "triad", "tetrad"]) for (const span of ["inPosition", "leapOctave", "leapWide"])
    for (const hand of ["RH", "LH"]) for (const cue of ["name", "staff"]) {
      const dflt = SCOPE.topo.targets[target] && SCOPE.topo.spans[span];
      yield [{ family: "topo", target, span, hand, cue }, dflt];
    }
}

// ---------- admission seed data (05 §1–2: the key wave, quality order, tier orders) ----------
const ADMISSION = {
  // The ladder's key column, wave by wave (05 §1 — the single source; C major first, everything cumulative)
  keyWave: [
    { rank: "F", adds: { majors: ["C"] } },
    { rank: "E", adds: { majors: ["G", "F"] } },
    { rank: "D", adds: { minors: ["Am"] } },
    { rank: "C", adds: { majors: ["D"], note: "single accidentals" } },
    { rank: "B", adds: { majors: ["Bb"], minors: ["Dm", "Em"], note: "2♯/2♭ complete" } },
    { rank: "A", adds: { majors: ["A", "Eb"], minors: ["harmonic minors to 3 accidentals"] } },
    { rank: "S", adds: { majors: ["E", "Ab"], note: "secondary chords enter" } },
    { rank: "SS", adds: { majors: ["B", "Db"], note: "chromatic neighbors" } },
    { rank: "SSS", adds: { majors: ["F#", "Gb (scope-gated)"], note: "all keys + modulation" } },
  ],
  qualityOrder: ["maj", "min", "maj7", "dom7", "m7", "dim", "m7b5", "dim7", "aug"], // F4 (log #52)
  tierOrders: {
    keys: ["flat"], // tierless knowledge atoms — admits along the key wave alone
    reading: ["T0 staff12", "T1 accidentals", "T2 signatures", "T3 ledger3", "T4 doubles", "T5 speeded"],
    interval: ["T1 white anchors", "T2 all anchors (gate)", "T3 harmonic", "T4 speeded (gate)"],
    chord: ["T1 root blocked HS", "T2 inversions", "T3 HT", "T4 broken", "T5 fluency gates", "T6 streams"],
    scale: ["T1 1oct HS", "T2 2oct HS (gate)", "T3 2oct HT", "T4 tempo gates", "T5 4oct+HT gate"],
    arp: ["T1 1oct HS", "T2 2oct (gate)", "T3 HT", "T4 seventh bases", "T5 fluency gates", "T6 alternating"],
    rhythm: ["vocab sets in order; 2-voice admits after 1-voice fluency per set"],
    flash: ["displayMs ladder 2000→400 (gates), then keyContext widens"],
    topo: ["T1 notes", "T2 wider spans", "T3 chord grabs"],
  },
};

// Subsumption (02 §3 — hands only, deliberately narrow) + confusables (04 §6 — starts narrow)
const SUBSUMPTION = [
  { families: ["chord (play arm)", "scale", "arp"], rule: "HT ⊐ RH, LH for the same atom otherwise; alternating (F6) is a sibling, never subsumed" },
];
const CONFUSABLES = {
  rules: ["same root, quality neighbors: m7 ↔ dom7, maj7 ↔ m7", "F♯ major ↔ G♭ major (F1 enharmonic pair)"],
  widening: "only from observed confusion tags, never speculation (04 §6)",
};

// ---------- enumerate, count, assert ----------
const FAMILIES = [["F1 Keys", f1], ["F2 Reading", f2], ["F3 Intervals", f3], ["F4 Chords", f4],
  ["F5 Scales", f5], ["F6 Arpeggios", f6], ["F7 Rhythm", f7], ["F8 Flash", f8], ["F9 Topography", f9]];

export function buildCatalog() {
  const atoms = [];
  const rows = [];
  for (const [label, gen] of FAMILIES) {
    let full = 0, dflt = 0;
    for (const [atom, inDefault] of gen()) {
      full++; if (inDefault) dflt++;
      atoms.push({ id: atomId({ ...atom, familyVersion: FAMILY_VERSIONS[atom.family] }), ...atom, inDefault });
    }
    rows.push({ family: label, full, default: dflt });
  }
  const totalFull = rows.reduce((a, r) => a + r.full, 0);
  const totalDefault = rows.reduce((a, r) => a + r.default, 0);
  const ids = new Set(atoms.map(a => a.id));
  if (ids.size !== atoms.length) throw new Error(`ID COLLISION: ${atoms.length - ids.size} duplicate atom ids`);
  if (totalFull >= BUDGET) throw new Error(`BUDGET EXCEEDED: full space ${totalFull} >= ${BUDGET} (02 §4)`);
  return { rows, totalFull, totalDefault, atoms };
}

export { FAMILY_VERSIONS, ADMISSION, SUBSUMPTION, CONFUSABLES, SCOPE, BUDGET };

// ---------- CLI: emit catalog.json + counts.json ----------
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { rows, totalFull, totalDefault, atoms } = buildCatalog();
  if (!process.argv.includes("--quiet")) {
    console.table([...rows, { family: "TOTAL", full: totalFull, default: totalDefault }]);
    console.log(`budget: ${totalFull} < ${BUDGET} ✓   unique ids ✓`);
  }
  writeFileSync(OUT, JSON.stringify({
    generated: "seed/seeder.mjs",
    familyVersions: FAMILY_VERSIONS,
    counts: { rows, totalFull, totalDefault, budget: BUDGET },
    admission: ADMISSION,
    subsumption: SUBSUMPTION,
    confusables: CONFUSABLES,
    defaultScope: SCOPE,
    atoms,
  }, null, 1));
  writeFileSync(join(dirname(OUT), "counts.json"),
    JSON.stringify({ rows, totalFull, totalDefault, budget: BUDGET }, null, 2));
  if (!process.argv.includes("--quiet")) console.log(`wrote ${OUT} (${atoms.length} atoms) + counts.json`);
}
