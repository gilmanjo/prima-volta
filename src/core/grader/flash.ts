// F8 instance + rep grading (F8 §Grading · 04 §5). Per instance: pitch + order strict,
// octave-exact (a staff cue names registers), read under the signature — a ♮ where the
// signature sharpens logs a `key:X` misread (F2 T2 semantics). Latency = blank → first
// CORRECT onset (03 §6, the eye-hand-span proxy). The triad snowman is one stacked event:
// its tones arrive in any order (recognition, not simultaneity — F4 owns the grab).
// Chatter law (03 §7): consecutive same-key onsets collapse before matching.
import type { GradeResult, NoteEvent, Rating } from "../types";

export interface FlashExpected { midi: number; naturalMidi: number; }

export interface FlashInstanceSpec {
  expected: FlashExpected[];   // sounding order (chord: the set)
  chord: boolean;
  windowMs: number;            // the generous answer window — displayMs is the difficulty
  blankAtMs: number;
  keyLabel: string | null;     // for `key:X` tags
}

const keyTag = (spec: FlashInstanceSpec, exp: FlashExpected, played: number): string[] =>
  spec.keyLabel !== null && played === exp.naturalMidi && exp.naturalMidi !== exp.midi
    ? [`key:${spec.keyLabel}`] : [];

export function gradeFlashInstance(spec: FlashInstanceSpec, notes: NoteEvent[]): GradeResult {
  const errors: GradeResult["errorEvents"] = [];
  const seq = [...notes].sort((a, b) => a.onMs - b.onMs)
    .filter((n, i, xs) => i === 0 || n.midi !== xs[i - 1].midi); // chatter collapses (03 §7)

  let firstCorrectAt: number | null = null;
  if (spec.chord) {
    const want = new Map(spec.expected.map(e => [e.midi, e]));
    const got = new Set<number>();
    for (const n of seq) {
      if (want.has(n.midi)) {
        if (firstCorrectAt === null) firstCorrectAt = n.onMs;
        got.add(n.midi);
      } else if (!errors.length) {
        const miss = spec.expected.find(e => !got.has(e.midi));
        errors.push({ type: "substitution", expectedMidi: miss?.midi, playedMidi: n.midi, tags: miss ? keyTag(spec, miss, n.midi) : [] });
      }
    }
    for (const e of spec.expected) if (!got.has(e.midi) && !errors.length) {
      errors.push({ type: "deletion", expectedMidi: e.midi, tags: [] });
    }
  } else {
    for (let i = 0; i < spec.expected.length; i++) {
      const exp = spec.expected[i];
      const n = seq[i];
      if (n === undefined) { errors.push({ type: "deletion", expectedMidi: exp.midi, tags: [] }); break; }
      if (n.midi !== exp.midi) {
        const samePc = ((n.midi - exp.midi) % 12 + 12) % 12 === 0;
        errors.push({ type: samePc ? "wrongOctave" : "substitution", expectedMidi: exp.midi, playedMidi: n.midi, tags: keyTag(spec, exp, n.midi) });
        break;
      }
      if (i === 0) firstCorrectAt = n.onMs;
    }
  }
  const clean = errors.length === 0;
  const latencyMs = firstCorrectAt !== null ? Math.round(firstCorrectAt - spec.blankAtMs) : null;
  const inWindow = clean && latencyMs !== null && latencyMs <= spec.windowMs;
  return { rating: !clean ? 1 : inWindow ? 3 : 2, latencyMs, errorEvents: errors, clean, inWindow };
}

/** 04 §5's aggregation: all Good → Good · exactly one below → Hard · more → Again.
 *  The rep's latency = mean of the clean instances' span latencies (the 07 stat);
 *  inWindow ≡ (rating === 3) so the replica refold stays exact (10 §5). */
export function aggregateFlashRep(instances: GradeResult[]): GradeResult {
  const below = instances.filter(r => r.rating !== 3).length;
  const rating: Rating = below === 0 ? 3 : below === 1 ? 2 : 1;
  const lats = instances.filter(r => r.clean && r.latencyMs !== null).map(r => r.latencyMs!);
  const latencyMs = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : null;
  return {
    rating, latencyMs,
    errorEvents: instances.flatMap(r => r.errorEvents),
    clean: instances.every(r => r.clean),
    inWindow: rating === 3,
  };
}
