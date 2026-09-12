import counts from "../../seed/counts.json";

export default function Home() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-serif text-3xl">Prima Volta</h1>
      <p className="mt-2 text-sm text-[#9aa3b0]">Phase 0 skeleton — the drill loop arrives in Phase 1.</p>
      <div className="mt-8 rounded-lg border border-white/10 p-4">
        <p className="text-xs uppercase tracking-wide text-[#9aa3b0]">the seeder says</p>
        <p className="mt-1 text-lg">
          {counts.totalFull.toLocaleString()} atoms enumerated · {counts.totalDefault.toLocaleString()} in default scope
        </p>
      </div>
    </main>
  );
}
