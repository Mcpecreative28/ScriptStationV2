import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Film,
  Layers,
  Loader2,
  Play,
  RotateCcw,
  Search,
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

function saveAniWanHistory(entry: Omit<AniWanHistoryItem, 'updatedAt'>): AniWanHistoryItem[] {
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
  if (diffSec < 60) return 'BARU SAJA';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}M LALU`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}J LALU`;
  return `${Math.floor(diffHour / 24)}H LALU`;
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
    throw new Error(`Endpoint /api/aniwan belum merespons JSON (HTTP ${res.status}).`);
  }
  const json = JSON.parse(text);
  if (!res.ok || json?.status === false) {
    throw new Error(json?.error || `Gagal memuat data AniWanTV (HTTP ${res.status}).`);
  }
  return json;
}

export default function AniWan() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'anime' | 'komik' | 'history'
  >('dashboard');

  // Data Feed
  const [animeFeed, setAnimeFeed] = useState<AniWanAnimeItem[]>([]);
  const [comicFeed, setComicFeed] = useState<AniWanComicItem[]>([]);
  const [comicPage, setComicPage] = useState(1);

  // Pencarian
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [searchAnimeRes, setSearchAnimeRes] = useState<AniWanAnimeItem[]>([]);
  const [searchComicRes, setSearchComicRes] = useState<AniWanComicItem[]>([]);

  // Active Views (Sub Indo Video Player / Comic Detail / Chapter Reader)
  const [activeEpisode, setActiveEpisode] = useState<any | null>(null);
  const [activeComic, setActiveComic] = useState<any | null>(null);
  const [activeChapter, setActiveChapter] = useState<any | null>(null);

  // Loading & Error
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
      if (Array.isArray(res?.data?.ongoing_anime)) {
        setAnimeFeed(res.data.ongoing_anime);
      }
      if (Array.isArray(res?.data?.latest_comics)) {
        setComicFeed(res.data.latest_comics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat beranda AniWanTV.');
    } finally {
      setLoading(false);
    }
  }

  async function loadFullAnimeFeed() {
    setLoading(true);
    setError('');
    try {
      const res = await fetchAniWanApi('anime');
      if (Array.isArray(res?.data)) {
        setAnimeFeed(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat feed anime.');
    } finally {
      setLoading(false);
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
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar komik.');
    } finally {
      setLoading(false);
      setLoadingMoreComics(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) {
      setActiveSearchQuery('');
      return;
    }

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
      setError(err instanceof Error ? err.message : 'Pencarian gagal.');
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
          title: epData.title || 'Episode Anime Sub Indo',
          subLabel: 'STREAM ANIME SUB INDO',
          thumb: epData.thumb || fallbackThumb,
          targetUrl: url,
        });
        setHistory(nextHist);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka episode anime.');
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
      setError(err instanceof Error ? err.message : 'Gagal memuat detail komik.');
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
          subLabel: res.data.title || 'BACA CHAPTER',
          thumb: activeComic?.image_url || res.data.images?.[0]?.url || '',
          targetUrl: chapterUrl,
          parentUrl: activeComic?.source_url,
        });
        setHistory(nextHist);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat gambar chapter.');
    } finally {
      setLoadingModal(false);
    }
  }

  function switchTab(nextTab: 'dashboard' | 'anime' | 'komik' | 'history') {
    setActiveTab(nextTab);
    setActiveEpisode(null);
    setActiveComic(null);
    setActiveChapter(null);
    setActiveSearchQuery('');

    if (nextTab === 'anime' && animeFeed.length <= 12) {
      loadFullAnimeFeed();
    } else if (nextTab === 'komik' && comicFeed.length <= 12) {
      loadComicPage(1, false);
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

  const bottomTabs = [
    {
      id: 'dashboard' as const,
      code: '01',
      label: 'OVERVIEW',
      sub: 'Feed Utama',
      icon: Layers,
    },
    {
      id: 'anime' as const,
      code: '02',
      label: 'ANIME INDO',
      sub: 'ScriptStation Stream',
      icon: Film,
    },
    {
      id: 'komik' as const,
      code: '03',
      label: 'KOMIK READER',
      sub: 'Manga & Manhwa',
      icon: BookOpen,
    },
    {
      id: 'history' as const,
      code: '04',
      label: 'LOG HISTORI',
      sub: history.length > 0 ? `${history.length} Tersimpan` : 'Riwayat',
      icon: Clock,
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#06080b] pb-24 text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-[1440px] px-4 pt-20 sm:px-6 sm:pt-24">
        {/* Top Terminal Header & Search Bar */}
        <div className="flex flex-col justify-between gap-3 border-b border-white/15 pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="bg-[#00e5ff] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-black">
                ANIWANTV // HUB
              </span>
              <span className="font-mono text-[11px] text-zinc-400">
                SUB INDO STREAMING &amp; MANGA READER
              </span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex w-full sm:w-96">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari Komik / Manhwa / Anime Indo..."
              className="h-10 flex-1 border border-r-0 border-white/15 bg-[#0b0e14] px-3.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-[#00e5ff]"
            />
            {activeSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setActiveSearchQuery('');
                }}
                className="border-y border-white/15 bg-[#0b0e14] px-2.5 text-zinc-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="submit"
              className="flex h-10 items-center gap-1.5 bg-[#00e5ff] px-4 font-mono text-xs font-black uppercase text-black transition hover:brightness-110"
            >
              <Search size={13} />
              CARI
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-5 flex items-center justify-between border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-300">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-1 border border-red-400/40 px-2.5 py-1 text-[11px] font-bold text-white"
            >
              <RotateCcw size={12} /> COBA LAGI
            </button>
          </div>
        )}

        {/* OVERLAY VIEW 1: LOADING MODAL (SAAT BUKA STREAM / CHAPTER) */}
        {loadingModal && (
          <div className="my-12 border border-white/15 bg-[#0a0d12] p-16 text-center">
            <Loader2 size={30} className="mx-auto animate-spin text-[#00e5ff]" />
            <p className="mt-3 font-mono text-xs uppercase text-zinc-400">
              MENGEKSTRAK KONTEN ANIWANTV...
            </p>
          </div>
        )}

        {/* OVERLAY VIEW 2: PEMUTAR VIDEO ANIME SUB INDO + MIRROR DOWNLOAD */}
        {!loadingModal && activeEpisode && (
          <section className="mt-6 border border-[#00e5ff]/60 bg-[#0a0d12]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 p-4 sm:px-6">
              <div>
                <span className="font-mono text-[10px] font-bold text-[#00e5ff]">
                  OTAKUDESU // SUBTITLE INDONESIA STREAM
                </span>
                <h1 className="mt-0.5 text-base font-black uppercase text-white sm:text-xl">
                  {activeEpisode.title}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setActiveEpisode(null)}
                className="inline-flex h-9 items-center gap-1.5 border border-white/20 px-4 font-mono text-xs font-bold uppercase text-white transition hover:bg-white hover:text-black"
              >
                <ArrowLeft size={13} /> TUTUP PLAYER
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="border-b border-white/10 p-4 sm:p-6 lg:col-span-8 lg:border-b-0 lg:border-r">
                <div className="aspect-video w-full border border-white/15 bg-black">
                  {activeEpisode.streamIframe ? (
                    <iframe
                      src={activeEpisode.streamIframe}
                      title={activeEpisode.title}
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <div className="grid h-full place-items-center p-6 text-center font-mono text-xs text-zinc-500">
                      IFRAME STREAM TIDAK TERSEDIA UNTUK EPISODE INI. SILAKAN
                      GUNAKAN TAUTAN DOWNLOAD MIRROR DI BAWAH.
                    </div>
                  )}
                </div>

                {activeEpisode.synopsis && (
                  <p className="mt-4 text-xs leading-relaxed text-zinc-400">
                    {activeEpisode.synopsis}
                  </p>
                )}

                {Array.isArray(activeEpisode.downloads) &&
                  activeEpisode.downloads.length > 0 && (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#00e5ff]">
                        SERVER DOWNLOAD LANGSUNG (GOFILE / PIXELDRAIN / GDRIVE / MEGA):
                      </span>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {activeEpisode.downloads.map((dl: any, idx: number) => (
                          <a
                            key={idx}
                            href={dl.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 border border-white/15 bg-[#06080b] px-3 py-1.5 font-mono text-[11px] font-bold text-zinc-200 transition hover:border-[#00e5ff] hover:bg-[#00e5ff] hover:text-black"
                          >
                            <Download size={11} />
                            {dl.server}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              {/* Sidebar Daftar Episode Terkait */}
              <div className="flex max-h-[540px] flex-col lg:col-span-4">
                <div className="border-b border-white/15 px-4 py-3 font-mono text-xs font-bold uppercase text-white">
                  DAFTAR EPISODE LAINNYA ({activeEpisode.episodes?.length || 0})
                </div>
                <div className="divide-y divide-white/10 overflow-y-auto">
                  {(activeEpisode.episodes || []).map((ep: any, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        openAnimeEpisode(ep.url, activeEpisode.thumb)
                      }
                      className={`flex w-full items-center justify-between px-4 py-3 text-left font-mono text-xs transition ${
                        ep.url === activeEpisode.source_url
                          ? 'bg-[#00e5ff] font-black text-black'
                          : 'text-zinc-300 hover:bg-white/[0.04] hover:text-[#00e5ff]'
                      }`}
                    >
                      <span className="truncate">{ep.title}</span>
                      <Play size={11} className="ml-2 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* OVERLAY VIEW 3: PEMBACA CHAPTER KOMIK (MANGA READER) */}
        {!loadingModal && activeChapter && (
          <section className="mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-white/15 bg-[#0a0d12] p-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-[#00e5ff]">
                  MANGA READER // {activeChapter.total_pages || 0} HALAMAN
                </span>
                <h1 className="text-base font-black uppercase text-white sm:text-xl">
                  {activeChapter.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeComic && (
                  <button
                    type="button"
                    onClick={() => setActiveChapter(null)}
                    className="inline-flex h-9 items-center gap-1.5 border border-white/20 px-3.5 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black"
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
                  className="inline-flex h-9 items-center gap-1 border border-white/15 px-3 font-mono text-xs text-zinc-400 hover:text-white"
                >
                  <X size={13} /> Tutup Reader
                </button>
              </div>
            </div>

            {/* Navigasi Chapter Atas */}
            <div className="mt-3 flex items-center justify-between border border-white/10 bg-[#0a0d12] px-4 py-2.5">
              <button
                type="button"
                disabled={!activeChapter.navigation?.prev}
                onClick={() =>
                  openChapterReader(activeChapter.navigation.prev)
                }
                className="inline-flex h-8 items-center gap-1 border border-white/15 px-3 font-mono text-xs font-bold uppercase text-white disabled:opacity-30"
              >
                <ChevronLeft size={13} /> PREV CHAPTER
              </button>

              <span className="font-mono text-xs text-zinc-400">
                SCROLL KE BAWAH UNTUK MEMBACA
              </span>

              <button
                type="button"
                disabled={!activeChapter.navigation?.next}
                onClick={() =>
                  openChapterReader(activeChapter.navigation.next)
                }
                className="inline-flex h-8 items-center gap-1 bg-[#00e5ff] px-3 font-mono text-xs font-black uppercase text-black disabled:opacity-30"
              >
                NEXT CHAPTER <ChevronRight size={13} />
              </button>
            </div>

            {/* Kanvas Gambar Komik */}
            <div className="mx-auto mt-4 max-w-3xl border border-white/15 bg-black">
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
            <div className="mt-6 flex justify-center gap-3">
              {activeChapter.navigation?.prev && (
                <button
                  type="button"
                  onClick={() =>
                    openChapterReader(activeChapter.navigation.prev)
                  }
                  className="inline-flex h-11 items-center gap-1.5 border border-white/20 bg-[#0a0d12] px-6 font-mono text-xs font-bold uppercase text-white"
                >
                  <ChevronLeft size={14} /> CHAPTER SEBELUMNYA
                </button>
              )}
              {activeChapter.navigation?.next && (
                <button
                  type="button"
                  onClick={() =>
                    openChapterReader(activeChapter.navigation.next)
                  }
                  className="inline-flex h-11 items-center gap-1.5 bg-[#00e5ff] px-6 font-mono text-xs font-black uppercase text-black"
                >
                  CHAPTER SELANJUTNYA <ChevronRight size={14} />
                </button>
              )}
            </div>
          </section>
        )}

        {/* OVERLAY VIEW 4: DETAIL KOMIK & DAFTAR CHAPTER */}
        {!loadingModal && !activeChapter && activeComic && (
          <section className="mt-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <button
                type="button"
                onClick={() => setActiveComic(null)}
                className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-zinc-300 hover:text-[#00e5ff]"
              >
                <ArrowLeft size={14} /> KEMBALI KE KATALOG KOMIK
              </button>
            </div>

            <div className="grid grid-cols-1 border border-white/15 bg-[#0a0d12] lg:grid-cols-12">
              <div className="border-b border-white/10 p-5 lg:col-span-3 lg:border-b-0 lg:border-r">
                <img
                  src={activeComic.image_url}
                  alt={activeComic.title}
                  className="mx-auto aspect-[3/4] w-44 border border-white/15 object-cover sm:w-full"
                />
              </div>

              <div className="flex flex-col justify-between p-5 sm:p-8 lg:col-span-9">
                <div>
                  <div className="flex flex-wrap gap-2 font-mono text-xs">
                    <span className="bg-[#00e5ff] px-2 py-0.5 font-black uppercase text-black">
                      {activeComic.type || 'MANGA'}
                    </span>
                    <span className="border border-white/15 px-2 py-0.5 text-zinc-300">
                      {activeComic.status}
                    </span>
                    <span className="border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-bold text-amber-300">
                      ★ {activeComic.rating}
                    </span>
                  </div>

                  <h1 className="mt-3 text-2xl font-black uppercase text-white sm:text-4xl">
                    {activeComic.title}
                  </h1>
                  <p className="mt-1 font-mono text-xs text-zinc-400">
                    PENGARANG // {activeComic.author}
                  </p>

                  {Array.isArray(activeComic.genres) &&
                    activeComic.genres.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {activeComic.genres.map((g: string) => (
                          <span
                            key={g}
                            className="border border-white/10 bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] uppercase text-zinc-300"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    )}

                  <p className="mt-5 text-xs leading-relaxed text-zinc-300 sm:text-sm">
                    {activeComic.synopsis || 'Sinopsis komik belum tersedia.'}
                  </p>
                </div>

                {activeComic.chapters?.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        openChapterReader(activeComic.chapters[0].url)
                      }
                      className="inline-flex h-11 items-center gap-2 bg-[#00e5ff] px-6 font-mono text-xs font-black uppercase text-black"
                    >
                      <BookOpen size={14} />
                      BACA CHAPTER TERBARU ({activeComic.chapters[0].title})
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
                        className="inline-flex h-11 items-center gap-2 border border-white/20 px-5 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black"
                      >
                        MULAI CHAPTER AWAL
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Matriks Daftar Chapter */}
            <div className="border border-white/15 bg-[#0a0d12]">
              <div className="border-b border-white/15 px-5 py-3.5 font-mono text-xs font-bold uppercase text-white">
                INDEKS CHAPTER ({activeComic.chapters?.length || 0})
              </div>
              <div className="grid max-h-[520px] grid-cols-1 border-l border-white/10 overflow-y-auto sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {(activeComic.chapters || []).map((ch: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openChapterReader(ch.url)}
                    className="flex items-center justify-between border-b border-r border-white/10 px-4 py-3 text-left font-mono text-xs text-zinc-200 transition hover:bg-[#00e5ff] hover:font-black hover:text-black"
                  >
                    <span className="truncate">{ch.title}</span>
                    <span className="ml-2 shrink-0 text-[10px] opacity-65">
                      {ch.update_time}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* HASIL PENCARIAN ANIWANTV (TAMPIL SAAT USER MENCARI SESUATU) */}
        {!loadingModal &&
          !activeEpisode &&
          !activeComic &&
          !activeChapter &&
          activeSearchQuery && (
            <section className="mt-6 space-y-10">
              <div className="flex items-center justify-between border border-white/15 bg-[#0a0d12] px-5 py-3.5">
                <span className="font-mono text-xs text-zinc-300">
                  HASIL PENCARIAN UNTUK:{' '}
                  <strong className="text-[#00e5ff]">
                    &quot;{activeSearchQuery}&quot;
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSearchQuery('')}
                  className="font-mono text-xs font-bold text-zinc-400 hover:text-white"
                >
                  TUTUP PENCARIAN [X]
                </button>
              </div>

              {loading ? (
                <div className="py-20 text-center">
                  <Loader2
                    size={28}
                    className="mx-auto animate-spin text-[#00e5ff]"
                  />
                </div>
              ) : (
                <>
                  {searchComicRes.length > 0 && (
                    <div>
                      <h2 className="border-b border-white/15 pb-3 text-lg font-black uppercase text-white">
                        Hasil Komik &amp; Manhwa ({searchComicRes.length})
                      </h2>
                      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {searchComicRes.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => openComicDetail(c.url, c.image_url)}
                            className="group flex flex-col text-left"
                          >
                            <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/10 bg-black">
                              <img
                                src={c.image_url}
                                alt={c.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                              />
                              <span className="absolute left-0 top-0 bg-[#00e5ff] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-black">
                                {c.type}
                              </span>
                            </div>
                            <h3 className="mt-2 line-clamp-2 text-xs font-bold text-white group-hover:text-[#00e5ff]">
                              {c.title}
                            </h3>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchAnimeRes.length > 0 && (
                    <div>
                      <h2 className="border-b border-white/15 pb-3 text-lg font-black uppercase text-white">
                        Hasil Anime Sub Indo ({searchAnimeRes.length})
                      </h2>
                      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                        {searchAnimeRes.map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => openAnimeEpisode(a.url, a.thumb)}
                            className="group flex flex-col text-left"
                          >
                            <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/10 bg-black">
                              <img
                                src={a.thumb}
                                alt={a.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                              />
                            </div>
                            <h3 className="mt-2 line-clamp-2 text-xs font-bold text-white group-hover:text-[#00e5ff]">
                              {a.title}
                            </h3>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchComicRes.length === 0 &&
                    searchAnimeRes.length === 0 && (
                      <div className="border border-white/10 bg-[#0a0d12] p-12 text-center font-mono text-xs text-zinc-500">
                        TIDAK DITEMUKAN KOMIK ATAU ANIME UNTUK KATA KUNCI TERSEBUT.
                      </div>
                    )}
                </>
              )}
            </section>
          )}

        {/* KONTEN UTAMA BERDASARKAN TAB BAWAH (KETIKA TIDAK ADA OVERLAY AKTIF) */}
        {!loadingModal &&
          !activeEpisode &&
          !activeComic &&
          !activeChapter &&
          !activeSearchQuery && (
            <>
              {/* TAB 01: OVERVIEW DASHBOARD (ANIME SUB INDO + KOMIK TERBARU) */}
              {activeTab === 'dashboard' && (
                <div className="mt-6 space-y-12">
                  {/* Riwayat Terakhir AniWanTV */}
                  {history.length > 0 && (
                    <section>
                      <div className="flex items-baseline justify-between border-b border-white/15 pb-3">
                        <h2 className="text-lg font-black uppercase tracking-tight text-white">
                          Terakhir Dibaca &amp; Ditonton
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('history')}
                          className="font-mono text-xs text-[#00e5ff] hover:underline"
                        >
                          SEMUA LOG ({history.length}) →
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
                        {history.slice(0, 4).map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              if (h.kind === 'anime')
                                openAnimeEpisode(h.targetUrl, h.thumb);
                              else openChapterReader(h.targetUrl);
                            }}
                            className="group flex items-center gap-3.5 border-b border-r border-white/10 bg-[#0a0d12] p-3.5 text-left transition hover:bg-[#10151e]"
                          >
                            {h.thumb && (
                              <img
                                src={h.thumb}
                                alt={h.title}
                                className="h-16 w-12 shrink-0 border border-white/10 object-cover"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="font-mono text-[9px] font-bold uppercase text-[#00e5ff]">
                                {h.kind === 'anime' ? 'ANIME INDO' : 'KOMIK READER'}
                              </span>
                              <h3 className="truncate text-xs font-bold text-white group-hover:text-[#00e5ff]">
                                {h.title}
                              </h3>
                              <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-400">
                                {h.subLabel}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Seksi Anime Ongoing Sub Indo */}
                  <section>
                    <div className="flex items-baseline justify-between border-b border-white/15 pb-3">
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">
                          Anime Ongoing Sub Indo
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchTab('anime')}
                        className="font-mono text-xs font-bold text-[#00e5ff] hover:underline"
                      >
                        LIHAT SEMUA ANIME →
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="aspect-[3/4] animate-pulse bg-white/[0.04]"
                            />
                          ))
                        : animeFeed.slice(0, 12).map((item, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                openAnimeEpisode(item.url, item.thumb)
                              }
                              className="group flex flex-col text-left"
                            >
                              <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/10 bg-[#0a0d12]">
                                <img
                                  src={item.thumb}
                                  alt={item.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                                />
                                <span className="absolute left-0 top-0 bg-[#00e5ff] px-2 py-0.5 font-mono text-[10px] font-black text-black">
                                  SUB INDO
                                </span>
                                <span className="absolute bottom-0 right-0 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                  {item.episode}
                                </span>
                              </div>
                              <h3 className="mt-2 line-clamp-2 text-xs font-bold text-zinc-100 group-hover:text-[#00e5ff]">
                                {item.title}
                              </h3>
                            </button>
                          ))}
                    </div>
                  </section>

                  {/* Seksi Update Komik & Manhwa Terbaru */}
                  <section>
                    <div className="flex items-baseline justify-between border-b border-white/15 pb-3">
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">
                          Komik &amp; Manhwa Terbaru
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => switchTab('komik')}
                        className="font-mono text-xs font-bold text-[#00e5ff] hover:underline"
                      >
                        BUKA KATALOG KOMIK →
                      </button>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {loading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="aspect-[3/4] animate-pulse bg-white/[0.04]"
                            />
                          ))
                        : comicFeed.slice(0, 12).map((comic, idx) => (
                            <div
                              key={idx}
                              className="group flex flex-col border border-white/10 bg-[#0a0d12]"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  openComicDetail(comic.url, comic.image_url)
                                }
                                className="relative aspect-[3/4] w-full overflow-hidden bg-black text-left"
                              >
                                <img
                                  src={comic.image_url}
                                  alt={comic.title}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                                />
                                <span className="absolute left-0 top-0 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                                  {comic.type}
                                </span>
                                {comic.is_colored && (
                                  <span className="absolute right-0 top-0 bg-[#00e5ff] px-2 py-0.5 font-mono text-[10px] font-black text-black">
                                    WARNA
                                  </span>
                                )}
                              </button>

                              <div className="flex flex-1 flex-col justify-between p-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openComicDetail(comic.url, comic.image_url)
                                  }
                                  className="line-clamp-2 text-left text-xs font-bold text-zinc-100 group-hover:text-[#00e5ff]"
                                >
                                  {comic.title}
                                </button>
                                <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[10px]">
                                  {comic.chapter_url ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openChapterReader(comic.chapter_url!)
                                      }
                                      className="font-bold text-[#00e5ff] hover:underline"
                                    >
                                      {comic.latest_chapter}
                                    </button>
                                  ) : (
                                    <span className="text-zinc-400">
                                      {comic.latest_chapter}
                                    </span>
                                  )}
                                  <span className="text-zinc-500">
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

              {/* TAB 02: ANIME SUB INDO FULL FEED */}
              {activeTab === 'anime' && (
                <section className="mt-6">
                  <div className="border-b border-white/15 pb-3">
                    <h1 className="text-2xl font-black uppercase text-white">
                      Katalog Rilis Anime Sub Indo
                    </h1>
                    <p className="font-mono text-xs text-zinc-400">
                      KLIK JUDUL UNTUK MEMBUKA PLAYER STREAMING &amp; LINK
                      DOWNLOAD
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {loading
                      ? Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-[3/4] animate-pulse bg-white/[0.04]"
                          />
                        ))
                      : animeFeed.map((item, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              openAnimeEpisode(item.url, item.thumb)
                            }
                            className="group flex flex-col text-left"
                          >
                            <div className="relative aspect-[3/4] w-full overflow-hidden border border-white/10 bg-[#0a0d12]">
                              <img
                                src={item.thumb}
                                alt={item.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                              />
                              <span className="absolute left-0 top-0 bg-[#00e5ff] px-2 py-0.5 font-mono text-[10px] font-black text-black">
                                SUB INDO
                              </span>
                              <span className="absolute bottom-0 right-0 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                {item.episode}
                              </span>
                            </div>
                            <h3 className="mt-2 line-clamp-2 text-xs font-bold text-zinc-100 group-hover:text-[#00e5ff]">
                              {item.title}
                            </h3>
                          </button>
                        ))}
                  </div>
                </section>
              )}

              {/* TAB 03: KOMIK & MANHWA READER FULL FEED + SHOW MORE */}
              {activeTab === 'komik' && (
                <section className="mt-6">
                  <div className="border-b border-white/15 pb-3">
                    <h1 className="text-2xl font-black uppercase text-white">
                      Direktori Komik, Manhwa &amp; Manhua
                    </h1>
                    <p className="font-mono text-xs text-zinc-400">
                      KLIK COVER UNTUK DAFTAR CHAPTER ATAU KLIK NOMOR CHAPTER
                      UNTUK LANGSUNG BACA
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {loading
                      ? Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-[3/4] animate-pulse bg-white/[0.04]"
                          />
                        ))
                      : comicFeed.map((comic, idx) => (
                          <div
                            key={`${comic.url}-${idx}`}
                            className="group flex flex-col border border-white/10 bg-[#0a0d12]"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openComicDetail(comic.url, comic.image_url)
                              }
                              className="relative aspect-[3/4] w-full overflow-hidden bg-black text-left"
                            >
                              <img
                                src={comic.image_url}
                                alt={comic.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                              />
                              <span className="absolute left-0 top-0 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                                {comic.type}
                              </span>
                              {comic.is_colored && (
                                <span className="absolute right-0 top-0 bg-[#00e5ff] px-2 py-0.5 font-mono text-[10px] font-black text-black">
                                  WARNA
                                </span>
                              )}
                            </button>

                            <div className="flex flex-1 flex-col justify-between p-3">
                              <button
                                type="button"
                                onClick={() =>
                                  openComicDetail(comic.url, comic.image_url)
                                }
                                className="line-clamp-2 text-left text-xs font-bold text-zinc-100 group-hover:text-[#00e5ff]"
                              >
                                {comic.title}
                              </button>
                              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[10px]">
                                {comic.chapter_url ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openChapterReader(comic.chapter_url!)
                                    }
                                    className="font-bold text-[#00e5ff] hover:underline"
                                  >
                                    {comic.latest_chapter}
                                  </button>
                                ) : (
                                  <span className="text-zinc-400">
                                    {comic.latest_chapter}
                                  </span>
                                )}
                                <span className="text-zinc-500">
                                  {comic.update_time}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                  </div>

                  <div className="mt-10 border-t border-white/10 pt-6 text-center">
                    <button
                      type="button"
                      disabled={loadingMoreComics}
                      onClick={() => loadComicPage(comicPage + 1, true)}
                      className="inline-flex h-12 min-w-[260px] items-center justify-center gap-2 border border-white/20 bg-[#0a0d12] px-8 font-mono text-xs font-bold uppercase text-white transition hover:border-[#00e5ff] hover:bg-[#00e5ff] hover:text-black disabled:opacity-50"
                    >
                      {loadingMoreComics ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          MEMUAT KOMIK BERIKUTNYA...
                        </>
                      ) : (
                        <>SHOW MORE KOMIK // HALAMAN {comicPage + 1}</>
                      )}
                    </button>
                  </div>
                </section>
              )}

              {/* TAB 04: LOG HISTORI ANIWANTV */}
              {activeTab === 'history' && (
                <section className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border border-white/15 bg-[#0a0d12] p-5">
                    <div>
                      <h1 className="text-xl font-black uppercase text-white">
                        Log Riwayat AniWanTV
                      </h1>
                      <p className="mt-0.5 font-mono text-xs text-zinc-500">
                        RIWAYAT BACA KOMIK &amp; STREAM ANIME SUB INDO (
                        {history.length} ITEM)
                      </p>
                    </div>
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllHistory}
                        className="inline-flex items-center gap-2 border border-red-500/40 bg-red-500/10 px-4 py-2 font-mono text-xs font-bold text-red-300 transition hover:bg-red-500 hover:text-black"
                      >
                        <Trash2 size={13} />
                        HAPUS SEMUA LOG
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className="mt-6 border border-white/10 bg-[#0a0d12] p-12 text-center font-mono text-xs text-zinc-500">
                      BELUM ADA RIWAYAT BACA KOMIK ATAU TONTONAN ANIME SUB INDO.
                    </div>
                  ) : (
                    <div className="mt-6 grid grid-cols-1 border-l border-t border-white/15 sm:grid-cols-2 lg:grid-cols-3">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            if (item.kind === 'anime')
                              openAnimeEpisode(item.targetUrl, item.thumb);
                            else openChapterReader(item.targetUrl);
                          }}
                          className="group flex cursor-pointer items-center gap-4 border-b border-r border-white/15 bg-[#0a0d12] p-4 transition hover:bg-[#10151e]"
                        >
                          {item.thumb && (
                            <img
                              src={item.thumb}
                              alt={item.title}
                              className="h-24 w-16 shrink-0 border border-white/10 object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-mono text-[10px] font-bold uppercase text-[#00e5ff]">
                                {item.kind === 'anime'
                                  ? 'ANIME SUB INDO'
                                  : 'KOMIK READER'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => removeHistoryItem(item.id, e)}
                                className="text-zinc-500 hover:text-white"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <h3 className="mt-1 line-clamp-1 text-sm font-bold text-white group-hover:text-[#00e5ff]">
                              {item.title}
                            </h3>
                            <p className="mt-1 truncate font-mono text-xs text-zinc-300">
                              {item.subLabel}
                            </p>
                            <p className="mt-1 font-mono text-[10px] text-zinc-500">
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

      {/* Bottom Sub-Navbar Khusus AniWanTV (Flush / Menempel di Bawah Layar) */}
      <nav
        aria-label="Navigasi AniWanTV"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/15 bg-[#06080b]"
      >
        <div className="mx-auto grid max-w-[1440px] grid-cols-4 divide-x divide-white/10">
          {bottomTabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTab(t.id)}
                className={`group relative flex h-16 flex-col justify-between px-3 py-2.5 text-left transition sm:h-[68px] sm:px-5 ${
                  active
                    ? 'bg-[#0e131a] text-white'
                    : 'bg-[#06080b] text-zinc-500 hover:bg-[#0a0e14] hover:text-zinc-200'
                }`}
              >
                <span
                  className={`absolute inset-x-0 top-0 h-[2px] transition-opacity ${
                    active ? 'bg-[#00e5ff] opacity-100' : 'opacity-0'
                  }`}
                />

                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-[10px] tracking-widest text-zinc-500">
                    {t.code}
                  </span>
                  <Icon
                    size={14}
                    className={
                      active
                        ? 'text-[#00e5ff]'
                        : 'text-zinc-600 group-hover:text-zinc-300'
                    }
                  />
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-xs font-bold tracking-tight sm:text-sm">
                    {t.label}
                  </span>
                  <span className="hidden truncate font-mono text-[10px] text-zinc-500 md:inline">
                    {t.sub}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}