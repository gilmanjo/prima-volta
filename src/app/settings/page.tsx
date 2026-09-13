"use client";
// Settings · Devices & calibration (U7-minimal, P1): the profile row with measured readouts,
// the calibration ritual (03 §3 — four low count-in clicks, eight scored, outliers dropped,
// median → latency, spread → jitter), and the profile principle, surfaced.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RITUAL_COUNT_IN, RITUAL_SCORED, type RitualResult } from "../../core/calibration";
import { startRitual, type RitualRun } from "../../services/calibration";
import { defaultProfile, initMidi, onNote, type DeviceProfile } from "../../services/midi";
import { loadProfile, saveProfile } from "../../services/store";
import { ensureAudio } from "../../services/uiAudio";

type Saved = DeviceProfile & { calibratedAt?: number };

export default function Settings() {
  const [device, setDevice] = useState<string | null>(null);
  const [profile, setProfile] = useState<Saved | null>(null);
  const [measured, setMeasured] = useState<boolean>(false);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState<{ i: number; countIn: boolean } | null>(null);
  const [result, setResult] = useState<RitualResult | null>(null);
  const [note, setNote] = useState<string>("");
  const run = useRef<RitualRun | null>(null);

  useEffect(() => {
    ensureAudio();
    const arm = () => ensureAudio();
    document.addEventListener("pointerdown", arm);
    void initMidi(async name => {
      setDevice(name);
      if (name) {
        const d = defaultProfile(name);
        const saved = await loadProfile(d.id);
        setProfile(saved ?? d);
        setMeasured(!!saved?.calibratedAt);
      }
    }).catch(() => setDevice(null));
    onNote(n => run.current?.feedStrike(n.onMs));
    return () => {
      document.removeEventListener("pointerdown", arm);
      onNote(null);
      run.current?.stop();
    };
  }, []);

  const start = () => {
    if (!device || running) return;
    ensureAudio();
    setResult(null); setNote(""); setRunning(true); setBeat(null);
    const r = startRitual((i, countIn) => setBeat({ i, countIn }));
    run.current = r;
    void r.done.then(async res => {
      run.current = null;
      setRunning(false); setBeat(null); setResult(res);
      if (res.medianMs === null || res.spreadMs === null || res.offsets.length < 6) {
        setNote("Too few strikes matched — run it again, striking any key on each high click.");
        return;
      }
      const base = defaultProfile(device);
      const p: Saved = {
        ...base, latencyMs: Math.round(res.medianMs), jitterMs: Math.round(res.spreadMs), calibratedAt: Date.now(),
      };
      await saveProfile(p as DeviceProfile & { calibratedAt: number });
      setProfile(p); setMeasured(true);
      setNote("Saved to the profile.");
    });
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl">Devices</h1>
        <Link href="/" className="text-[13px] text-[var(--ink2)]">← home</Link>
      </div>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
        {device ? (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-[15px]">{device}</span>
              <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--ink2)]">USB · performance-trusted</span>
            </div>
            <div className="mt-2 font-mono text-[13px] text-[var(--accent-hi)]">
              latency {profile?.latencyMs ?? "—"} ms · jitter ±{profile?.jitterMs ?? "—"} ms
            </div>
            <div className="mt-1 text-[12px] text-[var(--ink2)]">
              {measured && profile?.calibratedAt
                ? `calibrated ${new Date(profile.calibratedAt).toLocaleDateString()}`
                : "rig defaults (v0) — run the ritual to measure this keyboard"}
            </div>
          </>
        ) : (
          <span className="text-[14px] text-[var(--muted)]">no device — connect a keyboard</span>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-4">
        <div className="text-[15px]">Calibration ritual</div>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink2)]">
          Four low clicks to settle in, then eight high clicks — strike any key exactly on each high click. About 25 seconds.
        </p>
        <div className="mt-3 flex items-center gap-2">
          {Array.from({ length: RITUAL_COUNT_IN }, (_, i) => (
            <i key={`c${i}`} className={`inline-block h-2 w-2 rounded-full ${beat?.countIn && beat.i === i ? "bg-[var(--ink2)]" : "bg-[var(--border)]"}`} />
          ))}
          <span className="mx-1 h-3 w-px bg-[var(--border)]" />
          {Array.from({ length: RITUAL_SCORED }, (_, i) => (
            <i key={`s${i}`} className={`inline-block h-2 w-2 rounded-full ${beat && !beat.countIn && beat.i === i ? "bg-[var(--accent-hi)]" : "bg-[var(--border)]"}`} />
          ))}
        </div>
        <button onClick={start} disabled={!device || running}
          className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2 text-[14px] font-medium text-white disabled:opacity-40">
          {running ? "listening…" : "Start the ritual"}
        </button>
        {result && (
          <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--panel2)] px-3 py-2 font-mono text-[13px]">
            median {result.medianMs ?? "—"} ms · spread {result.spreadMs ?? "—"} ms · {result.matched}/{RITUAL_SCORED} matched
            {result.dropped > 0 && ` · ${result.dropped} dropped`}
          </div>
        )}
        {note && <p className="mt-2 text-[13px] text-[var(--ink2)]">{note}</p>}
      </section>

      <p className="mt-4 text-[13px] text-[var(--ink2)]">
        Device settings live in the profile; switching or fixing a profile never touches your history.
      </p>
    </main>
  );
}
