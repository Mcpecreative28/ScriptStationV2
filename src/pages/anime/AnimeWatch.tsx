import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import {
  AnimeBottomBar,
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
    <div className="min-h-[100dvh] bg-[#070709] pb-24 text-zinc-100">
      <Navbar />

      <main
        className={`mx-auto px-4 pt-20 sm:px-6 sm:pt-24 ${
          theaterMode ? 'max-w-[1600px]' : 'max-w-[1440px]'
        }`}
      >
        {/* Top Broadcast Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-3">
          <div className="flex items-center gap-4">
            <Link
              to={`/anime/${encodeURIComponent(streamData?.slug || slug || '')}`}
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-zinc-400 hover:text-[#ff5522]"
            >
              <ArrowLeft size={14} /> DOSSIER
            </Link>
            <span className="text-zinc-700">/</span>
            <h1 className="truncate text-sm font-black uppercase tracking-tight text-white sm:text-lg">
              {streamData?.title || slug}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheaterMode((v) => !v)}
              className="inline-flex h-8 items-center gap-1.5 border border-white/15 bg-[#0b0b0f] px-3 font-mono text-[11px] font-bold uppercase text-zinc-300 hover:border-white/40 hover:text-white"
            >
              {theaterMode ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {theaterMode ? 'NORMAL VIEW' : 'WIDE MONITOR'}
            </button>
            <span className="inline-flex h-8 items-center bg-[#ff5522] px-3 font-mono text-xs font-black text-black">
              EP {String(currentEp).padStart(2, '0')}
              {totalEpisodes ? ` / ${totalEpisodes}` : ''}
            </span>
          </div>
        </div>

        {/* Main Monitor + Episode Matrix */}
        <div
          className={`mt-5 grid grid-cols-1 gap-6 ${
            theaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'
          }`}
        >
          <div className={theaterMode ? 'col-span-1' : 'lg:col-span-9'}>
            <div className="border border-white/15 bg-black">
              <div className="relative aspect-video w-full bg-black">
                {loading ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2">
                    <Loader2 size={28} className="animate-spin text-[#ff5522]" />
                    <p className="font-mono text-xs text-zinc-500">
                      CONNECTING TO SERVER 0{server}...
                    </p>
                  </div>
                ) : error ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <p className="font-mono text-xs text-red-400">{error}</p>
                    <button
                      type="button"
                      onClick={() => setServer('2')}
                      className="inline-flex h-9 items-center gap-2 bg-[#ff5522] px-4 font-mono text-xs font-bold uppercase text-black"
                    >
                      <RotateCcw size={13} /> RELOAD SERVER 02
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
                  <div className="grid h-full place-items-center font-mono text-xs text-zinc-500">
                    STREAM UNAVAILABLE
                  </div>
                )}
              </div>

              {/* Matrix Control Deck */}
              <div className="border-t border-white/15 bg-[#0b0b0f]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] tracking-widest text-zinc-500">
                      NODE:
                    </span>
                    {[
                      { id: '2', label: 'SRV-02 (PRIMARY)' },
                      { id: '1', label: 'SRV-01' },
                      { id: '3', label: 'SRV-03' },
                    ].map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => setServer(srv.id)}
                        className={`h-8 px-3 font-mono text-xs font-bold transition ${
                          String(server) === srv.id
                            ? 'bg-[#ff5522] text-black'
                            : 'border border-white/10 bg-[#070709] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {srv.label}
                      </button>
                    ))}

                    <span className="ml-2 font-mono text-[10px] tracking-widest text-zinc-500">
                      TRACK:
                    </span>
                    {availableAudios.map((aud) => (
                      <button
                        key={aud}
                        type="button"
                        onClick={() =>
                          setAudio(
                            String(aud).toLowerCase() === 'dub' ? 'dub' : 'sub'
                          )
                        }
                        className={`h-8 px-3 font-mono text-xs font-bold uppercase transition ${
                          audio === String(aud).toLowerCase()
                            ? 'border border-[#ff5522] bg-[#ff5522]/15 text-[#ff5522]'
                            : 'border border-white/10 bg-[#070709] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {aud}
                      </button>
                    ))}
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
                      className="inline-flex h-8 items-center gap-1 border border-white/15 bg-[#070709] px-3 font-mono text-xs font-bold text-zinc-200 hover:bg-white hover:text-black disabled:opacity-35"
                    >
                      <ChevronLeft size={13} /> PREV
                    </button>

                    <button
                      type="button"
                      disabled={!hasNext}
                      onClick={() =>
                        navigate(
                          `/anime/watch/${encodeURIComponent(streamData?.slug || slug || '')}/${currentEp + 1}`
                        )
                      }
                      className="inline-flex h-8 items-center gap-1 bg-white px-3 font-mono text-xs font-bold text-black hover:bg-zinc-200 disabled:opacity-35"
                    >
                      NEXT <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {streamData?.stream_url && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <span className="font-mono text-[11px] text-zinc-500">
                      DIRECT STREAM FALLBACK (SERVER 02):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openPopupPlayer}
                        className="inline-flex h-7 items-center gap-1.5 bg-[#ff5522] px-3 font-mono text-[11px] font-bold uppercase text-black"
                      >
                        <Play size={11} fill="currentColor" />
                        POP-UP MONITOR
                      </button>
                      <a
                        href={streamData.stream_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 items-center gap-1 border border-white/15 px-3 font-mono text-[11px] font-bold uppercase text-zinc-300 hover:text-white"
                      >
                        EXTERNAL TAB
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Episode Matrix Sidebar */}
          <div className={theaterMode ? 'col-span-1' : 'lg:col-span-3'}>
            <div className="flex h-full max-h-[540px] flex-col border border-white/15 bg-[#0b0b0f]">
              <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
                <span className="font-mono text-xs font-bold uppercase text-white">
                  EPISODE MATRIX
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {watchedEpisodes.length}/{totalEpisodes || '?'} LOGGED
                </span>
              </div>

              <div className="grid flex-1 grid-cols-4 border-l border-white/10 overflow-y-auto sm:grid-cols-6 lg:grid-cols-4">
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
                        className={`flex h-10 items-center justify-center gap-1 border-b border-r border-white/10 font-mono text-xs font-bold transition ${
                          isCurrent
                            ? 'bg-[#ff5522] text-black'
                            : isWatched
                              ? 'bg-white/[0.03] text-zinc-500 hover:text-white'
                              : 'bg-[#0b0b0f] text-zinc-300 hover:bg-white/[0.05] hover:text-[#ff5522]'
                        }`}
                      >
                        <span>{String(num).padStart(2, '0')}</span>
                        {isWatched && !isCurrent && (
                          <Check size={10} className="text-[#ff5522]" />
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

      <AnimeBottomBar activeTab="watch" />
    </div>
  );
}