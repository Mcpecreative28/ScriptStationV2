import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';

export default function AnimeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/anime/search?q=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Pencarian gagal.');
      }

      const items = Array.isArray(data)
        ? data
        : data.results || data.data || [];

      setResults(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Terjadi kesalahan.'
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07070a] px-5 pb-16 pt-28 text-white">
      <div className="mx-auto max-w-5xl">
        <Link to="/anime" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400">
          <ArrowLeft size={16} /> Kembali ke AnimeHub
        </Link>

        <h1 className="text-3xl font-black">Cari Anime</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Temukan anime yang ingin kamu tonton.
        </p>

        <form onSubmit={handleSearch} className="mt-7 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Contoh: One Piece..."
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm outline-none focus:border-violet-400"
          />

          <button
            disabled={loading}
            className="rounded-xl bg-violet-500 px-5 text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
          </button>
        </form>

        {error && <p className="mt-5 text-sm text-red-400">{error}</p>}

        {loading && (
          <p className="mt-8 text-sm text-zinc-400">Mencari anime...</p>
        )}

        {!loading && results.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {results.map((item, index) => {
              const slug = item.slug || item.id;

              return (
                <Link
                  key={slug || index}
                  to={`/anime/${encodeURIComponent(String(slug))}`}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
                >
                  <img
                    src={item.poster || item.image || item.posterUrl}
                    alt={item.title || item.name || 'Anime'}
                    className="aspect-[3/4] w-full object-cover"
                    loading="lazy"
                  />
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold">
                      {item.title || item.name || 'Tanpa judul'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <p className="mt-10 text-center text-sm text-zinc-500">
            Masukkan judul anime untuk memulai pencarian.
          </p>
        )}
      </div>
    </main>
  );
}