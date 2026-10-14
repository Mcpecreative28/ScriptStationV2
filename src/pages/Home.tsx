
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Command,
  ShieldCheck,
  Sparkles,
  Upload,
  Search,
  Database,
  Users,
  Download,
  RefreshCw,
  Code2,
  FileCode2,
  MessageCircleCode,
} from 'lucide-react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import Shell from '../components/Shell';
import { db } from '../lib/firebase';

type HomeResource = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  resourceType?: string;
  language?: string;
  author?: string;
  ownerName?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  status?: string;
  createdAt?: {
    toMillis?: () => number;
  };
};

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-zinc-500">{icon}</div>

      <div className="mt-3 break-words text-xl font-semibold sm:text-2xl">
        {value}
      </div>

      <div className="mt-1 text-xs text-zinc-600">
        {label}
      </div>
    </div>
  );
}

function getResourcePath(resource: HomeResource) {
  const category = (
    resource.resourceType ||
    resource.category ||
    'scripts'
  ).toLowerCase();

  let basePath = '/scripts';

  if (category.includes('snippet')) {
    basePath = '/snippets';
  } else if (category.includes('baileys')) {
    basePath = '/baileys';
  }

  return `${basePath}/${resource.id}`;
}

function getResourceImage(resource: HomeResource) {
  return (
    resource.thumbnailUrl ||
    resource.thumbnail ||
    resource.imageUrl ||
    ''
  );
}

export default function Home() {
  const [resources, setResources] = useState<HomeResource[]>([]);
  const [totalResources, setTotalResources] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadHomeResources() {
      if (!db) {
        setLoadError('Firebase belum tersedia.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');

      try {
        const resourcesQuery = query(
          collection(db, 'scripts'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(6),
        );

        const snapshot = await getDocs(resourcesQuery);

        const latestResources: HomeResource[] =
          snapshot.docs.map((item) => ({
            ...(item.data() as Omit<HomeResource, 'id'>),
            id: item.id,
          }));

        if (!active) return;

        setResources(latestResources);
        setTotalResources(latestResources.length);
      } catch (error) {
        console.error(error);

        if (active) {
          setLoadError(
            'Resource belum dapat dimuat. Silakan coba lagi.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadHomeResources();

    return () => {
      active = false;
    };
  }, []);

  const categories = new Set(
    resources.map(
      (resource) =>
        resource.resourceType || resource.category,
    ).filter(Boolean),
  ).size;

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6">
        <section className="relative py-10 sm:py-20">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400">
              <Sparkles size={13} />
              Open Developer Ecosystem
            </div>

            <h1 className="text-5xl font-semibold leading-[.95] tracking-[-.055em] sm:text-7xl lg:text-8xl">
              Build.
              <br />

              <span className="bg-gradient-to-r from-white via-zinc-400 to-zinc-700 bg-clip-text text-transparent">
                Share. Discover.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-500 sm:text-lg">
              Tempat publik untuk menemukan scripts,
              snippets, Baileys resources, tools digital,
              dan komunitas developer dalam satu hub.
            </p>

            <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
              <Link
                to="/scripts"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
              >
                Explore Resources
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/scripts/upload"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold transition hover:bg-white/10"
              >
                <Upload size={17} />
                Upload Resource
              </Link>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              icon={<Database size={20} />}
              value={loading ? '...' : String(totalResources)}
              label="Resource terbaru"
            />

            <Stat
              icon={<Code2 size={20} />}
              value={loading ? '...' : String(categories)}
              label="Kategori pada resource terbaru"
            />

            <Stat
              icon={<Users size={20} />}
              value="Google"
              label="Login akun"
            />

            <Stat
              icon={<ShieldCheck size={20} />}
              value="Protected"
              label="Akses dan moderasi"
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-zinc-600">
            Jumlah resource dan kategori dihitung dari maksimal
            enam resource publik terbaru yang berhasil dimuat,
            bukan total seluruh database.
          </p>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
                Discover
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Trending Resources
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Resource publik terbaru yang sudah disetujui.
              </p>
            </div>

            <Link
              to="/scripts"
              className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
              Lihat semua
              <ArrowRight size={15} />
            </Link>
          </div>

          {loading ? (
            <div className="glass rounded-3xl p-10 text-center">
              <RefreshCw
                size={24}
                className="mx-auto mb-3 animate-spin text-zinc-500"
              />

              <p className="text-sm text-zinc-500">
                Memuat resource publik...
              </p>
            </div>
          ) : loadError ? (
            <div className="glass rounded-3xl p-8 text-center">
              <Database
                size={28}
                className="mx-auto mb-3 text-zinc-600"
              />

              <p className="text-sm text-zinc-400">
                {loadError}
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
              >
                Coba lagi
              </button>
            </div>
          ) : resources.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center sm:p-12">
              <FileCode2
                size={32}
                className="mx-auto mb-4 text-zinc-600"
              />

              <h3 className="text-lg font-semibold">
                Belum ada resource publik
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Resource yang sudah disetujui admin akan
                ditampilkan di sini.
              </p>

              <Link
                to="/scripts/upload"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                <Upload size={16} />
                Upload Resource
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((resource) => {
                const image = getResourceImage(resource);
                const category =
                  resource.resourceType ||
                  resource.category ||
                  'Script';

                return (
                  <Link
                    key={resource.id}
                    to={getResourcePath(resource)}
                    className="glass group min-w-0 overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1 hover:border-white/20"
                  >
                    {image ? (
                      <div className="aspect-[16/9] overflow-hidden border-b border-white/5 bg-black/20">
                        <img
                          src={image}
                          alt={resource.title || 'Resource preview'}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[16/9] items-center justify-center border-b border-white/5 bg-gradient-to-br from-white/[0.06] to-transparent">
                        <MessageCircleCode
                          size={42}
                          strokeWidth={1.2}
                          className="text-zinc-600 transition group-hover:text-zinc-300"
                        />
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-400">
                          {category}
                        </span>

                        {resource.language && (
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-500">
                            {resource.language}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 break-words text-lg font-semibold text-zinc-100 transition group-hover:text-white">
                        {resource.title || 'Untitled Resource'}
                      </h3>

                      <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-zinc-500">
                        {resource.description ||
                          'Belum ada deskripsi.'}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
                        <span className="min-w-0 truncate text-xs text-zinc-600">
                          Oleh{' '}
                          {resource.author ||
                            resource.ownerName ||
                            'Anonymous'}
                        </span>

                        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-300 transition group-hover:text-white">
                          Lihat
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-16 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
          <div className="glass rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-2 text-zinc-400">
              <Command size={17} />

              <span className="text-xs uppercase tracking-widest">
                Quick Search
              </span>
            </div>

            <h2 className="mt-5 text-3xl font-semibold">
              Find something useful.
            </h2>

            <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-500">
              Cari berdasarkan nama resource, kategori,
              bahasa pemrograman, atau author.
            </p>

            <Link
              to="/search"
              className="mt-6 flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
            >
              <Search size={17} />
              Search scripts, snippets, Baileys...
              <ArrowRight size={15} className="ml-auto" />
            </Link>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black">
              <ShieldCheck size={21} />
            </div>

            <h3 className="text-xl font-semibold">
              Security by Design
            </h3>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Resource publik melalui moderasi admin.
              Akses data tetap mengikuti autentikasi
              dan Firestore Rules.
            </p>
          </div>
        </section>
      </main>
    </Shell>
  );
}