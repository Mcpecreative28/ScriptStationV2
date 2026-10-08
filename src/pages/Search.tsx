import { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { Resource } from '../data/mock';
import { db } from '../lib/firebase';
import ResourceCard from '../components/ResourceCard';
import Shell from '../components/Shell';

type FirestoreResource = {
  title?: string; description?: string; category?: string; resourceType?: string;
  language?: string; author?: string; ownerName?: string; ownerEmail?: string;
  ownerId?: string; rating?: number; downloads?: number; views?: number;
  tags?: string[]; thumbnailUrl?: string | null; sourceCode?: string;
  scriptType?: Resource['scriptType']; platform?: Resource['platform'];
  snippetType?: Resource['snippetType']; mediafireUrl?: string | null;
  githubUrl?: string | null; status?: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown; updatedAt?: unknown;
};

type KindFilter = 'All' | Resource['kind'];

function getKind(value: unknown): Resource['kind'] {
  return value === 'Snippet' ? 'Snippet' : value === 'Baileys' ? 'Baileys' : 'Script';
}

function timestampToMillis(value: unknown) {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value &&
      typeof (value as { toMillis?: unknown }).toMillis === 'function') {
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

export default function Search() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadResources() {
      if (!db) {
        if (active) { setError('Firebase belum terkonfigurasi.'); setLoading(false); }
        return;
      }
      try {
        setLoading(true); setError('');
        const snapshot = await getDocs(query(
          collection(db, 'scripts'),
          where('status', '==', 'approved')
        ));
        const data: Resource[] = snapshot.docs.map((document) => {
          const item = document.data() as FirestoreResource;
          return {
            id: document.id, kind: getKind(item.resourceType ?? item.category),
            title: item.title ?? 'Untitled', description: item.description ?? '',
            desc: item.description ?? '',
            category: item.category ?? item.platform ?? item.scriptType ?? '',
            tags: Array.isArray(item.tags) ? item.tags : [],
            thumbnailUrl: item.thumbnailUrl ?? null, author: item.author ?? 'Unknown',
            uploaderName: item.ownerName ?? '', uploaderEmail: item.ownerEmail ?? '',
            ownerId: item.ownerId ?? '', language: item.language ?? '',
            sourceCode: item.sourceCode ?? '', scriptType: item.scriptType,
            platform: item.platform, snippetType: item.snippetType,
            mediafireUrl: item.mediafireUrl ?? null, githubUrl: item.githubUrl ?? null,
            rating: Number(item.rating ?? 0), downloads: Number(item.downloads ?? 0),
            views: Number(item.views ?? 0), status: item.status ?? 'approved',
            createdAt: item.createdAt, updatedAt: item.updatedAt,
          };
        });
        if (active) setResources(data);
      } catch (err) {
        console.error('GLOBAL_SEARCH_ERROR:', err);
        if (active) setError('Gagal mengambil resource dari server.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadResources();
    return () => { active = false; };
  }, []);

  const results = useMemo(() => {
    const queryText = search.trim().toLowerCase();
    if (!queryText) return [];
    return resources.filter((resource) => {
      if (kindFilter !== 'All' && resource.kind !== kindFilter) return false;
      const haystack = [
        resource.title, resource.description, resource.author,
        resource.uploaderName, resource.uploaderEmail, resource.language,
        resource.category, resource.scriptType, resource.platform,
        resource.snippetType, ...resource.tags
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(queryText);
    }).sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
  }, [resources, search, kindFilter]);

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl min-w-0 overflow-hidden px-4 pb-12 pt-32 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[.2em] text-zinc-600">Global search</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Find resources</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500 sm:text-base">
            Search across approved Scripts, Snippets and Baileys resources.
          </p>
        </div>

        <section className="glass mt-8 rounded-3xl p-3 sm:p-4">
          <div className="relative">
            <SearchIcon size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scripts, snippets, Baileys..."
              className="w-full rounded-2xl border border-white/8 bg-black/20 py-4 pl-12 pr-12 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/15 sm:text-base" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-zinc-500 transition hover:bg-white/5 hover:text-white">
              <X size={16} />
            </button>}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar">
            {(['All', 'Script', 'Snippet', 'Baileys'] as KindFilter[]).map((item) => (
              <button key={item} type="button" onClick={() => setKindFilter(item)}
                className={`whitespace-nowrap rounded-xl border px-4 py-2 text-xs transition ${
                  kindFilter === item ? 'border-white/15 bg-white text-black' : 'border-white/8 bg-white/4 text-zinc-400 hover:text-white'
                }`}>
                {item}
              </button>
            ))}
          </div>
        </section>

        {loading && <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="glass h-72 animate-pulse rounded-3xl" />)}
        </div>}

        {!loading && error && <div className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-300">{error}</div>}

        {!loading && !error && !search.trim() && (
          <div className="glass mt-8 rounded-3xl p-10 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-zinc-600"><SearchIcon size={22} /></div>
            <h2 className="mt-4 text-lg font-medium text-zinc-300">Mulai mencari resource</h2>
            <p className="mt-2 text-sm text-zinc-600">Ketik nama script, bahasa pemrograman, author, platform, atau kata kunci lainnya.</p>
          </div>
        )}

        {!loading && !error && search.trim() && (
          <>
            <div className="mt-8 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-300">{results.length} result{results.length === 1 ? '' : 's'}</p>
                <p className="mt-1 text-xs text-zinc-600">Showing approved resources for "{search}"</p>
              </div>
              <SlidersHorizontal size={16} className="shrink-0 text-zinc-700" />
            </div>

            {results.length === 0 ? (
              <div className="glass mt-5 rounded-3xl p-10 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-zinc-600"><SearchIcon size={20} /></div>
                <p className="mt-4 text-lg font-medium text-zinc-300">Resource tidak ditemukan.</p>
                <p className="mt-2 text-sm text-zinc-600">Coba kata kunci lain atau ubah kategori.</p>
              </div>
            ) : (
              <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((resource) => <ResourceCard key={resource.id} r={resource} />)}
              </div>
            )}
          </>
        )}
      </main>
    </Shell>
  );
}
