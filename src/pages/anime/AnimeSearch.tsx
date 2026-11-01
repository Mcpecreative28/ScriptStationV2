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
import { AnimeSubBar, type AnimeCard } from './AnimeHome';

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'latest', label: 'Latest Update' },
  { value: 'az', label: 'Title A – Z' },
  { value: 'za', label: 'Title Z – A' },
  { value: 'year', label: 'Newest Year' },
  { value: 'oldest', label: 'Oldest Year' },
];

const LETTERS = [
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
 * Custom Popover Dropdown (Pengganti <select> bawaan browser)
 */
function CustomSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLabel =
    options.find((o) => o.value === value)?.label || options[0]?.label || label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-xs transition ${
          open
            ? 'border-emerald-400/50 bg-[#131720] text-white'
            : 'border-white/[0.08] bg-[#0d0f14] text-zinc-200 hover:border-white/20'
        }`}
      >
        <div className="min-w-0">
          <span className="block text-[10px] font-medium text-zinc-500">
            {label}
          </span>
          <span className="block truncate font-semibold text-zinc-100">
            {activeLabel}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-zinc-400 transition-transform ${
            open ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-[#11141c]/95 p-1.5 shadow-2xl backdrop-blur-2xl">
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                  selected
                    ? 'bg-emerald-400/15 font-bold text-emerald-300'
                    : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {selected && <Check size={13} className="shrink-0 text-emerald-400" />}
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

  const [genreDrawerOpen, setGenreDrawerOpen] = useState(false);
  const [availableGenres, setAvailableGenres] = useState<
    Array<{ name: string; count: number }>
  >([]);
  const [availableFormats, setAvailableFormats] = useState<string[]>([
    'TV',
    'Movie',
    'ONA',
    'OVA',
    'Special',
  ]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([
    'Airing',
    'Completed',
  ]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [results, setResults] = useState<AnimeCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Muat daftar Genre, Format, Status, dan Tahun asli dari AnimeKai
  useEffect(() => {
    safeFetchJson('/api/anime/filters')
      .then((data) => {
        if (Array.isArray(data?.genres)) setAvailableGenres(data.genres);
        if (Array.isArray(data?.formats) && data.formats.length > 0)
          setAvailableFormats(data.formats);
        if (Array.isArray(data?.statuses) && data.statuses.length > 0)
          setAvailableStatuses(data.statuses);
        if (Array.isArray(data?.years)) setAvailableYears(data.years);
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

    fetchCatalog(
      { q, genre: g, format: f, status: st, year: y, letter: l, sort: s },
      1,
      false
    );
  }, [searchParams]);

  async function fetchCatalog(
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
      const list = Array.isArray(data?.results) ? data.results : [];

      if (append) {
        setResults((prev) => [...prev, ...list]);
      } else {
        setResults(list);
      }

      setPage(targetPage);
      setTotalResults(data?.total_results || list.length);
      setHasMore(Boolean(data?.has_more));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat katalog.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function syncUrlParams(next: Partial<{
    q: string;
    genre: string;
    format: string;
    status: string;
    year: string;
    letter: string;
    sort: string;
  }>) {
    const merged = {
      q: next.q !== undefined ? next.q : query,
      genre: next.genre !== undefined ? next.genre : genre,
      format: next.format !== undefined ? next.format : format,
      status: next.status !== undefined ? next.status : status,
      year: next.year !== undefined ? next.year : year,
      letter: next.letter !== undefined ? next.letter : letter,
      sort: next.sort !== undefined ? next.sort : sort,
    };

    const params: Record<string, string> = {};
    if (merged.q.trim()) params.q = merged.q.trim();
    if (merged.genre) params.genre = merged.genre;
    if (merged.format) params.format = merged.format;
    if (merged.status) params.status = merged.status;
    if (merged.year) params.year = merged.year;
    if (merged.letter && merged.letter !== 'ALL') params.letter = merged.letter;
    if (merged.sort && merged.sort !== 'popular') params.sort = merged.sort;

    setSearchParams(params);
  }

  function handleShowMore() {
    if (loadingMore || !hasMore) return;
    fetchCatalog(
      { q: query, genre, format, status, year, letter, sort },
      page + 1,
      true
    );
  }

  function resetAllFilters() {
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
    <div className="min-h-[100dvh] bg-[#08090c] text-zinc-100">
      <Navbar />

      <div className="pt-[68px] sm:pt-[76px]">
        <AnimeSubBar activeTab="catalog" />

        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-6 sm:px-6">
          {/* Panel Custom Filter & Search Console */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#0c0e13] p-4 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                syncUrlParams({ q: query });
              }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari judul anime (Inggris, Jepang, Romaji)..."
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#08090c] pl-11 pr-9 text-xs text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/50 sm:text-sm"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      syncUrlParams({ q: '' });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-400 px-6 text-xs font-bold text-zinc-950 transition hover:bg-emerald-300"
                >
                  Terapkan Pencarian
                </button>
                <button
                  type="button"
                  onClick={() => setGenreDrawerOpen((v) => !v)}
                  className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition ${
                    genre || genreDrawerOpen
                      ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                      : 'border-white/[0.08] bg-[#0d0f14] text-zinc-300 hover:border-white/20'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  <span>Genre {genre ? `(${genre})` : `(${availableGenres.length})`}</span>
                </button>
              </div>
            </form>

            {/* Baris Custom Dropdown (Bukan Select Bawaan Google/Browser) */}
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <CustomSelect
                label="Urutkan (Sort By)"
                value={sort}
                options={SORT_OPTIONS}
                onChange={(val) => syncUrlParams({ sort: val })}
              />

              <CustomSelect
                label="Format Tontonan"
                value={format}
                options={[
                  { value: '', label: 'Semua Format' },
                  ...availableFormats.map((f) => ({ value: f, label: f })),
                ]}
                onChange={(val) => syncUrlParams({ format: val })}
              />

              <CustomSelect
                label="Status Rilis"
                value={status}
                options={[
                  { value: '', label: 'Semua Status' },
                  ...availableStatuses.map((s) => ({ value: s, label: s })),
                ]}
                onChange={(val) => syncUrlParams({ status: val })}
              />

              <CustomSelect
                label="Tahun Rilis"
                value={year}
                options={[
                  { value: '', label: 'Semua Tahun' },
                  ...availableYears.map((y) => ({
                    value: String(y),
                    label: String(y),
                  })),
                ]}
                onChange={(val) => syncUrlParams({ year: val })}
              />
            </div>

            {/* Laci Pilihan Genre Lengkap AnimeKai */}
            {genreDrawerOpen && (
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#08090c] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">
                    Pilih Genre dari Katalog AnimeKai ({availableGenres.length} Genre)
                  </span>
                  {genre && (
                    <button
                      type="button"
                      onClick={() => syncUrlParams({ genre: '' })}
                      className="text-[11px] font-semibold text-emerald-400 hover:underline"
                    >
                      Reset Genre
                    </button>
                  )}
                </div>

                <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => syncUrlParams({ genre: '' })}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                      !genre
                        ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300'
                        : 'border-white/[0.07] bg-[#0d0f14] text-zinc-400 hover:text-white'
                    }`}
                  >
                    Semua Genre
                  </button>

                  {availableGenres.map((g) => {
                    const active = genre.toLowerCase() === g.name.toLowerCase();
                    return (
                      <button
                        key={g.name}
                        type="button"
                        onClick={() =>
                          syncUrlParams({ genre: active ? '' : g.name })
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                          active
                            ? 'border-emerald-400/50 bg-emerald-400/20 font-bold text-emerald-300'
                            : 'border-white/[0.07] bg-[#0d0f14] text-zinc-300 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <span>{g.name}</span>
                        <span className="font-mono text-[10px] opacity-60">
                          {g.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pita Filter Alfabet A-Z */}
            <div className="mt-4 flex items-center gap-1 overflow-x-auto border-t border-white/[0.06] pt-3.5 no-scrollbar">
              {LETTERS.map((char) => {
                const active = letter === char;
                return (
                  <button
                    key={char}
                    type="button"
                    onClick={() => syncUrlParams({ letter: char })}
                    className={`h-8 min-w-[32px] shrink-0 rounded-lg px-2 font-mono text-xs font-bold transition ${
                      active
                        ? 'bg-emerald-400 text-zinc-950'
                        : 'border border-white/[0.06] bg-[#08090c] text-zinc-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {char}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Status Bar Filter Aktif */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span>
                Menampilkan{' '}
                <strong className="font-mono text-white">{results.length}</strong>{' '}
                dari{' '}
                <strong className="font-mono text-emerald-400">
                  {totalResults}
                </strong>{' '}
                judul
              </span>
              {genre && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
                  Genre: {genre}
                  <button
                    type="button"
                    onClick={() => syncUrlParams({ genre: '' })}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {letter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-emerald-300">
                  Huruf: {letter}
                  <button
                    type="button"
                    onClick={() => syncUrlParams({ letter: 'ALL' })}
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            {(query || genre || format || status || year || letter !== 'ALL' || sort !== 'popular') && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08]"
              >
                <RotateCcw size={12} />
                Reset Semua Filter
              </button>
            )}
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Grid Hasil Katalog */}
          {loading ? (
            <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] animate-pulse rounded-2xl bg-white/[0.04]"
                />
              ))}
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {results.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/anime/${encodeURIComponent(item.slug)}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0f14] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                      <img
                        src={item.poster || item.image}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <span className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-200">
                        {item.format || 'TV'}
                      </span>
                      {item.score && (
                        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                          <Star size={9} fill="currentColor" />
                          {item.score.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-3">
                      <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-zinc-100 group-hover:text-emerald-300">
                        {item.title}
                      </h3>
                      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                        <span>{item.year || 'TBA'}</span>
                        <span>
                          {item.episodes_total
                            ? `${item.episodes_total} EP`
                            : 'ONGOING'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Tombol Show More Bertahap */}
              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleShowMore}
                    disabled={loadingMore}
                    className="inline-flex h-12 min-w-[220px] items-center justify-center gap-2 rounded-2xl border border-emerald-400/35 bg-emerald-400/15 px-8 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-zinc-950 disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Memuat Lebih Banyak...
                      </>
                    ) : (
                      <>
                        Tampilkan Lebih Banyak (Show More)
                        <span className="font-mono text-[11px] opacity-75">
                          ({results.length}/{totalResults})
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-12 rounded-2xl border border-white/[0.06] bg-[#0d0f14] p-12 text-center">
              <p className="text-sm font-semibold text-zinc-300">
                Tidak ada anime yang cocok dengan filter ini
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-bold text-zinc-950"
              >
                Reset Filter
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}