import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Compass,
  Flame,
  History,
  Layers,
  Play,
  Search,
  Star,
  Trash2,
  Tv,
  X,
} from 'lucide-react';
import Navbar from '../../components/Navbar';

export type AnimeCard = {
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

export const HISTORY_STORAGE_KEY = 'ss_v2_anime_history';

export function readWatchHistory(): WatchHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}j lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}h lalu`;
}

/**
 * Custom Sub-Navigation Bar pengganti Shell (Home, Katalog & Filter, Jadwal, Histori)
 */
export function AnimeSubBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: 'home' | 'catalog' | 'schedule' | 'history' | 'detail' | 'watch';
  onSelectTab?: (tab: 'home' | 'schedule' | 'history') => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [quickQuery, setQuickQuery] = useState('');
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    setHistoryCount(readWatchHistory().length);
  }, [location.pathname, location.search]);

  function handleTabClick(tab: 'home' | 'catalog' | 'schedule' | 'history') {
    if (tab === 'catalog') {
      navigate('/anime/search');
      return;
    }
    if (location.pathname === '/anime' && onSelectTab) {
      onSelectTab(tab);
      if (tab === 'home') navigate('/anime', { replace: true });
      else navigate(`/anime?tab=${tab}`, { replace: true });
    } else {
      if (tab === 'home') navigate('/anime');
      else navigate(`/anime?tab=${tab}`);
    }
  }

  function handleQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!quickQuery.trim()) {
      navigate('/anime/search');
      return;
    }
    navigate(`/anime/search?q=${encodeURIComponent(quickQuery.trim())}`);
  }

  const navItems = [
    { id: 'home' as const, label: 'Overview', icon: Tv },
    { id: 'catalog' as const, label: 'Katalog & Filter', icon: Compass },
    { id: 'schedule' as const, label: 'Jadwal Rilis', icon: CalendarDays },
    {
      id: 'history' as const,
      label: 'Histori',
      icon: Clock,
      badge: historyCount > 0 ? historyCount : undefined,
    },
  ];

  return (
    <div className="sticky top-[68px] z-40 border-b border-white/[0.07] bg-[#08090c]/90 backdrop-blur-2xl sm:top-[76px]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  isActive
                    ? 'border border-emerald-400/30 bg-emerald-400/15 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'border border-transparent text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                }`}
              >
                <Icon size={14} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="rounded-md bg-emerald-400/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={handleQuickSearch}
          className="hidden items-center gap-2 md:flex"
        >
          <div className="relative w-64">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              type="text"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder="Cepat cari judul / karakter..."
              className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#0d0f14] pl-9 pr-3 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/50"
            />
          </div>
          <Link
            to="/anime/search"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            Filter Lengkap
            <ArrowUpRight size={13} />
          </Link>
        </form>
      </div>
    </div>
  );
}

async function safeFetchJson(url: string) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const DAYS_ORDER = [
  { key: 'Monday', label: 'Senin' },
  { key: 'Tuesday', label: 'Selasa' },
  { key: 'Wednesday', label: 'Rabu' },
  { key: 'Thursday', label: 'Kamis' },
  { key: 'Friday', label: 'Jumat' },
  { key: 'Saturday', label: 'Sabtu' },
  { key: 'Sunday', label: 'Minggu' },
];

export default function AnimeHome() {
  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'history'>(
    initialTabParam === 'schedule'
      ? 'schedule'
      : initialTabParam === 'history'
        ? 'history'
        : 'home'
  );

  const [popular, setPopular] = useState<AnimeCard[]>([]);
  const [latest, setLatest] = useState<AnimeCard[]>([]);
  const [genres, setGenres] = useState<Array<{ name: string; count: number }>>([]);
  const [scheduleData, setScheduleData] = useState<Record<string, AnimeCard[]>>({});
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const dayIndex = new Date().getDay();
    const map = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return map[dayIndex] || 'Monday';
  });

  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'schedule' || t === 'history') {
      setActiveTab(t);
    } else {
      setActiveTab('home');
    }
  }, [searchParams]);

  useEffect(() => {
    setHistory(readWatchHistory());

    async function loadInitial() {
      setLoading(true);
      try {
        const [popJson, latJson, filterJson] = await Promise.all([
          safeFetchJson('/api/anime/popular?limit=12'),
          safeFetchJson('/api/anime/latest?limit=18'),
          safeFetchJson('/api/anime/filters'),
        ]);

        if (Array.isArray(popJson?.results)) setPopular(popJson.results);
        if (Array.isArray(latJson?.results)) setLatest(latJson.results);
        if (Array.isArray(filterJson?.genres)) setGenres(filterJson.genres);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, []);

  useEffect(() => {
    if (activeTab === 'schedule' && Object.keys(scheduleData).length === 0) {
      setLoadingSchedule(true);
      safeFetchJson('/api/anime/schedule')
        .then((res) => {
          if (res?.schedule) setScheduleData(res.schedule);
        })
        .finally(() => setLoadingSchedule(false));
    }
  }, [activeTab, scheduleData]);

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

  const spotlightList = popular.slice(0, 6);
  const featured = spotlightList[heroIndex] || popular[0];

  return (
    <div className="min-h-[100dvh] bg-[#08090c] text-zinc-100">
      <Navbar />

      <div className="pt-[68px] sm:pt-[76px]">
        <AnimeSubBar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6">
          {/* TAB 1: OVERVIEW (HOME) */}
          {activeTab === 'home' && (
            <div className="space-y-12">
              {/* Asymmetric Split Hero (Editorial Dark Tech) */}
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-6 sm:p-8 lg:col-span-8">
                  {featured?.banner || featured?.poster ? (
                    <div className="pointer-events-none absolute inset-0">
                      <img
                        src={featured.banner || featured.poster}
                        alt=""
                        className="h-full w-full object-cover opacity-25 transition-all duration-700"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f14] via-[#0d0f14]/90 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14] via-transparent to-transparent" />
                    </div>
                  ) : null}

                  <div className="relative flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-300">
                      SPOTLIGHT #{heroIndex + 1}
                    </span>

                    {spotlightList.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        {spotlightList.map((item, idx) => (
                          <button
                            key={item.slug}
                            type="button"
                            onClick={() => setHeroIndex(idx)}
                            className={`h-1.5 rounded-full transition-all ${
                              idx === heroIndex
                                ? 'w-7 bg-emerald-400'
                                : 'w-2 bg-white/20 hover:bg-white/40'
                            }`}
                            aria-label={`Spotlight ${idx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {featured ? (
                    <div className="relative mt-8 max-w-2xl">
                      <h1 className="line-clamp-2 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                        {featured.title}
                      </h1>

                      <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs text-zinc-400">
                        {featured.score && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-bold text-amber-300">
                            <Star size={11} fill="currentColor" />
                            {featured.score.toFixed(1)}
                          </span>
                        )}
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-zinc-200">
                          {featured.format || 'TV'}
                        </span>
                        {featured.episodes_total && (
                          <span>{featured.episodes_total} EP</span>
                        )}
                        {featured.year && <span>{featured.year}</span>}
                      </div>

                      {Array.isArray(featured.genres) &&
                        featured.genres.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {featured.genres.slice(0, 5).map((g) => (
                              <Link
                                key={g}
                                to={`/anime/search?genre=${encodeURIComponent(g)}`}
                                className="rounded-md border border-white/[0.07] bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400 transition hover:border-emerald-400/40 hover:text-emerald-300"
                              >
                                {g}
                              </Link>
                            ))}
                          </div>
                        )}

                      <div className="mt-6 flex flex-wrap items-center gap-2.5">
                        <Link
                          to={`/anime/watch/${encodeURIComponent(featured.slug)}/1`}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-bold text-zinc-950 transition hover:bg-emerald-300 active:scale-[0.98]"
                        >
                          <Play size={14} fill="currentColor" />
                          Mulai Tonton
                        </Link>
                        <Link
                          to={`/anime/${encodeURIComponent(featured.slug)}`}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.08]"
                        >
                          Rincian & Episode
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="relative my-auto">
                      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-white/5" />
                      <div className="mt-3 h-4 w-1/3 animate-pulse rounded-lg bg-white/5" />
                    </div>
                  )}
                </div>

                {/* Panel Samping: Indeks Genre Asli AnimeKai */}
                <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-5 lg:col-span-4">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-white">
                          Direktori Genre AnimeKai
                        </h2>
                        <p className="text-[11px] text-zinc-500">
                          Klik genre untuk memfilter katalog penuh
                        </p>
                      </div>
                      <Link
                        to="/anime/search"
                        className="font-mono text-[11px] font-semibold text-emerald-400 hover:underline"
                      >
                        Semua ({genres.length})
                      </Link>
                    </div>

                    <div className="mt-3.5 flex max-h-[210px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                      {genres.length === 0
                        ? Array.from({ length: 12 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-7 w-20 animate-pulse rounded-lg bg-white/5"
                            />
                          ))
                        : genres.map((g) => (
                            <Link
                              key={g.name}
                              to={`/anime/search?genre=${encodeURIComponent(g.name)}`}
                              className="group inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-[#12151c] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-white"
                            >
                              <span>{g.name}</span>
                              <span className="font-mono text-[10px] text-zinc-500 group-hover:text-emerald-300">
                                {g.count}
                              </span>
                            </Link>
                          ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('schedule')}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald-400/30 hover:text-emerald-300"
                    >
                      <CalendarDays size={14} />
                      Jadwal Mingguan
                    </button>
                    <Link
                      to="/anime/search?sort=az"
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-emerald-400/30 hover:text-emerald-300"
                    >
                      <Layers size={14} />
                      Indeks A–Z
                    </Link>
                  </div>
                </div>
              </section>

              {/* Rail Lanjutkan Menonton (Jika Ada Riwayat) */}
              {history.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Clock size={17} className="text-emerald-400" />
                      <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                        Lanjutkan Menonton
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="text-xs font-medium text-zinc-400 hover:text-emerald-300"
                    >
                      Kelola Histori ({history.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {history.slice(0, 4).map((item) => {
                      const pct =
                        item.totalEpisodes && item.totalEpisodes > 0
                          ? Math.min(
                              100,
                              Math.round((item.episode / item.totalEpisodes) * 100)
                            )
                          : 100;

                      return (
                        <Link
                          key={item.slug}
                          to={`/anime/watch/${encodeURIComponent(item.slug)}/${item.episode}`}
                          className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.07] bg-[#0d0f14] p-3 transition hover:border-emerald-400/40 hover:bg-[#11141b]"
                        >
                          <img
                            src={item.poster}
                            alt={item.title}
                            className="h-16 w-12 shrink-0 rounded-lg object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-1">
                              <h3 className="truncate text-xs font-bold text-white group-hover:text-emerald-300">
                                {item.title}
                              </h3>
                              <button
                                type="button"
                                onClick={(e) => removeHistoryItem(item.slug, e)}
                                className="text-zinc-500 hover:text-zinc-200"
                              >
                                <X size={13} />
                              </button>
                            </div>
                            <p className="mt-1 font-mono text-[11px] font-semibold text-emerald-400">
                              EP {item.episode}
                              {item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}
                            </p>
                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className="h-full bg-emerald-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Grid Peringkat Terpopuler */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Flame size={18} className="text-amber-400" />
                    <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                      Paling Populer
                    </h2>
                  </div>
                  <Link
                    to="/anime/search?sort=popular"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Lihat Semua
                    <ArrowUpRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]"
                        />
                      ))
                    : popular.slice(0, 12).map((item, idx) => (
                        <Link
                          key={item.slug}
                          to={`/anime/${encodeURIComponent(item.slug)}`}
                          className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0f14] transition hover:-translate-y-0.5 hover:border-emerald-400/40"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                            <img
                              src={item.poster || item.image}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-200 backdrop-blur-md">
                              #{idx + 1}
                            </span>
                            {item.score && (
                              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 backdrop-blur-md">
                                <Star size={9} fill="currentColor" />
                                {item.score.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col justify-between p-3">
                            <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-100 group-hover:text-emerald-300">
                              {item.title}
                            </h3>
                            <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                              <span>{item.format || 'TV'}</span>
                              <span>
                                {item.episodes_total
                                  ? `${item.episodes_total} EP`
                                  : 'ONGOING'}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                </div>
              </section>

              {/* Grid Update Episode Terbaru */}
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <History size={18} className="text-emerald-400" />
                    <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                      Pembaruan Terbaru
                    </h2>
                  </div>
                  <Link
                    to="/anime/search?sort=latest"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Lihat Semua
                    <ArrowUpRight size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {loading
                    ? Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]"
                        />
                      ))
                    : latest.map((item) => (
                        <Link
                          key={item.slug}
                          to={`/anime/${encodeURIComponent(item.slug)}`}
                          className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0f14] transition hover:-translate-y-0.5 hover:border-emerald-400/40"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                            <img
                              src={item.poster || item.image}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <span className="absolute left-2 top-2 rounded-md bg-emerald-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-950">
                              {item.format || 'TV'}
                            </span>
                          </div>
                          <div className="flex flex-1 flex-col justify-between p-3">
                            <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-100 group-hover:text-emerald-300">
                              {item.title}
                            </h3>
                            <p className="mt-2 font-mono text-[10px] text-zinc-500">
                              {item.year || 'NEW'} ·{' '}
                              {item.episodes_total
                                ? `${item.episodes_total} EP`
                                : 'AIRING'}
                            </p>
                          </div>
                        </Link>
                      ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: JADWAL RILIS MINGGUAN (SCHEDULE) */}
          {activeTab === 'schedule' && (
            <div>
              <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h1 className="text-xl font-bold text-white sm:text-2xl">
                      Jadwal Rilis Mingguan
                    </h1>
                    <p className="mt-1 text-xs text-zinc-400">
                      Estimasi pembaruan episode berdasarkan hari tayang di AnimeKai
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_ORDER.map((d) => {
                      const active = selectedDay === d.key;
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setSelectedDay(d.key)}
                          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                            active
                              ? 'bg-emerald-400 text-zinc-950 font-bold'
                              : 'border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {loadingSchedule ? (
                <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {(scheduleData[selectedDay] || []).map((item) => (
                    <Link
                      key={item.slug}
                      to={`/anime/${encodeURIComponent(item.slug)}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0f14] transition hover:-translate-y-0.5 hover:border-emerald-400/40"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                        <img
                          src={item.poster || item.image}
                          alt={item.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        {item.score && (
                          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                            <Star size={9} fill="currentColor" />
                            {item.score.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="line-clamp-2 text-xs font-semibold text-white group-hover:text-emerald-300">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 font-mono text-[10px] text-zinc-500">
                          {item.format || 'TV'} ·{' '}
                          {item.episodes_total ? `${item.episodes_total} EP` : 'ONGOING'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORI TONTONAN PENUH */}
          {activeTab === 'history' && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-5 sm:p-6">
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">
                    Histori Tontonan Kamu
                  </h1>
                  <p className="mt-1 text-xs text-zinc-400">
                    Disimpan otomatis di perangkat ini setiap kali kamu memutar episode
                  </p>
                </div>

                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllHistory}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={14} />
                    Bersihkan Semua Histori
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="mt-12 rounded-2xl border border-white/[0.06] bg-[#0d0f14] p-12 text-center">
                  <Clock size={28} className="mx-auto text-zinc-600" />
                  <p className="mt-3 text-sm font-semibold text-zinc-300">
                    Belum ada riwayat tontonan
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Pilih judul anime lalu mulai tonton episode untuk mencatat progresmu.
                  </p>
                  <Link
                    to="/anime/search"
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-bold text-zinc-950"
                  >
                    Jelajahi Katalog
                  </Link>
                </div>
              ) : (
                <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {history.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/anime/watch/${encodeURIComponent(item.slug)}/${item.episode}`}
                      className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-3.5 transition hover:border-emerald-400/40"
                    >
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="h-24 w-16 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-emerald-300">
                            {item.title}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => removeHistoryItem(item.slug, e)}
                            className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <p className="mt-1 font-mono text-xs font-semibold text-emerald-400">
                          Terakhir: Episode {item.episode}
                          {item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}
                        </p>

                        <p className="mt-1 text-[11px] text-zinc-500">
                          Ditonton {formatRelativeTime(item.updatedAt)} ·{' '}
                          {item.watchedEpisodes?.length || 1} ep selesai
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}