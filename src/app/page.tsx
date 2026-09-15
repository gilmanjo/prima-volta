"use client";
// U1-lite (Phase 1): family rows with the ruled subtexts, quiet weak counts, one Practice CTA.
// With no instrument, at-instrument-only families dim — knowledge-only mode is a filter the
// map applies too (08 §7, U1 §5).
import Link from "next/link";
import { useEffect, useState } from "react";
import { catalog } from "../core/catalog";
import { retrievability, type DrillCard } from "../core/scheduler";
import { RETENTION_TARGET } from "../core/constants";
import { initMidi } from "../services/midi";
import { loadCards } from "../services/store";

const FAMILIES: { name: string; sub: string; href?: string; offline?: boolean }[] = [
  { name: "Keys & signatures", sub: "staff notation recognition", href: "/practice?family=keys", offline: true },
  { name: "Note reading", sub: "name and play staff notes", href: "/practice?family=reading", offline: true },
  { name: "Chords", sub: "triads and tetrads", href: "/practice?family=chord", offline: true },
  { name: "Scales", sub: "major, minor, etc.", href: "/practice?family=scale" },
  { name: "Arpeggios", sub: "broken chord sequences", href: "/practice?family=arp" },
];

export default function Home() {
  const [weak, setWeak] = useState<number | null>(null);
  const [hasDevice, setHasDevice] = useState<boolean | null>(null); // null = still looking
  useEffect(() => {
    loadCards().then(cards => {
      const now = Date.now();
      let n = 0;
      for (const c of cards.values() as Iterable<DrillCard>) {
        if (c.step !== "graduated" || retrievability(c, now) < RETENTION_TARGET) n++;
      }
      setWeak(n);
    }).catch(() => setWeak(0));
    // the same never-blocks MIDI race the player runs: resolve within 1.5s either way
    let settled = false;
    const settle = (v: boolean) => { if (!settled) { settled = true; setHasDevice(v); } };
    initMidi(name => { if (name) settle(true); }).catch(() => settle(false));
    const t = setTimeout(() => settle(false), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl">Prima Volta</h1>
        <span className="text-xs text-[var(--ink2)]">
          {catalog.defaults("chord").length.toLocaleString()} chord drills in scope
          <Link href="/settings" className="ml-3 text-[var(--ink2)] underline decoration-[var(--border)] underline-offset-2">devices</Link>
        </span>
      </div>

      <div className="mt-8 space-y-2">
        {FAMILIES.map(f => {
          const atInstrumentOnly = hasDevice === false && !f.offline;
          const body = (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-[15px]">{f.name}</span>
                {f.href && !atInstrumentOnly && weak !== null && weak > 0 && (
                  <span className="text-xs text-[var(--ink2)]">{weak} weak</span>
                )}
              </div>
              <div className="text-[13px] text-[var(--ink2)]">
                {f.sub}{!f.href && " · arriving this phase"}{atInstrumentOnly && " · needs the piano"}
              </div>
            </>
          );
          const cls = "block rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3";
          return f.href && !atInstrumentOnly
            ? <Link key={f.name} href={f.href} className={cls}>{body}</Link>
            : <div key={f.name} className={`${cls} opacity-45`}>{body}</div>;
        })}
      </div>

      <Link href="/practice?template=starter"
        className="mt-8 block rounded-lg bg-[var(--accent)] py-3 text-center font-medium text-white">
        Practice
      </Link>
      <Link href="/practice?family=free"
        className="mt-2 block rounded-lg border border-[var(--border)] bg-[var(--panel)] py-2.5 text-center text-[14px] text-[var(--ink)]">
        Free roam <span className="text-[var(--ink2)]">· weakest first, everything in scope</span>
      </Link>
    </main>
  );
}
