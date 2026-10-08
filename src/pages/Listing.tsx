import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, SlidersHorizontal, Upload, X } from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

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
    return Number(
      (value as { toMillis: () => number }).toMillis()
    );
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value
  ) {
    return Number(
      (value as { seconds?: number }).seconds ?? 0
    ) * 1000;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

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
          const resourceKind = getKind(
            item.resourceType ?? item.category
          );

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
            rating: Number(item.rating ?? 0),
            downloads: Number(item.downloads ?? 0),
            views: Number(item.views ?? 0),
            status: item.status ?? 'approved',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          };
        });

        if (active) {
          setResources(data);
        }
      } catch (err) {
        console.error('LISTING_LOAD_ERROR:', err);

        if (active) {
          setError('Gagal mengambil resource dari server.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadResources();

    return () => {
      active = false;
    };
  }, []);

  const availableLanguages = useMemo(() => {
    const values = resources
      .filter((resource) => !kind || resource.kind === kind)
      .map((resource) => resource.language?.trim())
      .filter(Boolean) as string[];

    return ['All', ...Array.from(new Set(values)).sort()];
  }, [resources, kind]);

  const availableTypes = useMemo(() => {
    const current = resources.filter(
      (resource) => !kind || resource.kind === kind
    );

    const values =
      kind === 'Script'
        ? current.map((resource) => resource.scriptType)
        : kind === 'Snippet'
          ? current.map((resource) => resource.snippetType)
          : [];

    return [
      'All',
      ...Array.from(new Set(values.filter(Boolean) as string[])).sort(),
    ];
  }, [resources, kind]);

  const availablePlatforms = useMemo(() => {
    if (kind !== 'Script') return ['All'];

    const values = resources
      .filter((resource) => resource.kind === 'Script')
      .map((resource) => resource.platform)
      .filter(Boolean) as string[];

    return ['All', ...Array.from(new Set(values)).sort()];
  }, [resources, kind]);

  const list = useMemo(() => {
    const queryText = search.trim().toLowerCase();

    const filtered = resources.filter((resource) => {
      if (kind && resource.kind !== kind) return false;

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
          return a.title.localeCompare(
            b.title,
            undefined,
            { sensitivity: 'base' }
          );

        case 'Latest':
        default:
          return (
            timestampToMillis(b.createdAt) -
            timestampToMillis(a.createdAt)
          );
      }
    });
  }, [
    resources,
    kind,
    search,
    sortMode,
    languageFilter,
    typeFilter,
    platformFilter,
  ]);

  const hasActiveFilters =
    languageFilter !== 'All' ||
    typeFilter !== 'All' ||
    platformFilter !== 'All';

  function resetFilters() {
    setLanguageFilter('All');
    setTypeFilter('All');
    setPlatformFilter('All');
  }

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl min-w-0 overflow-hidden px-4 pb-12 pt-32 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
              Resource hub
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              {kind ?? 'All resources'}
            </h1>

            <p className="mt-2 max-w-2xl text-zinc-500">
              Discover, preview and share developer resources.
            </p>
          </div>

          <Link
            to={getUploadPath(kind)}
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            <Upload size={16} />
            Upload
          </Link>
        </div>

        <section className="glass mt-8 rounded-3xl p-3 sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${kind ?? 'resources'}...`}
                className="w-full rounded-2xl border border-white/8 bg-black/20 py-3 pl-11 pr-10 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/15"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm transition ${
                filtersOpen || hasActiveFilters
                  ? 'border-white/15 bg-white/10 text-white'
                  : 'border-white/8 bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
                  !
                </span>
              )}
            </button>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar pb-1">
            {(
              [
                'Latest',
                'Popular',
                'Top Rated',
                'Most Downloaded',
                'A-Z',
              ] as SortMode[]
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSortMode(item)}
                className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs transition ${
                  sortMode === item
                    ? 'border-white/15 bg-white text-black'
                    : 'border-white/8 bg-white/4 text-zinc-400 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {filtersOpen && (
            <div className="mt-4 grid gap-3 border-t border-white/6 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-zinc-500">
                Language
                <select
                  value={languageFilter}
                  onChange={(event) =>
                    setLanguageFilter(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-sm text-zinc-300 outline-none"
                >
                  {availableLanguages.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>

              {(kind === 'Script' || kind === 'Snippet') && (
                <label className="text-xs text-zinc-500">
                  Type
                  <select
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-sm text-zinc-300 outline-none"
                  >
                    {availableTypes.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {kind === 'Script' && (
                <label className="text-xs text-zinc-500">
                  Platform
                  <select
                    value={platformFilter}
                    onChange={(event) =>
                      setPlatformFilter(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-sm text-zinc-300 outline-none"
                  >
                    {availablePlatforms.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="self-end rounded-xl border border-white/8 bg-white/5 px-4 py-2.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}
        </section>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">
            {loading
              ? 'Loading resources...'
              : `${list.length} resource${list.length === 1 ? '' : 's'} found`}
          </p>

          {(search || hasActiveFilters) && !loading && (
            <p className="text-xs text-zinc-600">
              {search
                ? `Search: "${search}"`
                : 'Filtered results'}
            </p>
          )}
        </div>

        {loading && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="glass h-72 animate-pulse rounded-3xl"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-5 rounded-3xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className="glass mt-5 rounded-3xl p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-zinc-600">
              <Filter size={20} />
            </div>

            <p className="mt-4 text-lg font-medium text-zinc-300">
              {search || hasActiveFilters
                ? 'Tidak ada resource yang cocok.'
                : 'Belum ada resource yang tersedia.'}
            </p>

            <p className="mt-2 text-sm text-zinc-600">
              {search || hasActiveFilters
                ? 'Coba kata kunci atau filter yang berbeda.'
                : 'Resource yang sudah disetujui admin akan muncul di sini.'}
            </p>

            {(search || hasActiveFilters) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  resetFilters();
                }}
                className="mt-5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200"
              >
                Clear search & filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && list.length > 0 && (
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((resource) => (
              <ResourceCard
                key={resource.id}
                r={resource}
              />
            ))}
          </div>
        )}
      </main>
    </Shell>
  );
}
