import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

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
    return <div className="min-h-screen bg-[#07070a] pt-40 text-center text-white"><Loader2 className="mx-auto animate-spin" /></div>;
  }

  if (error) {
    return <div className="min-h-screen bg-[#07070a] p-10 pt-32 text-center text-red-400">{error}</div>;
  }

  const title = data?.title || data?.name || 'Detail Anime';
  const poster = data?.poster || data?.image || data?.posterUrl;
  const episodes = data?.episodes || [];

  return (
    <main className="min-h-screen bg-[#07070a] px-5 pb-16 pt-28 text-white">
      <div className="mx-auto max-w-5xl">
        <Link to="/anime" className="inline-flex items-center gap-2 text-sm text-zinc-400">
          <ArrowLeft size={16} /> AnimeHub
        </Link>

        <div className="mt-7 grid gap-7 sm:grid-cols-[220px_1fr]">
          {poster && (
            <img src={poster} alt={title} className="w-full rounded-2xl object-cover" />
          )}

          <div>
            <h1 className="text-3xl font-black">{title}</h1>
            <p className="mt-5 whitespace-pre-line text-sm leading-7 text-zinc-400">
              {data?.synopsis || data?.description || 'Belum ada sinopsis.'}
            </p>
          </div>
        </div>

        <h2 className="mt-12 text-xl font-bold">Daftar Episode</h2>

        <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {episodes.map((episode: any, index: number) => {
            const number = episode.number || episode.episode || index + 1;

            return (
              <Link
                key={episode.id || number}
                to={`/anime/watch/${encodeURIComponent(slug || '')}/${number}`}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center text-sm transition hover:border-violet-400"
              >
                Episode {number}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}