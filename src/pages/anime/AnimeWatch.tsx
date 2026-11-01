import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Server,
  Volume2,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import {
  AnimeSubBar,
  HISTORY_STORAGE_KEY,
  type WatchHistoryItem,
} from './AnimeHome';

function recordWatchHistory(payload: {
  slug: string;
  title: string;
  poster?: string;
  episode: number;
  totalEpisodes?: number;
  format?: string;
}): number[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const list: WatchHistoryItem[] = raw ? JSON.parse(raw) : [];
    const existing = list.find((item) => item.slug === payload.slug);

    const prevWatched = Array.isArray(existing?.watchedEpisodes)
      ? existing!.watchedEpisodes!
      : [];
    const watchedEpisodes = Array.from(
      new Set([...prevWatched, payload.episode])
    ).sort((a, b) => a - b);

    const updatedItem: WatchHistoryItem = {
      slug: payload.slug,
      title: payload.title,
      poster: payload.poster || existing?.poster,
      episode: payload.episode,
      totalEpisodes: payload.totalEpisodes || existing?.totalEpisodes,
      format: payload.format || existing?.format,
      updatedAt: Date.now(),
      watchedEpisodes,
    };

    const filtered = list.filter((item) => item.slug !== payload.slug);
    const nextList = [updatedItem, ...filtered].slice(0, 24);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextList));
    return watchedEpisodes;
  } catch {
    return [payload.episode];
  }
}

async function safeFetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const text = await response.text();
  if (!text || text.trim().startsWith('<')) {
    throw new Error(
      `Endpoint stream belum merespons JSON (HTTP ${response.status}).`
    );
  }
  const result = JSON.parse(text);
  if (!response.ok || result?.status === false) {
    throw new Error(result?.error || 'Gagal memuat player video.');
  }
  return result;
}

export default function AnimeWatch() {
  const { slug, episode } = useParams();
  const navigate = useNavigate();

  const currentEp = Math.max(1, parseInt(episode || '1', 10));
  const [server, setServer] = useState('2');
  const [audio, setAudio] = useState<'sub' | 'dub'>('sub');
  const [theaterMode, setTheaterMode] = useState(false);

  const [streamData, setStreamData] = useState<any>(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStream() {
      setLoading(true);
      setError('');

      try {
        const result = await safeFetchJson(
          `/api/anime/stream?slug=${encodeURIComponent(slug || '')}&episode=${currentEp}&server=${server}&audio=${audio}`
        );

        const data = result.data;
        setStreamData(data);

        if (data?.slug || slug) {
          const watched = recordWatchHistory({
            slug: data?.slug || slug || '',
            title: data?.title || slug || 'Anime',
            poster: data?.poster,
            episode: currentEp,
            totalEpisodes:
              data?.total_episodes || data?.episodes_list?.length || 0,
            format: data?.format,
          });
          setWatchedEpisodes(watched);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Terjadi kendala streaming.'
        );
      } finally {
        setLoading(false);
      }
    }

    if (slug) loadStream();
  }, [slug, currentEp, server, audio]);

  const totalEpisodes =
    streamData?.total_episodes || streamData?.episodes_list?.length || 0;
  const hasPrev = currentEp > 1;
  const hasNext = totalEpisodes === 0 || currentEp < totalEpisodes;

  const availableAudios: string[] =
    Array.isArray(streamData?.player_options?.audios) &&
    streamData.player_options.audios.length > 0
      ? streamData.player_options.audios
      : ['sub', 'dub'];

  const iframeSrc = streamData?.proxy_embed_url
    ? `${streamData.proxy_embed_url}#${streamData.stream_hash || ''}`
    : streamData?.stream_url || '';

  function openPopupPlayer() {
    if (!streamData?.stream_url) return;
    window.open(
      streamData.stream_url,
      'AnimeKaiPlayer',
      'width=960,height=540,menubar=no,toolbar=no,location=no,status=no'
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#08090c] text-zinc-100">
      <Navbar />

      <div className="pt-[68px] sm:pt-[76px]">
        <AnimeSubBar activeTab="watch" />

        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-5 sm:px-6">
          {/* Header Navigasi Episode */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                to={`/anime/${encodeURIComponent(streamData?.slug || slug || '')}`}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0d0f14] px-3.5 text-xs font-semibold text-zinc-300 transition hover:border-white/20 hover:text-white"
              >
                <ArrowLeft size={14} />
                Detail Anime
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-white sm:text-xl">
                  {streamData?.title || slug}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheaterMode((v) => !v)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0d0f14] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
              >
                {theaterMode ? (
                  <Minimize2 size={13} />
                ) : (
                  <Maximize2 size={13} />
                )}
                {theaterMode ? 'Normal' : 'Layar Lebar'}
              </button>

              <span className="inline-flex h-9 items-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 font-mono text-xs font-bold text-emerald-300">
                EP {currentEp}
                {totalEpisodes ? ` / ${totalEpisodes}` : ''}
              </span>
            </div>
          </div>

          {/* Layout Utama: Video Player + Sidebar Daftar Episode */}
          <div
            className={`mt-4 grid grid-cols-1 gap-5 ${
              theaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'
            }`}
          >
            <div className={theaterMode ? 'col-span-1' : 'lg:col-span-9'}>
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                <div className="relative aspect-video w-full bg-black">
                  {loading ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                      <Loader2
                        size={30}
                        className="animate-spin text-emerald-400"
                      />
                      <p className="font-mono text-xs text-zinc-400">
                        Memuat stream Server {server}...
                      </p>
                    </div>
                  ) : error ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                      <p className="text-sm font-semibold text-red-400">
                        {error}
                      </p>
                      <button
                        type="button"
                        onClick={() => setServer('2')}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-bold text-zinc-950"
                      >
                        <RotateCcw size={13} /> Muat Ulang Server 2
                      </button>
                    </div>
                  ) : iframeSrc ? (
                    <iframe
                      key={iframeSrc}
                      src={iframeSrc}
                      title={`${streamData.title} Episode ${currentEp}`}
                      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-zinc-500">
                      Stream tidak tersedia.
                    </div>
                  )}
                </div>

                {/* Control Deck */}
                <div className="border-t border-white/[0.08] bg-[#0d0f14] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Server size={14} className="text-emerald-400" />
                        <span className="text-xs font-medium text-zinc-400">
                          Server:
                        </span>
                        {[
                          { id: '2', label: 'Server 2 (Utama)' },
                          { id: '1', label: 'Server 1' },
                          { id: '3', label: 'Server 3' },
                        ].map((srv) => (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => setServer(srv.id)}
                            className={`h-8 rounded-lg px-3 text-xs font-bold transition ${
                              String(server) === srv.id
                                ? 'bg-emerald-400 text-zinc-950'
                                : 'border border-white/[0.08] bg-[#08090c] text-zinc-300 hover:text-white'
                            }`}
                          >
                            {srv.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Volume2 size={14} className="text-zinc-400" />
                        {availableAudios.map((aud) => (
                          <button
                            key={aud}
                            type="button"
                            onClick={() =>
                              setAudio(
                                String(aud).toLowerCase() === 'dub'
                                  ? 'dub'
                                  : 'sub'
                              )
                            }
                            className={`h-8 rounded-lg px-2.5 font-mono text-xs font-bold uppercase transition ${
                              audio === String(aud).toLowerCase()
                                ? 'border border-emerald-400/50 bg-emerald-400/15 text-emerald-300'
                                : 'border border-white/[0.08] bg-[#08090c] text-zinc-400 hover:text-white'
                            }`}
                          >
                            {aud}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() =>
                          navigate(
                            `/anime/watch/${encodeURIComponent(streamData?.slug || slug || '')}/${currentEp - 1}`
                          )
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.08] bg-[#08090c] px-3 text-xs font-semibold text-zinc-200 transition hover:border-white/20 disabled:opacity-40"
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>

                      <button
                        type="button"
                        disabled={!hasNext}
                        onClick={() =>
                          navigate(
                            `/anime/watch/${encodeURIComponent(streamData?.slug || slug || '')}/${currentEp + 1}`
                          )
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-3 text-xs font-bold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-40"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {streamData?.stream_url && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                      <span className="text-[11px] text-zinc-500">
                        Jika player terhalang proteksi jaringan browser, buka langsung
                        Server 2:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openPopupPlayer}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-400 px-3 text-xs font-bold text-zinc-950 transition hover:bg-emerald-300"
                        >
                          <Play size={12} fill="currentColor" />
                          Pop-Up Player
                        </button>
                        <a
                          href={streamData.stream_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-[#08090c] px-3 text-xs font-semibold text-zinc-200 hover:border-white/25"
                        >
                          Tab Baru
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Episode */}
            <div className={theaterMode ? 'col-span-1' : 'lg:col-span-3'}>
              <div className="flex h-full max-h-[540px] flex-col rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-4">
                <div className="border-b border-white/[0.07] pb-3">
                  <h2 className="text-sm font-bold text-white">Pilih Episode</h2>
                  <p className="font-mono text-[11px] text-zinc-500">
                    {watchedEpisodes.length} / {totalEpisodes || '?'} ditonton
                  </p>
                </div>

                <div className="mt-3 grid flex-1 grid-cols-4 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-6 lg:grid-cols-4">
                  {(streamData?.episodes_list || []).map(
                    (epItem: any, idx: number) => {
                      const num = Number(epItem.episode || epItem || idx + 1);
                      const isCurrent = num === currentEp;
                      const isWatched = watchedEpisodes.includes(num);

                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() =>
                            navigate(
                              `/anime/watch/${encodeURIComponent(streamData?.slug || slug || '')}/${num}`
                            )
                          }
                          className={`flex items-center justify-center gap-1 rounded-lg border py-2 font-mono text-xs font-bold transition ${
                            isCurrent
                              ? 'border-emerald-400 bg-emerald-400 text-zinc-950'
                              : isWatched
                                ? 'border-white/10 bg-white/[0.02] text-zinc-500 hover:text-white'
                                : 'border-white/[0.07] bg-[#08090c] text-zinc-300 hover:border-emerald-400/40 hover:text-emerald-300'
                          }`}
                        >
                          <span>{num}</span>
                          {isWatched && !isCurrent && (
                            <CheckCircle2
                              size={10}
                              className="text-emerald-400"
                            />
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}