
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import {
  ArrowRight,
  Code2,
  Download,
  Eye,
  FileCode2,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
} from 'lucide-react';

import Shell from '../components/Shell';
import { auth, db } from '../lib/firebase';

type Profile = {
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
};

type Resource = {
  id: string;
  title?: string;
  description?: string;
  resourceType?: string;
  category?: string;
  status?: string;
  views?: number;
  downloads?: number;
  createdAt?: { toDate?: () => Date } | Date | null;
};

type ResourceFilter = 'all' | 'pending' | 'approved' | 'rejected';

const statusLabels: Record<string, string> = {
  pending: 'Menunggu review',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

function getResourceType(resource: Resource) {
  const value = resource.resourceType || resource.category || 'Resource';
  const normalized = value.toLowerCase();

  if (normalized.includes('snippet')) return 'Snippet';
  if (normalized.includes('baileys')) return 'Baileys';
  if (normalized.includes('script')) return 'Script';

  return value;
}

function formatDate(value: Resource['createdAt']) {
  if (!value) return 'Tanggal tidak tersedia';

  try {
    const date =
      value instanceof Date
        ? value
        : typeof value.toDate === 'function'
          ? value.toDate()
          : null;

    if (!date || Number.isNaN(date.getTime())) {
      return 'Tanggal tidak tersedia';
    }

    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Tanggal tidak tersedia';
  }
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<ResourceFilter>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  async function loadDashboard(currentUser: User, showLoader = false) {
    if (!db) {
      setError('Firebase Firestore belum terkonfigurasi.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoader) setRefreshing(true);
    setError('');

    try {
      const [profileSnapshot, resourceSnapshot] = await Promise.all([
        getDoc(doc(db, 'users', currentUser.uid)),
        getDocs(
          query(
            collection(db, 'scripts'),
            where('ownerId', '==', currentUser.uid)
          )
        ),
      ]);

      if (profileSnapshot.exists()) {
        setProfile(profileSnapshot.data() as Profile);
      }

      const items: Resource[] = resourceSnapshot.docs.map((item) => {
        const data = item.data() as DocumentData;

        return {
          id: item.id,
          title: data.title,
          description: data.description,
          resourceType: data.resourceType,
          category: data.category,
          status: data.status || 'pending',
          views: Number(data.views ?? 0),
          downloads: Number(data.downloads ?? 0),
          createdAt: data.createdAt ?? null,
        };
      });

      items.sort((a, b) => {
        const getTime = (item: Resource) => {
          const value = item.createdAt;
          if (!value) return 0;

          try {
            if (value instanceof Date) return value.getTime();
            if (typeof value.toDate === 'function') {
              return value.toDate().getTime();
            }
          } catch {
            return 0;
          }

          return 0;
        };

        return getTime(b) - getTime(a);
      });

      setResources(items);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(
        'Gagal memuat dashboard. Periksa koneksi dan izin baca Firestore.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!auth || !db) {
      setError('Firebase belum terkonfigurasi.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate('/login', { replace: true });
        return;
      }

      setUser(currentUser);
      void loadDashboard(currentUser);
    });

    return () => unsubscribe();
  }, [navigate]);

  const stats = useMemo(() => {
    return resources.reduce(
      (result, resource) => {
        result.views += Number(resource.views ?? 0);
        result.downloads += Number(resource.downloads ?? 0);
        return result;
      },
      { resources: resources.length, views: 0, downloads: 0 }
    );
  }, [resources]);

  const counts = useMemo(
    () => ({
      all: resources.length,
      pending: resources.filter((item) => item.status === 'pending').length,
      approved: resources.filter((item) => item.status === 'approved').length,
      rejected: resources.filter((item) => item.status === 'rejected').length,
    }),
    [resources]
  );

  const filteredResources = useMemo(
    () =>
      filter === 'all'
        ? resources
        : resources.filter((item) => item.status === filter),
    [resources, filter]
  );

  async function handleLogout() {
    if (!auth) return;

    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      setError('Logout gagal. Silakan coba lagi.');
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 pt-28">
          <div className="glass flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-zinc-400">
            <Loader2 size={18} className="animate-spin" />
            Memuat dashboard...
          </div>
        </main>
      </Shell>
    );
  }

  const displayName =
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Developer';

  const email = profile?.email || user?.email || '';
  const photoURL = profile?.photoURL || user?.photoURL || '';
  const role = profile?.role || 'user';

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
        <section className="relative overflow-hidden">
          <div className="orb -right-10 -top-20 h-64 w-64 bg-indigo-500" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400">
              <Sparkles size={13} />
              Your developer space
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-zinc-500">Selamat datang kembali,</p>
                <h1 className="mt-1 break-words text-4xl font-semibold tracking-tight sm:text-6xl">
                  {displayName}
                  <span className="text-zinc-700">.</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                  Pantau resource, status review, dan statistik karya kamu di
                  ScriptStationV2.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => user && void loadDashboard(user, true)}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? 'animate-spin' : ''}
                  />
                  Refresh
                </button>

                <Link
                  to="/scripts/upload"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
                >
                  <Upload size={17} />
                  Upload Resource
                </Link>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-9 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="glass rounded-3xl p-6 sm:p-7">
            <div className="flex items-center gap-4">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Foto profil"
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
                  <UserRound size={28} className="text-zinc-400" />
                </div>
              )}

              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">{displayName}</h2>
                <p className="mt-1 truncate text-sm text-zinc-500">{email}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/7 bg-black/20 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <ShieldCheck size={17} />
                Account role
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium capitalize text-zinc-300">
                {role}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <LogOut size={17} />
              )}
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<FileCode2 size={20} />}
              value={stats.resources}
              label="My Resources"
              description="Total resource milikmu"
            />
            <StatCard
              icon={<Eye size={20} />}
              value={stats.views}
              label="Total Views"
              description="Jumlah views tersimpan"
            />
            <StatCard
              icon={<Download size={20} />}
              value={stats.downloads}
              label="Downloads"
              description="Jumlah download tersimpan"
            />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
                Resource manager
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Resource saya</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Daftar ini diambil dari koleksi Firestore milik akunmu.
              </p>
            </div>
            <span className="text-sm text-zinc-500">
              {resources.length} resource
            </span>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {(
              [
                ['all', 'Semua'],
                ['pending', 'Menunggu review'],
                ['approved', 'Disetujui'],
                ['rejected', 'Ditolak'],
              ] as [ResourceFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-xl border px-3 py-2 text-xs transition ${
                  filter === value
                    ? 'border-white/20 bg-white text-black'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {label}
                <span className="ml-2 opacity-70">{counts[value]}</span>
              </button>
            ))}
          </div>

          {filteredResources.length === 0 ? (
            <div className="glass rounded-3xl px-5 py-12 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5">
                <Code2 size={22} className="text-zinc-400" />
              </div>
              <h3 className="mt-4 font-semibold">
                {resources.length === 0
                  ? 'Belum ada resource'
                  : 'Tidak ada resource di filter ini'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                {resources.length === 0
                  ? 'Resource yang kamu upload akan muncul di sini beserta status review-nya.'
                  : 'Coba pilih status yang lain untuk melihat resource milikmu.'}
              </p>
              {resources.length === 0 && (
                <Link
                  to="/scripts/upload"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black"
                >
                  <Upload size={16} />
                  Upload pertama
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredResources.map((resource) => {
                const status = resource.status || 'pending';
                const type = getResourceType(resource);

                return (
                  <article
                    key={resource.id}
                    className="glass rounded-2xl p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-400">
                            {type}
                          </span>
                          <span
                            className={`rounded-lg border px-2 py-1 text-[11px] ${
                              status === 'approved'
                                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                                : status === 'rejected'
                                  ? 'border-red-400/20 bg-red-400/10 text-red-300'
                                  : 'border-amber-400/20 bg-amber-400/10 text-amber-300'
                            }`}
                          >
                            {statusLabels[status] || status}
                          </span>
                        </div>

                        <h3 className="mt-3 break-words text-base font-semibold">
                          {resource.title || 'Tanpa judul'}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-500">
                          {resource.description || 'Tidak ada deskripsi.'}
                        </p>
                        <p className="mt-2 text-xs text-zinc-600">
                          Dibuat: {formatDate(resource.createdAt)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:min-w-40">
                        <MiniStat icon={<Eye size={14} />} value={resource.views ?? 0} label="Views" />
                        <MiniStat icon={<Download size={14} />} value={resource.downloads ?? 0} label="Downloads" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <ActionCard
            href="/scripts/upload"
            icon={<Upload size={20} />}
            title="Upload Resource"
            description="Bagikan script, snippet, atau Baileys baru."
          />
          <ActionCard
            href="/scripts"
            icon={<Code2 size={20} />}
            title="Jelajahi Resource"
            description="Lihat resource yang tersedia di ScriptStationV2."
          />
        </section>
      </main>
    </Shell>
  );
}

function StatCard({
  icon,
  value,
  label,
  description,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  description: string;
}) {
  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
        {icon}
      </div>
      <div className="mt-5 text-3xl font-semibold tracking-tight">
        {value.toLocaleString('id-ID')}
      </div>
      <div className="mt-1 font-medium text-zinc-200">{label}</div>
      <p className="mt-2 text-xs leading-5 text-zinc-600">{description}</p>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-zinc-200">
        {Number(value).toLocaleString('id-ID')}
      </p>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={href}
      className="glass group rounded-3xl p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.07]"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black">
          {icon}
        </div>
        <ArrowRight
          size={18}
          className="text-zinc-600 transition group-hover:translate-x-1 group-hover:text-white"
        />
      </div>
      <h3 className="mt-6 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p>
    </Link>
  );
}