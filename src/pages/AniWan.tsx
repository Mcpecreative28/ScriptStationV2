import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Download,
  Film,
  Flame,
  Loader2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import Navbar from '../components/Navbar';

type AniWanAnimeItem = {
  title: string;
  episode: string;
  releaseTime?: string | null;
  url: string;
  thumb: string;
};

type AniWanComicItem = {
  title: string;
  type: string;
  is_colored?: boolean;
  is_hot?: boolean;
  latest_chapter?: string;
  update_time?: string;
  url: string;
  chapter_url?: string;
  image_url: string;
};

type ScheduleEntry = {
  title: string;
  url: string;
  chapter_url?: string;
  thumb?: string;
  image_url?: string;
  episode?: string;
  latest_chapter?: string;
  type?: string;
  day: string;
  kind?: 'anime' | 'komik';
};

type AniWanHistoryItem = {
  id: string;
  kind: 'anime' | 'komik';
  title: string;
  subLabel: string;
  thumb: string;
  targetUrl: string;
  parentUrl?: string;
  updatedAt: number;
};

const ANIWAN_HISTORY_KEY = 'ss_v2_aniwan_history';

const DAYS_INDO = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

function getTodayIndo(): string {
  const map = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
  ];
  return map[new Date().getDay()] || 'Senin';
}

function readAniWanHistory(): AniWanHistoryItem[] {
  try {
    const raw = localStorage.getItem(ANIWAN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAniWanHistory(
  entry: Omit<AniWanHistoryItem, 'updatedAt'>
): AniWanHistoryItem[] {
  try {
    const current = readAniWanHistory();
    const filtered = current.filter((item) => item.id !== entry.id);
    const updated: AniWanHistoryItem = {
      ...entry,
      updatedAt: Date.now(),
    };
    const next = [updated, ...filtered].slice(0, 30);
    localStorage.setItem(ANIWAN_HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

function formatTimeAgo(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  return `${Math.floor(diffHour / 24)} hari lalu`;
}

function parseErrorString(err: unknown): string {
  if (!err) return 'Terjadi gangguan jaringan.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string') return o.message;
    if (typeof o.error === 'string') return o.error;
  }
  return 'Gagal memuat data dari server. Silakan coba lagi.';
}

async function fetchAniWanApi(query = '', page = 1) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));

  const res = await fetch(`/api/aniwan?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  const text = await res.text();
  if (!text || text.trim().startsWith('<')) {
    throw new Error(
      `Server sedang sibuk (HTTP ${res.status}). Silakan ketuk muat ulang.`
    );
  }
  const json = JSON.parse(text);
  if (!res.ok || json?.status === false) {
    throw new Error(parseErrorString(json?.error));
  }
  return json;
}

const LIQUID_PANEL =
  'relative overflow-hidden rounded-[26px] border border-white/[0.14] bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl';

const LIQUID_CARD =
  'group relative overflow-hidden rounded-[22px] border border-white/[0.11] bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(15,23,42,0.45))] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-teal-300/40';

export default function AniWan() {
  const [activeTab, setActiveTab] = useState<
    'home' | 'search' | 'komik' | 'schedule' | 'history'
  >('home');

  // Data Feeds
  const [animeFeed, setAnimeFeed] = useState<AniWanAnimeItem[]>([]);
  const [comicFeed, setComicFeed] = useState<AniWanComicItem[]>([]);
  const [comicPage, setComicPage] = useState(1);

  // Jadwal Rilis Ganda (Anime & Komik)
  const [scheduleType, setScheduleType] = useState<'anime' | 'komik'>('anime');
  const [animeSchedule, setAnimeSchedule] = useState<
    Record<string, ScheduleEntry[]>
  >({});
  const [comicSchedule, setComicSchedule] = useState<
    Record<string, ScheduleEntry[]>
  >({});
  const [selectedDay, setSelectedDay] = useState<string>(getTodayIndo());
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Pencarian
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'anime' | 'komik'>(
    'all'
  );
  const [searchAnimeRes, setSearchAnimeRes] = useState<AniWanAnimeItem[]>([]);
  const [searchComicRes, setSearchComicRes] = useState<AniWanComicItem[]>([]);

  // Active Views (Player / Detail Komik / Reader)
  const [activeEpisode, setActiveEpisode] = useState<any | null>(null);
  const [activeComic, setActiveComic] = useState<any | null>(null);
  const [activeChapter, setActiveChapter] = useState<any | null>(null);

  // States
  const [loading, setLoading] = useState(true);
  const [loadingMoreComics, setLoadingMoreComics] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [error, setError] = useState('');

  // History
  const [history, setHistory] = useState<AniWanHistoryItem[]>([]);

  useEffect(() => {
    setHistory(readAniWanHistory());
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAniWanApi('');
      const ongoing = Array.isArray(res?.data?.ongoing_anime)
        ? res.data.ongoing_anime
        : [];
      const comics = Array.isArray(res?.data?.latest_comics)
        ? res.data.latest_comics
        : [];
      setAnimeFeed(ongoing);
      setComicFeed(comics);
    } catch (err) {
      setError(parseErrorString(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadSchedule() {
    setLoadingSchedule(true);
    setError('');
    try {
      const res = await fetchAniWanApi('schedule');
      if (res?.data?.anime || res?.data?.komik) {
        setAnimeSchedule(res.data.anime || {});
        setComicSchedule(res.data.komik || {});
      } else if (res?.data && typeof res.data === 'object') {
        setAnimeSchedule(res.data);
      }
    } catch (err) {
      setError(parseErrorString(err));
    } finally {
      setLoadingSchedule(false);
    }
  }

  async function loadComicPage(targetPage: number, append: boolean) {
    if (append) setLoadingMoreComics(true);
    else setLoading(true);
    setError('');

    try {
      const res = await fetchAniWanApi('komik', targetPage);
      const items = Array.isArray(res?.data) ? res.data : [];
      if (append) {
        setComicFeed((prev) => [...prev, ...items]);
      } else {
        setComicFeed(items);
      }
      setComicPage(targetPage);
    } catch (err) {
      setError(parseErrorString(err));
    } finally {
      setLoading(false);
      setLoadingMoreComics(false);
    }
  }

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;

    setActiveTab('search');
    setLoading(true);
    setError('');
    setActiveEpisode(null);
    setActiveComic(null);
    setActiveChapter(null);
    setActiveSearchQuery(q);

    try {
      const res = await fetchAniWanApi(`search:${q}`);
      setSearchComicRes(Array.isArray(res?.data?.comics) ? res.data.comics : []);
      setSearchAnimeRes(Array.isArray(res?.data?.anime) ? res.data.anime : []);
    } catch (err) {
      setError(parseErrorString(err));
    } finally {
      setLoading(false);
    }
  }

  async function openAnimeEpisode(url: string, fallbackThumb = '') {
    if (!url) return;
    setLoadingModal(true);
    setError('');
    setActiveComic(null);
    setActiveChapter(null);

    try {
      const res = await fetchAniWanApi(url);
      if (res?.data) {
        const epData = {
          ...res.data,
          thumb: res.data.thumb || fallbackThumb,
          source_url: url,
        };
        setActiveEpisode(epData);
        const nextHist = saveAniWanHistory({
          id: url,
          kind: 'anime',
          title: epData.title || 'Episode Anime',
          subLabel: 'Anime Sub Indo',
          thumb: epData.thumb || fallbackThumb,
          targetUrl: url,
        });
        setHistory(nextHist);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(parseErrorString(err));
    } finally {
      setLoadingModal(false);
    }
  }

  async function openComicDetail(comicUrl: string, fallbackThumb = '') {
    if (!comicUrl) return;
    setLoadingModal(true);
    setError('');
    setActiveEpisode(null);
    setActiveChapter(null);

    try {
      const res = await fetchAniWanApi(comicUrl);
      if (res?.data) {
        const detail = {
          ...res.data,
          image_url: res.data.image_url || fallbackThumb,
          source_url: comicUrl,
        };
        setActiveComic(detail);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(parseErrorString(err));
    } finally {
      setLoadingModal(false);
    }
  }

  async function openChapterReader(chapterUrl: string) {
    if (!chapterUrl) return;
    setLoadingModal(true);
    setError('');
    setActiveEpisode(null);

    try {
      const res = await fetchAniWanApi(chapterUrl);
      if (res?.data) {
        setActiveChapter({
          ...res.data,
          source_url: chapterUrl,
        });

        const nextHist = saveAniWanHistory({
          id: activeComic?.source_url || chapterUrl,
          kind: 'komik',
          title: activeComic?.title || res.data.title || 'Komik',
          subLabel: res.data.title || 'Chapter Komik',
          thumb: activeComic?.image_url || res.data.images?.[0]?.url || '',
          targetUrl: chapterUrl,
          parentUrl: activeComic?.source_url,
        });
        setHistory(nextHist);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(parseErrorString(err));
    } finally {
      setLoadingModal(false);
    }
  }

  function switchTab(
    nextTab: 'home' | 'search' | 'komik' | 'schedule' | 'history'
  ) {
    setActiveTab(nextTab);
    setActiveEpisode(null);
    setActiveComic(null);
    setActiveChapter(null);
    setError('');

    if (nextTab === 'komik' && comicFeed.length === 0) {
      loadComicPage(1, false);
    } else if (
      nextTab === 'schedule' &&
      Object.keys(animeSchedule).length === 0
    ) {
      loadSchedule();
    }
  }

  function removeHistoryItem(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    try {
      localStorage.setItem(ANIWAN_HISTORY_KEY, JSON.stringify(next));
    } catch {}
  }

  function clearAllHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(ANIWAN_HISTORY_KEY);
    } catch {}
  }

  const navItems = [
    { id: 'home' as const, label: 'Beranda', icon: Compass },
    { id: 'search' as const, label: 'Pencarian', icon: Search },
    { id: 'komik' as const, label: 'Komik', icon: BookOpen },
    { id: 'schedule' as const, label: 'Jadwal', icon: CalendarDays },
    {
      id: 'history' as const,
      label: 'Riwayat',
      icon: Clock,
      badge: history.length > 0 ? history.length : undefined,
    },
  ];

  const activeDayAnimeList = animeSchedule[selectedDay] || [];
  const activeDayComicList = comicSchedule[selectedDay] || [];

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#060b11] pb-28 text-slate-100 selection:bg-teal-400/30 selection:text-teal-100">
      {/* Ambient Liquid Background Orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -left-28 top-14 h-[380px] w-[380px] rounded-full bg-teal-500/15 blur-[130px]" />
        <div className="absolute -right-28 top-72 h-[420px] w-[420px] rounded-full bg-cyan-500/12 blur-[140px]" />
        <div className="absolute bottom-16 left-1/2 h-[300px] w-[480px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[130px]" />
      </div>

      <Navbar />

      <main className="relative mx-auto max-w-7xl px-4 pt-20 sm:px-6 sm:pt-24">
        {/* Hero Liquid Glass Header & Global Search */}
        <section className={`${LIQUID_PANEL} p-5 sm:p-8`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-teal-300/15 blur-3xl"
          />

          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/10 px-3.5 py-1 text-xs font-medium text-teal-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                <Sparkles size={13} className="text-teal-300" />
                Ruang Tonton &amp; Baca Santai
              </div>

              <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                Streaming Anime Sub Indo &amp; Baca Komik Pilihan
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-slate-300/80 sm:text-sm">
                Nikmati episode anime terbaru lengkap dengan terjemahan bahasa
                Indonesia atau lanjutkan baca chapter manga, manhwa, dan manhua
                favoritmu langsung dari satu tempat.
              </p>
            </div>

            {/* Form Pencarian Liquid Glass */}
            <form
              onSubmit={handleSearchSubmit}
              className="w-full lg:max-w-md"
            >
              <label
                htmlFor="aniwan-search"
                className="mb-2 block text-xs font-medium text-slate-300"
              >
                Cari anime atau komik favoritmu
              </label>
              <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/55 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl focus-within:border-teal-300/60">
                <Search
                  size={17}
                  className="ml-3 shrink-0 text-teal-300/80"
                />
                <input
                  id="aniwan-search"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Ketik Solo Leveling, One Piece, Boruto..."
                  className="h-10 min-w-0 flex-1 bg-transparent px-2 text-xs text-white outline-none placeholder:text-slate-400/60 sm:text-sm"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="submit"
                  className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-teal-300 via-cyan-300 to-emerald-300 px-5 text-xs font-bold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:brightness-105 active:scale-[0.98]"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Peringatan Kendala Jaringan */}
        {error && (
          <div
            className={`${LIQUID_PANEL} mt-6 flex flex-wrap items-center justify-between gap-3 border-amber-300/30 bg-amber-500/10 p-4`}
          >
            <p className="text-xs text-amber-100 sm:text-sm">{error}</p>
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'komik') loadComicPage(comicPage, false);
                else if (activeTab === 'schedule') loadSchedule();
                else loadDashboard();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/30 bg-amber-300/20 px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/30"
            >
              <RotateCcw size={13} /> Muat Ulang
            </button>
          </div>
        )}

        {/* OVERLAY 1: LOADING MODAL */}
        {loadingModal && (
          <div className={`${LIQUID_PANEL} my-10 p-16 text-center`}>
            <Loader2
              size={32}
              className="mx-auto animate-spin text-teal-300"
            />
            <p className="mt-3 text-sm font-medium text-slate-200">
              Menyiapkan halaman untukmu...
            </p>
          </div>
        )}

        {/* OVERLAY 2: PEMUTAR VIDEO ANIME SUB INDO */}
        {!loadingModal && activeEpisode && (
          <section className={`${LIQUID_PANEL} mt-6 p-5 sm:p-7`}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-medium text-teal-300">
                  Sedang Memutar Anime Sub Indo
                </span>
                <h2 className="mt-0.5 text-lg font-bold text-white sm:text-2xl">
                  {activeEpisode.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setActiveEpisode(null)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <ArrowLeft size={14} /> Kembali ke Daftar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
                  {activeEpisode.streamIframe ? (
                    <iframe
                      src={activeEpisode.streamIframe}
                      title={activeEpisode.title}
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <div className="grid h-full place-items-center p-6 text-center text-xs text-slate-400">
                      Pemutar langsung sedang tidak tersedia untuk episode ini.
                      Silakan gunakan tautan unduhan di bawah.
                    </div>
                  )}
                </div>

                {activeEpisode.synopsis && (
                  <p className="mt-4 text-xs leading-relaxed text-slate-300 sm:text-sm">
                    {activeEpisode.synopsis}
                  </p>
                )}

                {Array.isArray(activeEpisode.downloads) &&
                  activeEpisode.downloads.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="text-xs font-semibold text-teal-200">
                        Tautan Unduh Episode (GoFile, Pixeldrain, Google Drive,
                        Mega):
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {activeEpisode.downloads.map((dl: any, idx: number) => (
                          <a
                            key={idx}
                            href={dl.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-100 transition hover:border-teal-300/50 hover:bg-teal-300/20"
                          >
                            <Download size={12} />
                            {dl.server}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Daftar Episode Lainnya */}
              <div className="flex max-h-[520px] flex-col rounded-2xl border border-white/10 bg-slate-950/45 p-4 lg:col-span-4">
                <h3 className="border-b border-white/10 pb-3 text-sm font-bold text-white">
                  Episode Lainnya ({activeEpisode.episodes?.length || 0})
                </h3>
                <div className="mt-2 space-y-1.5 overflow-y-auto pr-1">
                  {(activeEpisode.episodes || []).map((ep: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        openAnimeEpisode(ep.url, activeEpisode.thumb)
                      }
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs transition ${
                        ep.url === activeEpisode.source_url
                          ? 'bg-gradient-to-r from-teal-300 to-cyan-300 font-bold text-slate-950'
                          : 'bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{ep.title}</span>
                      <Play size={12} className="ml-2 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* OVERLAY 3: PEMBACA CHAPTER KOMIK (MANGA READER) */}
        {!loadingModal && activeChapter && (
          <section className="mt-6 space-y-4">
            <div
              className={`${LIQUID_PANEL} flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6`}
            >
              <div>
                <span className="text-xs font-medium text-teal-300">
                  Mode Baca Komik · {activeChapter.total_pages || 0} Halaman
                </span>
                <h2 className="text-base font-bold text-white sm:text-xl">
                  {activeChapter.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeComic && (
                  <button
                    type="button"
                    onClick={() => setActiveChapter(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20"
                  >
                    <ArrowLeft size={13} /> Daftar Chapter
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setActiveChapter(null);
                    setActiveComic(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-slate-300 hover:text-white"
                >
                  <X size={13} /> Tutup
                </button>
              </div>
            </div>

            {/* Navigasi Chapter Atas */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 backdrop-blur-xl">
              <button
                type="button"
                disabled={!activeChapter.navigation?.prev}
                onClick={() =>
                  openChapterReader(activeChapter.navigation.prev)
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-30"
              >
                <ChevronLeft size={14} /> Chapter Sebelumnya
              </button>

              <button
                type="button"
                disabled={!activeChapter.navigation?.next}
                onClick={() =>
                  openChapterReader(activeChapter.navigation.next)
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 transition hover:brightness-105 disabled:opacity-30"
              >
                Chapter Berikutnya <ChevronRight size={14} />
              </button>
            </div>

            {/* Kanvas Halaman Komik */}
            <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
              {(activeChapter.images || []).map((img: any) => (
                <img
                  key={img.page}
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  className="block w-full select-none"
                />
              ))}
            </div>

            {/* Navigasi Chapter Bawah */}
            <div className="flex justify-center gap-3 pt-2">
              {activeChapter.navigation?.prev && (
                <button
                  type="button"
                  onClick={() =>
                    openChapterReader(activeChapter.navigation.prev)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-xs font-semibold text-white"
                >
                  <ChevronLeft size={14} /> Chapter Sebelumnya
                </button>
              )}
              {activeChapter.navigation?.next && (
                <button
                  type="button"
                  onClick={() =>
                    openChapterReader(activeChapter.navigation.next)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-300 px-5 py-2.5 text-xs font-bold text-slate-950"
                >
                  Chapter Berikutnya <ChevronRight size={14} />
                </button>
              )}
            </div>
          </section>
        )}

        {/* OVERLAY 4: DETAIL KOMIK & DAFTAR CHAPTER */}
        {!loadingModal && !activeChapter && activeComic && (
          <section className="mt-6 space-y-6">
            <div className={`${LIQUID_PANEL} p-5 sm:p-8`}>
              <button
                type="button"
                onClick={() => setActiveComic(null)}
                className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20"
              >
                <ArrowLeft size={14} /> Kembali ke Katalog Komik
              </button>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-[200px_1fr]">
                <img
                  src={activeComic.image_url}
                  alt={activeComic.title}
                  className="mx-auto aspect-[3/4] w-44 rounded-2xl border border-white/20 object-cover shadow-xl sm:mx-0 sm:w-full"
                />

                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg bg-teal-300 px-2.5 py-1 font-bold text-slate-950">
                        {activeComic.type || 'Komik'}
                      </span>
                      <span className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-slate-200">
                        {activeComic.status}
                      </span>
                      {activeComic.rating && activeComic.rating !== 'N/A' && (
                        <span className="rounded-lg border border-amber-300/30 bg-amber-400/15 px-2.5 py-1 font-bold text-amber-200">
                          ★ {activeComic.rating}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
                      {activeComic.title}
                    </h2>
                    {activeComic.author && activeComic.author !== 'N/A' && (
                      <p className="mt-1 text-xs text-slate-400">
                        Karya: {activeComic.author}
                      </p>
                    )}

                    {Array.isArray(activeComic.genres) &&
                      activeComic.genres.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {activeComic.genres.map((g: string) => (
                            <span
                              key={g}
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}

                    <p className="mt-4 text-xs leading-relaxed text-slate-300 sm:text-sm">
                      {activeComic.synopsis ||
                        'Pilih salah satu chapter di bawah untuk mulai membaca komik ini.'}
                    </p>
                  </div>

                  {activeComic.chapters?.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          openChapterReader(activeComic.chapters[0].url)
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-300 px-5 py-2.5 text-xs font-bold text-slate-950 shadow"
                      >
                        <BookOpen size={14} />
                        Baca Chapter Terbaru ({activeComic.chapters[0].title})
                      </button>
                      {activeComic.chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            openChapterReader(
                              activeComic.chapters[
                                activeComic.chapters.length - 1
                              ].url
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20"
                        >
                          Baca dari Chapter Awal
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={`${LIQUID_PANEL} p-5 sm:p-6`}>
              <h3 className="text-base font-bold text-white">
                Daftar Chapter ({activeComic.chapters?.length || 0})
              </h3>
              <div className="mt-4 grid max-h-[460px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3">
                {(activeComic.chapters || []).map((ch: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openChapterReader(ch.url)}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-xs text-slate-200 transition hover:border-teal-300/50 hover:bg-teal-300/15 hover:text-white"
                  >
                    <span className="truncate font-semibold">{ch.title}</span>
                    <span className="ml-2 shrink-0 text-[11px] text-slate-400">
                      {ch.update_time}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* KONTEN TAB UTAMA (SAAT TIDAK ADA OVERLAY AKTIF) */}
        {!loadingModal &&
          !activeEpisode &&
          !activeComic &&
          !activeChapter && (
            <>
              {/* TAB 1: BERANDA (ANIME ONGOING + KOMIK TERBARU) */}
              {activeTab === 'home' && (
                <div className="mt-8 space-y-10">
                  {history.length > 0 && (
                    <section>
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-white sm:text-xl">
                            Lanjutkan Aktivitasmu
                          </h2>
                          <p className="text-xs text-slate-400">
                            Episode dan chapter terakhir yang kamu buka
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => switchTab('history')}
                          className="text-xs font-semibold text-teal-300 hover:underline"
                        >
                          Lihat Semua ({history.length})
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                        {history.slice(0, 4).map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              if (h.kind === 'anime')
                                openAnimeEpisode(h.targetUrl, h.thumb);
                              else openChapterReader(h.targetUrl);
                            }}
                            className={`${LIQUID_CARD} flex items-center gap-3.5 p-3 text-left`}
                          >
                            {h.thumb && (
                              <img
                                src={h.thumb}
                                alt={h.title}
                                className="h-16 w-12 shrink-0 rounded-xl object-cover"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="inline-block rounded-md bg-teal-400/15 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                                {h.kind === 'anime' ? 'Anime' : 'Komik'}
                              </span>
                              <h3 className="mt-1 truncate text-xs font-bold text-white">
                                {h.title}
                              </h3>
                              <p className="truncate text-[11px] text-slate-400">
                                {h.subLabel}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Seksi Episode Anime Sub Indo Terbaru */}
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 place-items-center rounded-xl border border-teal-300/30 bg-teal-400/15 text-teal-300">
                          <Film size={18} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white sm:text-xl">
                            Episode Anime Sub Indo Terbaru
                          </h2>
                          <p className="text-xs text-slate-400">
                            Pilih judul untuk langsung menonton atau mengunduh
                            video
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setScheduleType('anime');
                          switchTab('schedule');
                        }}
                        className="rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                      >
                        Jadwal Anime
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="aspect-[3/4] animate-pulse rounded-[22px] bg-white/[0.05]"
                            />
                          ))
                        : animeFeed.slice(0, 12).map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                openAnimeEpisode(item.url, item.thumb)
                              }
                              className={`${LIQUID_CARD} flex flex-col text-left`}
                            >
                              <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
                                <img
                                  src={item.thumb}
                                  alt={item.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                                <span className="absolute left-2.5 top-2.5 rounded-lg bg-teal-300/95 px-2 py-0.5 text-[10px] font-bold text-slate-950 shadow">
                                  Sub Indo
                                </span>
                                <span className="absolute bottom-2 right-2 rounded-lg border border-white/15 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-teal-200 backdrop-blur-md">
                                  {item.episode}
                                </span>
                              </div>
                              <div className="p-3">
                                <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white group-hover:text-teal-200">
                                  {item.title}
                                </h3>
                              </div>
                            </button>
                          ))}
                    </div>
                  </section>

                  {/* Seksi Update Komik & Manhwa */}
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/30 bg-cyan-400/15 text-cyan-300">
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-white sm:text-xl">
                            Komik &amp; Manhwa Baru Rilis
                          </h2>
                          <p className="text-xs text-slate-400">
                            Ketuk sampul untuk melihat daftar chapter atau ketuk
                            nomor chapter untuk langsung membaca
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleType('komik');
                            switchTab('schedule');
                          }}
                          className="rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                        >
                          Jadwal Komik
                        </button>
                        <button
                          type="button"
                          onClick={() => switchTab('komik')}
                          className="rounded-xl bg-teal-300/20 px-3.5 py-2 text-xs font-bold text-teal-200 transition hover:bg-teal-300 hover:text-slate-950"
                        >
                          Semua Komik
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="aspect-[3/4] animate-pulse rounded-[22px] bg-white/[0.05]"
                            />
                          ))
                        : comicFeed.slice(0, 12).map((comic, idx) => (
                            <div
                              key={idx}
                              className={`${LIQUID_CARD} flex flex-col`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  openComicDetail(comic.url, comic.image_url)
                                }
                                className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900 text-left"
                              >
                                <img
                                  src={comic.image_url}
                                  alt={comic.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />
                                <span className="absolute left-2.5 top-2.5 rounded-lg border border-white/15 bg-slate-950/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                                  {comic.type}
                                </span>
                                {comic.is_colored && (
                                  <span className="absolute right-2.5 top-2.5 rounded-lg bg-teal-300/95 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                    Berwarna
                                  </span>
                                )}
                              </button>

                              <div className="flex flex-1 flex-col justify-between p-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openComicDetail(comic.url, comic.image_url)
                                  }
                                  className="line-clamp-2 text-left text-xs font-bold leading-snug text-white group-hover:text-teal-200"
                                >
                                  {comic.title}
                                </button>

                                <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                                  {comic.chapter_url ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openChapterReader(comic.chapter_url!)
                                      }
                                      className="font-semibold text-teal-300 hover:underline"
                                    >
                                      {comic.latest_chapter}
                                    </button>
                                  ) : (
                                    <span className="text-slate-400">
                                      {comic.latest_chapter}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400">
                                    {comic.update_time}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 2: PENCARIAN TERPADU (ANIME SUB INDO & KOMIK) */}
              {activeTab === 'search' && (
                <section className="mt-8 space-y-6">
                  <div
                    className={`${LIQUID_PANEL} flex flex-wrap items-center justify-between gap-4 p-5`}
                  >
                    <div>
                      <h2 className="text-lg font-bold text-white sm:text-xl">
                        {activeSearchQuery
                          ? `Hasil Pencarian: "${activeSearchQuery}"`
                          : 'Eksplorasi & Pencarian Judul'}
                      </h2>
                      <p className="text-xs text-slate-400">
                        Menampilkan hasil dari katalog Anime Sub Indo dan Komik
                        secara bersamaan
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {(
                        [
                          { id: 'all', label: 'Semua' },
                          {
                            id: 'komik',
                            label: `Komik (${searchComicRes.length})`,
                          },
                          {
                            id: 'anime',
                            label: `Anime (${searchAnimeRes.length})`,
                          },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSearchFilter(tab.id)}
                          className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                            searchFilter === tab.id
                              ? 'bg-gradient-to-r from-teal-300 to-cyan-300 font-bold text-slate-950'
                              : 'border border-white/15 bg-white/[0.04] text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div className="py-20 text-center">
                      <Loader2
                        size={30}
                        className="mx-auto animate-spin text-teal-300"
                      />
                      <p className="mt-3 text-xs text-slate-400">
                        Mencari judul yang sesuai...
                      </p>
                    </div>
                  ) : !activeSearchQuery ? (
                    <div className={`${LIQUID_PANEL} p-12 text-center`}>
                      <Search
                        size={28}
                        className="mx-auto text-teal-300/60"
                      />
                      <p className="mt-3 text-sm font-semibold text-white">
                        Ketik judul anime atau komik di kolom pencarian atas
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Kamu bisa mencari judul seperti One Piece, Solo Leveling,
                        Jujutsu Kaisen, atau Re:Monster.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {(searchFilter === 'all' || searchFilter === 'komik') &&
                        searchComicRes.length > 0 && (
                          <div>
                            <h3 className="mb-4 text-base font-bold text-white">
                              Komik &amp; Manhwa ({searchComicRes.length})
                            </h3>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                              {searchComicRes.map((c, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() =>
                                    openComicDetail(c.url, c.image_url)
                                  }
                                  className={`${LIQUID_CARD} flex flex-col text-left`}
                                >
                                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
                                    <img
                                      src={c.image_url}
                                      alt={c.title}
                                      loading="lazy"
                                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                    <span className="absolute left-2.5 top-2.5 rounded-lg bg-teal-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                      {c.type}
                                    </span>
                                  </div>
                                  <div className="p-3">
                                    <h4 className="line-clamp-2 text-xs font-bold text-white group-hover:text-teal-200">
                                      {c.title}
                                    </h4>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {(searchFilter === 'all' || searchFilter === 'anime') &&
                        searchAnimeRes.length > 0 && (
                          <div>
                            <h3 className="mb-4 text-base font-bold text-white">
                              Anime Sub Indo ({searchAnimeRes.length})
                            </h3>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                              {searchAnimeRes.map((a, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() =>
                                    openAnimeEpisode(a.url, a.thumb)
                                  }
                                  className={`${LIQUID_CARD} flex flex-col text-left`}
                                >
                                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
                                    <img
                                      src={a.thumb}
                                      alt={a.title}
                                      loading="lazy"
                                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />
                                    <span className="absolute left-2.5 top-2.5 rounded-lg bg-teal-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                      Sub Indo
                                    </span>
                                  </div>
                                  <div className="p-3">
                                    <h4 className="line-clamp-2 text-xs font-bold text-white group-hover:text-teal-200">
                                      {a.title}
                                    </h4>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                      {searchComicRes.length === 0 &&
                        searchAnimeRes.length === 0 && (
                          <div className={`${LIQUID_PANEL} p-12 text-center`}>
                            <p className="text-sm font-semibold text-slate-200">
                              Belum ditemukan hasil untuk &quot;
                              {activeSearchQuery}&quot;
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Coba gunakan kata kunci yang lebih pendek atau
                              ejaan Jepang/Inggrisnya.
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </section>
              )}

              {/* TAB 3: KOLEKSI KOMIK, MANHWA & MANHUA */}
              {activeTab === 'komik' && (
                <section className="mt-8">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-white sm:text-2xl">
                        Katalog Komik, Manhwa &amp; Manhua
                      </h2>
                      <p className="text-xs text-slate-400">
                        Ketuk sampul untuk melihat daftar chapter atau langsung
                        baca chapter terbaru
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {loading
                      ? Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-[3/4] animate-pulse rounded-[22px] bg-white/[0.05]"
                          />
                        ))
                      : comicFeed.map((comic, idx) => (
                          <div
                            key={`${comic.url}-${idx}`}
                            className={`${LIQUID_CARD} flex flex-col`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openComicDetail(comic.url, comic.image_url)
                              }
                              className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900 text-left"
                            >
                              <img
                                src={comic.image_url}
                                alt={comic.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                              <span className="absolute left-2.5 top-2.5 rounded-lg border border-white/15 bg-slate-950/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md">
                                {comic.type}
                              </span>
                              {comic.is_colored && (
                                <span className="absolute right-2.5 top-2.5 rounded-lg bg-teal-300/95 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                                  Berwarna
                                </span>
                              )}
                              {comic.is_hot && (
                                <span className="absolute bottom-2 left-2.5 inline-flex items-center gap-1 rounded-md bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                                  <Flame size={10} /> Populer
                                </span>
                              )}
                            </button>

                            <div className="flex flex-1 flex-col justify-between p-3">
                              <button
                                type="button"
                                onClick={() =>
                                  openComicDetail(comic.url, comic.image_url)
                                }
                                className="line-clamp-2 text-left text-xs font-bold leading-snug text-white group-hover:text-teal-200"
                              >
                                {comic.title}
                              </button>

                              <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[11px]">
                                {comic.chapter_url ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChapterReader(comic.chapter_url!)
                                    }
                                    className="font-semibold text-teal-300 hover:underline"
                                  >
                                    {comic.latest_chapter}
                                  </button>
                                ) : (
                                  <span className="text-slate-400">
                                    {comic.latest_chapter}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {comic.update_time}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                  </div>

                  {comicFeed.length > 0 && (
                    <div className="mt-10 text-center">
                      <button
                        type="button"
                        disabled={loadingMoreComics}
                        onClick={() => loadComicPage(comicPage + 1, true)}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-teal-300/35 bg-teal-400/15 px-8 text-xs font-bold text-teal-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-xl transition hover:bg-teal-300 hover:text-slate-950 disabled:opacity-50"
                      >
                        {loadingMoreComics ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            Memuat Komik Berikutnya...
                          </>
                        ) : (
                          <>Muat Lebih Banyak Komik (Halaman {comicPage + 1})</>
                        )}
                      </button>
                    </div>
                  )}
                </section>
              )}

              {/* TAB 4: JADWAL RILIS GANDA (JADWAL ANIME & JADWAL KOMIK) */}
              {activeTab === 'schedule' && (
                <section className="mt-8 space-y-6">
                  <div className={`${LIQUID_PANEL} p-5 sm:p-6`}>
                    <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
                      <div>
                        <h2 className="text-xl font-bold text-white sm:text-2xl">
                          Jadwal Rilis Anime &amp; Update Komik
                        </h2>
                        <p className="mt-1 text-xs text-slate-300/80">
                          Pantau jadwal tayang episode anime baru dan pembaruan
                          chapter komik setiap harinya
                        </p>
                      </div>

                      {/* Switcher Jadwal Anime vs Jadwal Komik */}
                      <div className="inline-flex self-start rounded-2xl border border-white/15 bg-slate-950/60 p-1 sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setScheduleType('anime')}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                            scheduleType === 'anime'
                              ? 'bg-gradient-to-r from-teal-300 to-cyan-300 text-slate-950 shadow'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <Film size={14} />
                          Jadwal Anime
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleType('komik')}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                            scheduleType === 'komik'
                              ? 'bg-gradient-to-r from-teal-300 to-cyan-300 text-slate-950 shadow'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          <BookOpen size={14} />
                          Jadwal Komik
                        </button>
                      </div>
                    </div>

                    {/* Pilihan Hari Senin - Minggu */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {DAYS_INDO.map((day) => {
                        const active = selectedDay === day;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                              active
                                ? 'border border-teal-300/50 bg-teal-400/20 font-bold text-teal-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                                : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {loadingSchedule ? (
                    <div className="py-20 text-center">
                      <Loader2
                        size={28}
                        className="mx-auto animate-spin text-teal-300"
                      />
                      <p className="mt-3 text-xs text-slate-400">
                        Menyusun jadwal rilis mingguan...
                      </p>
                    </div>
                  ) : scheduleType === 'anime' ? (
                    /* Daftar Jadwal Anime */
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                      {activeDayAnimeList.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            openAnimeEpisode(item.url, item.thumb || '')
                          }
                          className={`${LIQUID_CARD} flex items-center justify-between gap-3 p-4 text-left`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="inline-block rounded-md bg-teal-400/15 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                              Anime · Setiap {selectedDay}
                            </span>
                            <h3 className="mt-1.5 line-clamp-1 text-sm font-bold text-white group-hover:text-teal-200">
                              {item.title}
                            </h3>
                          </div>
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-teal-300 group-hover:bg-teal-300 group-hover:text-slate-950">
                            <Play size={14} fill="currentColor" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* Daftar Jadwal Rilis Komik */
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {activeDayComicList.map((comic, idx) => (
                        <div
                          key={idx}
                          className={`${LIQUID_CARD} flex flex-col`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openComicDetail(comic.url, comic.image_url || '')
                            }
                            className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900 text-left"
                          >
                            {comic.image_url && (
                              <img
                                src={comic.image_url}
                                alt={comic.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            )}
                            <span className="absolute left-2.5 top-2.5 rounded-lg bg-teal-300 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                              {comic.type || 'Komik'}
                            </span>
                            <span className="absolute bottom-2 right-2 rounded-lg border border-white/15 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-teal-200 backdrop-blur-md">
                              {selectedDay}
                            </span>
                          </button>

                          <div className="flex flex-1 flex-col justify-between p-3">
                            <button
                              type="button"
                              onClick={() =>
                                openComicDetail(
                                  comic.url,
                                  comic.image_url || ''
                                )
                              }
                              className="line-clamp-2 text-left text-xs font-bold leading-snug text-white group-hover:text-teal-200"
                            >
                              {comic.title}
                            </button>

                            {comic.latest_chapter && (
                              <div className="mt-2 border-t border-white/10 pt-2 text-[11px] font-semibold text-teal-300">
                                {comic.latest_chapter}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* TAB 5: RIWAYAT TONTON & BACA */}
              {activeTab === 'history' && (
                <section className="mt-8 space-y-6">
                  <div
                    className={`${LIQUID_PANEL} flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}
                  >
                    <div>
                      <h2 className="text-xl font-bold text-white sm:text-2xl">
                        Riwayat Tontonan &amp; Bacaan
                      </h2>
                      <p className="mt-1 text-xs text-slate-300/80">
                        Tersimpan otomatis di perangkatmu ({history.length}{' '}
                        aktivitas)
                      </p>
                    </div>
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllHistory}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25"
                      >
                        <Trash2 size={14} />
                        Bersihkan Riwayat
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className={`${LIQUID_PANEL} p-12 text-center`}>
                      <Clock
                        size={28}
                        className="mx-auto text-teal-300/60"
                      />
                      <p className="mt-3 text-sm font-semibold text-white">
                        Belum ada riwayat aktivitas
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Mulai tonton episode anime atau baca chapter komik untuk
                        menyimpan jejak terakhirmu secara otomatis.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (item.kind === 'anime')
                              openAnimeEpisode(item.targetUrl, item.thumb);
                            else openChapterReader(item.targetUrl);
                          }}
                          className={`${LIQUID_CARD} flex cursor-pointer items-center gap-4 p-4`}
                        >
                          {item.thumb && (
                            <img
                              src={item.thumb}
                              alt={item.title}
                              className="h-24 w-16 shrink-0 rounded-xl object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="rounded-md bg-teal-400/15 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                                {item.kind === 'anime'
                                  ? 'Anime Sub Indo'
                                  : 'Bacaan Komik'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => removeHistoryItem(item.id, e)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <h3 className="mt-1.5 line-clamp-1 text-sm font-bold text-white group-hover:text-teal-200">
                              {item.title}
                            </h3>
                            <p className="mt-0.5 truncate text-xs text-slate-300">
                              {item.subLabel}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {formatTimeAgo(item.updatedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
      </main>

      {/* Bottom Bar Liquid Glass */}
      <nav
        aria-label="Navigasi Utama AniWanTV"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.15] bg-[#070d15]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-5 px-2 py-1.5 sm:px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id)}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2 transition ${
                  active
                    ? 'bg-white/[0.09] text-teal-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
                  {item.badge !== undefined && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal-300 px-1 text-[9px] font-bold text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}