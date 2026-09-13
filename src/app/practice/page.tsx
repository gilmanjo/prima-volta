"use client";
// The practice player, Phase-1 (U2's rulings): landscape-first, mode chip beside the devchip,
// one-run chord symbols, no key labels, no clock — a wrong answer STOPS THE FLOW for
// reconciliation, and run material (F5/F6) plays against the metronome pulse with the ruled
// count-in (one bar ≥80, two below) and the 03 §4/§6 grid matcher + pulsed rating map.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Keybed, type KeyState } from "../../components/Keybed";
import {
  atomTitle, catalog, chordPcs, chordSymbol, compareAdmission, subsumedBy, PC_NAMES,
  type ArpAtom, type ChordAtom, type DrillAtom, type ScaleAtom,
} from "../../core/catalog";
import { next as fillerNext, noteServed, type FillerState } from "../../core/filler";
import { gradeDiscreteChord } from "../../core/grader/discrete";
import { runLabels } from "../../core/fingering";
import { gradePulsedRun, gridWindowMs } from "../../core/grader/pulsed";
import { buildRun, runTempo, type Run } from "../../core/runs";
import { afterTeach, applyDerived, applyRep, windowFor, type DrillCard } from "../../core/scheduler";
import { ulid } from "../../core/ulid";
import type { NoteEvent, Pc } from "../../core/types";
import { CHORD_SPREAD_MS, RUN_BEATS_PER_BAR } from "../../core/constants";
import { defaultProfile, initMidi, onNote } from "../../services/midi";
import { startRunClock, type RunClock } from "../../services/metronome";
import { ensureAudio, ui } from "../../services/uiAudio";
import { appendAttempt, appendReview, loadCards, pushOutbox, saveCard } from "../../services/store";

type Phase = "init" | "teach" | "prompt" | "countin" | "run" | "reconcile" | "good" | "next" | "polishing" | "unavailable";
const RECONCILE_ARM_MS = 600; // the settle-beat: the failed take's tail never bleeds in (U2)

type Family = "chord" | "scale" | "arp";
const FAMILY_TITLE: Record<Family, string> = { chord: "Chords", scale: "Scales", arp: "Arpeggios" };

const CHORD_POOL: ChordAtom[] = (catalog.defaults("chord") as ChordAtom[])
  .filter(a => a.answer === "midi" && !a.stream && a.cue === "name" && a.form === "blocked")
  .sort(compareAdmission);

function poolFor(f: Family): DrillAtom[] {
  if (f === "scale") // keysig cue is engraved — staff territory, Phase 2
    return (catalog.defaults("scale") as ScaleAtom[]).filter(a => a.cue === "name").sort(compareAdmission);
  if (f === "arp") // alternating is the T6 capstone — its handoff grading comes later
    return (catalog.defaults("arp") as ArpAtom[]).filter(a => a.hand !== "alternating").sort(compareAdmission);
  return CHORD_POOL;
}

const isRunAtom = (a: DrillAtom): a is ScaleAtom | ArpAtom => a.family === "scale" || a.family === "arp";

export default function Practice() {
  const [phase, setPhase] = useState<Phase>("init");
  const [family, setFamily] = useState<Family>("chord");
  const [device, setDevice] = useState<string | null>(null);
  const [atom, setAtom] = useState<DrillAtom | null>(null);
  const [keys, setKeys] = useState<Record<number, KeyState>>({});
  const [feedback, setFeedback] = useState<string>("");
  const [beat, setBeat] = useState<{ b: number; cIn: boolean } | null>(null);
  const [bpm, setBpm] = useState<number>(60);
  const [labels, setLabels] = useState<Record<number, string> | null>(null);

  const S = useRef<{
    filler: FillerState; pool: DrillAtom[]; served: number; boutId: string; profileId: string | null;
    profileLatencyMs: number; profileJitterMs: number;
    card: DrillCard | null; promptAt: number; collected: NoteEvent[]; matched: Set<number>;
    reconcileMatched: Set<number>; sinceSync: number; finalized: boolean; retryTimer: number | null;
    reconcileArmedAt: number; reconcileBuf: { midi: number; onMs: number }[];
    run: Run | null; runClock: RunClock | null; runT0: number; runNoteMs: number; finalizeTimer: number | null;
    teachSlot: number; teachHit: Set<number>;
  }>({
    filler: { cards: new Map(), recentServed: [], admittedThisWindow: [] }, pool: CHORD_POOL, served: 0,
    boutId: ulid(), profileId: null, profileLatencyMs: 0, profileJitterMs: 25,
    card: null, promptAt: 0, collected: [], matched: new Set(), reconcileMatched: new Set(),
    sinceSync: 0, finalized: false, retryTimer: null, reconcileArmedAt: 0, reconcileBuf: [],
    run: null, runClock: null, runT0: 0, runNoteMs: 1000, finalizeTimer: null, teachSlot: 0, teachHit: new Set(),
  });

  const phaseRef = useRef<Phase>("init");
  const atomRef = useRef<DrillAtom | null>(null);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { atomRef.current = atom; }, [atom]);

  const expectedKeyStates = useCallback((a: DrillAtom, state: KeyState): Record<number, KeyState> => {
    const out: Record<number, KeyState> = {};
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

  const clearRunTimers = useCallback(() => {
    const st = S.current;
    if (st.runClock) { st.runClock.stop(); st.runClock = null; }
    if (st.finalizeTimer !== null) { clearTimeout(st.finalizeTimer); st.finalizeTimer = null; }
    setBeat(null);
  }, []);

  const serve = useCallback(() => {
    const st = S.current;
    if (st.retryTimer !== null) { clearTimeout(st.retryTimer); st.retryTimer = null; }
    clearRunTimers();
    setKeys({}); // the board always clears between items (log #74's stale-green report)
    st.finalized = false;
    const res = fillerNext({ pool: st.pool }, st.filler, { servedCount: st.served, nowMs: Date.now() });
    if (res.kind === "polishing" || res.kind === "unavailable") {
      setPhase(res.kind);
      st.retryTimer = window.setTimeout(serve, 4000); // never a dead screen — quietly check again
      return;
    }
    st.served++;
    noteServed(st.filler, res.atom);
    st.card = res.card;
    st.promptAt = performance.now();
    st.collected = []; st.matched = new Set(); st.reconcileMatched = new Set();
    setAtom(res.atom);
    setFeedback("");
    setLabels(null);
    if (isRunAtom(res.atom)) {
      st.run = buildRun(res.atom);
      if (res.kind === "teach") {
        st.teachSlot = 0; st.teachHit = new Set();
        setKeys(expectedKeyStates(res.atom, "exp"));
        setLabels(runLabels(res.atom)); // sourced fingering numerals — or nothing (U2, log #81)
        setPhase("teach");
      } else {
        const a = res.atom;
        // the card's tier sets the demand (F5/F6 anchors, ruled): learning = ♩=60 on the beat;
        // the gate = eighths at ♩=80 — the metronome always clicks the quarter
        const tempo = runTempo(res.card.tier);
        st.runNoteMs = tempo.noteMs;
        setBpm(Math.round(60000 / tempo.beatMs));
        const lastNoteOffset = (st.run.slots.length - 1) * tempo.noteMs;
        const clock = startRunClock({
          beatMs: tempo.beatMs, runBeats: Math.floor(lastNoteOffset / tempo.beatMs) + 1,
          onBeat: (b, cIn) => { setBeat({ b, cIn }); if (!cIn && phaseRef.current === "countin") setPhase("run"); },
        });
        st.runClock = clock; st.runT0 = clock.t0Ms;
        st.finalizeTimer = window.setTimeout(
          () => finalizeRun(a),
          clock.t0Ms + lastNoteOffset - performance.now() + Math.max(tempo.noteMs / 2, 250) + 300,
        );
        setPhase("countin");
      }
      return;
    }
    st.run = null;
    if (res.kind === "teach") {
      setKeys(expectedKeyStates(res.atom, "exp"));
      setPhase("teach");
    } else {
      setPhase("prompt");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedKeyStates, clearRunTimers]);

  /** The between-items beat (U2): the prompt fades out, a breath with the serve tick, the next
   *  fades in — so the next prompt reads as NEW even when it differs only by hand. */
  const advance = useCallback((delayMs = 0) => {
    setTimeout(() => {
      setPhase("next"); setKeys({}); setBeat(null); // atom stays mounted so the outgoing prompt can fade
      ui.tick();
      setTimeout(serve, 380);
    }, delayMs);
  }, [serve]);

  const logAttempt = useCallback((a: DrillAtom, attemptId: string, nowMs: number, gradeJson: Record<string, unknown>) => {
    const st = S.current;
    void appendAttempt({
      id: attemptId, kind: "drill", atomId: a.id, mode: "rehearsal", profileId: st.profileId,
      rawMidi: st.collected, graderVersion: "v1", tagsVersion: "v1", gradeJson,
      startedAt: Math.round(nowMs - (performance.now() - st.promptAt)), boutId: st.boutId,
    });
    if (++st.sinceSync >= 8) { st.sinceSync = 0; void pushOutbox(); }
  }, []);

  const finalize = useCallback(async (a: ChordAtom) => {
    const st = S.current;
    const card = st.card!;
    const pcs = chordPcs(a);
    const subs = a.hand === "HT" ? subsumedBy(a) : [];
    const graded = gradeDiscreteChord(
      { pcs, hand: a.hand as "RH" | "LH" | "HT", windowMs: windowFor(card), promptAtMs: st.promptAt, inversion: (a.inversion as number) ?? 0 },
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

  const finalizeRun = useCallback((a: ScaleAtom | ArpAtom) => {
    const st = S.current;
    if (st.finalized) return;
    st.finalized = true;
    clearRunTimers();
    const run = st.run!;
    // the raw stream is what gets logged; the profile latency applies only at judgment (03 §3)
    const adjusted = st.collected.map(n => ({ ...n, onMs: n.onMs - st.profileLatencyMs }));
    const { result, evennessCv, outOfWindow } = gradePulsedRun({
      slots: run.slots, t0Ms: st.runT0, noteMs: st.runNoteMs,
      windowMs: gridWindowMs(st.runNoteMs, st.profileJitterMs), promptAtMs: st.runT0,
    }, adjusted);
    const attemptId = ulid();
    const nowMs = Date.now();
    const { card: after, row } = applyRep(st.card!, result, attemptId, { servedCount: st.served, nowMs });
    st.filler.cards.set(a.id, after);
    void saveCard(after);
    logAttempt(a, attemptId, nowMs, {
      rating: result.rating, latencyMs: result.latencyMs, errors: result.errorEvents.length,
      outOfWindow, evennessCv,
    });
    void appendReview({ id: ulid(), ...row });
    if (result.rating === 1) {
      ui.err();
      const errKeys: Record<number, KeyState> = {};
      for (const e of result.errorEvents) if (e.playedMidi !== undefined) errKeys[e.playedMidi] = "err";
      setKeys({ ...expectedKeyStates(a, "exp"), ...errKeys });
      setFeedback(`Expected ${atomTitle(a)}`);
      setPhase("reconcile");
      return;
    }
    if (result.rating === 3) ui.good(); else ui.hard();
    setFeedback(`${atomTitle(a)} · ${result.rating === 3 ? "Good" : "Hard"}`);
    setPhase("good");
    advance(850);
  }, [advance, clearRunTimers, expectedKeyStates, logAttempt]);

  const handleNote = useCallback((n: { midi: number; onMs: number; vel: number }) => {
    const a = atomRef.current;
    const st = S.current;
    const ph = phaseRef.current;
    if (!a) return;

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
      if (ph === "countin" || ph === "run") {
        st.collected.push({ midi: n.midi, onMs: n.onMs, vel: n.vel });
        setKeys(k => ({ ...k, [n.midi]: st.run!.pathMidis.includes(n.midi) ? "ok" : "err" }));
      }
      return; // run reconcile continues by tap only (U2 v0)
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
      st.reconcileBuf = st.reconcileBuf.filter(x => n.onMs - x.onMs <= CHORD_SPREAD_MS * 1.5);
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
        void finalize(a).then(res => {
          if (res.rating === 1) { ui.err(); enterReconcile(a, null); return; }
          if (res.rating === 3) ui.good(); else ui.hard();
          setFeedback(`${chordSymbol(a)} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
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

  const enterReconcile = useCallback((a: ChordAtom, wrongMidi: number | null) => {
    const st = S.current;
    st.reconcileBuf = [];
    st.reconcileArmedAt = performance.now() + RECONCILE_ARM_MS;
    setKeys({ ...expectedKeyStates(a, "exp"), ...(wrongMidi !== null ? { [wrongMidi]: "err" as KeyState } : {}) });
    const tones = chordPcs(a).map(pc => PC_NAMES[pc]).join(" · ");
    setFeedback(`Expected ${chordSymbol(a)} — ${tones}${a.hand === "HT" ? ", both hands" : ""}`);
    setPhase("reconcile");
  }, [expectedKeyStates]);

  useEffect(() => {
    let alive = true;
    // arm the UI cues: sticky activation covers client-side nav; any first touch covers a cold load
    ensureAudio();
    const arm = () => ensureAudio();
    document.addEventListener("pointerdown", arm);
    const f = new URLSearchParams(window.location.search).get("family");
    const fam: Family = f === "scale" || f === "arp" ? f : "chord";
    S.current.pool = poolFor(fam);
    setFamily(fam);
    (async () => {
      const cards = await loadCards();
      if (!alive) return;
      S.current.filler.cards = cards;
      // MIDI must never block the flow (08 §7's spirit): the permission promise can pend
      // forever, so race it — if access arrives later, the device chip lights then.
      const midiInit = initMidi(name => {
        setDevice(name);
        if (name) {
          const p = defaultProfile(name);
          S.current.profileId = p.id;
          S.current.profileLatencyMs = p.latencyMs;
          S.current.profileJitterMs = p.jitterMs;
        }
      }).catch(() => setDevice(null));
      await Promise.race([midiInit, new Promise(res => setTimeout(res, 1500))]);
      onNote(n => handleNote(n));
      serve();
    })();
    const onHide = () => { if (document.visibilityState === "hidden") void pushOutbox(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      alive = false; onNote(null);
      document.removeEventListener("pointerdown", arm);
      document.removeEventListener("visibilitychange", onHide);
      const st = S.current;
      if (st.retryTimer !== null) clearTimeout(st.retryTimer);
      if (st.finalizeTimer !== null) clearTimeout(st.finalizeTimer);
      st.runClock?.stop();
      void pushOutbox();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRun = atom !== null && isRunAtom(atom);
  const subParts = atom === null ? null
    : isRunAtom(atom) ? [atom.hand as string, atom.family === "scale" ? "1 octave" : "up-down"]
    : [atom.hand as string, atom.form as string];

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-[var(--ink2)]">
        <Link href="/" className="mr-1">←</Link>
        <span>{FAMILY_TITLE[family]}</span>
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
        {(phase === "teach" || phase === "prompt" || phase === "countin" || phase === "run" || phase === "reconcile" || phase === "good" || phase === "next") && atom && (
          <div className={`flex w-full items-end justify-between gap-6 transition-opacity duration-200 ease-out ${phase === "next" ? "opacity-0" : "opacity-100"}`}>
            <div>
              <div className="font-serif text-6xl leading-none">{atomTitle(atom)}</div>
              <div className="mt-2 text-[16px]">
                <span className="text-[var(--ink)]">{subParts![0]}</span>
                <span className="text-[var(--ink2)]"> · {subParts![1]}</span>
              </div>
            </div>
            <div className="flex max-w-[52%] flex-col items-end gap-2 text-right">
              {isRun && (phase === "countin" || phase === "run") && (
                <div className="flex items-center gap-2">
                  {Array.from({ length: RUN_BEATS_PER_BAR }, (_, i) => (
                    <i key={i} className={`inline-block h-2 w-2 rounded-full ${beat && beat.b === i ? (beat.cIn ? "bg-[var(--ink2)]" : "bg-[var(--accent-hi)]") : "bg-[var(--border)]"}`} />
                  ))}
                  <span className="ml-1 text-[12px] text-[var(--ink2)]">♩={bpm}</span>
                </div>
              )}
              {phase === "teach" && <p className="text-[14px] text-[var(--ink2)]">{isRun ? "Ungraded — walk the path, bottom up" : "Ungraded — take your time"}</p>}
              {phase === "good" && <p className="text-[14px] text-[var(--good)]">{feedback}</p>}
              {phase === "reconcile" && (
                <button onClick={() => advance(0)} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-left text-[14px] leading-relaxed text-[var(--ink)]">
                  <span className="text-[var(--felt)]">{feedback}</span>
                  <span className="mt-1 block text-[13px] text-[var(--ink2)]">
                    {isRun ? "Tap to continue" : "Play it together — or tap to continue"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
        {phase === "init" && <p className="mx-auto text-[14px] text-[var(--muted)]">loading…</p>}
      </section>

      {/* key proportions hold in any orientation (U2): height follows width, never toothpicks */}
      <section className="h-[min(44dvh,24vw)] min-h-20 shrink-0 px-2 pb-2">
        <div className="h-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1">
          <Keybed states={keys} labels={phase === "teach" && labels ? labels : undefined} />
        </div>
      </section>
    </main>
  );
}
