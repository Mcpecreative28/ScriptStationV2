import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Layers,
  Loader2,
  Play,
  Star,
  Tv,
} from 'lucide-react';
import Shell from '../../components/Shell';

export default function AnimeDetail() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(
          `/api/anime/detail?slug=${encodeURIComponent(slug || '')}`
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal mengambil detail anime.');
        }

        setData(result.data || result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <Shell>
        <div className="min-h-[100dvh] bg-[#07070a] pt-40 text-center text-white">
          <Loader2 className="mx-auto animate-spin text-violet-400" />
          <p className="mt-3 text-xs text-zinc-500">Memuat rincian anime...</p>
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="min-h-[100dvh] bg-[#07070a] p-10 pt-40 text-center text-red-400">
          <p>{error || 'Anime tidak ditemukan.'}</p>
          <Link to="/anime" className="mt-4 inline-block text-xs text-zinc-400 underline">
            Kembali ke katalog
          </Link>
        </div>
      </Shell>
    );
  }

  const title = data.title || data.title_english || data.title_romaji || 'Detail Anime';
  const poster = data.poster || data.image || data.images?.poster;
  const episodes = data.episodes || [];

  return (
    <Shell>
      <main className="relative min-h-[100dvh] bg-[#07070a] px-4 pb-24 pt-24 text-white sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/anime"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={14} /> Beranda Anime
          </Link>

          {/* Info Utama */}
          <div className="mt-6 grid gap-7 sm:grid-cols-[240px_1fr]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-xl">
              {poster ? (
                <img src={poster} alt={title} className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="aspect-[3/4] grid place-items-center bg-zinc-900 text-zinc-600">
                  No Image
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-300">
                  {data.format || 'ANIME'}
                </span>
                {data.status && (
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                    {data.status}
                  </span>
                )}
                {data.score && (
                  <span className="flex items-center gap-1 rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    <Star size={11} fill="currentColor" />
                    {data.score.toFixed(1)}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">
                {title}
              </h1>

              {data.title_romaji && data.title_romaji !== title && (
                <p className="mt-1 text-xs text-zinc-500">{data.title_romaji}</p>
              )}

              {/* Badges Genre */}
              {Array.isArray(data.genres) && data.genres.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {data.genres.map((g: string) => (
                    <span
                      key={g}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-zinc-400"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Sinopsis */}
              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <h3 className="text-xs font-semibold text-zinc-300">Sinopsis</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                  {data.synopsis || 'Sinopsis belum tersedia untuk judul anime ini.'}
                </p>
              </div>

              {/* Metadata Tambahan */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
                {data.year && (
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} /> Tahun: {data.year}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Layers size={13} /> Total Episode: {episodes.length || data.episodes_total || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Daftar Episode */}
          <div className="mt-12 border-t border-white/[0.08] pt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Daftar Episode ({episodes.length})</h2>
              {episodes.length > 0 && (
                <Link
                  to={`/anime/watch/${encodeURIComponent(slug || '')}/1`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400 transition hover:text-violet-300"
                >
                  <Play size={13} /> Tonton Episode 1
                </Link>
              )}
            </div>

            {episodes.length === 0 ? (
              <p className="mt-4 text-xs text-zinc-500">
                Episode belum tersedia atau server sedang menyiapkan data rilis.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {episodes.map((ep: any, index: number) => {
                  const number = ep.episode || ep.number || index + 1;
                  return (
                    <Link
                      key={number}
                      to={`/anime/watch/${encodeURIComponent(slug || '')}/${number}`}
                      className="group flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-center transition hover:border-violet-400/40 hover:bg-violet-500/10"
                    >
                      <span className="text-xs font-bold text-white group-hover:text-violet-300">
                        Ep {number}
                      </span>
                      {ep.is_filler && (
                        <span className="mt-0.5 text-[9px] text-amber-400">Filler</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </Shell>
  );
}