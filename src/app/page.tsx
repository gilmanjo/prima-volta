"use client";
// U1-lite (Phase 1): family rows with the ruled subtexts, quiet weak counts, one Practice CTA.
import Link from "next/link";
import { useEffect, useState } from "react";
import { catalog } from "../core/catalog";
import { retrievability, type DrillCard } from "../core/scheduler";
import { RETENTION_TARGET } from "../core/constants";
import { loadCards } from "../services/store";

const FAMILIES: { name: string; sub: string; live: boolean }[] = [
  { name: "Keys & signatures", sub: "staff notation recognition", live: false },
  { name: "Chords", sub: "triads and tetrads", live: true },
  { name: "Scales", sub: "major, minor, etc.", live: false },
  { name: "Arpeggios", sub: "broken chord sequences", live: false },
];

export default function Home() {
  const [weak, setWeak] = useState<number | null>(null);
  useEffect(() => {
    loadCards().then(cards => {
      const now = Date.now();
      let n = 0;
      for (const c of cards.values() as Iterable<DrillCard>) {
        if (c.step !== "graduated" || retrievability(c, now) < RETENTION_TARGET) n++;
      }
      setWeak(n);
    }).catch(() => setWeak(0));
  }, []);

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-3xl">Prima Volta</h1>
        <span className="text-xs text-[var(--ink2)]">{catalog.defaults("chord").length.toLocaleString()} chord drills in scope</span>
      </div>

      <div className="mt-8 space-y-2">
        {FAMILIES.map(f => (
          <div key={f.name}
            className={`rounded-lg border border-[var(--border)] bg-[var(--panel)] px-4 py-3 ${f.live ? "" : "opacity-45"}`}>
            <div className="flex items-baseline justify-between">
              <span className="text-[15px]">{f.name}</span>
              {f.live && weak !== null && weak > 0 && (
                <span className="text-xs text-[var(--ink2)]">{weak} weak</span>
              )}
            </div>
            <div className="text-[13px] text-[var(--ink2)]">{f.sub}{!f.live && " · arriving this phase"}</div>
          </div>
        ))}
      </div>

      <Link href="/practice"
        className="mt-8 block rounded-lg bg-[var(--accent)] py-3 text-center font-medium text-white">
        Practice
      </Link>
    </main>
  );
}
