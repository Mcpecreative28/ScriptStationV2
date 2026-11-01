import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  Loader2,
  Play,
  Search,
  Star,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import {
  AnimeBottomBar,
  HISTORY_STORAGE_KEY,
  type WatchHistoryItem,
} from './AnimeHome';

function getAnimeHistoryEntry(slug?: string): WatchHistoryItem | null {
  if (!slug) return null;
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return null;
    const list: WatchHistoryItem[] = JSON.parse(raw);
    return list.find((item) => item.slug === slug) || null;
  } catch {
    return null;
  }
}

async function safeFetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const text = await response.text();
  if (!text || text.trim().startsWith('<')) {
    throw new Error(`Endpoint API belum merespons JSON (HTTP ${response.status}).`);
  }
  const result = JSON.parse(text);
  if (!response.ok || result?.status === false) {
    throw new Error(result?.error || 'Gagal mengambil detail anime.');
  }
  return result;
}

const CHUNK_SIZE = 100;

export default function AnimeDetail() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null);
  const [epFilter, setEpFilter] = useState('');
  const [chunkIndex, setChunkIndex] = useState(0);
  const [historyEntry, setHistoryEntry] = useState<WatchHistoryItem | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setHistoryEntry(getAnimeHistoryEntry(slug));
    setChunkIndex(0);

    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await safeFetchJson(
          `/api/anime/detail?slug=${encodeURIComponent(slug || '')}`
        );
        const detail = result.data || result;
        setData(detail);
        if (detail?.slug) {
          setHistoryEntry(getAnimeHistoryEntry(detail.slug));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) load();
  }, [slug]);

  const episodes = Array.isArray(data?.episodes) ? data.episodes : [];
  const totalChunks = Math.ceil(episodes.length / CHUNK_SIZE) || 1;

  const displayedEpisodes = epFilter.trim()
    ? episodes.filter((ep: any, idx: number) =>
        String(ep.episode || ep.number || idx + 1).includes(epFilter.trim())
      )
    : episodes.slice(
        chunkIndex * CHUNK_SIZE,
        (chunkIndex + 1) * CHUNK_SIZE
      );

  const watchedSet = new Set(historyEntry?.watchedEpisodes || []);
  const recommendations = Array.isArray(data?.recommendations)
    ? data.recommendations
    : [];

  return (
    <div className="min-h-[100dvh] bg-[#070709] pb-24 text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-[1440px] px-4 pt-20 sm:px-6 sm:pt-24">
        <div className="border-b border-white/15 pb-3">
          <Link
            to="/anime"
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase text-zinc-400 transition hover:text-[#ff5522]"
          >
            <ArrowLeft size={14} /> KEMBALI KE INDEX
          </Link>
        </div>

        {loading ? (
          <div className="py-32 text-center">
            <Loader2 size={28} className="mx-auto animate-spin text-[#ff5522]" />
            <p className="mt-3 font-mono text-xs text-zinc-500">
              MEMUAT DOSSIER & DAFTAR EPISODE...
            </p>
          </div>
        ) : error || !data ? (
          <div className="mt-6 border border-red-500/30 bg-red-500/10 p-10 text-center">
            <p className="font-mono text-xs text-red-300">
              {error || 'Data anime tidak ditemukan.'}
            </p>
          </div>
        ) : (
          <>
            {/* Dossier Grid Layout */}
            <section className="mt-6 grid grid-cols-1 border border-white/15 bg-[#0b0b0f] lg:grid-cols-12">
              <div className="border-b border-white/10 p-5 sm:p-6 lg:col-span-3 lg:border-b-0 lg:border-r">
                <img
                  src={data.poster || data.image}
                  alt={data.title}
                  className="mx-auto aspect-[3/4] w-48 border border-white/15 object-cover sm:w-full"
                />
              </div>

              <div className="flex flex-col justify-between p-5 sm:p-8 lg:col-span-9">
                <div>
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                    <span className="bg-[#ff5522] px-2 py-0.5 font-bold text-black">
                      {data.format || 'TV'}
                    </span>
                    {data.status && (
                      <span className="border border-white/15 px-2 py-0.5 text-zinc-300">
                        {data.status.toUpperCase()}
                      </span>
                    )}
                    {data.score && (
                      <span className="flex items-center gap-1 border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 font-bold text-amber-300">
                        <Star size={11} fill="currentColor" />
                        {Number(data.score).toFixed(1)}
                      </span>
                    )}
                    {data.year && (
                      <span className="text-zinc-400">YEAR // {data.year}</span>
                    )}
                  </div>

                  <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
                    {data.title}
                  </h1>

                  {data.title_romaji && data.title_romaji !== data.title && (
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      {data.title_romaji}
                    </p>
                  )}

                  {Array.isArray(data.genres) && data.genres.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {data.genres.map((g: string) => (
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

                  <div className="mt-6 border-t border-white/10 pt-4">
                    <span className="font-mono text-[10px] tracking-widest text-zinc-500">
                      SYNOPSIS // OVERVIEW
                    </span>
                    <p className="mt-2 max-w-4xl text-xs leading-relaxed text-zinc-300 sm:text-sm">
                      {data.synopsis ||
                        'Sinopsis belum tersedia untuk judul anime ini.'}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                  <div className="font-mono text-xs text-zinc-400">
                    TOTAL EPISODES:{' '}
                    <strong className="text-white">
                      {episodes.length || data.episodes_total || 0}
                    </strong>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {historyEntry && (
                      <Link
                        to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/${historyEntry.episode}`}
                        className="inline-flex h-11 items-center gap-2 bg-[#ff5522] px-6 font-mono text-xs font-black uppercase text-black transition hover:bg-[#ff6b3d]"
                      >
                        <Clock size={14} />
                        LANJUT EPISODE {historyEntry.episode}
                      </Link>
                    )}

                    {episodes.length > 0 && (
                      <Link
                        to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/1`}
                        className={`inline-flex h-11 items-center gap-2 px-6 font-mono text-xs font-bold uppercase transition ${
                          historyEntry
                            ? 'border border-white/20 text-white hover:bg-white hover:text-black'
                            : 'bg-[#ff5522] font-black text-black hover:bg-[#ff6b3d]'
                        }`}
                      >
                        <Play size={14} fill="currentColor" />
                        MULAI EPISODE 01
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Matriks Daftar Episode */}
            <section className="mt-8 border border-white/15 bg-[#0b0b0f]">
              <div className="flex flex-col justify-between gap-3 border-b border-white/15 p-4 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h2 className="text-base font-black uppercase tracking-tight text-white">
                    Indeks Episode ({episodes.length})
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {totalChunks > 1 && !epFilter.trim() && (
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: totalChunks }).map((_, idx) => {
                        const startEp = idx * CHUNK_SIZE + 1;
                        const endEp = Math.min(
                          (idx + 1) * CHUNK_SIZE,
                          episodes.length
                        );
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setChunkIndex(idx)}
                            className={`px-2.5 py-1.5 font-mono text-[11px] font-bold transition ${
                              chunkIndex === idx
                                ? 'bg-[#ff5522] text-black'
                                : 'border border-white/10 bg-[#070709] text-zinc-400 hover:text-white'
                            }`}
                          >
                            {startEp}–{endEp}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {episodes.length > 12 && (
                    <div className="relative w-44">
                      <Search
                        size={13}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      />
                      <input
                        type="text"
                        value={epFilter}
                        onChange={(e) => setEpFilter(e.target.value)}
                        placeholder="Cari nomor ep..."
                        className="h-8 w-full border border-white/15 bg-[#070709] pl-8 pr-3 font-mono text-xs text-white outline-none focus:border-[#ff5522]"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 border-l border-t border-white/10 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-12">
                {displayedEpisodes.map((ep: any, index: number) => {
                  const number = Number(ep.episode || ep.number || index + 1);
                  const isWatched = watchedSet.has(number);
                  const isLast = historyEntry?.episode === number;

                  return (
                    <Link
                      key={number}
                      to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/${number}`}
                      title={ep.title || `Episode ${number}`}
                      className={`flex h-11 items-center justify-center gap-1 border-b border-r border-white/10 font-mono text-xs font-bold transition ${
                        isLast
                          ? 'bg-[#ff5522] text-black'
                          : isWatched
                            ? 'bg-white/[0.03] text-zinc-500 hover:text-white'
                            : 'bg-[#0b0b0f] text-zinc-200 hover:bg-white/[0.06] hover:text-[#ff5522]'
                      }`}
                    >
                      <span>{String(number).padStart(2, '0')}</span>
                      {isWatched && !isLast && (
                        <Check size={11} className="text-[#ff5522]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Rekomendasi Terkait */}
            {recommendations.length > 0 && (
              <section className="mt-10">
                <div className="border-b border-white/15 pb-3">
                  <h2 className="text-base font-black uppercase tracking-tight text-white">
                    Rekomendasi Serupa
                  </h2>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                  {recommendations.map((rec: any) => (
                    <Link
                      key={rec.slug}
                      to={`/anime/${encodeURIComponent(rec.slug)}`}
                      className="group flex flex-col"
                    >
                      <div className="aspect-[3/4] overflow-hidden border border-white/10 bg-black">
                        <img
                          src={rec.poster || rec.image}
                          alt={rec.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                        />
                      </div>
                      <h3 className="mt-2 line-clamp-1 text-xs font-bold text-zinc-200 group-hover:text-[#ff5522]">
                        {rec.title}
                      </h3>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <AnimeBottomBar activeTab="detail" />
    </div>
  );
}