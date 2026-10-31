import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Search, Star } from 'lucide-react';
import Shell from '../../components/Shell';

type AnimeItem = {
  id: number;
  slug: string;
  title: string;
  poster?: string;
  image?: string;
  format?: string;
  score?: number;
  episodes_total?: number;
  year?: number;
};

export default function AnimeSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

  async function executeSearch(keyword: string) {
    if (!keyword.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/anime/search?q=${encodeURIComponent(keyword)}&limit=30`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pencarian gagal diproses.');
      }

      setResults(data.results || data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi gangguan jaringan.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query.trim() });
    executeSearch(query.trim());
  }

  return (
    <Shell>
      <main className="min-h-[100dvh] bg-[#07070a] px-4 pb-24 pt-24 text-white sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-6xl">
          <Link
            to="/anime"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={14} /> Kembali ke Beranda Anime
          </Link>

          <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-4xl">
            Pencarian Anime
          </h1>
          <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
            Temukan anime berdasarkan judul bahasa Inggris, Romaji, atau karakter.
          </p>

          <form onSubmit={handleFormSubmit} className="mt-6 flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Contoh: Jujutsu Kaisen, Solo Leveling..."
                className="min-h-[48px] w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-violet-600 px-6 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Cari'}
            </button>
          </form>

          {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

          {loading && (
            <div className="mt-12 text-center text-zinc-500">
              <Loader2 className="mx-auto mb-2 animate-spin text-violet-400" />
              <p className="text-xs">Mencari dalam katalog anime...</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.map((item) => (
                <Link
                  key={item.slug}
                  to={`/anime/${encodeURIComponent(item.slug)}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition hover:-translate-y-1 hover:border-violet-400/40"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
                    <img
                      src={item.poster || item.image}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    {item.score && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                        <Star size={10} fill="currentColor" />
                        {item.score.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="line-clamp-1 text-xs font-bold text-white group-hover:text-violet-300">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {item.format || 'Anime'} · {item.year || 'TBA'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="mt-16 text-center text-zinc-500">
              <p className="text-xs sm:text-sm">
                {initialQuery
                  ? `Tidak ada anime yang cocok dengan "${initialQuery}". Coba kata kunci lain.`
                  : 'Ketik judul anime pada kotak di atas untuk memulai pencarian.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </Shell>
  );
}