import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Play,
  Search,
  Star,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import {
  AnimeSubBar,
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
    <div className="min-h-[100dvh] bg-[#08090c] text-zinc-100">
      <Navbar />

      <div className="pt-[68px] sm:pt-[76px]">
        <AnimeSubBar activeTab="detail" />

        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6">
          {loading ? (
            <div className="py-32 text-center">
              <Loader2 size={28} className="mx-auto animate-spin text-emerald-400" />
              <p className="mt-3 text-xs text-zinc-500">
                Memuat metadata & daftar episode...
              </p>
            </div>
          ) : error || !data ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-10 text-center">
              <p className="text-sm text-red-300">
                {error || 'Anime tidak ditemukan.'}
              </p>
              <Link
                to="/anime/search"
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-white/10 px-4 text-xs font-semibold text-white"
              >
                Kembali ke Katalog
              </Link>
            </div>
          ) : (
            <>
              {/* Hero Info Panel */}
              <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-5 sm:p-8">
                {data.banner && (
                  <div className="pointer-events-none absolute inset-0">
                    <img
                      src={data.banner}
                      alt=""
                      className="h-full w-full object-cover opacity-15 blur-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f14] via-[#0d0f14]/90 to-[#0d0f14]/70" />
                  </div>
                )}

                <div className="relative grid gap-6 sm:grid-cols-[210px_1fr]">
                  <div className="mx-auto w-44 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 sm:mx-0 sm:w-full">
                    <img
                      src={data.poster || data.image}
                      alt={data.title}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="rounded-md border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 font-bold text-emerald-300">
                          {data.format || 'TV'}
                        </span>
                        {data.status && (
                          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-zinc-300">
                            {data.status}
                          </span>
                        )}
                        {data.score && (
                          <span className="flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-0.5 font-bold text-amber-300">
                            <Star size={11} fill="currentColor" />
                            {Number(data.score).toFixed(1)}
                          </span>
                        )}
                      </div>

                      <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-4xl">
                        {data.title}
                      </h1>

                      {data.title_romaji && data.title_romaji !== data.title && (
                        <p className="mt-1 text-xs text-zinc-400">
                          {data.title_romaji}
                        </p>
                      )}

                      {Array.isArray(data.genres) && data.genres.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-1.5">
                          {data.genres.map((g: string) => (
                            <Link
                              key={g}
                              to={`/anime/search?genre=${encodeURIComponent(g)}`}
                              className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
                            >
                              {g}
                            </Link>
                          ))}
                        </div>
                      )}

                      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-zinc-400 sm:text-sm">
                        {data.synopsis ||
                          'Sinopsis belum tersedia untuk judul anime ini.'}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
                      <div className="flex flex-wrap gap-4 font-mono text-xs text-zinc-400">
                        {data.year && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={13} className="text-emerald-400" />
                            {data.year}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Layers size={13} className="text-emerald-400" />
                          {episodes.length || data.episodes_total || 0} Episode
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {historyEntry && (
                          <Link
                            to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/${historyEntry.episode}`}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-bold text-zinc-950 transition hover:bg-emerald-300"
                          >
                            <Clock size={14} />
                            Lanjut Episode {historyEntry.episode}
                          </Link>
                        )}

                        {episodes.length > 0 && (
                          <Link
                            to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/1`}
                            className={`inline-flex h-10 items-center gap-2 rounded-xl px-5 text-xs font-bold transition ${
                              historyEntry
                                ? 'border border-white/15 bg-white/[0.05] text-white hover:bg-white/[0.1]'
                                : 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300'
                            }`}
                          >
                            <Play size={14} fill="currentColor" />
                            Tonton Episode 1
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Panel Daftar Episode + Pemilih Rentang 1-100 */}
              <section className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-base font-bold text-white sm:text-lg">
                      Daftar Episode ({episodes.length})
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Pilih nomor episode untuk mulai memutar stream
                    </p>
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
                              className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold transition ${
                                chunkIndex === idx
                                  ? 'bg-emerald-400 text-zinc-950'
                                  : 'border border-white/[0.08] bg-[#08090c] text-zinc-400 hover:text-white'
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
                          placeholder="Loncat ke ep..."
                          className="h-9 w-full rounded-xl border border-white/[0.08] bg-[#08090c] pl-8 pr-3 font-mono text-xs text-white outline-none focus:border-emerald-400/50"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
                  {displayedEpisodes.map((ep: any, index: number) => {
                    const number = Number(ep.episode || ep.number || index + 1);
                    const isWatched = watchedSet.has(number);
                    const isLast = historyEntry?.episode === number;

                    return (
                      <Link
                        key={number}
                        to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/${number}`}
                        title={ep.title || `Episode ${number}`}
                        className={`flex items-center justify-center gap-1 rounded-xl border py-2.5 font-mono text-xs font-bold transition ${
                          isLast
                            ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                            : isWatched
                              ? 'border-white/10 bg-white/[0.02] text-zinc-500 hover:border-emerald-400/40 hover:text-white'
                              : 'border-white/[0.07] bg-[#08090c] text-zinc-200 hover:border-emerald-400/40 hover:text-emerald-300'
                        }`}
                      >
                        <span>{number}</span>
                        {isWatched && (
                          <CheckCircle2 size={11} className="text-emerald-400" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>

              {/* Rekomendasi Serupa */}
              {recommendations.length > 0 && (
                <section className="mt-10">
                  <h2 className="mb-4 text-base font-bold text-white sm:text-lg">
                    Judul Terkait & Serupa
                  </h2>
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
                    {recommendations.map((rec: any) => (
                      <Link
                        key={rec.slug}
                        to={`/anime/${encodeURIComponent(rec.slug)}`}
                        className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d0f14] transition hover:border-emerald-400/40"
                      >
                        <div className="aspect-[3/4] overflow-hidden bg-zinc-900">
                          <img
                            src={rec.poster || rec.image}
                            alt={rec.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-2.5">
                          <h3 className="line-clamp-1 text-[11px] font-semibold text-zinc-200 group-hover:text-emerald-300">
                            {rec.title}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}