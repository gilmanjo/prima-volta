"use client";
// The practice player, Phase-1 (U2's rulings): landscape-first, mode chip beside the devchip,
// one-run chord symbols, no key labels, no clock — a wrong answer STOPS THE FLOW for
// reconciliation, and run material (F5/F6) plays against the metronome pulse with the ruled
// count-in (one bar ≥80, two below) and the 03 §4/§6 grid matcher + pulsed rating map.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Keybed, type KeyState } from "../../components/Keybed";
import {
  atomTitle, catalog, chordPcs, chordSymbol, compareAdmission, keyNameOf, knowledgeAnswerable, relativeOf, sigSpelling, subsumedBy, PC_NAMES,
  type ArpAtom, type ChordAtom, type DrillAtom, type IntervalAtom, type KeysAtom, type ReadingAtom, type ScaleAtom,
} from "../../core/catalog";
import { intervalWords, sampleInterval, spellNoteName, staffSpec, type IntervalInstance } from "../../core/intervals";
import { gradeIntervalPair } from "../../core/grader/interval";
import { IntervalSelector } from "../../components/IntervalSelector";
import { sampleReading, spellSounding, type ReadingInstance } from "../../core/reading";
import { gradeSingleNote } from "../../core/grader/note";
import { StaffView } from "../../components/StaffView";
import { NoteSelector } from "../../components/NoteSelector";
import { SpellChips } from "../../components/SpellChips";
import { Sig } from "../../components/Sig";
import { KeyWheel, SigGrid, type PickState } from "../../components/KeysWidgets";
import { gradeChoice, gradeSpellTaps } from "../../core/grader/choice";
import { next as fillerNext, noteServed, type FillerState } from "../../core/filler";
import { gradeDiscreteChord } from "../../core/grader/discrete";
import { runLabels } from "../../core/fingering";
import { anchorOffset, buildRun, runTempo, selfPacedRunResult, type Run } from "../../core/runs";
import { afterTeach, applyDerived, applyRep, windowFor, type DrillCard } from "../../core/scheduler";
import { ulid } from "../../core/ulid";
import type { GradeResult, NoteEvent, Pc } from "../../core/types";
import { CHORD_SPREAD_MS, INTERVAL_WINDOW_MS, KNOWLEDGE_WINDOW_MS, READ_GATE_WINDOW_MS, READ_LEARN_WINDOW_MS, spellWindowMs } from "../../core/constants";
import { STARTER_TEMPLATE, type PracticeTemplate, type TemplateBlock } from "../../core/template";
import { defaultProfile, initMidi, onNote, onNoteOff } from "../../services/midi";
import { ensureAudio, ui } from "../../services/uiAudio";
import { refoldCards } from "../../core/refold";
import { appendAttempt, appendReview, attachBoutProfile, loadCards, loadProfile, pullReplica, pushOutbox, saveCard, touchBout } from "../../services/store";

type Phase = "init" | "teach" | "prompt" | "reconcile" | "good" | "next" | "interstitial" | "done" | "polishing" | "unavailable";
const RECONCILE_ARM_MS = 600; // the settle-beat: the failed take's tail never bleeds in (U2)

type Family = "chord" | "scale" | "arp" | "keys" | "reading" | "interval" | "free";
const FAMILY_TITLE: Record<Family, string> = { chord: "Chords", scale: "Scales", arp: "Arpeggios", keys: "Keys & signatures", reading: "Note reading", interval: "Intervals", free: "Free roam" };

const CHORD_POOL: ChordAtom[] = (catalog.defaults("chord") as ChordAtom[])
  .filter(a => !a.stream && (a.answer === "midi" ? a.cue === "name" && a.form === "blocked" : a.answer === "spell"))
  .sort(compareAdmission);

function poolFor(f: Family): DrillAtom[] {
  if (f === "keys")
    return (catalog.defaults("keys") as KeysAtom[]).sort(compareAdmission);
  if (f === "scale") // keysig cue is engraved — staff territory, still ahead
    return (catalog.defaults("scale") as ScaleAtom[]).filter(a => a.cue === "name").sort(compareAdmission);
  if (f === "arp") // alternating is the T6 capstone — its handoff grading comes later
    return (catalog.defaults("arp") as ArpAtom[]).filter(a => a.hand !== "alternating").sort(compareAdmission);
  if (f === "reading")
    return (catalog.defaults("reading") as ReadingAtom[]).sort(compareAdmission);
  if (f === "interval")
    return (catalog.defaults("interval") as IntervalAtom[]).sort(compareAdmission);
  if (f === "free") // U1's ruled free roam: the weakest-first everything-in-scope mix
    return [...poolFor("keys"), ...CHORD_POOL, ...poolFor("scale"), ...poolFor("arp"), ...poolFor("reading"), ...poolFor("interval")].sort(compareAdmission);
  return CHORD_POOL;
}

/** Knowledge-only mode (08 §7 — a filter, not a mode): with no MIDI device the filler
 *  offers only choice-answerable atoms; identical scheduling, identical evidence. */
function deviceFiltered(pool: DrillAtom[], hasDevice: boolean): DrillAtom[] {
  return hasDevice ? pool : pool.filter(knowledgeAnswerable);
}

/** A template block's serving pool (08 §5): its areas' pools, weakest-first via the filler.
 *  The template's "reading" block is F10 passages (Phase 3) — not F2's note-reading family. */
function poolForBlock(b: TemplateBlock): DrillAtom[] {
  return b.families
    .flatMap(f => (f === "reading" ? [] : poolFor(f)))
    .sort(compareAdmission);
}

const isRunAtom = (a: DrillAtom): a is ScaleAtom | ArpAtom => a.family === "scale" || a.family === "arp";
const isKeysAtom = (a: DrillAtom): a is KeysAtom => a.family === "keys";
const isSpellAtom = (a: DrillAtom): a is ChordAtom & { answer: "spell" } =>
  a.family === "chord" && a.answer === "spell";
const isReadingAtom = (a: DrillAtom): a is ReadingAtom => a.family === "reading";
const isIntervalAtom = (a: DrillAtom): a is IntervalAtom => a.family === "interval";

/** Confirmation copy (F1 §Variants): sig→key reveals the relative pairing (and the ±6
 *  enharmonic); key→sig spells the accidentals in order. */
function keysConfirmation(a: KeysAtom): string {
  if (a.dir === "sigToKey") {
    const enh = a.sig === 6 ? (a.mode === "major" ? " (= G♭ major)" : " (= e♭ minor)")
      : a.sig === -6 ? (a.mode === "major" ? " (= F♯ major)" : " (= d♯ minor)") : "";
    return `${keyNameOf(a.sig, a.mode)}${enh} · relative of ${relativeOf(a.sig, a.mode)}`;
  }
  return sigSpelling(a.sig);
}

export default function Practice() {
  const [phase, setPhase] = useState<Phase>("init");
  const [family, setFamily] = useState<Family>("chord");
  const [device, setDevice] = useState<string | null>(null);
  const [atom, setAtom] = useState<DrillAtom | null>(null);
  const [keys, setKeys] = useState<Record<number, KeyState>>({});
  const [feedback, setFeedback] = useState<string>("");
  const [labels, setLabels] = useState<Record<number, string> | null>(null);
  const [picks, setPicks] = useState<Record<number, PickState>>({});
  const [inst, setInst] = useState<ReadingInstance | null>(null);
  const [ivInst, setIvInst] = useState<IntervalInstance | null>(null);
  const [doubles, setDoubles] = useState(false);

  const S = useRef<{
    filler: FillerState; pool: DrillAtom[]; served: number; profileId: string | null;
    profileLatencyMs: number; profileJitterMs: number;
    template: PracticeTemplate | null; blockIdx: number; blockStartMs: number; blockServed: number; interTimer: number | null;
    card: DrillCard | null; promptAt: number; collected: NoteEvent[]; matched: Set<number>;
    reconcileMatched: Set<number>; sinceSync: number; finalized: boolean; retryTimer: number | null;
    reconcileArmedAt: number; reconcileBuf: { midi: number; onMs: number }[];
    spellTaps: { midi: number; atMs: number }[];
    run: Run | null; runNoteMs: number; runPos: number; runSlotHit: Set<number>; runOnsets: number[]; runOffset: number;
    teachSlot: number; teachHit: Set<number>; baseKeys: Record<number, KeyState>;
    readingInst: ReadingInstance | null; readingSeed: number; hasDevice: boolean;
    ivInst: IntervalInstance | null; ivSeed: number;
  }>({
    filler: { cards: new Map(), recentServed: [], admittedThisWindow: [] }, pool: CHORD_POOL, served: 0,
    profileId: null, profileLatencyMs: 0, profileJitterMs: 25,
    template: null, blockIdx: 0, blockStartMs: 0, blockServed: 0, interTimer: null,
    card: null, promptAt: 0, collected: [], matched: new Set(), reconcileMatched: new Set(),
    sinceSync: 0, finalized: false, retryTimer: null, reconcileArmedAt: 0, reconcileBuf: [], spellTaps: [],
    run: null, runNoteMs: 1000, runPos: 0, runSlotHit: new Set(), runOnsets: [], runOffset: 0, teachSlot: 0, teachHit: new Set(), baseKeys: {},
    readingInst: null, readingSeed: 0, hasDevice: false,
    ivInst: null, ivSeed: 0,
  });

  const phaseRef = useRef<Phase>("init");
  const atomRef = useRef<DrillAtom | null>(null);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { atomRef.current = atom; }, [atom]);

  /** F4 spell lights CHIPS, not keys — the state map is pc-keyed (F4 §Variants). */
  const spellPcStates = (a: ChordAtom, state: KeyState): Record<number, KeyState> =>
    Object.fromEntries(chordPcs(a).map(pc => [pc, state]));

  const expectedKeyStates = useCallback((a: DrillAtom, state: KeyState): Record<number, KeyState> => {
    const out: Record<number, KeyState> = {};
    if (isKeysAtom(a) || isReadingAtom(a) || isIntervalAtom(a)) return out; // lit inline or on widgets
    if (isRunAtom(a)) {
      for (const m of buildRun(a).pathMidis) out[m] = state;
      return out;
    }
    const stack = (base: number) => {
      let prev = base - 1;
      for (const pc of chordPcs(a)) {          // bass-first voicing: the inversion is the lesson
        let m = base + ((pc - (base % 12) + 12) % 12);
        while (m <= prev) m += 12;
        out[m] = state; prev = m;
      }
    };
    if (a.hand === "HT") { stack(48); stack(60); }
    else stack(a.hand === "LH" ? 48 : 60);
    return out;
  }, []);

  const serve = useCallback(() => {
    const st = S.current;
    if (st.retryTimer !== null) { clearTimeout(st.retryTimer); st.retryTimer = null; }
    // bounded blocks end at the next item boundary — soft chime + auto-advance (U2)
    if (st.template) {
      const b = st.template.blocks[st.blockIdx];
      const over = (b.boundMinutes !== undefined && performance.now() - st.blockStartMs >= b.boundMinutes * 60_000)
        || (b.boundCount !== undefined && st.blockServed >= b.boundCount);
      if (over) { ui.chime(); enterInterstitial(st.blockIdx + 1); return; }
    }
    setKeys({});
    st.baseKeys = {}; // the board always clears between items (log #74's stale-green report)
    st.finalized = false;
    // knowledge-only mode (08 §7): no device → only choice-answerable atoms are offered
    const res = fillerNext({ pool: deviceFiltered(st.pool, st.hasDevice) }, st.filler, { servedCount: st.served, nowMs: Date.now() });
    if (res.kind === "polishing" || res.kind === "unavailable") {
      setPhase(res.kind);
      st.retryTimer = window.setTimeout(serve, 4000); // never a dead screen — quietly check again
      return;
    }
    st.served++;
    st.blockServed++;
    noteServed(st.filler, res.atom);
    st.card = res.card;
    st.promptAt = performance.now();
    st.collected = []; st.matched = new Set(); st.reconcileMatched = new Set();
    setAtom(res.atom);
    setFeedback("");
    setLabels(null);
    setPicks({});
    setInst(null);
    setIvInst(null);
    if (isIntervalAtom(res.atom)) {
      // engine-A sampled anchors (F3 §Grading): the card's tier IS the anchor pool —
      // tier 0 white keys with the anchor highlighted, tier 1 all twelve from memory
      st.ivSeed = Math.floor(Math.random() * 2 ** 31);
      st.ivInst = sampleInterval(res.atom, res.card.tier, st.ivSeed);
      setIvInst(st.ivInst);
      const iv = st.ivInst;
      if (res.kind === "teach") {
        st.teachSlot = 0; st.teachHit = new Set();
        if (res.atom.answer === "midi") {
          const base: Record<number, KeyState> = { [iv.anchor.midi]: "exp", [iv.target.midi]: "exp" };
          st.baseKeys = base;
          setKeys(base);
          setFeedback(res.atom.form === "harmonic"
            ? `${iv.label} — ${spellNoteName(iv.anchor)} + ${spellNoteName(iv.target)}, together`
            : `${iv.label} — ${spellNoteName(iv.anchor)}, then ${spellNoteName(iv.target)}`);
        } else {
          setFeedback(`${iv.label} — ${intervalWords(iv)}`);
        }
        setPhase("teach");
      } else {
        if (res.atom.answer === "midi" && res.atom.cue === "name" && res.card.tier === 0) {
          // T1: the anchor highlight — it fades out at the all-anchors gate (F3 §Tier ladder)
          const base: Record<number, KeyState> = { [iv.anchor.midi]: "exp" };
          st.baseKeys = base;
          setKeys(base);
        }
        setPhase("prompt");
      }
      return;
    }
    if (isKeysAtom(res.atom)) {
      st.run = null;
      if (res.kind === "teach") {
        // teach shows the pairing: the correct option highlighted; tap it to continue (U2 Teach)
        setPicks({ [res.atom.sig]: "correct" });
        setFeedback(keysConfirmation(res.atom));
        setPhase("teach");
      } else {
        setPhase("prompt");
      }
      return;
    }
    if (isRunAtom(res.atom)) {
      st.run = buildRun(res.atom);
      if (res.kind === "teach") {
        st.teachSlot = 0; st.teachHit = new Set();
        const base = expectedKeyStates(res.atom, "exp");
        st.baseKeys = base;
        setKeys(base);
        setLabels(runLabels(res.atom)); // sourced fingering numerals — or nothing (U2, log #81)
        setPhase("teach");
      } else {
        // name-cue runs are SELF-PACED (03 §6, log #87): the tier anchor demands pace,
        // not entrainment — the pulse arrives with cue types that can engrave a note value
        st.runNoteMs = runTempo(res.card.tier).noteMs;
        st.runPos = 0; st.runSlotHit = new Set(); st.runOnsets = []; st.runOffset = 0;
        setPhase("prompt");
      }
      return;
    }
    st.run = null;
    if (isReadingAtom(res.atom)) {
      // engine-A with a SAMPLED target (02 §1): fresh seeded instance, seed logged
      st.readingSeed = Math.floor(Math.random() * 2 ** 31);
      st.readingInst = sampleReading(res.atom, st.readingSeed);
      setInst(st.readingInst);
      // the NoteSelector's accidental row grows once doubles have admitted (F2 §Variants)
      setDoubles(res.atom.accidental === "double" || [...st.filler.cards.keys()].some(id => {
        const at = catalog.byId(id) as ReadingAtom | undefined;
        return at?.family === "reading" && at.accidental === "double";
      }));
      if (res.kind === "teach") {
        if (res.atom.answer === "midi") {
          const base = { [st.readingInst.midi]: "exp" as KeyState };
          st.baseKeys = base;
          setKeys(base);
        }
        setFeedback(st.readingInst.spelled);
        setPhase("teach");
      } else {
        setPhase("prompt");
      }
      return;
    }
    if (isSpellAtom(res.atom)) {
      st.spellTaps = [];
      if (res.kind === "teach") {
        // choice-shape teach (U2 §Teach): tones named + chips revealed; a tap continues
        const base = spellPcStates(res.atom, "exp");
        st.baseKeys = base;
        setKeys(base);
        setFeedback(chordPcs(res.atom).map(pc => PC_NAMES[pc]).join(" · "));
        setPhase("teach");
      } else {
        setPhase("prompt");
      }
      return;
    }
    if (res.kind === "teach") {
      const base = expectedKeyStates(res.atom, "exp");
      st.baseKeys = base;
      setKeys(base);
      setPhase("teach");
    } else {
      setPhase("prompt");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedKeyStates]);

  const [blockIdxView, setBlockIdxView] = useState(0);

  /** Enter the block-transition interstitial (U2): "up next", the name large, its bound,
   *  the template dots, one placing line. Auto-advances; tappable. Empty-pool blocks skip. */
  const enterInterstitial = useCallback((idx: number) => {
    const st = S.current;
    const blocks = st.template!.blocks;
    // a block with nothing servable HERE — empty, or at-instrument-only with no device — skips (08 §4/§7)
    while (idx < blocks.length && deviceFiltered(poolForBlock(blocks[idx]), st.hasDevice).length === 0) idx++;
    if (idx >= blocks.length) {
      ui.chime();
      setPhase("done");
      void pushOutbox();
      return;
    }
    st.blockIdx = idx;
    setBlockIdxView(idx);
    setAtom(null); setKeys({}); setFeedback("");
    setPhase("interstitial");
    st.interTimer = window.setTimeout(beginBlock, 2600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginBlock = useCallback(() => {
    const st = S.current;
    if (st.interTimer !== null) { clearTimeout(st.interTimer); st.interTimer = null; }
    const block = st.template!.blocks[st.blockIdx];
    st.pool = poolForBlock(block);
    st.filler = { cards: st.filler.cards, recentServed: [], admittedThisWindow: [] }; // shared cards, fresh block context
    st.blockStartMs = performance.now();
    st.blockServed = 0;
    serve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The between-items beat (U2): the prompt fades out, a breath with the serve tick, the next
   *  fades in — so the next prompt reads as NEW even when it differs only by hand. */
  const advance = useCallback((delayMs = 0) => {
    setTimeout(() => {
      setPhase("next"); setKeys({}); // atom stays mounted so the outgoing prompt can fade
      ui.tick();
      setTimeout(serve, 380);
    }, delayMs);
  }, [serve]);

  const logAttempt = useCallback((a: DrillAtom, attemptId: string, nowMs: number, gradeJson: Record<string, unknown>, rawChoiceJson?: unknown, seed?: string) => {
    const st = S.current;
    const raw = rawChoiceJson === undefined ? st.collected.slice() : [];
    void (async () => {
      // a graded attempt is bout activity (08 §6): continue the sitting or open a fresh bout
      const boutId = await touchBout(st.profileId, nowMs);
      await appendAttempt({
        id: attemptId, kind: "drill", atomId: a.id, mode: "rehearsal", profileId: st.profileId,
        rawMidi: raw,
        ...(rawChoiceJson !== undefined ? { rawChoiceJson } : {}),
        ...(seed !== undefined ? { seed } : {}),
        graderVersion: "v1", tagsVersion: "v1", gradeJson,
        startedAt: Math.round(nowMs - (performance.now() - st.promptAt)), boutId,
      });
      if (++st.sinceSync >= 8) { st.sinceSync = 0; void pushOutbox(); }
    })();
  }, []);

  /** F2 staff→midi: the first key answers — octave-strict, sounding pitch (F𝄪4 accepts G4's key). */
  const finalizeReading = useCallback((a: ReadingAtom, note: NoteEvent) => {
    const st = S.current;
    const inst = st.readingInst!;
    const windowMs = st.card!.tier === 1 ? READ_GATE_WINDOW_MS : READ_LEARN_WINDOW_MS;
    const res = gradeSingleNote({ midi: inst.midi, spelled: inst.spelled, windowMs, promptAtMs: st.promptAt }, note);
    const attemptId = ulid();
    const nowMs = Date.now();
    const { card: after, row } = applyRep(st.card!, res, attemptId, { servedCount: st.served, nowMs });
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, { rating: res.rating, latencyMs: res.latencyMs, errors: res.errorEvents.length }, undefined, String(st.readingSeed));
    void appendReview({ id: ulid(), ...row, instanceSeed: String(st.readingSeed) });
    if (res.rating === 1) {
      ui.err();
      const base: Record<number, KeyState> = { [inst.midi]: "exp", [note.midi]: "err" };
      st.baseKeys = base;
      setKeys(base);
      setFeedback(`Expected ${inst.spelled}`);
      setPhase("reconcile");
      return;
    }
    if (res.rating === 3) ui.good(); else ui.hard();
    setFeedback(`${inst.spelled} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s / ${(windowMs / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
    setPhase("good");
    advance(850);
  }, [advance, logAttempt]);

  /** F3 pairs: both notes, exact octaves; melodic order enforced; harmonic = the grab. */
  const finalizeInterval = useCallback((a: IntervalAtom) => {
    const st = S.current;
    const iv = st.ivInst!;
    const res = gradeIntervalPair({
      anchorMidi: iv.anchor.midi, targetMidi: iv.target.midi, form: a.form,
      windowMs: INTERVAL_WINDOW_MS, spreadMs: CHORD_SPREAD_MS + st.profileJitterMs, promptAtMs: st.promptAt,
    }, st.collected);
    const attemptId = ulid();
    const nowMs = Date.now();
    const { card: after, row } = applyRep(st.card!, res, attemptId, { servedCount: st.served, nowMs });
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, { rating: res.rating, latencyMs: res.latencyMs, errors: res.errorEvents.length }, undefined, String(st.ivSeed));
    void appendReview({ id: ulid(), ...row, instanceSeed: String(st.ivSeed) });
    if (res.rating === 1) {
      ui.err();
      st.teachSlot = 0; st.teachHit = new Set(); // the replay walker starts over
      const errKeys: Record<number, KeyState> = {};
      for (const e of res.errorEvents) if (e.playedMidi !== undefined) errKeys[e.playedMidi] = "err";
      const base: Record<number, KeyState> = { [iv.anchor.midi]: "exp", [iv.target.midi]: "exp", ...errKeys };
      st.baseKeys = base;
      setKeys(base);
      setFeedback(a.form === "harmonic"
        ? `Expected ${iv.label} — ${spellNoteName(iv.anchor)} + ${spellNoteName(iv.target)}, together`
        : `Expected ${iv.label} — ${spellNoteName(iv.anchor)}, then ${spellNoteName(iv.target)}`);
      setPhase("reconcile");
      return;
    }
    if (res.rating === 3) ui.good(); else ui.hard();
    setFeedback(`${iv.label} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s / ${(INTERVAL_WINDOW_MS / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
    setPhase("good");
    advance(850);
  }, [advance, logAttempt]);

  /** F3 staff→IntervalSelector: strict symbolic naming — the engraving disambiguates. */
  /** Choice-answer teach ack (U2 §Teach): the result is named, the widget inert — any tap
   *  in the answer zone continues. Never logs (04 §3). */
  const teachAck = useCallback(() => {
    const a = atomRef.current;
    const st = S.current;
    if (phaseRef.current !== "teach" || !a) return;
    const taught = afterTeach(st.card!);
    st.filler.cards.set(a.id, taught);
    void saveCard(taught);
    advance(250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance]);

  const handleIntervalPick = useCallback((sym: { size: number; quality: string }) => {
    const a = atomRef.current;
    const st = S.current;
    const ph = phaseRef.current;
    if (!a || !isIntervalAtom(a) || a.answer !== "selector") return;
    const iv = st.ivInst!;
    const picked = sym.quality === "P" ? `P${sym.size}`
      : sym.quality === "aug" ? `A${sym.size}`
      : sym.quality === "dim" ? `d${sym.size}`
      : `${sym.quality}${sym.size}`;
    if (ph === "reconcile") {
      if (picked === iv.label) { ui.good(); advance(250); }
      return;
    }
    if (ph !== "prompt" || st.finalized) return;
    st.finalized = true;
    const commitAt = performance.now();
    const res = gradeChoice({ expectedSym: iv.label, windowMs: KNOWLEDGE_WINDOW_MS, promptAtMs: st.promptAt }, picked, commitAt);
    const attemptId = ulid();
    const nowMs = Date.now();
    const { card: after, row } = applyRep(st.card!, res, attemptId, { servedCount: st.served, nowMs }, false, null, false);
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, { rating: res.rating, latencyMs: res.latencyMs, errors: res.errorEvents.length },
      { expectedSym: iv.label, tapped: [{ sym: picked, atMs: Math.round(commitAt - st.promptAt) }] }, String(st.ivSeed));
    void appendReview({ id: ulid(), ...row, instanceSeed: String(st.ivSeed) });
    if (res.rating === 1) {
      ui.err();
      setFeedback(`Expected ${iv.label}`);
      setPhase("reconcile");
      return;
    }
    if (res.rating === 3) ui.good(); else ui.hard();
    setFeedback(`${iv.label} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s / ${(KNOWLEDGE_WINDOW_MS / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
    setPhase("good");
    advance(1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance, logAttempt]);

  /** F2 staff→NoteSelector: symbolic naming — the spelling itself is graded (F𝄪 ≠ G). */
  const handleReadingPick = useCallback((sym: { letter: number; acc: number; octave: number }) => {
    const a = atomRef.current;
    const st = S.current;
    const ph = phaseRef.current;
    if (!a || !isReadingAtom(a) || a.answer !== "selector") return;
    const inst = st.readingInst!;
    const playedSym = spellSounding(sym.letter, sym.octave, sym.acc, 0);
    if (ph === "reconcile") {
      if (playedSym === inst.spelled) { ui.good(); advance(250); }
      return;
    }
    if (ph !== "prompt" || st.finalized) return;
    st.finalized = true;
    const commitAt = performance.now();
    const res = gradeChoice({ expectedSym: inst.spelled, windowMs: KNOWLEDGE_WINDOW_MS, promptAtMs: st.promptAt }, playedSym, commitAt);
    const attemptId = ulid();
    const nowMs = Date.now();
    // the selector variant is knowledge — tierless, no gate (02 §1)
    const { card: after, row } = applyRep(st.card!, res, attemptId, { servedCount: st.served, nowMs }, false, null, false);
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, { rating: res.rating, latencyMs: res.latencyMs, errors: res.errorEvents.length },
      { expectedSym: inst.spelled, tapped: [{ sym: playedSym, atMs: Math.round(commitAt - st.promptAt) }] }, String(st.readingSeed));
    void appendReview({ id: ulid(), ...row, instanceSeed: String(st.readingSeed) });
    if (res.rating === 1) {
      ui.err();
      setFeedback(`Expected ${inst.spelled}`);
      setPhase("reconcile");
      return;
    }
    if (res.rating === 3) ui.good(); else ui.hard();
    setFeedback(`${inst.spelled} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s / ${(KNOWLEDGE_WINDOW_MS / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
    setPhase("good");
    advance(1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance, logAttempt]);

  const finalize = useCallback(async (a: ChordAtom) => {
    const st = S.current;
    const card = st.card!;
    const pcs = chordPcs(a);
    const subs = a.hand === "HT" ? subsumedBy(a) : [];
    const graded = gradeDiscreteChord(
      {
        pcs, hand: a.hand as "RH" | "LH" | "HT", windowMs: windowFor(card), promptAtMs: st.promptAt,
        inversion: (a.inversion as number) ?? 0,
        spreadMs: CHORD_SPREAD_MS + st.profileJitterMs, // every grading window widens by jitter (03 §3)
      },
      st.collected,
      a.hand === "HT" ? {
        LH: subs.find(x => x.hand === "LH")?.id, RH: subs.find(x => x.hand === "RH")?.id,
        embeddedWindowMs: 5000,
      } : undefined,
    );
    const attemptId = ulid();
    const nowMs = Date.now();
    const ctx = { servedCount: st.served, nowMs };
    const { card: after, row } = applyRep(card, graded.primary, attemptId, ctx);
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, {
      rating: graded.primary.rating, latencyMs: graded.primary.latencyMs, errors: graded.primary.errorEvents.length,
    });
    void appendReview({ id: ulid(), ...row });
    for (const [subId, er] of graded.embedded) {
      const subCard = st.filler.cards.get(subId);
      if (!subCard) continue;
      const out = applyDerived(subCard, er, attemptId, ulid(), ctx);
      if (out) { st.filler.cards.set(subId, out.card); void saveCard(out.card); void appendReview({ id: ulid(), ...out.row }); }
    }
    return graded.primary;
  }, [logAttempt]);

  const finalizeRun = useCallback((a: ScaleAtom | ArpAtom, wrongMidi?: number) => {
    const st = S.current;
    const run = st.run!;
    const complete = st.runPos >= run.slots.length;
    // self-paced (03 §6): pace decides Hard vs Good; a wrong note already stopped the flow
    const result: GradeResult = complete && wrongMidi === undefined
      ? selfPacedRunResult(st.runOnsets, st.runNoteMs)
      : {
          rating: 1, latencyMs: null, clean: false, inWindow: false,
          errorEvents: [{ type: "substitution", playedMidi: wrongMidi, expectedMidi: run.slots[st.runPos] ? run.slots[st.runPos].midis[0] + st.runOffset : undefined, tags: [] }],
        };
    const attemptId = ulid();
    const nowMs = Date.now();
    const { card: after, row } = applyRep(st.card!, result, attemptId, { servedCount: st.served, nowMs });
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, {
      rating: result.rating, latencyMs: result.latencyMs, errors: result.errorEvents.length, paceMsPerNote: result.latencyMs,
    });
    void appendReview({ id: ulid(), ...row });
    if (result.rating === 1) {
      ui.err();
      st.teachSlot = 0; st.teachHit = new Set(); // the remediation walk starts from the bottom
      // the path lights at the register the attempt anchored (03 §7's offset)
      const base: Record<number, KeyState> = Object.fromEntries(run.pathMidis.map(m => [m + st.runOffset, "exp" as KeyState]));
      if (wrongMidi !== undefined) base[wrongMidi] = "err";
      st.baseKeys = base;
      setKeys(base);
      setFeedback(`Expected ${atomTitle(a)} — up and down`);
      setPhase("reconcile");
      return;
    }
    if (result.rating === 3) ui.good(); else ui.hard();
    setFeedback(`${atomTitle(a)} · ${result.latencyMs} / ${st.runNoteMs} ms per note · ${result.rating === 3 ? "Good" : "Hard"}`);
    setPhase("good");
    advance(850);
  }, [advance, expectedKeyStates, logAttempt]);

  /** F4 spell (F4 §Variants: "tap its notes", octave-free): grade the tap stream. */
  const finalizeSpell = useCallback((a: ChordAtom, wrongPc?: number) => {
    const st = S.current;
    // 03 §6: a multi-tap answer widens the window per additional tone
    const windowMs = spellWindowMs(chordPcs(a).length);
    const res = gradeSpellTaps(
      { pcs: chordPcs(a), symbol: chordSymbol(a), windowMs, promptAtMs: st.promptAt },
      st.spellTaps,
    );
    const attemptId = ulid();
    const nowMs = Date.now();
    // spelling is knowledge — tierless, no gate (02 §1)
    const { card: after, row } = applyRep(st.card!, res, attemptId, { servedCount: st.served, nowMs }, false, null, false);
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, { rating: res.rating, latencyMs: res.latencyMs, errors: res.errorEvents.length },
      { spellTaps: st.spellTaps });
    void appendReview({ id: ulid(), ...row });
    const tones = chordPcs(a).map(pc => PC_NAMES[pc]).join(" · ");
    if (res.rating === 1) {
      ui.err();
      st.reconcileMatched = new Set();
      const base = { ...spellPcStates(a, "exp"), ...(wrongPc !== undefined ? { [wrongPc]: "err" as KeyState } : {}) };
      st.baseKeys = base;
      setKeys(base);
      setFeedback(`Expected ${chordSymbol(a)} — ${tones}`);
      setPhase("reconcile");
      return;
    }
    if (res.rating === 3) ui.good(); else ui.hard();
    setFeedback(`${chordSymbol(a)} · ${tones} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s / ${(windowMs / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
    setPhase("good");
    advance(1000);
  }, [advance, expectedKeyStates, logAttempt]);

  /** Spell input — a chip tap or a played key, the same answer (octave-free recall).
   *  Chip state is pc-keyed; a played key folds to its pc. */
  const spellInput = useCallback((midi: number) => {
    const a = atomRef.current;
    const st = S.current;
    const ph = phaseRef.current;
    if (!a || !isSpellAtom(a)) return;
    const pc = ((midi % 12) + 12) % 12 as Pc;
    const want = new Set(chordPcs(a));
    if (ph === "teach" || ph === "reconcile") {
      // screen taps ack the teach via the zone (U2 §Teach); this path is played keys +
      // reconcile chips — walking the revealed tones continues (the reconciliation rule)
      if (!want.has(pc)) {
        if (ph === "reconcile") { setKeys({ ...spellPcStates(a, "exp"), [pc]: "err" }); st.reconcileMatched = new Set(); }
        return;
      }
      st.reconcileMatched.add(pc);
      setKeys(k => ({ ...k, [pc]: "ok" }));
      if (st.reconcileMatched.size >= want.size) {
        if (ph === "teach") {
          const taught = afterTeach(st.card!);
          st.filler.cards.set(a.id, taught);
          void saveCard(taught);
          advance(300);
        } else { ui.good(); advance(250); }
      }
      return;
    }
    if (ph !== "prompt" || st.finalized) return;
    st.spellTaps.push({ midi, atMs: performance.now() });
    if (want.has(pc)) {
      st.matched.add(pc);
      setKeys(k => ({ ...k, [pc]: "ok" }));
      if (st.matched.size >= want.size) { st.finalized = true; finalizeSpell(a); }
    } else {
      st.finalized = true;
      setKeys(k => ({ ...k, [pc]: "err" }));
      finalizeSpell(a, pc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance, finalizeSpell]);

  /** Widget taps (F1): the answer path for choice atoms — commit on tap (03 §3). */
  const handlePick = useCallback((sig: number) => {
    const a = atomRef.current;
    const st = S.current;
    const ph = phaseRef.current;
    if (!a || !isKeysAtom(a)) return;
    if (ph === "reconcile") {
      // continue by tapping the correct answer — instant (U2's reconciliation rule)
      if (sig === a.sig) { ui.good(); advance(250); }
      else setPicks(p => ({ ...p, [sig]: "wrong" }));
      return;
    }
    if (ph !== "prompt" || st.finalized) return;
    st.finalized = true;
    const commitAt = performance.now();
    const expectedSym = a.dir === "sigToKey" ? keyNameOf(a.sig, a.mode) : `sig:${a.sig}`;
    const playedSym = a.dir === "sigToKey" ? keyNameOf(sig, a.mode) : `sig:${sig}`;
    const res = gradeChoice(
      { expectedSym, windowMs: KNOWLEDGE_WINDOW_MS, promptAtMs: st.promptAt, tags: [`key:${keyNameOf(a.sig, a.mode)}`] },
      playedSym, commitAt,
    );
    const attemptId = ulid();
    const nowMs = Date.now();
    // knowledge atoms are tierless — no gate arms or releases (02 §1, F1 §Grading)
    const { card: after, row } = applyRep(st.card!, res, attemptId, { servedCount: st.served, nowMs }, false, null, false);
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, { rating: res.rating, latencyMs: res.latencyMs, errors: res.errorEvents.length },
      { dir: a.dir, expectedSym, tapped: [{ sym: playedSym, atMs: Math.round(commitAt - st.promptAt) }] });
    void appendReview({ id: ulid(), ...row });
    if (res.rating === 1) {
      ui.err();
      setPicks({ [a.sig]: "correct", [sig]: "wrong" });
      setFeedback(`Expected ${a.dir === "sigToKey" ? keyNameOf(a.sig, a.mode) : sigSpelling(a.sig)}`);
      setPhase("reconcile");
      return;
    }
    if (res.rating === 3) ui.good(); else ui.hard();
    setPicks({ [sig]: "correct" });
    setFeedback(`${keysConfirmation(a)} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s / ${(KNOWLEDGE_WINDOW_MS / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
    setPhase("good");
    advance(1200); // the confirmation carries the relative pairing — worth a breath more
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance, logAttempt]);

  const handleNote = useCallback((n: { midi: number; onMs: number; vel: number }) => {
    const a = atomRef.current;
    const st = S.current;
    const ph = phaseRef.current;
    if (!a) return;
    if (isKeysAtom(a)) return; // choice atoms answer on widgets — the piano is silent here
    if (isSpellAtom(a)) { spellInput(n.midi); return; } // a played key spells too — same recall
    if (isIntervalAtom(a)) {
      if (a.answer !== "midi") return; // the selector variant answers on the widget
      const iv = st.ivInst!;
      const pairSlots = a.form === "harmonic" ? [[iv.anchor.midi, iv.target.midi]] : [[iv.anchor.midi], [iv.target.midi]];
      if (ph === "teach" || ph === "reconcile") {
        const slot = pairSlots[st.teachSlot];
        if (!slot || !slot.includes(n.midi) || st.teachHit.has(n.midi)) return; // ungraded — wrongs ignored
        st.teachHit.add(n.midi);
        setKeys(k => ({ ...k, [n.midi]: "ok" }));
        if (st.teachHit.size >= slot.length) {
          st.teachSlot++;
          st.teachHit = new Set();
          if (st.teachSlot >= pairSlots.length) {
            if (ph === "teach") {
              const taught = afterTeach(st.card!);
              st.filler.cards.set(a.id, taught);
              void saveCard(taught);
              advance(300);
            } else { ui.good(); advance(250); }
          }
        }
        return;
      }
      if (ph !== "prompt" || st.finalized) return;
      st.collected.push({ midi: n.midi, onMs: n.onMs, vel: n.vel });
      if (a.form === "melodic") {
        if (st.collected.length === 1) {
          // order enforced: the anchor sounds first (direction is identity)
          if (n.midi !== iv.anchor.midi) { st.finalized = true; ui.err(); setKeys(k => ({ ...k, [n.midi]: "err" })); finalizeInterval(a); }
          else setKeys(k => ({ ...k, [n.midi]: "ok" }));
          return;
        }
        // chatter law (03 §7): a retrigger of the anchor is never the second note —
        // the pair is two distinct keys by construction (the grader collapses it too)
        if (n.midi === iv.anchor.midi) return;
        st.finalized = true;
        setKeys(k => ({ ...k, [n.midi]: n.midi === iv.target.midi ? "ok" : "err" }));
        finalizeInterval(a);
        return;
      }
      // harmonic — the two-finger grab
      if (n.midi !== iv.anchor.midi && n.midi !== iv.target.midi) {
        st.finalized = true; ui.err();
        setKeys(k => ({ ...k, [n.midi]: "err" }));
        finalizeInterval(a);
        return;
      }
      if (st.matched.has(n.midi)) return; // retrigger of a held key
      st.matched.add(n.midi);
      setKeys(k => ({ ...k, [n.midi]: "ok" }));
      if (st.matched.size >= 2) { st.finalized = true; finalizeInterval(a); }
      return;
    }
    if (isReadingAtom(a)) {
      if (a.answer !== "midi") return; // the selector variant answers on the widget
      const inst = st.readingInst!;
      if (ph === "teach") {
        if (n.midi !== inst.midi) return; // ungraded — wrongs ignored
        setKeys(k => ({ ...k, [n.midi]: "ok" }));
        const taught = afterTeach(st.card!);
        st.filler.cards.set(a.id, taught);
        void saveCard(taught);
        advance(300);
        return;
      }
      if (ph === "reconcile") {
        if (n.midi === inst.midi) { setKeys(k => ({ ...k, [n.midi]: "ok" })); ui.good(); advance(250); }
        else setKeys(k => ({ ...k, [n.midi]: "err" }));
        return;
      }
      if (ph !== "prompt" || st.finalized) return;
      st.collected.push({ midi: n.midi, onMs: n.onMs, vel: n.vel });
      st.finalized = true; // the first key answers a single-note read
      setKeys(k => ({ ...k, [n.midi]: n.midi === inst.midi ? "ok" : "err" }));
      finalizeReading(a, { midi: n.midi, onMs: n.onMs, vel: n.vel });
      return;
    }

    if (isRunAtom(a)) {
      if (ph === "teach") {
        const run = st.run!;
        const slot = run.slots[st.teachSlot];
        if (!slot) return;
        if (slot.midis.includes(n.midi) && !st.teachHit.has(n.midi)) {
          st.teachHit.add(n.midi);
          setKeys(k => ({ ...k, [n.midi]: "ok" }));
          if (st.teachHit.size >= slot.midis.length) {
            st.teachSlot++; st.teachHit = new Set();
            if (st.teachSlot >= run.slots.length) {
              const taught = afterTeach(st.card!);
              st.filler.cards.set(a.id, taught);
              void saveCard(taught);
              advance(300);
            }
          }
        }
        return;
      }
      if (ph === "prompt" && !st.finalized) {
        // the self-paced walker (03 §6/F5/F6): order-strict; a wrong note stops the flow
        st.collected.push({ midi: n.midi, onMs: n.onMs, vel: n.vel });
        const run = st.run!;
        const slot = run.slots[st.runPos];
        if (!slot) return;
        if (st.runPos === 0 && st.runSlotHit.size === 0) {
          // name-cue register freedom (03 §7): the first tonic-pc note fixes the octave offset
          const off = anchorOffset(slot, n.midi);
          if (off !== null) st.runOffset = off;
        }
        const slotMidis = slot.midis.map(m => m + st.runOffset);
        if (slotMidis.includes(n.midi)) {
          if (st.runSlotHit.has(n.midi)) return; // retrigger of a held key — chatter
          st.runSlotHit.add(n.midi);
          setKeys(k => ({ ...k, [n.midi]: "ok" }));
          if (st.runSlotHit.size >= slotMidis.length) {
            st.runOnsets.push(n.onMs);
            st.runPos++;
            st.runSlotHit = new Set();
            if (st.runPos >= run.slots.length) { st.finalized = true; finalizeRun(a); }
          }
          return;
        }
        // a re-strike of the just-completed slot within a beat's breath is bounce, not a wrong note
        const prev = st.runPos > 0 ? run.slots[st.runPos - 1] : null;
        if (prev && prev.midis.some(m => m + st.runOffset === n.midi) && n.onMs - st.runOnsets[st.runOnsets.length - 1] < 200) return;
        st.finalized = true;
        ui.err();
        setKeys(k => ({ ...k, [n.midi]: "err" }));
        finalizeRun(a, n.midi);
        return;
      }
      if (ph === "reconcile") {
        // remediation = walk the lit path from the top, self-paced and ungraded (U2, log #88) —
        // lit at the register the attempt anchored (the offset survives into the walk)
        const run = st.run!;
        const slot = run.slots[st.teachSlot];
        if (!slot || !slot.midis.some(m => m + st.runOffset === n.midi) || st.teachHit.has(n.midi)) return;
        st.teachHit.add(n.midi);
        setKeys(k => ({ ...k, [n.midi]: "ok" }));
        if (st.teachHit.size >= slot.midis.length) {
          st.teachSlot++;
          st.teachHit = new Set();
          if (st.teachSlot >= run.slots.length) { ui.good(); advance(250); }
        }
      }
      return;
    }

    const pc = ((n.midi % 12) + 12) % 12 as Pc;
    const want = new Set(chordPcs(a));
    const need = a.hand === "HT" ? want.size * 2 : want.size;

    if (ph === "teach") {
      if (want.has(pc)) {
        st.reconcileMatched.add(a.hand === "HT" ? n.midi : pc);
        setKeys(k => ({ ...k, [n.midi]: "ok" }));
        if (st.reconcileMatched.size >= need) {
          const taught = afterTeach(st.card!);
          st.filler.cards.set(a.id, taught);
          void saveCard(taught);
          advance(300);
        }
      }
      return;
    }
    if (ph === "reconcile") {
      // continue only by playing the correct answer AS A FRESH ATTACK (U2, log #75):
      // armed after a settle-beat; the tones together; loose noodling never advances.
      if (performance.now() < st.reconcileArmedAt) return;
      if (!want.has(pc)) {
        // a wrong key just flashes and resets the fresh-attack buffer — never advances
        setKeys({ ...expectedKeyStates(a, "exp"), [n.midi]: "err" });
        st.reconcileBuf = [];
        return;
      }
      st.reconcileBuf = st.reconcileBuf.filter(x => n.onMs - x.onMs <= (CHORD_SPREAD_MS + st.profileJitterMs) * 1.5);
      if (!st.reconcileBuf.some(x => (a.hand === "HT" ? x.midi === n.midi : ((x.midi % 12) + 12) % 12 === pc))) {
        st.reconcileBuf.push({ midi: n.midi, onMs: n.onMs });
      }
      setKeys(k => ({ ...k, [n.midi]: "ok" }));
      if (st.reconcileBuf.length >= need) { ui.good(); advance(250); }
      return;
    }
    if (ph !== "prompt" || st.finalized) return;

    st.collected.push({ midi: n.midi, onMs: n.onMs, vel: n.vel });
    if (want.has(pc)) {
      st.matched.add(a.hand === "HT" ? n.midi : pc);
      setKeys(k => ({ ...k, [n.midi]: "ok" }));
      if (st.matched.size >= need) {
        st.finalized = true; // exactly one grade per serve (log #74's double-finalize)
        const budgetMs = windowFor(st.card!); // the window this rep grades against (pre-rep tier)
        void finalize(a).then(res => {
          if (res.rating === 1) {
            ui.err();
            const timingOnly = res.errorEvents.length > 0 && res.errorEvents.every(e => e.type === "dropChordTone");
            enterReconcile(a, null, timingOnly);
            return;
          }
          if (res.rating === 3) ui.good(); else ui.hard();
          setFeedback(`${chordSymbol(a)} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s / ${(budgetMs / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
          setPhase("good");
          advance(850);
        });
      }
    } else {
      // wrong answer: the flow stops for reconciliation (11 global rule)
      st.finalized = true;
      ui.err();
      setKeys(k => ({ ...k, [n.midi]: "err" }));
      void finalize(a).then(() => enterReconcile(a, n.midi));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalize, advance, expectedKeyStates]);

  const enterReconcile = useCallback((a: ChordAtom, wrongMidi: number | null, timingOnly = false) => {
    const st = S.current;
    st.reconcileBuf = [];
    st.reconcileArmedAt = performance.now() + RECONCILE_ARM_MS;
    const base = { ...expectedKeyStates(a, "exp"), ...(wrongMidi !== null ? { [wrongMidi]: "err" as KeyState } : {}) };
    st.baseKeys = base;
    setKeys(base);
    const tones = chordPcs(a).map(pc => PC_NAMES[pc]).join(" · ");
    // when timing was the ONLY failure, say so — a correct-keys take must never look mis-graded (03 §4)
    setFeedback(timingOnly
      ? `Right tones, not together — ${chordSymbol(a)} is one attack: ${tones}${a.hand === "HT" ? ", both hands" : ""}`
      : `Expected ${chordSymbol(a)} — ${tones}${a.hand === "HT" ? ", both hands" : ""}`);
    setPhase("reconcile");
  }, [expectedKeyStates]);

  useEffect(() => {
    let alive = true;
    // arm the UI cues: sticky activation covers client-side nav; any first touch covers a cold load
    ensureAudio();
    const arm = () => ensureAudio();
    document.addEventListener("pointerdown", arm);
    const params = new URLSearchParams(window.location.search);
    const f = params.get("family");
    const fam: Family = f === "scale" || f === "arp" || f === "keys" || f === "reading" || f === "interval" || f === "free" ? f : "chord";
    S.current.pool = poolFor(fam);
    setFamily(fam);
    if (params.get("template") === "starter") S.current.template = STARTER_TEMPLATE;
    (async () => {
      let cards = await loadCards();
      if (!alive) return;
      if (cards.size === 0) {
        // new-device boot (10 §5): pull the log stream once and refold the cards from it
        const pulled = await pullReplica(rows => refoldCards(rows, id => {
          const a = catalog.byId(id) as DrillAtom | undefined;
          if (!a) return true;
          // knowledge atoms are tierless — no gate (02 §1)
          return !(knowledgeAnswerable(a) || (a.family === "chord" && a.answer !== "midi"));
        }));
        if (pulled > 0) cards = await loadCards();
        if (!alive) return;
      }
      S.current.filler.cards = cards;
      // MIDI must never block the flow (08 §7's spirit): the permission promise can pend
      // forever, so race it — if access arrives later, the device chip lights then.
      const midiInit = initMidi(name => {
        setDevice(name);
        S.current.hasDevice = !!name;
        if (name) {
          const d = defaultProfile(name);
          S.current.profileId = d.id;
          S.current.profileLatencyMs = d.latencyMs;
          S.current.profileJitterMs = d.jitterMs;
          // the measured profile wins over rig defaults when the ritual has run (03 §3, U7)
          void loadProfile(d.id).then(saved => {
            if (saved) { S.current.profileLatencyMs = saved.latencyMs; S.current.profileJitterMs = saved.jitterMs; }
          });
          // a bout opens on device detect (08 §6); attach the profile if it opened without one
          void touchBout(d.id, Date.now()).then(() => attachBoutProfile(d.id));
        }
      }).catch(() => setDevice(null));
      await Promise.race([midiInit, new Promise(res => setTimeout(res, 1500))]);
      onNote(n => handleNote(n));
      // a correct key's green lives with the note (U2, log #87): fade back to base on release
      onNoteOff(({ midi }) => {
        setKeys(k => {
          if (k[midi] !== "ok") return k;
          const next = { ...k };
          const base = S.current.baseKeys[midi];
          if (base) next[midi] = base; else delete next[midi];
          return next;
        });
      });
      if (S.current.template) enterInterstitial(0);
      else serve();
    })();
    const onHide = () => { if (document.visibilityState === "hidden") void pushOutbox(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      alive = false; onNote(null); onNoteOff(null);
      document.removeEventListener("pointerdown", arm);
      document.removeEventListener("visibilitychange", onHide);
      const st = S.current;
      if (st.retryTimer !== null) clearTimeout(st.retryTimer);
      if (st.interTimer !== null) clearTimeout(st.interTimer);
      void pushOutbox();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRun = atom !== null && isRunAtom(atom);
  const isKeys = atom !== null && isKeysAtom(atom);
  const isSpell = atom !== null && isSpellAtom(atom);
  const isReading = atom !== null && isReadingAtom(atom);
  const isReadSel = isReading && (atom as ReadingAtom).answer === "selector";
  const isInterval = atom !== null && isIntervalAtom(atom);
  const isIvSel = isInterval && (atom as IntervalAtom).answer === "selector";
  // choice-answer teach: named result, inert widget, any tap continues (U2 §Teach) —
  // played keys may still walk the revealed tones instead (spell's at-instrument ack)
  const choiceTeach = phase === "teach" && (isKeys || isReadSel || isIvSel || isSpell);
  const tpl = S.current.template;
  const tplBlock = tpl ? tpl.blocks[blockIdxView] : null;
  const subParts = atom === null ? null
    : isKeysAtom(atom) ? [`${atom.clef} clef`, atom.dir === "sigToKey" ? "name the key" : "pick the signature"]
    : isReadingAtom(atom) ? [`${inst?.clef ?? atom.clef} clef`, atom.answer === "midi" ? "play it" : "name it"]
    : isIntervalAtom(atom) ? (atom.cue === "name"
        ? [`from ${ivInst ? spellNoteName(ivInst.anchor) : "…"}`, `${atom.hand}${atom.form === "harmonic" ? " · together" : ""}`]
        : [`${atom.clef} clef`, atom.answer === "midi" ? "play it" : "name it"])
    : isSpellAtom(atom) ? ["spell it", device ? "play or tap · any octave" : "any octave"]
    : isRunAtom(atom) ? [atom.hand as string, atom.family === "scale" ? "1 octave · up and down" : "up and down"]
    : [atom.hand as string, atom.form as string];

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-[var(--ink2)]">
        <Link href="/" className="mr-1">←</Link>
        <span>{tplBlock ? tplBlock.name : FAMILY_TITLE[family]}</span>
        <span className="ml-auto rounded-full border border-[var(--border)] px-2 py-0.5 normal-case tracking-normal text-[var(--ink)]">
          {phase === "teach" ? "Teach" : "Rehearsal"}
        </span>
        <span className={`ml-2 flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2 py-0.5 normal-case tracking-normal ${device ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
          <i className={`inline-block h-1.5 w-1.5 rounded-full ${device ? "bg-[var(--good)]" : "bg-[var(--muted)]"}`} />
          {device ?? "no device — connect a keyboard"}
        </span>
      </header>

      <section className="flex min-h-0 flex-1 items-center px-6">
        {(phase === "polishing" || phase === "unavailable") && (
          <button onClick={serve} className="mx-auto text-[15px] text-[var(--ink2)]">
            {phase === "polishing" ? "everything here is steady — polishing" : "nothing to serve here right now"}
            <span className="ml-2 text-[var(--accent-hi)]">check again</span>
          </button>
        )}
        {(phase === "teach" || phase === "prompt" || phase === "reconcile" || phase === "good" || phase === "next") && atom && (
          <div className={`flex w-full items-end justify-between gap-6 transition-opacity duration-200 ease-out ${phase === "next" ? "opacity-0" : "opacity-100"}`}>
            <div>
              {isKeysAtom(atom) && atom.dir === "sigToKey"
                ? <div className="h-28 w-72 max-w-[62vw]"><Sig sig={atom.sig} clef={atom.clef} /></div>
                : isReadingAtom(atom) && inst
                ? <div className="h-36 w-80 max-w-[64vw]"><StaffView clef={inst.clef} sig={inst.sig} letter={inst.letter} octave={inst.octave} inline={inst.inline} /></div>
                : isIntervalAtom(atom) && atom.cue === "staff" && ivInst
                ? <div className="h-36 w-80 max-w-[64vw]"><StaffView clef={atom.clef === "bass" ? "bass" : "treble"} {...staffSpec(ivInst.anchor)} second={staffSpec(ivInst.target)} form={atom.form} /></div>
                : isIntervalAtom(atom) && ivInst
                ? <div className="font-serif text-6xl leading-none">{ivInst.label} {atom.dir === "down" ? "↓" : "↑"}</div>
                : <div className="font-serif text-6xl leading-none">{atomTitle(atom)}</div>}
              <div className="mt-2 text-[16px]">
                <span className="text-[var(--ink)]">{subParts![0]}</span>
                <span className="text-[var(--ink2)]"> · {subParts![1]}</span>
              </div>
            </div>
            <div className="flex max-w-[52%] flex-col items-end gap-2 text-right">
              {phase === "teach" && (
                <p className={`max-w-72 text-[14px] text-[var(--ink2)] ${choiceTeach ? "cursor-pointer" : ""}`}
                  onClick={choiceTeach ? teachAck : undefined}>
                  {choiceTeach ? <>{feedback} · <span className="text-[var(--accent-hi)]">{isSpell && device ? "play them — or tap to continue" : "tap to continue"}</span></>
                    : isReading ? `${feedback} — play it`
                    : isInterval ? feedback
                    : isRun ? "Ungraded — walk the path, bottom up" : "Ungraded — take your time"}
                </p>
              )}
              {phase === "good" && <p className="text-[14px] text-[var(--good)]">{feedback}</p>}
              {phase === "reconcile" && (
                <button onClick={() => advance(0)} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-left text-[14px] leading-relaxed text-[var(--ink)]">
                  <span className="text-[var(--felt)]">{feedback}</span>
                  <span className="mt-1 block text-[13px] text-[var(--ink2)]">
                    {isKeys ? "Tap the right one — or tap here to continue"
                      : isReadSel || isIvSel ? "Name it — or tap here to continue"
                      : isInterval ? ((atom as IntervalAtom).form === "harmonic" ? "Grab both together — or tap here to continue" : "Play it, anchor first — or tap here to continue")
                      : isReading ? "Play it — or tap here to continue"
                      : isSpell ? "Tap the tones — or tap here to continue"
                      : isRun ? "Walk it from the bottom — or tap here to continue"
                      : "Play it together — or tap to continue"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
        {phase === "interstitial" && tpl && tplBlock && (
          <button onClick={beginBlock} className="mx-auto text-center">
            <div className="text-[11px] uppercase tracking-wide text-[var(--muted)]">up next</div>
            <div className="mt-1 font-serif text-5xl leading-tight">{tplBlock.name}</div>
            <div className="mt-2 text-[14px] text-[var(--ink2)]">
              {tplBlock.boundMinutes !== undefined ? `${tplBlock.boundMinutes} minutes` : `${tplBlock.boundCount} reads`} · weakest first
            </div>
            <div className="mt-4 flex justify-center gap-1.5">
              {tpl.blocks.map((b, i) => (
                <i key={b.name} className={`inline-block h-1.5 w-1.5 rounded-full ${i < blockIdxView ? "bg-[var(--ink2)]" : i === blockIdxView ? "bg-[var(--accent-hi)]" : "bg-[var(--border)]"}`} />
              ))}
            </div>
            {(blockIdxView > 0 || blockIdxView + 1 < tpl.blocks.length) && (
              <div className="mt-2 text-[13px] text-[var(--ink2)]">
                {[blockIdxView > 0 ? `${tpl.blocks[blockIdxView - 1].name} done` : null,
                  blockIdxView + 1 < tpl.blocks.length ? `${tpl.blocks[blockIdxView + 1].name} after` : null]
                  .filter(Boolean).join(" · ")}
              </div>
            )}
          </button>
        )}
        {phase === "done" && (
          <div className="mx-auto text-center">
            <div className="font-serif text-5xl">Session done</div>
            <div className="mt-3 text-[14px] text-[var(--ink2)]">{S.current.served} items practiced</div>
            <Link href="/" className="mt-5 inline-block rounded-lg bg-[var(--accent)] px-5 py-2 text-[14px] font-medium text-white">Home</Link>
          </div>
        )}
        {phase === "init" && <p className="mx-auto text-[14px] text-[var(--muted)]">loading…</p>}
      </section>

      {/* the widget roster replaces the keybed for choice answers (U2 §4);
          key proportions hold in any orientation (U2): height follows width, never toothpicks */}
      {phase !== "interstitial" && phase !== "done" && (
        <section className={`${isKeys || isReadSel || isIvSel || (atom === null && family === "keys") ? "h-[56dvh]" : "h-[min(44dvh,24vw)] min-h-20"} shrink-0 px-2 pb-2`}>
          <div className="h-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1" style={{ containerType: "size" }}
            onClick={choiceTeach ? teachAck : undefined}>
            <div className={`h-full ${choiceTeach ? "pointer-events-none" : ""}`}>
              {atom && isKeysAtom(atom) ? (
                atom.dir === "sigToKey"
                  ? <KeyWheel mode={atom.mode} states={picks} onPick={handlePick} />
                  : <SigGrid clef={atom.clef} states={picks} onPick={handlePick} />
              ) : isReadSel && inst ? (
                <NoteSelector doubles={doubles} onCommit={handleReadingPick}
                  reveal={phase === "teach" || phase === "reconcile" ? { letter: inst.letter, inline: inst.eff, octave: inst.octave } : null} />
              ) : isIvSel && ivInst ? (
                <IntervalSelector onCommit={handleIntervalPick}
                  reveal={phase === "teach" || phase === "reconcile" ? { size: ivInst.size, quality: ivInst.quality } : null} />
              ) : isSpell ? (
                <SpellChips states={keys} onTap={spellInput} />
              ) : atom === null && (family === "keys" || tpl !== null) ? null : (
                <Keybed states={keys} labels={phase === "teach" && labels ? labels : undefined} />
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
