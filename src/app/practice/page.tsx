"use client";
// The practice player, Phase-1 slice (U2's rulings): landscape-first, mode chip beside the
// devchip, one-run chord symbols, no key labels, no clock — and a wrong answer STOPS THE FLOW
// for reconciliation: expected vs played shown, continue by tap or by playing the correct answer.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Keybed, type KeyState } from "../../components/Keybed";
import { catalog, chordPcs, chordSymbol, compareAdmission, subsumedBy, type ChordAtom } from "../../core/catalog";
import { next as fillerNext, noteServed, type FillerState } from "../../core/filler";
import { gradeDiscreteChord } from "../../core/grader/discrete";
import { afterTeach, applyDerived, applyRep, windowFor, type DrillCard } from "../../core/scheduler";
import { ulid } from "../../core/ulid";
import type { NoteEvent, Pc } from "../../core/types";
import { defaultProfile, deviceName, initMidi, onNote } from "../../services/midi";
import { appendAttempt, appendReview, loadCards, pushOutbox, saveCard } from "../../services/store";

type Phase = "init" | "teach" | "prompt" | "reconcile" | "good" | "polishing" | "unavailable";

const POOL: ChordAtom[] = (catalog.defaults("chord") as ChordAtom[])
  .filter(a => a.answer === "midi" && !a.stream && a.cue === "name" && a.form === "blocked")
  .sort(compareAdmission);

export default function Practice() {
  const [phase, setPhase] = useState<Phase>("init");
  const [device, setDevice] = useState<string | null>(null);
  const [atom, setAtom] = useState<ChordAtom | null>(null);
  const [keys, setKeys] = useState<Record<number, KeyState>>({});
  const [feedback, setFeedback] = useState<string>("");

  const S = useRef<{
    filler: FillerState; served: number; boutId: string; profileId: string | null;
    card: DrillCard | null; promptAt: number; collected: NoteEvent[]; matched: Set<number>;
    reconcileMatched: Set<number>; sinceSync: number; finalized: boolean; retryTimer: number | null;
  }>({ filler: { cards: new Map(), recentServed: [], admittedThisWindow: [] }, served: 0, boutId: ulid(), profileId: null, card: null, promptAt: 0, collected: [], matched: new Set(), reconcileMatched: new Set(), sinceSync: 0, finalized: false, retryTimer: null });

  const phaseRef = useRef<Phase>("init");
  const atomRef = useRef<ChordAtom | null>(null);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { atomRef.current = atom; }, [atom]);

  const expectedKeyStates = useCallback((a: ChordAtom, state: KeyState): Record<number, KeyState> => {
    const out: Record<number, KeyState> = {};
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
    setKeys({}); // the board always clears between items (log #74's stale-green report)
    st.finalized = false;
    const res = fillerNext({ pool: POOL }, st.filler, { servedCount: st.served, nowMs: Date.now() });
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
    if (res.kind === "teach") {
      setKeys(expectedKeyStates(res.atom, "exp"));
      setPhase("teach");
    } else {
      setPhase("prompt");
    }
  }, [expectedKeyStates]);

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
    void appendAttempt({
      id: attemptId, kind: "drill", atomId: a.id, mode: "rehearsal", profileId: st.profileId,
      rawMidi: st.collected, graderVersion: "v1", tagsVersion: "v1",
      gradeJson: { rating: graded.primary.rating, latencyMs: graded.primary.latencyMs, errors: graded.primary.errorEvents.length },
      startedAt: Math.round(nowMs - (performance.now() - st.promptAt)), boutId: st.boutId,
    });
    void appendReview({ id: ulid(), ...row });
    for (const [subId, er] of graded.embedded) {
      const subCard = st.filler.cards.get(subId);
      if (!subCard) continue;
      const out = applyDerived(subCard, er, attemptId, ulid(), ctx);
      if (out) { st.filler.cards.set(subId, out.card); void saveCard(out.card); void appendReview({ id: ulid(), ...out.row }); }
    }
    if (++st.sinceSync >= 8) { st.sinceSync = 0; void pushOutbox(); }
    return graded.primary;
  }, []);

  const handleNote = useCallback((n: { midi: number; onMs: number; vel: number }) => {
    const a = atomRef.current;
    const st = S.current;
    const ph = phaseRef.current;
    if (!a) return;
    const pc = ((n.midi % 12) + 12) % 12 as Pc;
    const want = new Set(chordPcs(a));
    const need = a.hand === "HT" ? want.size * 2 : want.size;

    if (ph === "teach" || ph === "reconcile") {
      // advance by playing the correct answer (11's reconciliation rule — instant)
      if (want.has(pc)) {
        st.reconcileMatched.add(a.hand === "HT" ? n.midi : pc);
        setKeys(k => ({ ...k, [n.midi]: "ok" }));
        if (st.reconcileMatched.size >= need) {
          if (ph === "teach") {
            const taught = afterTeach(st.card!);
            st.filler.cards.set(a.id, taught);
            void saveCard(taught);
          }
          setTimeout(serve, 350);
        }
      }
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
          if (res.rating === 1) { enterReconcile(a, null); return; }
          setFeedback(`${chordSymbol(a)} · ${((res.latencyMs ?? 0) / 1000).toFixed(1)}s · ${res.rating === 3 ? "Good" : "Hard"}`);
          setPhase("good");
          setTimeout(serve, 900);
        });
      }
    } else {
      // wrong answer: the flow stops for reconciliation (11 global rule)
      st.finalized = true;
      setKeys(k => ({ ...k, [n.midi]: "err" }));
      void finalize(a).then(() => enterReconcile(a, n.midi));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalize, serve]);

  const enterReconcile = useCallback((a: ChordAtom, wrongMidi: number | null) => {
    const st = S.current;
    st.reconcileMatched = new Set();
    setKeys({ ...expectedKeyStates(a, "exp"), ...(wrongMidi !== null ? { [wrongMidi]: "err" as KeyState } : {}) });
    setFeedback("Expected — play it, or tap to continue");
    setPhase("reconcile");
  }, [expectedKeyStates]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const cards = await loadCards();
      if (!alive) return;
      S.current.filler.cards = cards;
      // MIDI must never block the flow (08 §7's spirit): the permission promise can pend
      // forever, so race it — if access arrives later, the device chip lights then.
      const midiInit = initMidi(name => {
        setDevice(name);
        if (name) S.current.profileId = defaultProfile(name).id;
      }).catch(() => setDevice(null));
      await Promise.race([midiInit, new Promise(res => setTimeout(res, 1500))]);
      onNote(n => handleNote(n));
      serve();
    })();
    const onHide = () => { if (document.visibilityState === "hidden") void pushOutbox(); };
    document.addEventListener("visibilitychange", onHide);
    return () => { alive = false; onNote(null); document.removeEventListener("visibilitychange", onHide); void pushOutbox(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sub = atom ? [atom.hand, atom.form].filter(Boolean).join(" · ") : "";

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-[var(--ink2)]">
        <Link href="/" className="mr-1">←</Link>
        <span>Chords</span>
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
        {(phase === "teach" || phase === "prompt" || phase === "reconcile" || phase === "good") && atom && (
          <div className="flex w-full items-end justify-between gap-6">
            <div>
              <div className="font-serif text-6xl leading-none">{chordSymbol(atom)}</div>
              <div className="mt-2 text-[13px] text-[var(--ink2)]">{sub}</div>
            </div>
            <div className="max-w-[46%] text-right">
              {phase === "teach" && <p className="text-[14px] text-[var(--ink2)]">Ungraded — take your time</p>}
              {phase === "good" && <p className="text-[14px] text-[var(--good)]">{feedback}</p>}
              {phase === "reconcile" && (
                <button onClick={serve} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-2 text-[14px] text-[var(--ink)]">
                  {feedback} <span className="ml-2 text-[var(--accent-hi)]">Continue</span>
                </button>
              )}
            </div>
          </div>
        )}
        {phase === "init" && <p className="mx-auto text-[14px] text-[var(--muted)]">loading…</p>}
      </section>

      <section className="h-[44dvh] min-h-36 shrink-0 px-2 pb-2">
        <div className="h-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1">
          <Keybed states={keys} />
        </div>
      </section>
    </main>
  );
}
