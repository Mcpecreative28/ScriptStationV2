import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
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

function formatDownloads(value: number) {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

export default function Listing({
  kind,
}: {
  kind?: Resource['kind'];
}) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

        const firestore = db;

        const resourcesQuery = query(
          collection(firestore, 'scripts'),
          where('status', '==', 'approved')
        );

        const snapshot = await getDocs(resourcesQuery);

        const data: Resource[] = snapshot.docs
          .map((document) => {
            const item =
              document.data() as FirestoreResource;

            const rawKind =
              item.resourceType ??
              item.category ??
              'Script';

            const resourceKind: Resource['kind'] =
              rawKind === 'Snippet'
                ? 'Snippet'
                : rawKind === 'Baileys'
                  ? 'Baileys'
                  : 'Script';

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

              language: item.language ?? '',

              author: item.author ?? 'Unknown',

              rating: Number(item.rating ?? 0),

              downloads: formatDownloads(
                Number(item.downloads ?? 0)
              ),

              tags: Array.isArray(item.tags)
                ? item.tags
                : [],

              kind: resourceKind,

              thumbnailUrl:
                item.thumbnailUrl ?? null,

              uploaderName:
                item.ownerName ?? '',

              uploaderEmail:
                item.ownerEmail ?? '',

              ownerId:
                item.ownerId ?? '',

              sourceCode:
                item.sourceCode ?? '',

              scriptType:
                item.scriptType,

              platform:
                item.platform,

              snippetType:
                item.snippetType,

              mediafireUrl:
                item.mediafireUrl ?? null,

              githubUrl:
                item.githubUrl ?? null,

              views:
                Number(item.views ?? 0),

              status:
                item.status ?? 'approved',

              createdAt:
                item.createdAt,

              updatedAt:
                item.updatedAt,
            };
          })
          .sort((a, b) =>
            a.title.localeCompare(
              b.title,
              undefined,
              {
                sensitivity: 'base',
              }
            )
          );

        if (active) {
          setResources(data);
        }
      } catch (err) {
        console.error(
          'LISTING_LOAD_ERROR:',
          err
        );

        if (active) {
          setError(
            'Gagal mengambil resource dari server.'
          );
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

  const list = kind
    ? resources.filter(
        (resource) => resource.kind === kind
      )
    : resources;

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
            to={
              kind === 'Snippet'
                ? '/snippets/upload'
                : kind === 'Baileys'
                  ? '/baileys/upload'
                  : '/scripts/upload'
            }
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            <Upload size={16} />
            Upload
          </Link>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto scrollbar pb-2">
          {[
            'Latest',
            'Popular',
            'Top Rated',
            'Most Downloaded',
            'A-Z',
          ].map((item) => (
            <button
              key={item}
              type="button"
              className="whitespace-nowrap rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-xs text-zinc-400 transition hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>

        {loading && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="glass h-72 animate-pulse rounded-3xl"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          list.length === 0 && (
            <div className="glass mt-8 rounded-3xl p-10 text-center">
              <p className="text-lg font-medium text-zinc-300">
                Belum ada resource yang tersedia.
              </p>

              <p className="mt-2 text-sm text-zinc-600">
                Resource yang sudah disetujui admin akan muncul di sini.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          list.length > 0 && (
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