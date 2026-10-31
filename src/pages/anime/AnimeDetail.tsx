import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Play,
  Search,
  Star,
} from 'lucide-react';
import Shell from '../../components/Shell';
import type { WatchHistoryItem } from './AnimeHome';

const HISTORY_STORAGE_KEY = 'ss_v2_anime_history';

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

  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Respons server bukan JSON valid (HTTP ${response.status}).`);
  }

  if (!response.ok || result?.status === false) {
    throw new Error(result?.error || 'Gagal mengambil detail anime.');
  }

  return result;
}

export default function AnimeDetail() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null);
  const [epFilter, setEpFilter] = useState('');
  const [historyEntry, setHistoryEntry] = useState<WatchHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setHistoryEntry(getAnimeHistoryEntry(slug));

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

    if (slug) {
      load();
    }
  }, [slug]);

  if (loading) {
    return (
      <Shell>
        <div className="min-h-[100dvh] bg-[#060609] pt-40 text-center text-white">
          <Loader2 size={30} className="mx-auto animate-spin text-rose-500" />
          <p className="mt-3 text-xs text-zinc-500">Memuat rincian & episode anime...</p>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="min-h-[100dvh] bg-[#060609] p-10 pt-40 text-center">
          <p className="text-sm text-red-400">{error || 'Anime tidak ditemukan.'}</p>
          <Link
            to="/anime"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={14} /> Kembali ke Beranda Anime
          </Link>
        </div>
      </Shell>
    );
  }

  const title = data.title || data.title_english || data.title_romaji || 'Detail Anime';
  const poster = data.poster || data.image || data.images?.poster;
  const banner = data.banner || data.images?.banner || poster;
  const episodes = Array.isArray(data.episodes) ? data.episodes : [];
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];
  const watchedSet = new Set(historyEntry?.watchedEpisodes || []);

  const filteredEpisodes = epFilter.trim()
    ? episodes.filter((ep: any, idx: number) => {
        const num = String(ep.episode || ep.number || idx + 1);
        return num.includes(epFilter.trim());
      })
    : episodes;

  return (
    <Shell>
      <main className="relative min-h-[100dvh] bg-[#060609] px-4 pb-24 pt-24 text-white sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/anime"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={14} /> Beranda Anime
          </Link>

          {/* Kartu Hero Detail */}
          <div className="relative mt-6 overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0c0c12] p-6 shadow-2xl sm:p-8">
            {banner && (
              <div className="pointer-events-none absolute inset-0">
                <img
                  src={banner}
                  alt=""
                  className="h-full w-full object-cover opacity-20 blur-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c12] via-[#0c0c12]/90 to-[#0c0c12]/60" />
              </div>
            )}

            <div className="relative grid gap-7 sm:grid-cols-[220px_1fr]">
              <div className="mx-auto w-48 overflow-hidden rounded-2xl border border-white/15 bg-black/50 shadow-2xl sm:mx-0 sm:w-full">
                {poster ? (
                  <img src={poster} alt={title} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[3/4] place-items-center bg-zinc-900 text-zinc-600">
                    No Image
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-300">
                    {data.format || 'TV'}
                  </span>
                  {data.status && (
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                      {data.status}
                    </span>
                  )}
                  {data.score && (
                    <span className="flex items-center gap-1 rounded-lg bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                      <Star size={11} fill="currentColor" />
                      {Number(data.score).toFixed(1)}
                    </span>
                  )}
                </div>

                <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
                  {title}
                </h1>

                {data.title_romaji && data.title_romaji !== title && (
                  <p className="mt-1 text-xs text-zinc-400">{data.title_romaji}</p>
                )}

                {Array.isArray(data.genres) && data.genres.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {data.genres.map((g: string) => (
                      <Link
                        key={g}
                        to={`/anime/search?genre=${encodeURIComponent(g)}`}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300 transition hover:border-rose-500/40 hover:text-rose-200"
                      >
                        {g}
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-black/40 p-4">
                  <h2 className="text-xs font-bold text-zinc-300">Sinopsis</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                    {data.synopsis || 'Sinopsis belum tersedia untuk judul anime ini.'}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                    {data.year && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-rose-400" /> Tahun: {data.year}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Layers size={14} className="text-rose-400" /> Total Episode:{' '}
                      {episodes.length || data.episodes_total || 'N/A'}
                    </span>
                  </div>

                  {/* Tombol Mulai atau Lanjutkan Menonton */}
                  <div className="flex flex-wrap gap-2.5">
                    {historyEntry ? (
                      <Link
                        to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/${historyEntry.episode}`}
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg transition hover:brightness-110"
                      >
                        <Clock size={15} />
                        Lanjut Episode {historyEntry.episode}
                      </Link>
                    ) : null}

                    {episodes.length > 0 && (
                      <Link
                        to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/1`}
                        className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition ${
                          historyEntry
                            ? 'border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]'
                            : 'bg-gradient-to-r from-rose-500 to-amber-500 text-black shadow-lg hover:brightness-110'
                        }`}
                      >
                        <Play size={15} fill="currentColor" />
                        Mulai Episode 1
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daftar Episode dengan Pencarian Cepat Nomor Episode */}
          <section className="mt-10 rounded-3xl border border-white/[0.08] bg-[#0c0c12] p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Daftar Episode ({episodes.length})
                </h2>
                <p className="text-xs text-zinc-500">
                  Episode dengan tanda centang menandakan sudah pernah kamu putar
                </p>
              </div>

              {episodes.length > 12 && (
                <div className="relative w-full sm:w-56">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    value={epFilter}
                    onChange={(e) => setEpFilter(e.target.value)}
                    placeholder="Cari nomor episode..."
                    className="min-h-[38px] w-full rounded-xl border border-white/10 bg-[#07070b] pl-9 pr-3 text-xs text-white outline-none focus:border-rose-500/60"
                  />
                </div>
              )}
            </div>

            {filteredEpisodes.length === 0 ? (
              <p className="mt-6 text-center text-xs text-zinc-500">
                Episode tidak ditemukan.
              </p>
            ) : (
              <div className="mt-5 grid max-h-[420px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {filteredEpisodes.map((ep: any, index: number) => {
                  const number = Number(ep.episode || ep.number || index + 1);
                  const isWatched = watchedSet.has(number);
                  const isLastWatched = historyEntry?.episode === number;

                  return (
                    <Link
                      key={number}
                      to={`/anime/watch/${encodeURIComponent(data.slug || slug || '')}/${number}`}
                      className={`group relative flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                        isLastWatched
                          ? 'border-rose-500/60 bg-rose-500/20 text-white'
                          : isWatched
                            ? 'border-emerald-500/25 bg-emerald-500/[0.07] text-zinc-300 hover:border-rose-400/50'
                            : 'border-white/[0.08] bg-white/[0.025] text-white hover:border-rose-500/40 hover:bg-rose-500/10'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold group-hover:text-rose-300">
                          Ep {number}
                        </span>
                        {isWatched && (
                          <CheckCircle2 size={12} className="text-emerald-400" />
                        )}
                      </div>
                      {ep.is_filler && (
                        <span className="mt-0.5 text-[9px] font-semibold text-amber-400">
                          Filler
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Rekomendasi Serupa */}
          {recommendations.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-bold text-white">Rekomendasi Serupa</h2>
              <div className="mt-4 grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-8">
                {recommendations.map((rec: any) => (
                  <Link
                    key={rec.slug}
                    to={`/anime/${encodeURIComponent(rec.slug)}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c12] transition hover:-translate-y-1 hover:border-rose-500/40"
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
                      <h3 className="line-clamp-1 text-[11px] font-bold text-white group-hover:text-rose-300">
                        {rec.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </Shell>
  );
}