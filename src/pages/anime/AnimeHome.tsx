import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  Compass,
  Flame,
  History,
  Play,
  Search,
  Sparkles,
  Star,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import Shell from '../../components/Shell';

type AnimeCard = {
  id: number | null;
  slug: string;
  title: string;
  title_romaji?: string;
  poster?: string;
  banner?: string;
  image?: string;
  format?: string;
  status?: string;
  score?: number;
  episodes_total?: number;
  year?: number;
  genres?: string[];
};

export type WatchHistoryItem = {
  slug: string;
  title: string;
  poster?: string;
  episode: number;
  totalEpisodes?: number;
  format?: string;
  updatedAt: number;
  watchedEpisodes?: number[];
};

const HISTORY_STORAGE_KEY = 'ss_v2_anime_history';

function readWatchHistory(): WatchHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari lalu`;
}

const QUICK_GENRES = [
  'Action',
  'Adventure',
  'Fantasy',
  'Romance',
  'Comedy',
  'Sci-Fi',
  'Mystery',
  'Supernatural',
];

export default function AnimeHome() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [popular, setPopular] = useState<AnimeCard[]>([]);
  const [latest, setLatest] = useState<AnimeCard[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setHistory(readWatchHistory());

    async function loadData() {
      try {
        const [popList, latList] = await Promise.all([
          safeFetchList('/api/anime/popular?limit=12'),
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

  const heroPool = popular.slice(0, 5);
  const featured = heroPool[heroIndex] || popular[0];

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/anime/search?q=${encodeURIComponent(searchInput.trim())}`);
  }

  function removeHistoryItem(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = history.filter((item) => item.slug !== slug);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function clearAllHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {}
  }

  return (
    <Shell>
      <main className="relative min-h-[100dvh] overflow-hidden bg-[#060609] px-4 pb-24 pt-24 text-zinc-100 sm:px-6 sm:pt-28">
        {/* Ambient Cinema Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden"
        >
          <div className="absolute -left-36 top-12 h-[420px] w-[420px] rounded-full bg-rose-600/[0.08] blur-[140px]" />
          <div className="absolute -right-32 top-72 h-[380px] w-[380px] rounded-full bg-amber-500/[0.06] blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          {/* Spotlight Hero Cinema */}
          <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0c0c12] shadow-[0_28px_80px_rgba(0,0,0,0.65)]">
            {featured?.banner || featured?.poster ? (
              <div className="pointer-events-none absolute inset-0">
                <img
                  src={featured.banner || featured.poster}
                  alt=""
                  className="h-full w-full object-cover opacity-25 blur-[2px] transition-all duration-700"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#060609] via-[#060609]/90 to-[#060609]/40" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060609] via-transparent to-transparent" />
              </div>
            ) : null}

            <div className="relative grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-[11px] font-bold tracking-wider text-rose-300">
                  <Sparkles size={13} className="text-rose-400" />
                  ANIMEHUB CINEMA LOUNGE
                </div>

                {featured ? (
                  <>
                    <h1 className="mt-4 line-clamp-2 text-3xl font-black tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
                      {featured.title}
                    </h1>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2.5 text-xs text-zinc-300">
                      {featured.score && (
                        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/15 px-2.5 py-1 font-bold text-amber-300">
                          <Star size={12} fill="currentColor" />
                          {featured.score.toFixed(1)}
                        </span>
                      )}
                      <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1 font-semibold text-white">
                        {featured.format || 'TV'}
                      </span>
                      {featured.episodes_total && (
                        <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-zinc-300">
                          {featured.episodes_total} Episode
                        </span>
                      )}
                      {featured.year && (
                        <span className="text-zinc-400">{featured.year}</span>
                      )}
                    </div>

                    {Array.isArray(featured.genres) && featured.genres.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {featured.genres.slice(0, 4).map((g) => (
                          <Link
                            key={g}
                            to={`/anime/search?genre=${encodeURIComponent(g)}`}
                            className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-zinc-400 transition hover:bg-rose-500/20 hover:text-rose-200"
                          >
                            {g}
                          </Link>
                        ))}
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Link
                        to={`/anime/watch/${encodeURIComponent(featured.slug)}/1`}
                        className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-3 text-xs font-bold text-black shadow-[0_10px_30px_rgba(244,63,94,0.3)] transition hover:brightness-110 active:scale-[0.98]"
                      >
                        <Play size={16} fill="currentColor" />
                        Tonton Sekarang
                      </Link>

                      <Link
                        to={`/anime/${encodeURIComponent(featured.slug)}`}
                        className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-3 text-xs font-semibold text-white backdrop-blur-xl transition hover:bg-white/[0.1]"
                      >
                        Detail & Episode
                      </Link>
                    </div>

                    {heroPool.length > 1 && (
                      <div className="mt-6 flex items-center gap-2">
                        {heroPool.map((item, idx) => (
                          <button
                            key={item.slug}
                            type="button"
                            onClick={() => setHeroIndex(idx)}
                            aria-label={`Pilih spotlight ${item.title}`}
                            className={`h-1.5 rounded-full transition-all ${
                              idx === heroIndex
                                ? 'w-8 bg-rose-500'
                                : 'w-2.5 bg-white/20 hover:bg-white/40'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-4">
                    <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
                      Streaming Anime & Donghua Tanpa Batas
                    </h1>
                    <p className="mt-3 max-w-xl text-sm text-zinc-400">
                      Pilih judul favoritmu, ganti server pemutar kapan saja, dan
                      lanjutkan episode terakhir yang kamu tonton secara otomatis.
                    </p>
                  </div>
                )}
              </div>

              {/* Panel Pencarian & Filter Genre Cepat */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-white/10 bg-black/55 p-5 shadow-inner backdrop-blur-2xl sm:p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-white">
                      Cari Judul atau Jelajahi Katalog
                    </h2>
                    <Link
                      to="/anime/search"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300"
                    >
                      <Compass size={13} />
                      Katalog Penuh
                    </Link>
                  </div>

                  <form onSubmit={handleSearchSubmit} className="mt-3.5 flex gap-2">
                    <div className="relative flex-1">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                      />
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Ketik Naruto, One Piece, Bleach..."
                        className="min-h-[46px] w-full rounded-xl border border-white/10 bg-[#08080c] pl-10 pr-3 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-rose-500/60"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-white px-5 text-xs font-bold text-black transition hover:bg-zinc-200"
                    >
                      Cari
                    </button>
                  </form>

                  <div className="mt-4">
                    <p className="text-[11px] font-medium text-zinc-500">
                      Filter Genre Cepat:
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {QUICK_GENRES.map((genre) => (
                        <Link
                          key={genre}
                          to={`/anime/search?genre=${encodeURIComponent(genre)}`}
                          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-white"
                        >
                          {genre}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bagian Riwayat Tontonan (Lanjutkan Menonton) */}
          {history.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                      Terakhir Ditonton
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Lanjutkan episode terakhir yang kamu putar di perangkat ini
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearAllHistory}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 size={13} />
                  Hapus Histori
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {history.slice(0, 8).map((item) => {
                  const progressPercent =
                    item.totalEpisodes && item.totalEpisodes > 0
                      ? Math.min(100, Math.round((item.episode / item.totalEpisodes) * 100))
                      : 100;

                  return (
                    <Link
                      key={item.slug}
                      to={`/anime/watch/${encodeURIComponent(item.slug)}/${item.episode}`}
                      className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d14]/90 p-3 transition hover:-translate-y-0.5 hover:border-rose-500/40 hover:bg-[#12121c]"
                    >
                      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
                        {item.poster ? (
                          <img
                            src={item.poster}
                            alt={item.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-zinc-600">
                            <Tv size={18} />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                          <Play size={18} className="text-white" fill="currentColor" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 text-xs font-bold text-white group-hover:text-rose-300">
                            {item.title}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => removeHistoryItem(item.slug, e)}
                            title="Hapus dari riwayat"
                            className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-white/10 hover:text-white"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        <p className="mt-1 text-xs font-semibold text-rose-400">
                          Lanjut Episode {item.episode}
                          {item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}
                        </p>

                        <p className="mt-0.5 text-[10px] text-zinc-500">
                          {formatRelativeTime(item.updatedAt)}
                        </p>

                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Bagian Paling Populer */}
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                  <Flame size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                    Peringkat Terpopuler
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Anime dengan rating tertinggi pilihan komunitas
                  </p>
                </div>
              </div>

              <Link
                to="/anime/search?sort=popular"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Lihat Semua
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]"
                    />
                  ))
                : popular.map((item, idx) => (
                    <Link
                      key={item.slug}
                      to={`/anime/${encodeURIComponent(item.slug)}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c12] transition duration-300 hover:-translate-y-1 hover:border-rose-500/40"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                        <img
                          src={item.poster || item.image}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12] via-transparent to-transparent opacity-80" />

                        <span className="absolute left-2.5 top-2.5 rounded-lg border border-white/15 bg-black/70 px-2 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-md">
                          #{idx + 1}
                        </span>

                        {item.score && (
                          <span className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-lg border border-amber-400/30 bg-black/75 px-2 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur-md">
                            <Star size={10} fill="currentColor" />
                            {item.score.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-3">
                        <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white group-hover:text-rose-300">
                          {item.title}
                        </h3>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                          <span>{item.format || 'TV'}</span>
                          <span>
                            {item.episodes_total ? `${item.episodes_total} Ep` : 'Ongoing'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
            </div>
          </section>

          {/* Bagian Rilis & Pembaruan Terbaru */}
          <section className="mt-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-300">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                    Baru Diperbarui
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Rilis episode terbaru yang siap ditonton hari ini
                  </p>
                </div>
              </div>

              <Link
                to="/anime/search?sort=latest"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                Eksplorasi Terbaru
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]"
                    />
                  ))
                : latest.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/anime/${encodeURIComponent(item.slug)}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c12] transition duration-300 hover:-translate-y-1 hover:border-rose-500/40"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                        <img
                          src={item.poster || item.image}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c12] via-transparent to-transparent opacity-80" />

                        <span className="absolute left-2.5 top-2.5 rounded-md bg-rose-600/90 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                          {item.format || 'TV'}
                        </span>
                      </div>

                      <div className="flex flex-1 flex-col justify-between p-3">
                        <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white group-hover:text-rose-300">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-[10px] text-zinc-500">
                          {item.year || 'Rilis Baru'} ·{' '}
                          {item.episodes_total ? `${item.episodes_total} Ep` : 'Ongoing'}
                        </p>
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