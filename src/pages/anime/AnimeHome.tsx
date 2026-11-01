import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Compass,
  Disc,
  Play,
  Search,
  Star,
  Trash2,
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
  if (diffSec < 60) return 'BARU SAJA';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}M LALU`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}J LALU`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}H LALU`;
}

/**
 * Sub-Navbar Bawah (Flush / Menempel penuh di bawah layar, tidak mengambang, menggantikan Shell)
 */
export function AnimeBottomBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: 'home' | 'catalog' | 'schedule' | 'history' | 'detail' | 'watch';
  onSelectTab?: (tab: 'home' | 'schedule' | 'history') => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    setHistoryCount(readWatchHistory().length);
  }, [location.pathname, location.search]);

  function handleNav(tab: 'home' | 'catalog' | 'schedule' | 'history') {
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

  const items = [
    { id: 'home' as const, code: '01', label: 'INDEX', sub: 'Beranda', icon: Disc },
    { id: 'catalog' as const, code: '02', label: 'ARCHIVE', sub: 'Katalog & Filter', icon: Compass },
    { id: 'schedule' as const, code: '03', label: 'SCHEDULE', sub: 'Jadwal Rilis', icon: Calendar },
    {
      id: 'history' as const,
      code: '04',
      label: 'WATCHLOG',
      sub: historyCount > 0 ? `${historyCount} Tersimpan` : 'Histori',
      icon: Clock,
    },
  ];

  return (
    <nav
      aria-label="Navigasi Anime"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-[#070709]"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-4 divide-x divide-white/10">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`group relative flex h-16 flex-col justify-between px-3 py-2.5 text-left transition sm:h-[68px] sm:px-5 ${
                active
                  ? 'bg-[#121217] text-white'
                  : 'bg-[#070709] text-zinc-500 hover:bg-[#0d0d11] hover:text-zinc-200'
              }`}
            >
              {/* Indikator garis tegas di atas tab aktif */}
              <span
                className={`absolute inset-x-0 top-0 h-[2px] transition-opacity ${
                  active ? 'bg-[#ff5522] opacity-100' : 'opacity-0'
                }`}
              />

              <div className="flex w-full items-center justify-between">
                <span className="font-mono text-[10px] tracking-widest text-zinc-500">
                  {item.code}
                </span>
                <Icon
                  size={14}
                  className={
                    active
                      ? 'text-[#ff5522]'
                      : 'text-zinc-600 group-hover:text-zinc-300'
                  }
                />
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className=" truncate text-xs font-bold tracking-tight sm:text-sm">
                  {item.label}
                </span>
                <span className="hidden truncate font-mono text-[10px] text-zinc-500 md:inline">
                  {item.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
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

const DAYS_LIST = [
  { key: 'Monday', short: 'MON', label: 'Senin' },
  { key: 'Tuesday', short: 'TUE', label: 'Selasa' },
  { key: 'Wednesday', short: 'WED', label: 'Rabu' },
  { key: 'Thursday', short: 'THU', label: 'Kamis' },
  { key: 'Friday', short: 'FRI', label: 'Jumat' },
  { key: 'Saturday', short: 'SAT', label: 'Sabtu' },
  { key: 'Sunday', short: 'SUN', label: 'Minggu' },
];

export default function AnimeHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'history'>(
    tabParam === 'schedule'
      ? 'schedule'
      : tabParam === 'history'
        ? 'history'
        : 'home'
  );

  const [popular, setPopular] = useState<AnimeCard[]>([]);
  const [latest, setLatest] = useState<AnimeCard[]>([]);
  const [genres, setGenres] = useState<Array<{ name: string; count: number }>>([]);
  const [scheduleData, setScheduleData] = useState<Record<string, AnimeCard[]>>({});
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const map = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    return map[new Date().getDay()] || 'Monday';
  });

  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'schedule' || t === 'history') setActiveTab(t);
    else setActiveTab('home');
  }, [searchParams]);

  useEffect(() => {
    setHistory(readWatchHistory());

    async function load() {
      setLoading(true);
      try {
        const [popRes, latRes, fltRes] = await Promise.all([
          safeFetchJson('/api/anime/popular?limit=12'),
          safeFetchJson('/api/anime/latest?limit=18'),
          safeFetchJson('/api/anime/filters'),
        ]);
        if (Array.isArray(popRes?.results)) setPopular(popRes.results);
        if (Array.isArray(latRes?.results)) setLatest(latRes.results);
        if (Array.isArray(fltRes?.genres)) setGenres(fltRes.genres);
      } finally {
        setLoading(false);
      }
    }
    load();
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

  function removeHistory(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = history.filter((item) => item.slug !== slug);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {}
  }

  function handleQuickSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      navigate('/anime/search');
      return;
    }
    navigate(`/anime/search?q=${encodeURIComponent(searchQuery.trim())}`);
  }

  const spotlightPool = popular.slice(0, 5);
  const featured = spotlightPool[heroIndex] || popular[0];

  return (
    <div className="min-h-[100dvh] bg-[#070709] pb-24 text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-[1440px] px-4 pt-20 sm:px-6 sm:pt-24">
        {/* Top Utility Strip (Pencarian Cepat & Indikator Katalog) */}
        <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs font-bold tracking-widest text-[#ff5522]">
              SCRIPTSTATION // STREAM
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              INDEXED STREAMING TERMINAL
            </span>
          </div>

          <form onSubmit={handleQuickSearch} className="flex w-full sm:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul anime / donghua..."
              className="h-10 flex-1 border border-r-0 border-white/15 bg-[#0c0c10] px-3.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-[#ff5522]"
            />
            <button
              type="submit"
              className="flex h-10 items-center gap-1.5 bg-[#ff5522] px-4 text-xs font-bold text-black transition hover:bg-[#ff6b3d]"
            >
              <Search size={13} />
              CARI
            </button>
          </form>
        </div>

        {/* VIEW 1: INDEX HOME */}
        {activeTab === 'home' && (
          <div className="mt-6 space-y-14">
            {/* Editorial Asymmetric Hero */}
            {featured && (
              <section className="grid grid-cols-1 border border-white/15 bg-[#0b0b0f] lg:grid-cols-12">
                {/* Kolom Kiri: Tipografi & Kontrol */}
                <div className="flex flex-col justify-between border-b border-white/10 p-6 sm:p-8 lg:col-span-7 lg:border-b-0 lg:border-r">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="font-mono text-[11px] font-bold text-[#ff5522]">
                        FEATURED SELECTION // 0{heroIndex + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {spotlightPool.map((item, idx) => (
                          <button
                            key={item.slug}
                            type="button"
                            onClick={() => setHeroIndex(idx)}
                            className={`h-6 w-6 font-mono text-[11px] font-bold transition ${
                              idx === heroIndex
                                ? 'bg-[#ff5522] text-black'
                                : 'bg-white/[0.04] text-zinc-500 hover:text-white'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    <h1 className="mt-6 line-clamp-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl sm:leading-[1.02]">
                      {featured.title}
                    </h1>

                    {featured.title_romaji &&
                      featured.title_romaji !== featured.title && (
                        <p className="mt-2 font-mono text-xs text-zinc-500">
                          {featured.title_romaji}
                        </p>
                      )}

                    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-white/10 py-3 font-mono text-xs">
                      <div>
                        <span className="text-zinc-500">FORMAT: </span>
                        <span className="font-bold text-white">
                          {featured.format || 'TV'}
                        </span>
                      </div>
                      {featured.score && (
                        <div>
                          <span className="text-zinc-500">SCORE: </span>
                          <span className="font-bold text-[#ff5522]">
                            {featured.score.toFixed(1)} / 10
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-zinc-500">EPISODES: </span>
                        <span className="font-bold text-white">
                          {featured.episodes_total || 'ONGOING'}
                        </span>
                      </div>
                      {featured.year && (
                        <div>
                          <span className="text-zinc-500">YEAR: </span>
                          <span className="font-bold text-white">
                            {featured.year}
                          </span>
                        </div>
                      )}
                    </div>

                    {Array.isArray(featured.genres) &&
                      featured.genres.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {featured.genres.map((g) => (
                            <Link
                              key={g}
                              to={`/anime/search?genre=${encodeURIComponent(g)}`}
                              className="border border-white/10 bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] uppercase text-zinc-300 transition hover:border-[#ff5522] hover:text-[#ff5522]"
                            >
                              {g}
                            </Link>
                          ))}
                        </div>
                      )}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                      to={`/anime/watch/${encodeURIComponent(featured.slug)}/1`}
                      className="inline-flex h-11 items-center gap-2.5 bg-[#ff5522] px-6 text-xs font-black uppercase tracking-wider text-black transition hover:bg-[#ff6b3d]"
                    >
                      <Play size={14} fill="currentColor" />
                      Putar Episode 01
                    </Link>

                    <Link
                      to={`/anime/${encodeURIComponent(featured.slug)}`}
                      className="inline-flex h-11 items-center gap-2 border border-white/20 bg-transparent px-5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
                    >
                      Buka Arsip Episode
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Kolom Kanan: Visual Poster & Banner Kontras Tinggi */}
                <div className="relative min-h-[280px] overflow-hidden bg-black lg:col-span-5">
                  <img
                    src={featured.banner || featured.poster}
                    alt={featured.title}
                    className="h-full w-full object-cover opacity-65"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] via-transparent to-transparent" />
                  <img
                    src={featured.poster}
                    alt={featured.title}
                    className="absolute bottom-5 right-5 w-28 border border-white/20 shadow-2xl sm:w-36"
                  />
                </div>
              </section>
            )}

            {/* Baris Histori Tontonan Terakhir (Jika Ada) */}
            {history.length > 0 && (
              <section>
                <div className="flex items-baseline justify-between border-b border-white/15 pb-3">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-lg font-black uppercase tracking-tight text-white">
                      Terakhir Ditonton
                    </h2>
                    <span className="font-mono text-xs text-zinc-500">
                      ({history.length} RIWAYAT AKTIF)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="font-mono text-xs text-[#ff5522] hover:underline"
                  >
                    LIHAT SEMUA LOG →
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
                  {history.slice(0, 4).map((item) => (
                    <Link
                      key={item.slug}
                      to={`/anime/watch/${encodeURIComponent(item.slug)}/${item.episode}`}
                      className="group relative flex items-center gap-3.5 border-b border-r border-white/10 bg-[#0b0b0f] p-3.5 transition hover:bg-[#121218]"
                    >
                      <img
                        src={item.poster}
                        alt={item.title}
                        className="h-16 w-12 shrink-0 border border-white/10 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-xs font-bold text-white group-hover:text-[#ff5522]">
                            {item.title}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => removeHistory(item.slug, e)}
                            className="text-zinc-600 hover:text-white"
                          >
                            <X size={13} />
                          </button>
                        </div>
                        <p className="mt-1 font-mono text-xs font-bold text-[#ff5522]">
                          EPISODE {item.episode}
                          {item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                          {formatRelativeTime(item.updatedAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Layout 2 Kolom Asimetris: Rilis Terbaru (Kiri 8 Kolom) + Top Peringkat & Genre (Kanan 4 Kolom) */}
            <section className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              {/* Kiri: Pembaruan Episode Terbaru */}
              <div className="lg:col-span-8">
                <div className="flex items-baseline justify-between border-b border-white/15 pb-3">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">
                      Baru Diperbarui
                    </h2>
                  </div>
                  <Link
                    to="/anime/search?sort=latest"
                    className="font-mono text-xs font-bold text-zinc-400 hover:text-[#ff5522]"
                  >
                    ARSIP LENGKAP →
                  </Link>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {loading
                    ? Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className="aspect-[3/4] animate-pulse bg-white/[0.03]"
                        />
                      ))
                    : latest.slice(0, 12).map((item) => (
                        <Link
                          key={item.slug}
                          to={`/anime/${encodeURIComponent(item.slug)}`}
                          className="group flex flex-col"
                        >
                          <div className="relative aspect-[3/4] overflow-hidden border border-white/10 bg-[#0d0d12]">
                            <img
                              src={item.poster || item.image}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                            />
                            <div className="absolute left-0 top-0 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                              {item.format || 'TV'}
                            </div>
                            {item.episodes_total && (
                              <div className="absolute bottom-0 right-0 bg-[#ff5522] px-2 py-0.5 font-mono text-[10px] font-bold text-black">
                                {item.episodes_total} EP
                              </div>
                            )}
                          </div>
                          <h3 className="mt-2 line-clamp-1 text-xs font-bold text-zinc-100 group-hover:text-[#ff5522]">
                            {item.title}
                          </h3>
                          <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                            {item.year || 'ONGOING'} · {item.status || 'RELEASED'}
                          </p>
                        </Link>
                      ))}
                </div>
              </div>

              {/* Kanan: Top 10 Ledger & Indeks Genre */}
              <div className="space-y-10 lg:col-span-4">
                <div>
                  <div className="flex items-baseline justify-between border-b border-white/15 pb-3">
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">
                      Top Peringkat
                    </h2>
                    <Link
                      to="/anime/search?sort=popular"
                      className="font-mono text-xs text-zinc-400 hover:text-[#ff5522]"
                    >
                      SEMUA →
                    </Link>
                  </div>

                  <div className="mt-3 divide-y divide-white/10 border-b border-white/10">
                    {popular.slice(0, 8).map((item, idx) => (
                      <Link
                        key={item.slug}
                        to={`/anime/${encodeURIComponent(item.slug)}`}
                        className="group flex items-center gap-3.5 py-2.5 transition hover:bg-white/[0.02]"
                      >
                        <span
                          className={`w-6 font-mono text-sm font-black ${
                            idx < 3 ? 'text-[#ff5522]' : 'text-zinc-600'
                          }`}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <img
                          src={item.poster || item.image}
                          alt={item.title}
                          className="h-12 w-9 shrink-0 border border-white/10 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-xs font-bold text-zinc-100 group-hover:text-[#ff5522]">
                            {item.title}
                          </h3>
                          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-zinc-500">
                            <span>{item.format || 'TV'}</span>
                            <span>·</span>
                            <span>
                              {item.episodes_total
                                ? `${item.episodes_total} EP`
                                : 'AIRING'}
                            </span>
                          </div>
                        </div>
                        {item.score && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-amber-400">
                            <Star size={10} fill="currentColor" />
                            {item.score.toFixed(1)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Direktori Genre AnimeKai */}
                <div>
                  <div className="flex items-baseline justify-between border-b border-white/15 pb-3">
                    <h2 className="text-base font-black uppercase tracking-tight text-white">
                      Indeks Genre SSSTREAM
                    </h2>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {genres.length} KATEGORI
                    </span>
                  </div>

                  <div className="mt-3 grid max-h-64 grid-cols-2 border-l border-t border-white/10 overflow-y-auto">
                    {genres.map((g) => (
                      <Link
                        key={g.name}
                        to={`/anime/search?genre=${encodeURIComponent(g.name)}`}
                        className="flex items-center justify-between border-b border-r border-white/10 bg-[#0b0b0f] px-3 py-2 text-xs text-zinc-300 transition hover:bg-[#ff5522] hover:font-bold hover:text-black"
                      >
                        <span className="truncate">{g.name}</span>
                        <span className="font-mono text-[10px] opacity-60">
                          {g.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: SCHEDULE (JADWAL RILIS HARIAN) */}
        {activeTab === 'schedule' && (
          <div className="mt-6">
            <div className="border border-white/15 bg-[#0b0b0f]">
              <div className="grid grid-cols-7 divide-x divide-white/10 border-b border-white/10">
                {DAYS_LIST.map((d) => {
                  const active = selectedDay === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setSelectedDay(d.key)}
                      className={`flex flex-col items-center py-3 transition ${
                        active
                          ? 'bg-[#ff5522] text-black'
                          : 'bg-[#0b0b0f] text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span className="font-mono text-[10px] font-bold tracking-widest">
                        {d.short}
                      </span>
                      <span className="mt-0.5 hidden text-xs font-bold sm:inline">
                        {d.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="p-5 sm:p-6">
                {loadingSchedule ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-[3/4] animate-pulse bg-white/[0.04]"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {(scheduleData[selectedDay] || []).map((item) => (
                      <Link
                        key={item.slug}
                        to={`/anime/${encodeURIComponent(item.slug)}`}
                        className="group flex flex-col"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden border border-white/10 bg-black">
                          <img
                            src={item.poster || item.image}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                          />
                          {item.score && (
                            <span className="absolute right-0 top-0 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                              ★ {item.score.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 line-clamp-1 text-xs font-bold text-white group-hover:text-[#ff5522]">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 font-mono text-[10px] text-zinc-500">
                          {item.format || 'TV'} ·{' '}
                          {item.episodes_total
                            ? `${item.episodes_total} EP`
                            : 'SIMULCAST'}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: WATCHLOG (HISTORI TONTONAN) */}
        {activeTab === 'history' && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border border-white/15 bg-[#0b0b0f] p-5">
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight text-white">
                  Log Riwayat Tontonan
                </h1>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">
                  DISIMPAN SECARA LOKAL DI PERANGKAT INI ({history.length} JUDUL)
                </p>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-4 py-2 font-mono text-xs font-bold text-red-300 transition hover:bg-red-500 hover:text-black"
                >
                  <Trash2 size={13} />
                  HAPUS SEMUA LOG
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="mt-6 border border-white/10 bg-[#0b0b0f] p-12 text-center">
                <p className="font-mono text-xs uppercase text-zinc-500">
                  Belum ada episode yang tercatat di histori.
                </p>
                <Link
                  to="/anime/search"
                  className="mt-4 inline-block bg-[#ff5522] px-5 py-2.5 text-xs font-bold uppercase text-black"
                >
                  Mulai Eksplorasi Katalog
                </Link>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 border-l border-t border-white/15 sm:grid-cols-2 lg:grid-cols-3">
                {history.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/anime/watch/${encodeURIComponent(item.slug)}/${item.episode}`}
                    className="group flex items-center gap-4 border-b border-r border-white/15 bg-[#0b0b0f] p-4 transition hover:bg-[#121218]"
                  >
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="h-24 w-16 shrink-0 border border-white/10 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-[#ff5522]">
                          {item.title}
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => removeHistory(item.slug, e)}
                          className="text-zinc-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="mt-1.5 font-mono text-xs font-bold text-[#ff5522]">
                        LANJUT EPISODE {item.episode}
                        {item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-zinc-500">
                        {formatRelativeTime(item.updatedAt)} ·{' '}
                        {item.watchedEpisodes?.length || 1} EP SELESAI
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <AnimeBottomBar activeTab={activeTab} onSelectTab={setActiveTab} />
    </div>
  );
}