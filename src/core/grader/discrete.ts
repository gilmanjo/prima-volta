// Discrete-answer grader (03 §4/§6/§7): one chord/note prompt → judgment.
// Laws implemented here:
//  · name-cue = pitch classes, any octave; doubling a named pc is never an error (03 §7)
//  · all tones inside the spread window; a missing tone after it closes logs dropChordTone (03 §4)
//  · any error event → Again, corrected included; clean-over-window → Hard; clean-in-window → Good (03 §6)
//  · HT reps also grade each hand on its own terms for the lattice (02 §3) — split at the largest gap
import { CHORD_SPREAD_MS, TRAILING_GRACE_MS } from "../constants";
import type { ErrorEvent, GradeResult, GradedAttempt, NoteEvent, Pc } from "../types";

export interface DiscreteChordSpec {
  pcs: Pc[];                 // expected pitch classes (name-cue), bass first for inversions
  hand: "RH" | "LH" | "HT";  // HT = the same pc set in each hand
  windowMs: number;          // the card's current latency window (tier-dependent, 03 §6)
  promptAtMs: number;
  inversion?: number;        // when set, the slash bass is graded: each hand's lowest tone = pcs[0]
  key?: string;              // for error-event tagging
}

function gradeOneHand(pcs: Pc[], notes: NoteEvent[], spec: DiscreteChordSpec, hand: "RH" | "LH"): GradeResult {
  const want = new Set(pcs);
  const errors: ErrorEvent[] = [];
  const matchedAt = new Map<Pc, number>();
  const seenMidi = new Set<number>();
  let firstOn: number | null = null;
  let completeAt: number | null = null;
  let lowestSounded: number | null = null;

  for (const n of notes) {
    if (seenMidi.has(n.midi) && completeAt === null) continue; // same-key retrigger: one note (device chatter)
    seenMidi.add(n.midi);
    if (completeAt !== null) {
      const dt = n.onMs - completeAt;
      // notes inside the spread window of completion are part of the ATTACK and grade normally
      // (an extra hand is not a flourish); the grace covers only what comes after (03 §7)
      if (dt > CHORD_SPREAD_MS && dt <= TRAILING_GRACE_MS) continue;
    }
    // spread check FIRST: a note arriving after the window closed, while tones were still missing,
    // means those tones were dropped (03 §4) — even if this very note completes the chord late.
    if (firstOn !== null && completeAt === null && n.onMs - firstOn > CHORD_SPREAD_MS
        && matchedAt.size < want.size && !errors.some(e => e.type === "dropChordTone")) {
      errors.push({ type: "dropChordTone", hand, tags: [] });
    }
    const pc = ((n.midi % 12) + 12) % 12 as Pc;
    if (firstOn === null) firstOn = n.onMs;
    if (lowestSounded === null || n.midi < lowestSounded) lowestSounded = n.midi;
    if (want.has(pc)) {
      if (!matchedAt.has(pc)) matchedAt.set(pc, n.onMs);
      // a second key on an already-sounded pc is an extra tone, not a register choice: the drill
      // asks for the chord, once per hand — hands are honor-system, extra keys are not (log #74)
      else errors.push({ type: "insertion", playedMidi: n.midi, hand, tags: [] });
    } else {
      errors.push({ type: "substitution", playedMidi: n.midi, expectedSym: [...want].join(","), hand, tags: [] });
    }
    if (matchedAt.size === want.size && completeAt === null) completeAt = n.onMs;
  }
  if (completeAt === null) {
    // never completed: each missing tone is a deletion
    for (const pc of want) if (!matchedAt.has(pc)) errors.push({ type: "deletion", expectedMidi: pc, hand, tags: [] });
  }
  // the slash bass is graded (F4 §Grading): right tones voiced over the wrong bass = an inversion error
  if (spec.inversion !== undefined && lowestSounded !== null) {
    const lowPc = ((lowestSounded % 12) + 12) % 12 as Pc;
    if (lowPc !== pcs[0] && want.has(lowPc)) {
      errors.push({ type: "substitution", playedMidi: lowestSounded, expectedMidi: pcs[0], hand, tags: [`inversion:${spec.inversion}`] });
    }
  }
  const latencyMs = completeAt !== null ? completeAt - spec.promptAtMs : null;
  const clean = errors.length === 0 && completeAt !== null;
  const inWindow = clean && latencyMs !== null && latencyMs <= spec.windowMs;
  const rating = !clean ? 1 : inWindow ? 3 : 2;
  return { rating, latencyMs, errorEvents: errors, clean, inWindow };
}

/** Split simultaneous HT playing into hands (03 §7's range attribution, name-cue form):
 *  try every split point and keep the one that best explains "the same chord in each hand" —
 *  a largest-gap heuristic mangles close-position chords an octave apart (Jordan's C/G report). */
export function splitHands(notes: NoteEvent[], pcs?: Pc[]): { LH: NoteEvent[]; RH: NoteEvent[] } {
  const sorted = [...notes].sort((a, b) => a.midi - b.midi);
  if (sorted.length < 2) return { LH: [], RH: sorted };
  const want = new Set<number>(pcs ?? []);
  const score = (half: NoteEvent[]): number => {
    if (!want.size) return 0;
    const seen = new Set<number>();
    let bad = 0;
    for (const n of half) {
      const pc = ((n.midi % 12) + 12) % 12;
      if (!want.has(pc)) bad++;
      else if (seen.has(pc)) bad++;
      else seen.add(pc);
    }
    return bad + (want.size - seen.size); // extras/dups + missing tones
  };
  let best = Math.floor(sorted.length / 2), bestScore = Infinity;
  for (let i = 1; i < sorted.length; i++) {
    const s = score(sorted.slice(0, i)) + score(sorted.slice(i))
      + Math.abs(i - sorted.length / 2) * 0.01; // tie-break toward balance
    if (s < bestScore) { bestScore = s; best = i; }
  }
  return { LH: sorted.slice(0, best), RH: sorted.slice(best) };
}

export function gradeDiscreteChord(
  spec: DiscreteChordSpec,
  notes: NoteEvent[],
  embeddedIds?: { RH?: string; LH?: string; embeddedWindowMs?: number },
): GradedAttempt {
  if (spec.hand !== "HT") {
    return { primary: gradeOneHand(spec.pcs, notes, spec, spec.hand), embedded: new Map() };
  }
  const { LH, RH } = splitHands(notes, spec.pcs);
  const lh = gradeOneHand(spec.pcs, LH, spec, "LH");
  const rh = gradeOneHand(spec.pcs, RH, spec, "RH");
  // primary = the HT judgment: both hands' tone sets, all errors combined, latency = later completion
  const errors = [...lh.errorEvents, ...rh.errorEvents];
  const clean = lh.clean && rh.clean;
  const latencyMs = lh.latencyMs !== null && rh.latencyMs !== null ? Math.max(lh.latencyMs, rh.latencyMs) : null;
  const inWindow = clean && latencyMs !== null && latencyMs <= spec.windowMs;
  const primary: GradeResult = { rating: !clean ? 1 : inWindow ? 3 : 2, latencyMs, errorEvents: errors, clean, inWindow };
  // embedded (02 §3, improvement-only enforced by the scheduler): each hand ON ITS OWN TERMS,
  // judged against the SUBSUMED card's window — clean-but-slow writes nothing downward.
  const embedded = new Map<string, GradeResult>();
  const w = embeddedIds?.embeddedWindowMs ?? spec.windowMs;
  const judge = (r: GradeResult): GradeResult => ({ ...r, inWindow: r.clean && r.latencyMs !== null && r.latencyMs <= w });
  if (embeddedIds?.LH) embedded.set(embeddedIds.LH, judge(lh));
  if (embeddedIds?.RH) embedded.set(embeddedIds.RH, judge(rh));
  return { primary, embedded };
}
