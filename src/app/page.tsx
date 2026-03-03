import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              onepiece500
            </div>
            <div className="mt-1 text-xl font-semibold tracking-tight">
              One Piece cards over $500
            </div>
          </div>
          <Link
            href="/over-500"
            className="rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:opacity-90"
          >
            View list
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-16">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-7">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Plan
          </div>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-300">
            <li>Ingest One Piece card catalog</li>
            <li>Pull prices via JustTCG</li>
            <li>Persist snapshots in Supabase</li>
            <li>Show cards with latest price ≥ $500</li>
          </ol>
          <div className="mt-6 text-xs text-zinc-400">
            Next step: add an ingest script + cron.
          </div>
        </div>
      </main>
    </div>
  );
}
