import { Link } from 'react-router-dom';
import { Search, Play, Sparkles } from 'lucide-react';

export default function AnimeHome() {
  return (
    <main className="min-h-screen bg-[#07070a] px-5 pb-16 pt-28 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">
            ScriptStation Entertainment
          </span>

          <h1 className="mt-3 text-4xl font-black sm:text-6xl">
            Anime<span className="text-violet-400">Hub.</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
            Temukan anime favoritmu dan jelajahi berbagai judul menarik.
          </p>

          <Link
            to="/anime/search"
            className="mt-7 inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-violet-200"
          >
            <Search size={17} />
            Cari Anime
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/anime/search"
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:bg-white/[0.07]"
          >
            <Search className="mb-5 text-violet-400" />
            <h2 className="font-bold">Jelajahi Anime</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Cari anime berdasarkan judul.
            </p>
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <Sparkles className="mb-5 text-violet-400" />
            <h2 className="font-bold">Anime Discovery</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Temukan koleksi anime terbaru dan populer.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}