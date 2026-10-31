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
  Sparkles,
  Volume2,
} from 'lucide-react';
import Shell from '../../components/Shell';
import type { WatchHistoryItem } from './AnimeHome';

const HISTORY_STORAGE_KEY = 'ss_v2_anime_history';

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

  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Respons server bukan JSON valid (HTTP ${response.status}).`);
  }

  if (!response.ok || result?.status === false) {
    throw new Error(result?.error || 'Gagal memuat player video.');
  }

  return result;
}

export default function AnimeWatch() {
  const { slug, episode } = useParams();
  const navigate = useNavigate();

  const currentEp = Math.max(1, parseInt(episode || '1', 10));
  // Kunci default ke Server 2 karena Server 2 adalah server aktif utama di AnimeKai
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

    if (slug) {
      loadStream();
    }
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

  // Gunakan Proxy Embed URL milik kita sendiri (+ #hash) agar tidak terkena blokir X-Frame-Options
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
    <Shell>
      <main className="min-h-[100dvh] bg-[#050508] px-3 pb-24 pt-24 text-white sm:px-6 sm:pt-28">
        <div
          className={`mx-auto transition-all duration-300 ${
            theaterMode ? 'max-w-[1440px]' : 'max-w-6xl'
          }`}
        >
          {/* Navigasi Atas */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={`/anime/${encodeURIComponent(streamData?.slug || slug || '')}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft size={14} /> Detail Anime
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheaterMode((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
              >
                {theaterMode ? (
                  <Minimize2 size={13} />
                ) : (
                  <Maximize2 size={13} />
                )}
                {theaterMode ? 'Mode Normal' : 'Mode Bioskop'}
              </button>

              <span className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-3 py-2 font-mono text-xs font-bold text-rose-300">
                EPISODE {currentEp}
                {totalEpisodes ? ` / ${totalEpisodes}` : ''}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              {streamData?.title || slug}
            </h1>
            {streamData?.episode_info?.title && (
              <p className="mt-0.5 text-xs text-zinc-400">
                Episode {currentEp} — {streamData.episode_info.title}
              </p>
            )}
          </div>

          {/* Layout Utama: Video Player + Sidebar Daftar Episode */}
          <div
            className={`mt-4 grid grid-cols-1 gap-5 ${
              theaterMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'
            }`}
          >
            {/* Kolom Video Player */}
            <div className={theaterMode ? 'col-span-1' : 'lg:col-span-8'}>
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
                <div className="relative aspect-video w-full bg-black">
                  {loading ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                      <Loader2
                        size={34}
                        className="animate-spin text-rose-500"
                      />
                      <p className="text-xs text-zinc-400">
                        Menghubungkan stream Server {server}...
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
                        className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-black transition hover:bg-rose-400"
                      >
                        <RotateCcw size={14} /> Muat Ulang Server 2
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
                      Player tidak dapat dimuat.
                    </div>
                  )}
                </div>

                {/* Kontrol Bar Server, Audio, dan Navigasi Episode */}
                <div className="border-t border-white/[0.08] bg-[#0b0b11] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      {/* Pilihan Server (Utamakan Server 2) */}
                      <div className="flex items-center gap-1.5">
                        <Server size={14} className="text-rose-400" />
                        <span className="text-[11px] font-semibold text-zinc-400">
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
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                              String(server) === srv.id
                                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-black shadow-sm'
                                : 'border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                            }`}
                          >
                            {srv.label}
                          </button>
                        ))}
                      </div>

                      {/* Pilihan Audio (SUB / DUB) */}
                      <div className="flex items-center gap-1.5">
                        <Volume2 size={14} className="text-zinc-400" />
                        <span className="text-[11px] font-medium text-zinc-400">
                          Audio:
                        </span>
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
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold uppercase transition ${
                              audio === String(aud).toLowerCase()
                                ? 'border border-rose-400/50 bg-rose-500/20 text-rose-200'
                                : 'border border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                            }`}
                          >
                            {aud}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tombol Prev / Next Episode */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!hasPrev}
                        onClick={() =>
                          navigate(
                            `/anime/watch/${encodeURIComponent(streamData?.slug || slug || '')}/${currentEp - 1}`
                          )
                        }
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-xl bg-white px-3.5 text-xs font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Baris Tombol Pop-Up Player Langsung (100% Anti-Blokir Browser) */}
                  {streamData?.stream_url && (
                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3.5">
                      <span className="text-[11px] text-zinc-400">
                        Jika browser membatasi embed pihak ketiga, gunakan
                        pemutar langsung Server 2:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openPopupPlayer}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-3.5 py-2 text-xs font-bold text-black shadow transition hover:brightness-110"
                        >
                          <Play size={13} fill="currentColor" />
                          Putar di Jendela Pop-Up
                        </button>

                        <a
                          href={streamData.stream_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/[0.1]"
                        >
                          Buka Langsung
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Daftar Episode */}
            <div className={theaterMode ? 'col-span-1' : 'lg:col-span-4'}>
              <div className="flex h-full max-h-[520px] flex-col rounded-[24px] border border-white/[0.08] bg-[#0c0c12] p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      Daftar Episode
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      {watchedEpisodes.length} dari {totalEpisodes || '?'} episode
                      telah ditonton
                    </p>
                  </div>
                  <Sparkles size={15} className="text-rose-400" />
                </div>

                <div className="mt-3.5 grid flex-1 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 lg:grid-cols-4">
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
                          className={`flex items-center justify-center gap-1 rounded-xl border py-2.5 text-xs font-bold transition ${
                            isCurrent
                              ? 'border-rose-400 bg-gradient-to-r from-rose-500 to-amber-500 text-black shadow-md'
                              : isWatched
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:border-rose-400/40'
                                : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-rose-500/40 hover:text-white'
                          }`}
                        >
                          <span>{num}</span>
                          {isWatched && !isCurrent && (
                            <CheckCircle2
                              size={11}
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
        </div>
      </main>
    </Shell>
  );
}