import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Filter, Loader2, Search, Star } from 'lucide-react';
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

const GENRE_OPTIONS = [
  '',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Paling Populer' },
  { value: 'latest', label: 'Baru Diperbarui' },
  { value: 'year', label: 'Tahun Rilis' },
  { value: 'az', label: 'Abjad A-Z' },
];

async function safeFetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const text = await response.text();

  if (!text || text.trim().startsWith('<')) {
    throw new Error(
      `Endpoint API belum merespons JSON (HTTP ${response.status}).`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Respons server bukan JSON valid (HTTP ${response.status}).`);
  }

  if (!response.ok || data?.status === false) {
    throw new Error(data?.error || `Permintaan gagal (HTTP ${response.status}).`);
  }

  return data;
}

export default function AnimeSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialGenre = searchParams.get('genre') || '';
  const initialSort = searchParams.get('sort') || 'popular';

  const [query, setQuery] = useState(initialQuery);
  const [genre, setGenre] = useState(initialGenre);
  const [sort, setSort] = useState(initialSort);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    const gParam = searchParams.get('genre') || '';
    const sParam = searchParams.get('sort') || 'popular';
    setQuery(qParam);
    setGenre(gParam);
    setSort(sParam);
    executeSearch(qParam, gParam, sParam);
  }, [searchParams]);

  async function executeSearch(keyword: string, selectedGenre: string, selectedSort: string) {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        q: keyword.trim(),
        limit: '36',
        sort: selectedSort,
      });
      if (selectedGenre) params.set('genre', selectedGenre);

      const data = await safeFetchJson(`/api/anime/search?${params.toString()}`);
      setResults(data.results || data.data || []);
      setTotalResults(data.total_results || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi gangguan jaringan.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function updateFilters(nextQuery: string, nextGenre: string, nextSort: string) {
    const nextParams: Record<string, string> = {};
    if (nextQuery.trim()) nextParams.q = nextQuery.trim();
    if (nextGenre) nextParams.genre = nextGenre;
    if (nextSort && nextSort !== 'popular') nextParams.sort = nextSort;
    setSearchParams(nextParams);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateFilters(query, genre, sort);
  }

  return (
    <Shell>
      <main className="min-h-[100dvh] bg-[#060609] px-4 pb-24 pt-24 text-white sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/anime"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08]"
          >
            <ArrowLeft size={14} /> Kembali ke Beranda Anime
          </Link>

          <div className="mt-6 rounded-3xl border border-white/[0.09] bg-[#0c0c12] p-5 shadow-xl sm:p-7">
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">
              Eksplorasi & Pencarian Anime
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              Cari judul spesifik atau saring ribuan katalog berdasarkan genre dan urutan.
            </p>

            <form onSubmit={handleFormSubmit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="relative sm:col-span-6">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari judul Inggris, Jepang, atau karakter..."
                  className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#07070b] pl-11 pr-4 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-rose-500/60 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={genre}
                  onChange={(e) => {
                    setGenre(e.target.value);
                    updateFilters(query, e.target.value, sort);
                  }}
                  aria-label="Filter genre"
                  className="min-h-[48px] w-full rounded-xl border border-white/10 bg-[#07070b] px-3.5 text-xs text-zinc-200 outline-none focus:border-rose-500/60 sm:text-sm"
                >
                  <option value="">Semua Genre</option>
                  {GENRE_OPTIONS.filter(Boolean).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 sm:col-span-3">
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    updateFilters(query, genre, e.target.value);
                  }}
                  aria-label="Urutkan berdasarkan"
                  className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-[#07070b] px-3 text-xs text-zinc-200 outline-none focus:border-rose-500/60 sm:text-sm"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-5 text-xs font-bold text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Terapkan'}
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="mt-16 text-center text-zinc-500">
              <Loader2 size={28} className="mx-auto mb-3 animate-spin text-rose-500" />
              <p className="text-xs">Memuat katalog anime...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Filter size={13} className="text-rose-400" />
                  Menampilkan {results.length} dari {totalResults} judul
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {results.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/anime/${encodeURIComponent(item.slug)}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c12] transition duration-300 hover:-translate-y-1 hover:border-rose-500/40"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                      <img
                        src={item.poster || item.image}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      {item.score && (
                        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
                          <Star size={10} fill="currentColor" />
                          {item.score.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-3">
                      <h3 className="line-clamp-2 text-xs font-bold leading-snug text-white group-hover:text-rose-300">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-[10px] text-zinc-500">
                        {item.format || 'TV'} · {item.year || 'TBA'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-16 text-center text-zinc-500">
              <p className="text-sm">
                Tidak ditemukan judul yang cocok dengan filter tersebut.
              </p>
            </div>
          )}
        </div>
      </main>
    </Shell>
  );
}