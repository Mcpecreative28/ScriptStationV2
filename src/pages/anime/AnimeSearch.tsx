import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { AnimeBottomBar, type AnimeCard } from './AnimeHome';

const SORT_OPTIONS = [
  { value: 'popular', label: 'MOST POPULAR' },
  { value: 'latest', label: 'LATEST UPDATE' },
  { value: 'az', label: 'TITLE (A – Z)' },
  { value: 'za', label: 'TITLE (Z – A)' },
  { value: 'year', label: 'NEWEST YEAR' },
  { value: 'oldest', label: 'OLDEST YEAR' },
];

const ALPHABET = [
  'ALL',
  '0-9',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];

/**
 * Custom Matrix Dropdown Cell (Tanpa <select> bawaan browser)
 */
function MatrixDropdown({
  title,
  value,
  options,
  onChange,
}: {
  title: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const currentLabel =
    options.find((o) => o.value === value)?.label || options[0]?.label || title;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-14 w-full flex-col justify-between px-4 py-2 text-left transition ${
          open ? 'bg-[#15151d] text-white' : 'bg-[#0b0b0f] hover:bg-[#111117]'
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <span className="font-mono text-[10px] tracking-widest text-zinc-500">
            {title}
          </span>
          <ChevronDown
            size={13}
            className={`text-zinc-500 transition-transform ${
              open ? 'rotate-180 text-[#ff5522]' : ''
            }`}
          />
        </div>
        <span className="truncate font-mono text-xs font-bold text-white">
          {currentLabel}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 max-h-64 overflow-y-auto border border-white/20 bg-[#0e0e14] shadow-2xl">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between border-b border-white/[0.06] px-4 py-2.5 text-left font-mono text-xs transition ${
                  active
                    ? 'bg-[#ff5522] font-bold text-black'
                    : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function safeFetchJson(url: string) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  const text = await response.text();
  if (!text || text.trim().startsWith('<')) {
    throw new Error(`Endpoint API belum merespons JSON (HTTP ${response.status}).`);
  }
  const data = JSON.parse(text);
  if (!response.ok || data?.status === false) {
    throw new Error(data?.error || `Permintaan gagal (HTTP ${response.status}).`);
  }
  return data;
}

export default function AnimeSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');
  const [format, setFormat] = useState(searchParams.get('format') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [year, setYear] = useState(searchParams.get('year') || '');
  const [letter, setLetter] = useState(searchParams.get('letter') || 'ALL');
  const [sort, setSort] = useState(searchParams.get('sort') || 'popular');

  const [genrePanelOpen, setGenrePanelOpen] = useState(false);
  const [genresList, setGenresList] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [formatsList, setFormatsList] = useState<string[]>([
    'TV',
    'Movie',
    'ONA',
    'OVA',
    'Special',
  ]);
  const [statusesList, setStatusesList] = useState<string[]>([
    'Airing',
    'Completed',
  ]);
  const [yearsList, setYearsList] = useState<number[]>([]);

  const [results, setResults] = useState<AnimeCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    safeFetchJson('/api/anime/filters')
      .then((data) => {
        if (Array.isArray(data?.genres)) setGenresList(data.genres);
        if (Array.isArray(data?.formats) && data.formats.length > 0)
          setFormatsList(data.formats);
        if (Array.isArray(data?.statuses) && data.statuses.length > 0)
          setStatusesList(data.statuses);
        if (Array.isArray(data?.years)) setYearsList(data.years);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const g = searchParams.get('genre') || '';
    const f = searchParams.get('format') || '';
    const st = searchParams.get('status') || '';
    const y = searchParams.get('year') || '';
    const l = searchParams.get('letter') || 'ALL';
    const s = searchParams.get('sort') || 'popular';

    setQuery(q);
    setGenre(g);
    setFormat(f);
    setStatus(st);
    setYear(y);
    setLetter(l);
    setSort(s);

    loadCatalog(
      { q, genre: g, format: f, status: st, year: y, letter: l, sort: s },
      1,
      false
    );
  }, [searchParams]);

  async function loadCatalog(
    filters: {
      q: string;
      genre: string;
      format: string;
      status: string;
      year: string;
      letter: string;
      sort: string;
    },
    targetPage: number,
    append: boolean
  ) {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: '24',
        sort: filters.sort || 'popular',
      });
      if (filters.q.trim()) params.set('q', filters.q.trim());
      if (filters.genre) params.set('genre', filters.genre);
      if (filters.format) params.set('format', filters.format);
      if (filters.status) params.set('status', filters.status);
      if (filters.year) params.set('year', filters.year);
      if (filters.letter && filters.letter !== 'ALL')
        params.set('letter', filters.letter);

      const data = await safeFetchJson(`/api/anime/search?${params.toString()}`);
      const items = Array.isArray(data?.results) ? data.results : [];

      if (append) setResults((prev) => [...prev, ...items]);
      else setResults(items);

      setPage(targetPage);
      setTotalResults(data?.total_results || items.length);
      setHasMore(Boolean(data?.has_more));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat katalog.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function updateParams(
    patch: Partial<{
      q: string;
      genre: string;
      format: string;
      status: string;
      year: string;
      letter: string;
      sort: string;
    }>
  ) {
    const merged = {
      q: patch.q !== undefined ? patch.q : query,
      genre: patch.genre !== undefined ? patch.genre : genre,
      format: patch.format !== undefined ? patch.format : format,
      status: patch.status !== undefined ? patch.status : status,
      year: patch.year !== undefined ? patch.year : year,
      letter: patch.letter !== undefined ? patch.letter : letter,
      sort: patch.sort !== undefined ? patch.sort : sort,
    };

    const nextParams: Record<string, string> = {};
    if (merged.q.trim()) nextParams.q = merged.q.trim();
    if (merged.genre) nextParams.genre = merged.genre;
    if (merged.format) nextParams.format = merged.format;
    if (merged.status) nextParams.status = merged.status;
    if (merged.year) nextParams.year = merged.year;
    if (merged.letter && merged.letter !== 'ALL')
      nextParams.letter = merged.letter;
    if (merged.sort && merged.sort !== 'popular') nextParams.sort = merged.sort;

    setSearchParams(nextParams);
  }

  function handleShowMore() {
    if (loadingMore || !hasMore) return;
    loadCatalog(
      { q: query, genre, format, status, year, letter, sort },
      page + 1,
      true
    );
  }

  function resetAll() {
    setQuery('');
    setGenre('');
    setFormat('');
    setStatus('');
    setYear('');
    setLetter('ALL');
    setSort('popular');
    setSearchParams({});
  }

  return (
    <div className="min-h-[100dvh] bg-[#070709] pb-24 text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-[1440px] px-4 pt-20 sm:px-6 sm:pt-24">
        {/* Header Arsip */}
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/15 pb-4">
          <div>
            <span className="font-mono text-[11px] font-bold tracking-widest text-[#ff5522]">
              ARCHIVE // DIRECTORY
            </span>
            <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-4xl">
              Katalog & Filter Penuh
            </h1>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            TERDETEKSI <strong className="text-white">{totalResults}</strong> JUDUL
          </span>
        </div>

        {/* Custom Filter Control Matrix */}
        <section className="mt-6 border border-white/15 bg-[#0b0b0f]">
          {/* Baris 1: Input Pencarian & Tombol Laci Genre */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ q: query });
            }}
            className="grid grid-cols-1 divide-y divide-white/10 border-b border-white/10 lg:grid-cols-12 lg:divide-x lg:divide-y-0"
          >
            <div className="relative flex items-center lg:col-span-7">
              <Search
                size={15}
                className="pointer-events-none absolute left-4 text-zinc-500"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik judul anime (Inggris / Jepang / Romaji)..."
                className="h-12 w-full bg-transparent pl-11 pr-10 text-xs text-white outline-none placeholder:text-zinc-600 sm:text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    updateParams({ q: '' });
                  }}
                  className="absolute right-3 text-zinc-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setGenrePanelOpen((v) => !v)}
              className={`flex h-12 items-center justify-between px-4 font-mono text-xs font-bold uppercase transition lg:col-span-3 ${
                genre || genrePanelOpen
                  ? 'bg-[#16161f] text-[#ff5522]'
                  : 'text-zinc-300 hover:bg-white/[0.03]'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <SlidersHorizontal size={13} />
                {genre ? `GENRE: ${genre}` : `PILIH GENRE (${genresList.length})`}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform ${
                  genrePanelOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <button
              type="submit"
              className="flex h-12 items-center justify-center bg-[#ff5522] font-mono text-xs font-black uppercase tracking-wider text-black transition hover:bg-[#ff6b3d] lg:col-span-2"
            >
              FILTER DATA
            </button>
          </form>

          {/* Baris 2: 4 Kolom Custom Matrix Dropdown */}
          <div className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0">
            <MatrixDropdown
              title="SORT ORDER"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(val) => updateParams({ sort: val })}
            />

            <MatrixDropdown
              title="FORMAT TYPE"
              value={format}
              options={[
                { value: '', label: 'ALL FORMATS' },
                ...formatsList.map((f) => ({
                  value: f,
                  label: f.toUpperCase(),
                })),
              ]}
              onChange={(val) => updateParams({ format: val })}
            />

            <MatrixDropdown
              title="AIRING STATUS"
              value={status}
              options={[
                { value: '', label: 'ALL STATUS' },
                ...statusesList.map((s) => ({
                  value: s,
                  label: s.toUpperCase(),
                })),
              ]}
              onChange={(val) => updateParams({ status: val })}
            />

            <MatrixDropdown
              title="RELEASE YEAR"
              value={year}
              options={[
                { value: '', label: 'ALL YEARS' },
                ...yearsList.map((y) => ({
                  value: String(y),
                  label: String(y),
                })),
              ]}
              onChange={(val) => updateParams({ year: val })}
            />
          </div>

          {/* Laci Matriks Genre Lengkap dari AnimeKai */}
          {genrePanelOpen && (
            <div className="border-t border-white/15 bg-[#070709] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold uppercase text-zinc-400">
                  DIREKTORI GENRE ANIMEKAI ({genresList.length} GENRE TERSEDIA)
                </span>
                {genre && (
                  <button
                    type="button"
                    onClick={() => updateParams({ genre: '' })}
                    className="font-mono text-[11px] font-bold text-[#ff5522] hover:underline"
                  >
                    RESET GENRE
                  </button>
                )}
              </div>

              <div className="grid max-h-60 grid-cols-2 border-l border-t border-white/10 overflow-y-auto sm:grid-cols-4 md:grid-cols-6">
                <button
                  type="button"
                  onClick={() => updateParams({ genre: '' })}
                  className={`flex items-center justify-between border-b border-r border-white/10 px-3 py-2 text-left font-mono text-xs transition ${
                    !genre
                      ? 'bg-[#ff5522] font-bold text-black'
                      : 'bg-[#0b0b0f] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>ALL</span>
                </button>

                {genresList.map((g) => {
                  const isSelected =
                    genre.toLowerCase() === g.name.toLowerCase();
                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() =>
                        updateParams({ genre: isSelected ? '' : g.name })
                      }
                      className={`flex items-center justify-between border-b border-r border-white/10 px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? 'bg-[#ff5522] font-bold text-black'
                          : 'bg-[#0b0b0f] text-zinc-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{g.name}</span>
                      <span className="ml-1 font-mono text-[10px] opacity-60">
                        {g.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Baris 3: Pita Alfabet A-Z */}
          <div className="flex items-center divide-x divide-white/10 overflow-x-auto border-t border-white/10 bg-[#08080b] no-scrollbar">
            {ALPHABET.map((item) => {
              const active = letter === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateParams({ letter: item })}
                  className={`h-9 min-w-[36px] flex-1 px-2 font-mono text-[11px] font-bold transition ${
                    active
                      ? 'bg-[#ff5522] text-black'
                      : 'text-zinc-500 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </section>

        {/* Bar Status Filter Aktif */}
        {(query ||
          genre ||
          format ||
          status ||
          year ||
          letter !== 'ALL' ||
          sort !== 'popular') && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-[#0b0b0f] px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="text-zinc-500">ACTIVE FILTERS:</span>
              {query && (
                <span className="bg-white/10 px-2 py-0.5 text-white">
                  Q: &quot;{query}&quot;
                </span>
              )}
              {genre && (
                <span className="bg-[#ff5522]/20 px-2 py-0.5 text-[#ff5522]">
                  GENRE: {genre.toUpperCase()}
                </span>
              )}
              {format && (
                <span className="bg-white/10 px-2 py-0.5 text-white">
                  FORMAT: {format.toUpperCase()}
                </span>
              )}
              {letter !== 'ALL' && (
                <span className="bg-white/10 px-2 py-0.5 text-white">
                  INDEX: {letter}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#ff5522] hover:underline"
            >
              <RotateCcw size={12} />
              CLEAR ALL
            </button>
          </div>
        )}

        {error && (
          <div className="mt-5 border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Grid Katalog */}
        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse bg-white/[0.04]"
              />
            ))}
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {results.map((item) => (
                <Link
                  key={item.slug}
                  to={`/anime/${encodeURIComponent(item.slug)}`}
                  className="group flex flex-col"
                >
                  <div className="relative aspect-[3/4] overflow-hidden border border-white/10 bg-[#0c0c10]">
                    <img
                      src={item.poster || item.image}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-103"
                    />
                    <div className="absolute left-0 top-0 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                      {item.format || 'TV'}
                    </div>
                    {item.score && (
                      <div className="absolute right-0 top-0 flex items-center gap-1 bg-black/85 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
                        <Star size={9} fill="currentColor" />
                        {item.score.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <h3 className="mt-2 line-clamp-1 text-xs font-bold text-zinc-100 group-hover:text-[#ff5522]">
                    {item.title}
                  </h3>
                  <div className="mt-0.5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                    <span>{item.year || 'TBA'}</span>
                    <span>
                      {item.episodes_total
                        ? `${item.episodes_total} EP`
                        : 'ONGOING'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Tombol Show More */}
            {hasMore && (
              <div className="mt-10 border-t border-white/10 pt-6 text-center">
                <button
                  type="button"
                  onClick={handleShowMore}
                  disabled={loadingMore}
                  className="inline-flex h-12 min-w-[260px] items-center justify-center gap-2 border border-white/20 bg-[#0b0b0f] px-8 font-mono text-xs font-bold uppercase tracking-wider text-white transition hover:border-[#ff5522] hover:bg-[#ff5522] hover:text-black disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      MEMUAT HALAMAN BERIKUTNYA...
                    </>
                  ) : (
                    <>
                      SHOW MORE // MUAT LEBIH BANYAK ({results.length}/
                      {totalResults})
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="mt-10 border border-white/10 bg-[#0b0b0f] p-12 text-center">
            <p className="font-mono text-xs uppercase text-zinc-400">
              Tidak ditemukan judul anime yang cocok dengan parameter filter di atas.
            </p>
            <button
              type="button"
              onClick={resetAll}
              className="mt-4 bg-[#ff5522] px-5 py-2.5 font-mono text-xs font-bold uppercase text-black"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </main>

      <AnimeBottomBar activeTab="catalog" />
    </div>
  );
}