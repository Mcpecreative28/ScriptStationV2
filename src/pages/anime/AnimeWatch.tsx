import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Play,
  RotateCcw,
  Server,
  Volume2,
} from 'lucide-react';
import Shell from '../../components/Shell';

export default function AnimeWatch() {
  const { slug, episode } = useParams();
  const navigate = useNavigate();

  const currentEp = parseInt(episode || '1', 10);
  const [server, setServer] = useState('2');
  const [audio, setAudio] = useState<'sub' | 'dub'>('sub');

  const [streamData, setStreamData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStream() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/anime/stream?slug=${encodeURIComponent(slug || '')}&episode=${currentEp}&server=${server}&audio=${audio}`
        );

        const result = await response.json();

        if (!response.ok || !result.status) {
          throw new Error(result.error || 'Gagal memuat player video.');
        }

        setStreamData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kendala streaming.');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadStream();
    }
  }, [slug, currentEp, server, audio]);

  const totalEpisodes = streamData?.total_episodes || streamData?.episodes_list?.length || 0;
  const hasPrev = currentEp > 1;
  const hasNext = totalEpisodes === 0 || currentEp < totalEpisodes;

  return (
    <Shell>
      <main className="min-h-[100dvh] bg-[#07070a] px-4 pb-24 pt-24 text-white sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          {/* Navigasi Balik */}
          <div className="flex items-center justify-between">
            <Link
              to={`/anime/${encodeURIComponent(slug || '')}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[0.08]"
            >
              <ArrowLeft size={14} /> Kembali ke Info Anime
            </Link>

            <span className="font-mono text-xs text-zinc-400">
              Episode {currentEp}
            </span>
          </div>

          <h1 className="mt-4 text-xl font-black tracking-tight sm:text-2xl">
            {streamData?.title || slug}
          </h1>

          {/* Kotak Video Player */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <div className="relative aspect-video w-full bg-black">
              {loading ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                  <Loader2 size={32} className="animate-spin text-violet-400" />
                  <p className="text-xs text-zinc-400">Menghubungkan stream server...</p>
                </div>
              ) : error ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                  <button
                    onClick={() => setServer((prev) => (prev === '2' ? '1' : '2'))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/10"
                  >
                    <RotateCcw size={13} /> Coba Server Lain
                  </button>
                </div>
              ) : streamData?.stream_url ? (
                <iframe
                  src={streamData.stream_url}
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

            {/* Kontrol Bar Streaming (Server, Audio, Navigasi Episode) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] bg-[#0c0c11] p-3.5 sm:px-5">
              <div className="flex flex-wrap items-center gap-4">
                {/* Pilihan Server */}
                <div className="flex items-center gap-1.5">
                  <Server size={14} className="text-zinc-500" />
                  <span className="text-[11px] text-zinc-400">Server:</span>
                  {['1', '2', '3'].map((srv) => (
                    <button
                      key={srv}
                      onClick={() => setServer(srv)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        server === srv
                          ? 'bg-violet-500 text-white'
                          : 'border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {srv}
                    </button>
                  ))}
                </div>

                {/* Pilihan Audio Sub/Dub */}
                <div className="flex items-center gap-1.5">
                  <Volume2 size={14} className="text-zinc-500" />
                  <span className="text-[11px] text-zinc-400">Audio:</span>
                  {(['sub', 'dub'] as const).map((aud) => (
                    <button
                      key={aud}
                      onClick={() => setAudio(aud)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase transition ${
                        audio === aud
                          ? 'bg-violet-500 text-white'
                          : 'border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white'
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
                  disabled={!hasPrev}
                  onClick={() => navigate(`/anime/watch/${encodeURIComponent(slug || '')}/${currentEp - 1}`)}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <button
                  disabled={!hasNext}
                  onClick={() => navigate(`/anime/watch/${encodeURIComponent(slug || '')}/${currentEp + 1}`)}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Pemilih Episode Cepat di Bawah Player */}
          {streamData?.episodes_list && streamData.episodes_list.length > 0 && (
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <h2 className="text-xs font-bold text-zinc-300 uppercase">
                Pilih Episode
              </h2>
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8 md:grid-cols-12">
                {streamData.episodes_list.map((epItem: any) => {
                  const num = epItem.episode || epItem;
                  const isCurrent = num === currentEp;

                  return (
                    <button
                      key={num}
                      onClick={() =>
                        navigate(`/anime/watch/${encodeURIComponent(slug || '')}/${num}`)
                      }
                      className={`rounded-xl py-2 text-xs font-semibold transition ${
                        isCurrent
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'border border-white/10 bg-white/[0.03] text-zinc-400 hover:border-violet-400/40 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </Shell>
  );
}