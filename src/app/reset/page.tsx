"use client";
// Dev-phase reset (P1 kinks): erases THIS DEVICE's replica — cards, logs, bouts, outbox.
// Deliberately unlinked from the app chrome; the ruled System row (U7, P5) supersedes it.
import { useState } from "react";
import Link from "next/link";

type State = "idle" | "done" | "blocked" | "error";

export default function Reset() {
  const [state, setState] = useState<State>("idle");

  const erase = () => {
    try {
      const req = indexedDB.deleteDatabase("prima-volta");
      req.onsuccess = () => setState("done");
      req.onerror = () => setState("error");
      req.onblocked = () => setState("blocked"); // another tab holds the DB open
    } catch {
      setState("error");
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-serif text-3xl">Erase practice data</h1>
      <p className="text-[14px] text-[var(--ink2)]">
        Removes every card, review, and bout stored on <b>this device</b>. The curriculum starts
        over from the first teach. This cannot be undone.
      </p>
      {state === "idle" && (
        <button onClick={erase} className="rounded-lg bg-[var(--felt)] px-6 py-3 font-medium text-white">
          Erase this device&apos;s data
        </button>
      )}
      {state === "done" && (
        <>
          <p className="text-[15px] text-[var(--good)]">Erased — fresh start.</p>
          <Link href="/" className="rounded-lg bg-[var(--accent)] px-6 py-2.5 font-medium text-white">Home</Link>
        </>
      )}
      {state === "blocked" && (
        <p className="text-[14px] text-[var(--felt)]">
          Another tab of the app is open and holding the data — close it, then tap again.
        </p>
      )}
      {state === "error" && <p className="text-[14px] text-[var(--felt)]">Could not erase — try reloading this page.</p>}
    </main>
  );
}
