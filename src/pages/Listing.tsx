
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownAZ,
  Check,
  ChevronDown,
  Code2,
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';

import type { Resource } from '../data/mock';
import { db } from '../lib/firebase';
import ResourceCard from '../components/ResourceCard';
import Shell from '../components/Shell';

type FirestoreResource = {
  title?: string;
  description?: string;
  category?: string;
  resourceType?: string;
  language?: string;
  author?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerId?: string;
  rating?: number;
  downloads?: number;
  views?: number;
  tags?: string[];
  thumbnailUrl?: string | null;
  sourceCode?: string;
  scriptType?: Resource['scriptType'];
  platform?: Resource['platform'];
  snippetType?: Resource['snippetType'];
  mediafireUrl?: string | null;
  githubUrl?: string | null;
  previewImageUrls?: string[];
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
};

type SortMode =
  | 'Latest'
  | 'Popular'
  | 'Top Rated'
  | 'Most Downloaded'
  | 'A-Z';

function timestampToMillis(value: unknown) {
  if (!value) return 0;

  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof (value as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return Number((value as { toMillis: () => number }).toMillis());
  }

  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return Number((value as { seconds?: number }).seconds ?? 0) * 1000;
  }

  if (value instanceof Date) return value.getTime();

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Number(value) || 0;
  }

  return 0;
}

function getKind(value: unknown): Resource['kind'] {
  return value === 'Snippet'
    ? 'Snippet'
    : value === 'Baileys'
      ? 'Baileys'
      : 'Script';
}

function getUploadPath(kind?: Resource['kind']) {
  return kind === 'Snippet'
    ? '/snippets/upload'
    : kind === 'Baileys'
      ? '/baileys/upload'
      : '/scripts/upload';
}

const sortOptions: {
  label: SortMode;
  description: string;
  icon: typeof Sparkles;
}[] = [
  {
    label: 'Latest',
    description: 'Terbaru ditambahkan',
    icon: Sparkles,
  },
  {
    label: 'Popular',
    description: 'Paling banyak dilihat',
    icon: Sparkles,
  },
  {
    label: 'Top Rated',
    description: 'Rating tertinggi',
    icon: Sparkles,
  },
  {
    label: 'Most Downloaded',
    description: 'Paling banyak diunduh',
    icon: Sparkles,
  },
  {
    label: 'A-Z',
    description: 'Urut berdasarkan nama',
    icon: ArrowDownAZ,
  },
];

function GlassSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-w-0">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[.17em] text-zinc-500">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`group flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 ${
          open
            ? 'border-white/20 bg-white/[.09] text-white shadow-lg shadow-black/20'
            : 'border-white/[.08] bg-black/20 text-zinc-300 hover:border-white/[.14] hover:bg-white/[.045]'
        }`}
      >
        <span className="truncate">{value}</span>

        <ChevronDown
          size={16}
          className={`shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? 'rotate-180 text-white' : 'group-hover:text-zinc-300'
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={`Close ${label} menu`}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />

          <div
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-64 origin-top overflow-y-auto rounded-2xl border border-white/[.12] bg-[#111114]/[.98] p-1.5 shadow-2xl shadow-black/60 backdrop-blur-3xl animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {options.map((option) => {
              const selected = option === value;

              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${
                    selected
                      ? 'bg-white text-black'
                      : 'text-zinc-300 hover:bg-white/[.07] hover:text-white'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {selected && <Check size={15} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Listing({
  kind,
}: {
  kind?: Resource['kind'];
}) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('Latest');

  const [languageFilter, setLanguageFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [authorFilter, setAuthorFilter] = useState('All');

  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadResources() {
      if (!db) {
        if (active) {
          setError('Firebase belum terkonfigurasi.');
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError('');

        const resourcesQuery = query(
          collection(db, 'scripts'),
          where('status', '==', 'approved')
        );

        const snapshot = await getDocs(resourcesQuery);

        const data: Resource[] = snapshot.docs.map((document) => {
          const item = document.data() as FirestoreResource;
          const resourceKind = getKind(item.resourceType ?? item.category);

          return {
            id: document.id,
            title: item.title ?? 'Untitled',
            description: item.description ?? '',
            desc: item.description ?? '',
            category:
              item.category ??
              item.platform ??
              item.scriptType ??
              '',
            tags: Array.isArray(item.tags) ? item.tags : [],
            kind: resourceKind,
            thumbnailUrl: item.thumbnailUrl ?? null,
            author: item.author ?? 'Unknown',
            uploaderName: item.ownerName ?? '',
            uploaderEmail: item.ownerEmail ?? '',
            ownerId: item.ownerId ?? '',
            language: item.language ?? '',
            sourceCode: item.sourceCode ?? '',
            scriptType: item.scriptType,
            platform: item.platform,
            snippetType: item.snippetType,
            mediafireUrl: item.mediafireUrl ?? null,
            githubUrl: item.githubUrl ?? null,
            previewImageUrls: Array.isArray(item.previewImageUrls)
              ? item.previewImageUrls.filter(
                  (url: unknown): url is string => typeof url === 'string'
                )
              : [],
            rating: Number(item.rating ?? 0),
            downloads: Number(item.downloads ?? 0),
            views: Number(item.views ?? 0),
            status: item.status ?? 'approved',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        });

        if (active) setResources(data);
      } catch (err) {
        console.error('LISTING_LOAD_ERROR:', err);

        if (active) {
          setError('Gagal mengambil resource dari server.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResources();

    return () => {
      active = false;
    };
  }, []);

  const scopedResources = useMemo(
    () => resources.filter((resource) => !kind || resource.kind === kind),
    [resources, kind]
  );

  const availableLanguages = useMemo(() => {
    const values = scopedResources
      .map((resource) => resource.language?.trim())
      .filter(Boolean) as string[];

    return ['All', ...Array.from(new Set(values)).sort()];
  }, [scopedResources]);

  const availableTypes = useMemo(() => {
    const values =
      kind === 'Script'
        ? scopedResources.map((resource) => resource.scriptType)
        : kind === 'Snippet'
          ? scopedResources.map((resource) => resource.snippetType)
          : [];

    return [
      'All',
      ...Array.from(new Set(values.filter(Boolean) as string[])).sort(),
    ];
  }, [scopedResources, kind]);

  const availablePlatforms = useMemo(() => {
    if (kind !== 'Script') return ['All'];

    const values = scopedResources
      .map((resource) => resource.platform)
      .filter(Boolean) as string[];

    return ['All', ...Array.from(new Set(values)).sort()];
  }, [scopedResources, kind]);

  const availableAuthors = useMemo(() => {
    const values = scopedResources
      .map((resource) => resource.author?.trim())
      .filter(Boolean) as string[];

    return ['All', ...Array.from(new Set(values)).sort()];
  }, [scopedResources]);

  useEffect(() => {
    if (!availableLanguages.includes(languageFilter)) {
      setLanguageFilter('All');
    }

    if (!availableTypes.includes(typeFilter)) {
      setTypeFilter('All');
    }

    if (!availablePlatforms.includes(platformFilter)) {
      setPlatformFilter('All');
    }

    if (!availableAuthors.includes(authorFilter)) {
      setAuthorFilter('All');
    }
  }, [
    availableLanguages,
    availableTypes,
    availablePlatforms,
    availableAuthors,
    languageFilter,
    typeFilter,
    platformFilter,
    authorFilter,
  ]);

  const list = useMemo(() => {
    const queryText = search.trim().toLowerCase();

    const filtered = scopedResources.filter((resource) => {
      if (
        languageFilter !== 'All' &&
        resource.language !== languageFilter
      ) {
        return false;
      }

      if (
        platformFilter !== 'All' &&
        resource.platform !== platformFilter
      ) {
        return false;
      }

      if (
        authorFilter !== 'All' &&
        resource.author !== authorFilter
      ) {
        return false;
      }

      if (typeFilter !== 'All') {
        const currentType =
          resource.kind === 'Script'
            ? resource.scriptType
            : resource.kind === 'Snippet'
              ? resource.snippetType
              : '';

        if (currentType !== typeFilter) return false;
      }

      if (!queryText) return true;

      const haystack = [
        resource.title,
        resource.description,
        resource.author,
        resource.uploaderName,
        resource.uploaderEmail,
        resource.language,
        resource.category,
        resource.scriptType,
        resource.platform,
        resource.snippetType,
        ...(resource.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(queryText);
    });

    return [...filtered].sort((a, b) => {
      switch (sortMode) {
        case 'Popular':
          return Number(b.views ?? 0) - Number(a.views ?? 0);
        case 'Top Rated':
          return Number(b.rating ?? 0) - Number(a.rating ?? 0);
        case 'Most Downloaded':
          return Number(b.downloads ?? 0) - Number(a.downloads ?? 0);
        case 'A-Z':
          return a.title.localeCompare(b.title, undefined, {
            sensitivity: 'base',
          });
        case 'Latest':
        default:
          return (
            timestampToMillis(b.createdAt) -
            timestampToMillis(a.createdAt)
          );
      }
    });
  }, [
    scopedResources,
    search,
    sortMode,
    languageFilter,
    typeFilter,
    platformFilter,
    authorFilter,
  ]);

  const activeFilterCount =
    (languageFilter !== 'All' ? 1 : 0) +
    (typeFilter !== 'All' ? 1 : 0) +
    (platformFilter !== 'All' ? 1 : 0) +
    (authorFilter !== 'All' ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  function resetFilters() {
    setLanguageFilter('All');
    setTypeFilter('All');
    setPlatformFilter('All');
    setAuthorFilter('All');
  }

  function clearSearchAndFilters() {
    setSearch('');
    resetFilters();
  }

  const pageTitle = kind ?? 'All resources';

  return (
    <Shell>
      <main className="relative mx-auto min-h-screen w-full max-w-7xl min-w-0 overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
        <div className="pointer-events-none absolute -top-12 right-[-9rem] h-72 w-72 rounded-full bg-violet-500/[.07] blur-[100px]" />
        <div className="pointer-events-none absolute left-[-10rem] top-80 h-72 w-72 rounded-full bg-sky-500/[.05] blur-[100px]" />

        <header className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[.09] bg-white/[.035] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.6)]" />
              <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-zinc-400">
                ScriptStation resource hub
              </span>
            </div>

            <h1 className="mt-5 break-words text-4xl font-semibold tracking-[-.045em] text-white sm:text-5xl">
              {pageTitle}
              <span className="text-zinc-600">.</span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
              Discover, preview and share developer resources in one place.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 py-1.5">
                <Code2 size={13} />
                Developer resources
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 py-1.5">
                <Check size={13} />
                Admin approved
              </span>
            </div>
          </div>

          <Link
            to={getUploadPath(kind)}
            className="group inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-white/[.04] transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-200 hover:shadow-xl hover:shadow-white/[.06] sm:w-fit"
          >
            <Upload
              size={16}
              className="transition-transform duration-200 group-hover:-translate-y-0.5"
            />
            Upload resource
          </Link>
        </header>

        <section className="glass relative mt-8 overflow-visible rounded-3xl p-3 sm:p-5">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/[.16] to-transparent" />

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="group relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-zinc-300"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${kind ?? 'resources'}...`}
                aria-label="Search resources"
                className="min-h-12 w-full rounded-2xl border border-white/[.08] bg-black/20 py-3 pl-11 pr-11 text-sm text-white outline-none transition-all duration-200 placeholder:text-zinc-600 hover:border-white/[.13] focus:border-white/[.2] focus:bg-black/30 focus:ring-2 focus:ring-white/[.035]"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/[.08] hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              aria-expanded={filtersOpen}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition-all duration-200 ${
                filtersOpen || hasActiveFilters
                  ? 'border-white/[.18] bg-white/[.09] text-white'
                  : 'border-white/[.08] bg-white/[.035] text-zinc-400 hover:border-white/[.14] hover:bg-white/[.06] hover:text-white'
              }`}
            >
              <SlidersHorizontal
                size={16}
                className={filtersOpen ? 'rotate-90 transition-transform duration-200' : 'transition-transform duration-200'}
              />
              <span>Filters</span>

              {activeFilterCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-600">
              <SlidersHorizontal size={12} />
              Sort by
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar">
              {sortOptions.map((item) => {
                const selected = sortMode === item.label;
                const SortIcon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSortMode(item.label)}
                    title={item.description}
                    aria-pressed={selected}
                    className={`group inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs transition-all duration-200 ${
                      selected
                        ? 'border-white bg-white text-black shadow-md shadow-white/[.04]'
                        : 'border-white/[.08] bg-white/[.025] text-zinc-400 hover:border-white/[.14] hover:bg-white/[.06] hover:text-white'
                    }`}
                  >
                    <SortIcon size={13} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
              filtersOpen
                ? 'mt-4 grid-rows-[1fr] opacity-100'
                : 'mt-0 grid-rows-[0fr] opacity-0'
            }`}
            aria-hidden={!filtersOpen}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="border-t border-white/[.07] pt-5">
                <div className="mb-4 flex flex-col gap-1">
                  <p className="text-sm font-medium text-zinc-200">
                    Refine your results
                  </p>
                  <p className="text-xs leading-5 text-zinc-500">
                    Pilih metadata untuk mempersempit daftar resource.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <GlassSelect
                    label="Programming language"
                    value={languageFilter}
                    options={availableLanguages}
                    onChange={setLanguageFilter}
                  />

                  {(kind === 'Script' || kind === 'Snippet') && (
                    <GlassSelect
                      label={kind === 'Script' ? 'Script type' : 'Snippet type'}
                      value={typeFilter}
                      options={availableTypes}
                      onChange={setTypeFilter}
                    />
                  )}

                  {kind === 'Script' && (
                    <GlassSelect
                      label="Platform"
                      value={platformFilter}
                      options={availablePlatforms}
                      onChange={setPlatformFilter}
                    />
                  )}

                  <GlassSelect
                    label="Author"
                    value={authorFilter}
                    options={availableAuthors}
                    onChange={setAuthorFilter}
                  />
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-white/[.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-300">
                      {hasActiveFilters
                        ? `${activeFilterCount} filter aktif`
                        : 'Semua resource'}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-600">
                      Pilihan filter mengikuti data yang tersedia.
                    </p>
                  </div>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-4 py-2.5 text-xs text-zinc-400 transition hover:border-white/[.14] hover:bg-white/[.07] hover:text-white"
                    >
                      <X size={14} />
                      Reset filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl border border-white/[.08] bg-white/[.035] text-zinc-400">
              <Filter size={14} />
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-200">
                {loading
                  ? 'Loading resources'
                  : `${list.length} resource${list.length === 1 ? '' : 's'} found`}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-600">
                {loading
                  ? 'Mengambil data terbaru...'
                  : `${scopedResources.length} resource tersedia di kategori ini`}
              </p>
            </div>
          </div>

          {(search || hasActiveFilters) && !loading && (
            <div className="flex min-w-0 items-center gap-2 sm:justify-end">
              <p className="min-w-0 truncate text-xs text-zinc-500">
                {search ? `Search: "${search}"` : `${activeFilterCount} filter aktif`}
              </p>

              <button
                type="button"
                onClick={clearSearchAndFilters}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/[.05] hover:text-white"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="glass overflow-hidden rounded-3xl"
                style={{
                  animationDelay: `${item * 70}ms`,
                }}
              >
                <div className="aspect-[16/9] animate-pulse bg-white/[.045]" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/4 animate-pulse rounded-full bg-white/[.07]" />
                  <div className="h-5 w-3/4 animate-pulse rounded-lg bg-white/[.07]" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-white/[.05]" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-white/[.05]" />
                  <div className="mt-5 h-10 animate-pulse rounded-xl bg-white/[.05]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="glass mt-5 rounded-3xl border border-red-400/[.18] p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-red-400/[.18] bg-red-400/[.07] text-red-300">
                <X size={18} />
              </div>

              <div>
                <p className="font-medium text-red-200">
                  Resource tidak dapat dimuat
                </p>
                <p className="mt-1 text-sm leading-6 text-red-200/60">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className="glass relative mt-5 overflow-hidden rounded-3xl px-5 py-14 text-center sm:px-10 sm:py-16">
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-white/[.035] blur-[70px]" />

            <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[.09] bg-white/[.035] text-zinc-300 shadow-xl shadow-black/20">
              {search || hasActiveFilters ? (
                <Search size={22} />
              ) : (
                <Code2 size={22} />
              )}
            </div>

            <p className="relative mt-5 text-lg font-medium tracking-tight text-zinc-200 sm:text-xl">
              {search || hasActiveFilters
                ? 'Tidak ada resource yang cocok.'
                : 'Belum ada resource di sini.'}
            </p>

            <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              {search || hasActiveFilters
                ? 'Coba kata kunci lain atau sesuaikan filter untuk menemukan resource yang kamu cari.'
                : 'Resource yang telah disetujui admin akan muncul di halaman ini.'}
            </p>

            {(search || hasActiveFilters) && (
              <button
                type="button"
                onClick={clearSearchAndFilters}
                className="relative mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200"
              >
                <X size={14} />
                Clear search & filters
              </button>
            )}

            {!search && !hasActiveFilters && (
              <Link
                to={getUploadPath(kind)}
                className="relative mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[.12] bg-white/[.05] px-4 py-2.5 text-xs font-medium text-zinc-200 transition hover:border-white/[.2] hover:bg-white/[.09]"
              >
                <Upload size={14} />
                Upload a resource
              </Link>
            )}
          </div>
        )}

        {!loading && !error && list.length > 0 && (
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((resource, index) => (
              <div
                key={resource.id}
                className="min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{
                  animationDelay: `${Math.min(index * 55, 330)}ms`,
                  animationFillMode: 'both',
                }}
              >
                <ResourceCard r={resource} />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && list.length > 0 && (
          <div className="mt-10 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[.18em] text-zinc-700">
            <span className="h-px w-8 bg-white/[.08]" />
            End of collection
            <span className="h-px w-8 bg-white/[.08]" />
          </div>
        )}
      </main>
    </Shell>
  );
}