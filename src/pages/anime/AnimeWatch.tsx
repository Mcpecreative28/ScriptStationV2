import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';

export default function AnimeWatch() {
  const { slug, episode } = useParams();

  return (
    <main className="min-h-screen bg-[#07070a] px-4 pb-16 pt-28 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          to={`/anime/${encodeURIComponent(slug || '')}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400"
        >
          <ArrowLeft size={16} /> Kembali ke Detail Anime
        </Link>

        <h1 className="mt-7 text-2xl font-black">
          Episode {episode}
        </h1>

        <div className="mt-6 flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="text-center">
            <Play size={35} className="mx-auto text-violet-400" />
            <p className="mt-4 text-sm text-zinc-400">
              Player akan dihubungkan setelah format resolver diverifikasi.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
