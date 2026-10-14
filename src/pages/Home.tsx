
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
  Eye,
  Star,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  collection,
  getDocs,
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
  views?: number;
  downloads?: number;
  rating?: number;
  averageRating?: number;
  createdAt?: {
    toMillis?: () => number;
  };
};

type SiteStats = {
  totalUsers: number;
  totalResources: number;
  totalViews: number;
  totalDownloads: number;
  averageRating: number;
  totalRatings: number;
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
    <div className="glass rounded-2xl p-4 sm:p-5">
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

  if (category.includes('snippet')) {
    return `/snippets/${resource.id}`;
  }

  if (category.includes('baileys')) {
    return `/baileys/${resource.id}`;
  }

  return `/scripts/${resource.id}`;
}

function getResourceImage(resource: HomeResource) {
  return (
    resource.thumbnailUrl ||
    resource.thumbnail ||
    resource.imageUrl ||
    ''
  );
}

function getCreatedTime(resource: HomeResource) {
  return resource.createdAt?.toMillis?.() ?? 0;
}

function getRating(resource: HomeResource) {
  return resource.averageRating ?? resource.rating ?? 0;
}

function getPopularity(resource: HomeResource) {
  return (
    (resource.views ?? 0) +
    (resource.downloads ?? 0) * 3 +
    getRating(resource) * 2
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
}

function ResourceCard({
  resource,
}: {
  resource: HomeResource;
}) {
  const image = getResourceImage(resource);
  const category =
    resource.resourceType ||
    resource.category ||
    'Script';

  return (
    <Link
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
          {resource.description || 'Belum ada deskripsi.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <Eye size={14} />
            {formatNumber(resource.views ?? 0)}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Download size={14} />
            {formatNumber(resource.downloads ?? 0)}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Star size={14} />
            {getRating(resource).toFixed(1)}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
          <span className="min-w-0 truncate text-xs text-zinc-600">
            Oleh {resource.author || resource.ownerName || 'Anonymous'}
          </span>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-300 transition group-hover:text-white">
            Lihat
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const [resources, setResources] = useState<HomeResource[]>([]);
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
        const approvedQuery = query(
          collection(db, 'scripts'),
          where('status', '==', 'approved'),
        );

        const snapshot = await getDocs(approvedQuery);

        const approvedResources: HomeResource[] =
          snapshot.docs.map((item) => ({
            ...(item.data() as Omit<HomeResource, 'id'>),
            id: item.id,
          }));

        approvedResources.sort(
          (a, b) => getCreatedTime(b) - getCreatedTime(a),
        );

        if (!active) return;

        setResources(approvedResources);
      } catch (error) {
        console.error('Home resource loading error:', error);

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
  
const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
const [statsLoading, setStatsLoading] = useState(true);

useEffect(() => {
  let active = true;

  async function loadSiteStats() {
    try {
      const response = await fetch('/api/site-stats', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil statistik situs.');
      }

      const data = await response.json();

      if (
        !data.success ||
        !Number.isFinite(data.totalUsers) ||
        !Number.isFinite(data.totalResources) ||
        !Number.isFinite(data.totalViews) ||
        !Number.isFinite(data.totalDownloads)
      ) {
        throw new Error('Format statistik tidak valid.');
      }

      if (active) {
        setSiteStats({
          totalUsers: data.totalUsers,
          totalResources: data.totalResources,
          totalViews: data.totalViews,
          totalDownloads: data.totalDownloads,
          averageRating: Number(data.averageRating) || 0,
          totalRatings: Number(data.totalRatings) || 0,
        });
      }
    } catch (error) {
      console.error('Site stats loading error:', error);
    } finally {
      if (active) {
        setStatsLoading(false);
      }
    }
  }

  void loadSiteStats();

  return () => {
    active = false;
  };
}, []);

  
const totalResources = siteStats?.totalResources ?? resources.length;
const totalViews = siteStats?.totalViews ?? 0;
const totalDownloads = siteStats?.totalDownloads ?? 0;

  const trendingResources = [...resources]
    .sort((a, b) => getPopularity(b) - getPopularity(a))
    .slice(0, 6);

  const recentlyUploaded = resources.slice(0, 6);

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6">
        <section className="relative py-8 sm:py-16">
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

          
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              icon={<Database size={20} />}
              value={statsLoading ? '...' : formatNumber(totalResources)}
              label="Total Resources"
            />

            <Stat
              icon={<Users size={20} />}
              value={statsLoading ? '...' : formatNumber(siteStats?.totalUsers ?? 0)}
              label="Total Users"
            />

            <Stat
              icon={<Eye size={20} />}
              value={statsLoading ? '...' : formatNumber(totalViews)}
              label="Total Views"
            />

            <Stat
              icon={<Download size={20} />}
              value={statsLoading ? '...' : formatNumber(totalDownloads)}
              label="Total Downloads"
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-zinc-600">
            Statistik dihitung dari resource berstatus approved dan data
            pengguna yang tercatat di server.
          </p>
        </section>

        {[
          {
            title: 'Trending Resources',
            subtitle: 'Resource populer berdasarkan views, downloads, dan rating.',
            icon: <TrendingUp size={17} />,
            items: trendingResources,
          },
          {
            title: 'Recently Uploaded',
            subtitle: 'Resource terbaru yang sudah disetujui admin.',
            icon: <Clock size={17} />,
            items: recentlyUploaded,
          },
        ].map((section) => (
          <section key={section.title} className="mt-12">
            <div className="mb-6 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-end min-[420px]:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-zinc-600">
                  {section.icon}
                  Discover
                </p>

                <h2 className="mt-2 text-2xl font-semibold">
                  {section.title}
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  {section.subtitle}
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
            ) : section.items.length === 0 ? (
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
                {section.items.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                  />
                ))}
              </div>
            )}
          </section>
        ))}

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