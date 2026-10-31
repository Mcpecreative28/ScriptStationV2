import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  History,
  Play,
  Search,
  Sparkles,
  Star,
} from 'lucide-react';
import Shell from '../../components/Shell';

type AnimeCard = {
  id: number | null;
  slug: string;
  title: string;
  poster?: string;
  image?: string;
  format?: string;
  score?: number;
  episodes_total?: number;
  year?: number;
};

async function safeFetchList(url: string): Promise<AnimeCard[]> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) return [];
    const json = JSON.parse(text);
    return Array.isArray(json?.results) ? json.results : [];
  } catch {
    return [];
  }
}

export default function AnimeHome() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [popular, setPopular] = useState<AnimeCard[]>([]);
  const [latest, setLatest] = useState<AnimeCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [popList, latList] = await Promise.all([
          safeFetchList('/api/anime/popular?limit=10'),
          safeFetchList('/api/anime/latest?limit=12'),
        ]);

        setPopular(popList);
        setLatest(latList);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/anime/search?q=${encodeURIComponent(searchInput.trim())}`);
  }

  const featured = popular[0];

  return (
    <Shell>
      <main className="relative min-h-[100dvh] overflow-hidden bg-[#07070a] px-4 pb-24 pt-24 text-white sm:px-6 sm:pt-28">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-36 top-16 h-96 w-96 rounded-full bg-violet-600/10 blur-[130px]" />
          <div className="absolute -right-32 top-80 h-96 w-96 rounded-full bg-indigo-600/10 blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          {/* Hero Section */}
          <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[linear-gradient(145deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01))] p-6 shadow-2xl backdrop-blur-2xl sm:p-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-400/[0.08] px-3 py-1 text-xs font-semibold text-violet-300">
                <Sparkles size={13} />
                SCRIPTSTATION STREAM
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
                Jelajahi & Tonton
                <span className="mt-1 block bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent">
                  Anime Favoritmu
                </span>
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Koleksi episode terlengkap dari berbagai format anime. Cari judul,
                pilih episode, dan langsung tonton tanpa hambatan.
              </p>

              {/* Input Pencarian Cepat */}
              <form onSubmit={handleSearchSubmit} className="mt-6 flex max-w-md items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Ketik judul anime, misal: Naruto, One Piece..."
                    className="min-h-[46px] w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-3 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-black transition hover:bg-violet-200"
                >
                  Cari
                </button>
              </form>
            </div>

            {featured && (
              <div className="mt-8 border-t border-white/[0.08] pt-6 sm:mt-10 sm:pt-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={featured.poster || featured.image}
                      alt={featured.title}
                      className="h-20 w-14 shrink-0 rounded-xl object-cover shadow-md"
                    />
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-violet-400 uppercase">
                        POPULER HARI INI
                      </span>
                      <h2 className="mt-0.5 line-clamp-1 text-base font-bold text-white sm:text-lg">
                        {featured.title}
                      </h2>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-400">
                        {featured.score && (
                          <span className="flex items-center gap-1 text-amber-300">
                            <Star size={12} fill="currentColor" />
                            {featured.score.toFixed(1)}
                          </span>
                        )}
                        <span>{featured.format || 'TV'}</span>
                        {featured.year && <span>{featured.year}</span>}
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/anime/${encodeURIComponent(featured.slug)}`}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/20 px-5 text-xs font-bold text-violet-200 transition hover:bg-violet-500/30"
                  >
                    <Play size={14} />
                    Mulai Tonton
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Bagian Anime Populer */}
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <Flame size={17} />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Paling Populer</h2>
              </div>

              <Link to="/anime/search" className="text-xs text-zinc-400 transition hover:text-white">
                Lihat Semua
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]" />
                  ))
                : popular.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/anime/${encodeURIComponent(item.slug)}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[0.05]"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
                        <img
                          src={item.poster || item.image}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        {item.score && (
                          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-black/40 bg-black/60 px-2 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur-md">
                            <Star size={11} fill="currentColor" />
                            {item.score.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="p-3">
                        <h3 className="line-clamp-1 text-xs font-bold text-white group-hover:text-violet-300">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-[11px] text-zinc-500">
                          {item.format || 'Anime'} · {item.episodes_total ? `${item.episodes_total} Ep` : 'Ongoing'}
                        </p>
                      </div>
                    </Link>
                  ))}
            </div>
          </section>

          {/* Bagian Baru Diperbarui */}
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/20 bg-violet-400/10 text-violet-300">
                  <History size={17} />
                </div>
                <h2 className="text-xl font-bold tracking-tight">Baru Diperbarui</h2>
              </div>

              <Link to="/anime/search" className="text-xs text-zinc-400 transition hover:text-white">
                Eksplorasi Katalog
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]" />
                  ))
                : latest.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/anime/${encodeURIComponent(item.slug)}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] transition hover:-translate-y-1 hover:border-violet-400/30 hover:bg-white/[0.05]"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
                        <img
                          src={item.poster || item.image}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>

                      <div className="p-2.5">
                        <h3 className="line-clamp-1 text-xs font-semibold text-white group-hover:text-violet-300">
                          {item.title}
                        </h3>
                        <span className="mt-1 inline-block rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                          {item.format || 'Anime'}
                        </span>
                      </div>
                    </Link>
                  ))}
            </div>
          </section>
        </div>
      </main>
    </Shell>
  );
}