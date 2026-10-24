
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Command,
  ShieldCheck,
  Sparkles,
  Upload,
  Code2,
  Search,
  Database,
  Users,
  Download,
  RefreshCw,
  FileCode2,
  MessageCircleCode,
  Eye,
  Star,
  Clock,
  TrendingUp,
  Store,
  ScanSearch,
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

function formatNumber(value: number) {
  return new Intl.NumberFormat('id-ID').format(value);
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
    <div className="glass group relative min-w-0 overflow-hidden rounded-2xl border border-white/[0.07] p-4 transition duration-300 hover:-translate-y-1 hover:border-white/[0.15] sm:p-5 motion-reduce:transform-none motion-reduce:transition-none">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/[0.035] blur-2xl transition duration-500 group-hover:bg-white/[0.08]" />

      <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition duration-300 group-hover:border-white/[0.15] group-hover:text-white">
        {icon}
      </div>

      <div className="relative mt-4 break-words text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
        {value}
      </div>

      <div className="relative mt-1 text-xs text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function ResourceCard({
  resource,
  index = 0,
}: {
  resource: HomeResource;
  index?: number;
}) {
  const image = getResourceImage(resource);
  const category =
    resource.resourceType ||
    resource.category ||
    'Script';

  const rating = getRating(resource);

  return (
    <Link
      to={getResourcePath(resource)}
      style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }}
      className="glass group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-white/[0.07] transition duration-300 animate-[home-card-in_0.5s_ease-out_both] hover:-translate-y-1 hover:border-white/[0.16] hover:bg-white/[0.025] motion-reduce:animate-none motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/[0.06] bg-black/20">
        {image ? (
          <img
            src={image}
            alt={resource.title || 'Resource preview'}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/[0.07] via-white/[0.025] to-transparent">
            <MessageCircleCode
              size={42}
              strokeWidth={1.2}
              className="text-zinc-600 transition duration-300 group-hover:scale-110 group-hover:text-zinc-300 motion-reduce:transform-none motion-reduce:transition-none"
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70" />

        <div className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)]">
          <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-zinc-200 backdrop-blur-xl">
            <FileCode2 size={13} className="shrink-0" />
            <span className="truncate">{category}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {resource.language && (
            <span className="max-w-full truncate rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[11px] text-zinc-500">
              {resource.language}
            </span>
          )}

          {rating > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/10 bg-amber-300/[0.04] px-2.5 py-1 text-[11px] text-amber-200/80">
              <Star size={11} />
              {rating.toFixed(1)}
            </span>
          )}
        </div>

        <h3 className="mt-4 break-words text-base font-semibold leading-6 text-zinc-100 transition duration-300 group-hover:text-white sm:text-lg">
          {resource.title || 'Untitled Resource'}
        </h3>

        <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-zinc-500">
          {resource.description || 'Belum ada deskripsi.'}
        </p>

        <div className="mt-auto">
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Eye size={14} />
              {formatNumber(resource.views ?? 0)}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Download size={14} />
              {formatNumber(resource.downloads ?? 0)}
            </span>

            {rating <= 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Star size={14} />
                Belum dinilai
              </span>
            )}
          </div>

          <div className="mt-5 flex min-w-0 items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
            <span className="min-w-0 truncate text-xs text-zinc-600">
              Oleh {resource.author || resource.ownerName || 'Anonymous'}
            </span>

            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-300 transition duration-300 group-hover:translate-x-0.5 group-hover:text-white motion-reduce:transform-none motion-reduce:transition-none">
              Lihat
              <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
        {icon}
        Discover
      </p>

      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
        {title}
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
        {subtitle}
      </p>
    </div>
  );
}

export default function Home() {
  const [resources, setResources] = useState<HomeResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const [siteStats, setSiteStats] = useState<SiteStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadHomeResources = useCallback(async () => {
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

      const approvedResources: HomeResource[] = snapshot.docs.map(
        (item) => ({
          ...(item.data() as Omit<HomeResource, 'id'>),
          id: item.id,
        }),
      );

      approvedResources.sort(
        (a, b) => getCreatedTime(b) - getCreatedTime(a),
      );

      setResources(approvedResources);
    } catch (error) {
      console.error('Home resource loading error:', error);
      setLoadError(
        'Resource belum dapat dimuat. Silakan coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomeResources();
  }, [loadHomeResources, retryKey]);

  useEffect(() => {
    let active = true;

    async function loadSiteStats() {
      setStatsLoading(true);

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

  const totalResources =
    siteStats?.totalResources ?? resources.length;

  const totalViews = siteStats?.totalViews ?? 0;
  const totalDownloads = siteStats?.totalDownloads ?? 0;

  const trendingResources = [...resources]
    .sort((a, b) => getPopularity(b) - getPopularity(a))
    .slice(0, 6);

  const recentlyUploaded = resources.slice(0, 6);

  const resourceSections = [
    {
      title: 'Trending Resources',
      subtitle:
        'Resource populer berdasarkan views, downloads, dan rating.',
      icon: <TrendingUp size={17} />,
      items: trendingResources,
    },
    {
      title: 'Recently Uploaded',
      subtitle:
        'Temukan resource terbaru yang sudah disetujui admin.',
      icon: <Clock size={17} />,
      items: recentlyUploaded,
    },
  ];

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/[0.07] bg-white/[0.015] px-5 py-10 sm:px-9 sm:py-14 lg:px-12 lg:py-16">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-white/[0.055] blur-[100px]" />
            <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-indigo-400/[0.045] blur-[100px]" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.025] via-transparent to-transparent" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.65fr] lg:gap-12">
            <div className="min-w-0 animate-[home-card-in_0.65s_ease-out_both]">
              <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 py-2 text-xs text-zinc-400">
                <Sparkles size={14} className="shrink-0 text-zinc-200" />
                <span>Open Developer Ecosystem</span>
              </div>

              <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-7xl lg:text-[5.5rem]">
                Build.
                <br />
                <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
                  Share. Discover.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-zinc-400 sm:mt-7 sm:text-base sm:leading-8 lg:text-lg">
                Tempat publik untuk menemukan scripts, snippets,
                Baileys resources, tools digital, dan komunitas
                developer dalam satu hub.
              </p>

              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <Link
                  to="/scripts"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition duration-300 hover:-translate-y-0.5 hover:bg-zinc-200 motion-reduce:transform-none motion-reduce:transition-none"
                >
                  Explore Resources
                  <ArrowRight
                    size={17}
                    className="transition duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                </Link>

                <Link
                  to="/scripts/upload"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-semibold text-zinc-200 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <Upload size={17} />
                  Upload Resource
                </Link>

                <Link
                  to="/downloader"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-violet-300/15 bg-violet-300/[0.07] px-5 py-3 text-sm font-semibold text-violet-100 transition duration-300 hover:-translate-y-0.5 hover:border-violet-300/30 hover:bg-violet-300/[0.12] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <Download size={17} />
                  Downloader Hub
                  <ArrowRight size={15} />
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                  Community-driven
                </span>

                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={13} />
                  Moderated resources
                </span>
              </div>
            </div>

            <div className="relative hidden min-h-[290px] items-center justify-center lg:flex">
              <div className="absolute h-64 w-64 rounded-full border border-white/[0.07]" />
              <div className="absolute h-48 w-48 rounded-full border border-white/[0.09]" />
              <div className="absolute h-32 w-32 rounded-full border border-white/[0.12]" />

              <div className="absolute h-64 w-64 animate-[spin_32s_linear_infinite] rounded-full border border-dashed border-white/[0.13] motion-reduce:animate-none" />

              <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/15 bg-white/[0.07] shadow-2xl shadow-black/30 backdrop-blur-xl">
                <Command size={42} strokeWidth={1.1} className="text-zinc-100" />
                <div className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-300 shadow-xl">
                  <Code2 size={17} />
                </div>
                <div className="absolute -bottom-3 -left-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-300 shadow-xl">
                  <Database size={17} />
                </div>
              </div>

              <div className="absolute right-0 top-10 rounded-2xl border border-white/10 bg-zinc-950/75 px-4 py-3 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <FileCode2 size={15} />
                  <span>Scripts & Snippets</span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-600">
                  Discover something useful
                </div>
              </div>

              <div className="absolute bottom-8 left-0 rounded-2xl border border-white/10 bg-zinc-950/75 px-4 py-3 shadow-xl backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Users size={15} />
                  <span>Built for developers</span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-600">
                  Share knowledge together
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Platform Overview
              </p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-200">
                Statistik platform
              </h2>
            </div>

            <span className="text-xs text-zinc-600">
              {statsLoading ? 'Memperbarui data...' : 'Data dari server'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Stat
              icon={<Database size={19} />}
              value={
                statsLoading
                  ? '...'
                  : formatNumber(totalResources)
              }
              label="Total Resources"
            />

            <Stat
              icon={<Users size={19} />}
              value={
                statsLoading
                  ? '...'
                  : formatNumber(siteStats?.totalUsers ?? 0)
              }
              label="Total Users"
            />

            <Stat
              icon={<Eye size={19} />}
              value={
                statsLoading
                  ? '...'
                  : formatNumber(totalViews)
              }
              label="Total Views"
            />

            <Stat
              icon={<Download size={19} />}
              value={
                statsLoading
                  ? '...'
                  : formatNumber(totalDownloads)
              }
              label="Total Downloads"
            />
          </div>

          <p className="mt-3 text-xs leading-5 text-zinc-600">
            Statistik dihitung dari resource berstatus approved dan
            data pengguna yang tercatat di server.
          </p>
        </section>

        {resourceSections.map((section, sectionIndex) => (
          <section
            key={section.title}
            className="mt-14 sm:mt-16"
          >
            <div className="mb-6 flex flex-col gap-4 min-[520px]:flex-row min-[520px]:items-end min-[520px]:justify-between">
              <SectionHeading
                title={section.title}
                subtitle={section.subtitle}
                icon={section.icon}
              />

              <Link
                to="/scripts"
                className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-sm text-zinc-400 transition duration-300 hover:border-white/[0.16] hover:bg-white/[0.035] hover:text-white"
              >
                Lihat semua
                <ArrowRight size={15} />
              </Link>
            </div>

            {loading ? (
              <div className="glass rounded-3xl border border-white/[0.07] p-10 text-center sm:p-14">
                <RefreshCw
                  size={24}
                  className="mx-auto mb-4 animate-spin text-zinc-500 motion-reduce:animate-none"
                />
                <p className="text-sm text-zinc-400">
                  Memuat resource publik...
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Mengambil resource yang sudah disetujui.
                </p>
              </div>
            ) : loadError ? (
              <div className="glass rounded-3xl border border-white/[0.07] p-8 text-center sm:p-12">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-zinc-500">
                  <Database size={23} />
                </div>

                <p className="mt-4 text-sm text-zinc-300">
                  {loadError}
                </p>

                <button
                  type="button"
                  onClick={() => setRetryKey((value) => value + 1)}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition duration-300 hover:bg-white/[0.06] hover:text-white"
                >
                  <RefreshCw size={15} />
                  Coba lagi
                </button>
              </div>
            ) : section.items.length === 0 ? (
              <div className="glass rounded-3xl border border-white/[0.07] p-8 text-center sm:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-zinc-500">
                  <FileCode2 size={28} />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-zinc-200">
                  Belum ada resource publik
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Resource yang sudah disetujui admin akan
                  ditampilkan di sini.
                </p>

                <Link
                  to="/scripts/upload"
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition duration-300 hover:bg-zinc-200"
                >
                  <Upload size={16} />
                  Upload Resource
                </Link>
              </div>
            ) : (
              <div
                key={`${section.title}-${sectionIndex}`}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {section.items.map((resource, index) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    index={index}
                  />
                ))}
              </div>
            )}
          </section>
        ))}

        <section className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            to="/rooms"
            className="glass group relative overflow-hidden rounded-3xl border border-white/[0.07] p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.025] sm:p-7 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-300/[0.06] blur-3xl transition duration-500 group-hover:bg-cyan-300/[0.11]" />

            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.07] text-cyan-200 transition duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
              <MessageCircleCode size={22} />
            </div>

            <h2 className="relative mt-5 text-lg font-semibold text-zinc-100">
              Global Chat
            </h2>

            <p className="relative mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Diskusi publik bersama komunitas developer dan
              berbagi pengetahuan.
            </p>

            <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition duration-300 group-hover:gap-3">
              Buka Rooms
              <ArrowRight size={15} />
            </span>
          </Link>

          <Link
            to="/marketplace"
            className="glass group relative overflow-hidden rounded-3xl border border-white/[0.07] p-6 transition duration-300 hover:-translate-y-1 hover:border-indigo-300/25 hover:bg-white/[0.025] sm:p-7 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-300/[0.06] blur-3xl transition duration-500 group-hover:bg-indigo-300/[0.11]" />

            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-300/10 bg-indigo-300/[0.07] text-indigo-200 transition duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
              <Store size={22} />
            </div>

            <h2 className="relative mt-5 text-lg font-semibold text-zinc-100">
              Marketplace
            </h2>

            <p className="relative mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Jelajahi tools, produk, dan resource pilihan dari
              komunitas.
            </p>

            <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-medium text-indigo-200 transition duration-300 group-hover:gap-3">
              Jelajahi Marketplace
              <ArrowRight size={15} />
            </span>
          </Link>
          
<Link
            to="/downloader"
            className="glass group relative overflow-hidden rounded-3xl border border-cyan-300/15 p-6 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:bg-white/[0.025] sm:p-7 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/[0.08] blur-3xl transition duration-500 group-hover:bg-cyan-400/[0.16]" />

            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.08] text-cyan-200 transition duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
              <Download size={22} />
            </div>

            <div className="relative mt-5 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">
                Downloader Hub
              </h2>
              <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.07] px-2 py-1 text-[10px] font-medium text-cyan-200">
                MULTI PLATFORM
              </span>
            </div>

            <p className="relative mt-2 text-sm leading-6 text-zinc-500">
              Unduh media dari platform yang didukung melalui satu halaman,
              dengan pilihan layanan dan resolusi yang tersedia.
            </p>

            <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition duration-300 group-hover:gap-3">
              Buka Downloader
              <ArrowRight size={15} />
            </span>
          </Link>

          <Link
  to="/amfinder"
  className="glass group relative overflow-hidden rounded-3xl border border-violet-300/15 p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/[0.025] sm:p-7 motion-reduce:transform-none motion-reduce:transition-none"
>
  <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-400/[0.08] blur-3xl transition duration-500 group-hover:bg-violet-400/[0.16]" />

  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-300/[0.08] text-violet-200 transition duration-300 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
    <ScanSearch size={22} />
  </div>

  <div className="relative mt-5 flex flex-wrap items-center gap-2">
    <h2 className="text-lg font-semibold text-zinc-100">
      AMFinder
    </h2>
    <span className="rounded-full border border-violet-300/15 bg-violet-300/[0.07] px-2 py-1 text-[10px] font-medium text-violet-200">
      PRESET TOOLS
    </span>
  </div>

  <p className="relative mt-2 text-sm leading-6 text-zinc-500">
    Temukan preset Alight Motion dari tautan video TikTok.
    Pindai hasil yang tersedia dari deskripsi, bio, dan komentar
    melalui layanan pencarian preset.
  </p>

  <span className="relative mt-5 inline-flex items-center gap-2 text-sm font-medium text-violet-200 transition duration-300 group-hover:gap-3">
    Cari Preset
    <ArrowRight size={15} />
  </span>
</Link>
        </section>

        <section className="mt-14 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="glass relative overflow-hidden rounded-3xl border border-white/[0.07] p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/[0.035] blur-3xl" />

            <div className="relative flex items-center gap-2 text-zinc-400">
              <Command size={17} />
              <span className="text-xs uppercase tracking-[0.18em]">
                Quick Search
              </span>
            </div>

            <h2 className="relative mt-5 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
              Find something useful.
            </h2>

            <p className="relative mt-3 max-w-lg text-sm leading-6 text-zinc-500">
              Cari berdasarkan nama resource, kategori, bahasa
              pemrograman, atau author.
            </p>

            <Link
              to="/search"
              className="group relative mt-6 flex min-h-12 w-full max-w-xl items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-zinc-500 transition duration-300 hover:border-white/[0.18] hover:bg-black/30 hover:text-zinc-300"
            >
              <Search size={17} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                Search scripts, snippets, Baileys...
              </span>
              <ArrowRight
                size={15}
                className="shrink-0 transition duration-300 group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <div className="glass relative overflow-hidden rounded-3xl border border-white/[0.07] p-6 sm:p-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
              <ShieldCheck size={22} />
            </div>

            <h3 className="text-xl font-semibold text-zinc-100">
              Security by Design
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Resource publik melalui moderasi admin. Akses data
              tetap mengikuti autentikasi dan Firestore Rules.
            </p>

            <div className="mt-5 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-xs text-zinc-500">
              <ShieldCheck size={14} />
              <span>Moderated public resources</span>
            </div>
          </div>
        </section>

        <footer className="mt-14 flex flex-col gap-2 border-t border-white/[0.07] pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>ScriptStationV2</span>
          <span>Build, share, and discover.</span>
        </footer>
      </main>
    </Shell>
  );
}