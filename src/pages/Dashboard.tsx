import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import {
  ArrowRight,
  Code2,
  Download,
  Eye,
  FileCode2,
  Loader2,
  LogOut,
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

type Stats = {
  resources: number;
  views: number;
  downloads: number;
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    resources: 0,
    views: 0,
    downloads: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth || !db) {
      setError('Firebase belum terkonfigurasi.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError('');
        setUser(currentUser);

        // Load user profile
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          setProfile(userSnapshot.data() as Profile);
        }

        // Load user's resources
        const scriptsQuery = query(
          collection(db, 'scripts'),
          where('ownerId', '==', currentUser.uid)
        );

        const scriptsSnapshot = await getDocs(scriptsQuery);

        let totalViews = 0;
        let totalDownloads = 0;

        scriptsSnapshot.forEach((item) => {
          const data = item.data();

          totalViews += Number(data.views ?? 0);
          totalDownloads += Number(data.downloads ?? 0);
        });

        setStats({
          resources: scriptsSnapshot.size,
          views: totalViews,
          downloads: totalDownloads,
        });
      } catch (err) {
        console.error('Dashboard error:', err);

        setError(
          'Gagal memuat data dashboard. Periksa Firestore Rules dan koneksi Firebase.'
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    if (!auth) return;

    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      setError('Gagal logout. Silakan coba lagi.');
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto flex min-h-[75vh] max-w-7xl items-center justify-center px-4 pt-28 sm:px-6">
          <div className="glass flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-zinc-400">
            <Loader2 className="animate-spin" size={18} />
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
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-32 sm:px-6">
        {/* Header */}
        <section className="relative overflow-hidden">
          <div className="orb -right-10 -top-20 h-64 w-64 bg-indigo-500" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400">
              <Sparkles size={13} />
              Your developer space
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Welcome back,
                </p>

                <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-6xl">
                  {displayName}
                  <span className="text-zinc-700">.</span>
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                  Kelola resource developer kamu, pantau statistik,
                  dan bagikan karya ke komunitas ScriptStationV2.
                </p>
              </div>

              <Link
                to="/scripts/upload"
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                <Upload size={17} />
                Upload Resource
              </Link>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Profile + Stats */}
        <section className="mt-10 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          {/* Profile */}
          <div className="glass rounded-3xl p-6 sm:p-7">
            <div className="flex items-center gap-4">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName}
                  className="h-16 w-16 rounded-2xl object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
                  <UserRound size={28} className="text-zinc-400" />
                </div>
              )}

              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold">
                  {displayName}
                </h2>

                <p className="mt-1 truncate text-sm text-zinc-500">
                  {email}
                </p>
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
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {loggingOut ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <LogOut size={17} />
              )}

              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<FileCode2 size={20} />}
              value={stats.resources}
              label="My Resources"
              description="Resource yang kamu upload"
            />

            <StatCard
              icon={<Eye size={20} />}
              value={stats.views}
              label="Total Views"
              description="Total kunjungan resource"
            />

            <StatCard
              icon={<Download size={20} />}
              value={stats.downloads}
              label="Downloads"
              description="Total download resource"
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mt-10">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
              Quick actions
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Continue building
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              href="/scripts/upload"
              icon={<Upload size={20} />}
              title="Upload Resource"
              description="Bagikan script, snippet, atau Baileys resource baru."
            />

            <ActionCard
              href="/scripts"
              icon={<Code2 size={20} />}
              title="Explore Resources"
              description="Cari resource yang sudah tersedia di ScriptStationV2."
            />

            <ActionCard
              href="/scripts"
              icon={<FileCode2 size={20} />}
              title="My Resources"
              description="Kelola resource yang sudah kamu publikasikan."
            />
          </div>
        </section>

        {/* Coming next */}
        <section className="mt-10">
          <div className="glass overflow-hidden rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-500">
                  <Sparkles size={13} />
                  Coming next
                </div>

                <h2 className="text-2xl font-semibold">
                  Your resource ecosystem
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  Berikutnya kita akan menghubungkan upload resource
                  langsung ke Firestore, lalu menampilkannya secara
                  real-time di halaman Scripts, Snippets, dan Baileys.
                </p>
              </div>

              <Link
                to="/scripts"
                className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                Explore
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
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
    <div className="glass rounded-3xl p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
        {icon}
      </div>

      <div className="mt-6 text-3xl font-semibold tracking-tight">
        {value.toLocaleString('id-ID')}
      </div>

      <div className="mt-1 font-medium text-zinc-200">
        {label}
      </div>

      <p className="mt-2 text-xs leading-5 text-zinc-600">
        {description}
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

      <h3 className="mt-6 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </Link>
  );
}