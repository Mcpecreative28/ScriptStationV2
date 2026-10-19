
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
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
  MessageCircle,
  Store,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  CheckCircle2,
  X,
  AlertTriangle,
  Clock3,
  XCircle,
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

type DeleteConfirmation = {
  id: string;
  title: string;
};

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

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'approved'
      ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300'
      : status === 'rejected'
        ? 'border-red-400/20 bg-red-400/[0.08] text-red-300'
        : 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300';

  const icon =
    status === 'approved' ? (
      <CheckCircle2 size={12} />
    ) : status === 'rejected' ? (
      <XCircle size={12} />
    ) : (
      <Clock3 size={12} />
    );

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${className}`}
    >
      {icon}
      {statusLabels[status] || status}
    </span>
  );
}

function DashboardStat({
  icon,
  value,
  label,
  description,
  delay,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  description: string;
  delay: number;
}) {
  return (
    <article
      className="group relative min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-white/[0.15] hover:bg-white/[0.045] sm:p-6"
      style={{
        animation: 'dashboard-enter .5s ease-out both',
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-violet-400/[0.08] blur-3xl transition duration-300 group-hover:bg-violet-400/[0.15]" />

      <div className="relative flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-400">{label}</span>

        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 transition duration-300 group-hover:scale-105">
          {icon}
        </span>
      </div>

      <p className="relative mt-5 break-words text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {value.toLocaleString('id-ID')}
      </p>

      <p className="relative mt-2 text-xs leading-5 text-zinc-500">
        {description}
      </p>

      <div className="mt-5 h-px overflow-hidden bg-white/[0.06]">
        <div className="h-full w-1/3 rounded-full bg-violet-300/60 transition-all duration-500 group-hover:w-2/3" />
      </div>
    </article>
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
    <div className="rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        {icon}
        {label}
      </div>

      <p className="mt-1.5 text-sm font-semibold text-zinc-200">
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
  delay,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <Link
      to={href}
      className="group rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 transition duration-300 hover:-translate-y-1 hover:border-white/[0.15] hover:bg-white/[0.05] sm:p-6"
      style={{
        animation: 'dashboard-enter .45s ease-out both',
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-zinc-200 transition group-hover:bg-white group-hover:text-black">
          {icon}
        </div>

        <ArrowRight
          size={18}
          className="text-zinc-600 transition duration-200 group-hover:translate-x-1 group-hover:text-white"
        />
      </div>

      <h3 className="mt-5 text-base font-semibold text-zinc-100">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-zinc-500">
        {description}
      </p>
    </Link>
  );
}

function DeleteModal({
  resource,
  deleting,
  onCancel,
  onConfirm,
}: {
  resource: DeleteConfirmation;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !deleting) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
      style={{ animation: 'dashboard-fade .18s ease-out both' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) {
          onCancel();
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dashboard-delete-title"
        aria-describedby="dashboard-delete-description"
        className="my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.12] bg-[#101013] shadow-2xl shadow-black/60"
        style={{ animation: 'dashboard-enter .22s ease-out both' }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.08] text-red-300">
              <Trash2 size={20} />
            </div>

            <div className="min-w-0">
              <h2
                id="dashboard-delete-title"
                className="text-lg font-semibold text-white"
              >
                Hapus resource?
              </h2>

              <p
                id="dashboard-delete-description"
                className="mt-1 text-sm leading-6 text-zinc-400"
              >
                Resource ini akan dihapus dari daftar dan database. Tindakan
                ini tidak dapat dibatalkan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            aria-label="Tutup dialog"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3.5">
            <p className="text-xs text-zinc-500">Resource yang dipilih</p>

            <p className="mt-1.5 break-words text-sm font-medium text-zinc-200">
              {resource.title}
            </p>

            <p className="mt-1 break-all font-mono text-[11px] text-zinc-600">
              {resource.id}
            </p>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-red-300/80">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Pastikan resource yang dipilih benar sebelum melanjutkan.
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="order-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50 sm:order-1"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="order-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-400 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-50 sm:order-2"
            >
              {deleting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Trash2 size={15} />
              )}

              {deleting ? 'Menghapus...' : 'Hapus permanen'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
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
  const [notice, setNotice] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState<DeleteConfirmation | null>(null);

  const loadDashboard = useCallback(
    async (currentUser: User, showLoader = false) => {
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
              where('ownerId', '==', currentUser.uid),
            ),
          ),
        ]);

        const profileData = profileSnapshot.exists()
          ? (profileSnapshot.data() as Profile)
          : null;

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

        setProfile(profileData);
        setResources(items);
      } catch (err) {
        console.error('Dashboard load error:', err);

        setError(
          'Gagal memuat dashboard. Periksa koneksi dan izin baca Firestore.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!auth || !db) {
      setError('Firebase belum terkonfigurasi.');
      setLoading(false);
      return;
    }

    let active = true;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!active) return;

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setResources([]);
        setLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      setUser(currentUser);
      setLoading(true);

      void loadDashboard(currentUser).then(() => {
        if (!active) return;
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [navigate, loadDashboard]);

  const stats = useMemo(
    () =>
      resources.reduce(
        (result, resource) => {
          result.views += Number(resource.views ?? 0);
          result.downloads += Number(resource.downloads ?? 0);
          return result;
        },
        { resources: resources.length, views: 0, downloads: 0 },
      ),
    [resources],
  );

  const counts = useMemo(
    () => ({
      all: resources.length,
      pending: resources.filter((item) => item.status === 'pending').length,
      approved: resources.filter((item) => item.status === 'approved').length,
      rejected: resources.filter((item) => item.status === 'rejected').length,
    }),
    [resources],
  );

  const filteredResources = useMemo(
    () =>
      filter === 'all'
        ? resources
        : resources.filter((item) => item.status === filter),
    [resources, filter],
  );

  async function handleLogout() {
    if (!auth || loggingOut) return;

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

  function startEditing(resource: Resource) {
    setEditingId(resource.id);
    setEditTitle(resource.title || '');
    setEditDescription(resource.description || '');
    setError('');
    setNotice('');
  }

  function cancelEditing() {
    setEditingId(null);
    setEditTitle('');
    setEditDescription('');
  }

  async function saveEdit(resource: Resource) {
    if (!db || !user || savingEdit) return;

    const title = editTitle.trim();
    const description = editDescription.trim();

    if (title.length < 3 || title.length > 120) {
      setError('Nama resource harus terdiri dari 3–120 karakter.');
      return;
    }

    if (!description || description.length > 5000) {
      setError('Deskripsi wajib diisi dan maksimal 5.000 karakter.');
      return;
    }

    try {
      setSavingEdit(true);
      setError('');
      setNotice('');

      const resourceRef = doc(db, 'scripts', resource.id);
      const snapshot = await getDoc(resourceRef);

      if (!snapshot.exists()) {
        throw new Error('Resource sudah tidak tersedia.');
      }

      if (snapshot.data().ownerId !== user.uid) {
        throw new Error('Kamu hanya dapat mengedit resource milikmu.');
      }

      await updateDoc(resourceRef, {
        title,
        description,
        status: 'pending',
        updatedAt: serverTimestamp(),
      });

      setResources((previous) =>
        previous.map((item) =>
          item.id === resource.id
            ? { ...item, title, description, status: 'pending' }
            : item,
        ),
      );

      cancelEditing();
      setNotice('Perubahan tersimpan. Resource menunggu review kembali.');
    } catch (err) {
      console.error('Edit resource error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengedit resource. Periksa izin Firestore.',
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDeleteResource() {
    if (!db || !user || !deleteConfirmation || deletingId) return;

    const resourceId = deleteConfirmation.id;

    try {
      setDeletingId(resourceId);
      setError('');
      setNotice('');

      const resourceRef = doc(db, 'scripts', resourceId);
      const snapshot = await getDoc(resourceRef);

      if (!snapshot.exists()) {
        setResources((previous) =>
          previous.filter((item) => item.id !== resourceId),
        );

        setNotice('Resource sudah tidak tersedia dan dihapus dari daftar.');
        setDeleteConfirmation(null);

        if (editingId === resourceId) cancelEditing();

        return;
      }

      const token = await user.getIdTokenResult(true);
      const isAdmin = token.claims.admin === true;
      const isOwner = snapshot.data().ownerId === user.uid;

      if (!isOwner && !isAdmin) {
        throw new Error('Kamu tidak memiliki izin menghapus resource ini.');
      }

      await deleteDoc(resourceRef);

      setResources((previous) =>
        previous.filter((item) => item.id !== resourceId),
      );

      if (editingId === resourceId) cancelEditing();

      setDeleteConfirmation(null);
      setNotice('Resource berhasil dihapus.');
    } catch (err) {
      console.error('Delete resource error:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus resource. Periksa izin Firestore.',
      );
    } finally {
      setDeletingId(null);
    }
  }

  const displayName =
    profile?.displayName ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Developer';

  const email = profile?.email || user?.email || '';
  const photoURL = profile?.photoURL || user?.photoURL || '';
  const role = profile?.role || 'user';

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto min-h-[70vh] max-w-7xl px-4 pb-12 pt-28 sm:px-6">
          <div className="mx-auto max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.025] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
              <Loader2 size={25} className="animate-spin text-zinc-300" />
            </div>

            <h1 className="mt-5 text-lg font-semibold text-white">
              Memuat dashboard
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Menyiapkan profil dan resource milikmu...
            </p>

            <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-white/50" />
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
        <style>{`
          @keyframes dashboard-enter {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes dashboard-fade {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .dashboard-motion,
            .dashboard-motion * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              scroll-behavior: auto !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>

        <div className="dashboard-motion">
          <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0d0d10] p-5 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-violet-500/[0.10] blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-32 left-1/4 -z-10 h-64 w-64 rounded-full bg-blue-500/[0.06] blur-[100px]" />

            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.035] px-3 py-1.5 text-xs text-zinc-300">
                <Sparkles size={14} />
                Your developer space
              </div>

              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-500">
                    Selamat datang kembali,
                  </p>

                  <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                    {displayName}
                    <span className="text-zinc-600">.</span>
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                    Pantau resource, status review, dan statistik karya kamu
                    di ScriptStationV2.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300">
                      <ShieldCheck size={13} />
                      Akun terhubung
                    </span>

                    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs text-zinc-400">
                      <Code2 size={13} />
                      Developer dashboard
                    </span>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                  <button
                    type="button"
                    onClick={() => user && void loadDashboard(user, true)}
                    disabled={refreshing}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition duration-200 hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <RefreshCw
                      size={16}
                      className={refreshing ? 'animate-spin' : ''}
                    />
                    {refreshing ? 'Memuat...' : 'Refresh'}
                  </button>

                  <Link
                    to="/scripts/upload"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-zinc-200 sm:w-auto"
                  >
                    <Upload size={16} />
                    Upload Resource
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200"
            >
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />

              <p className="min-w-0 flex-1 break-words leading-6">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Tutup pesan error"
                className="shrink-0 rounded-lg p-1 text-red-200/70 transition hover:bg-red-400/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

              <p className="min-w-0 flex-1 break-words leading-6">
                {notice}
              </p>

              <button
                type="button"
                onClick={() => setNotice('')}
                aria-label="Tutup notifikasi"
                className="shrink-0 rounded-lg p-1 text-emerald-200/70 transition hover:bg-emerald-400/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <section className="mt-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Account overview
                </p>

                <ShieldCheck size={16} className="text-zinc-500" />
              </div>

              <div className="mt-5 flex min-w-0 items-center gap-4">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Foto profil"
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 shrink-0 rounded-2xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.05]">
                    <UserRound size={27} className="text-zinc-400" />
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="break-words text-lg font-semibold text-white sm:text-xl">
                    {displayName}
                  </h2>

                  <p className="mt-1 break-all text-sm text-zinc-500">
                    {email}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-black/20 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-400">
                  <ShieldCheck size={16} className="shrink-0" />
                  Account role
                </div>

                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium capitalize text-zinc-300">
                  {role}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-red-400/20 hover:bg-red-400/[0.05] hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}

                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>

            <div>
              <div className="mb-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Your activity
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white">
                  Ringkasan aktivitas
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DashboardStat
                  icon={<FileCode2 size={19} />}
                  value={stats.resources}
                  label="My Resources"
                  description="Total resource milikmu"
                  delay={0}
                />

                <DashboardStat
                  icon={<Eye size={19} />}
                  value={stats.views}
                  label="Total Views"
                  description="Jumlah views tersimpan"
                  delay={70}
                />

                <DashboardStat
                  icon={<Download size={19} />}
                  value={stats.downloads}
                  label="Downloads"
                  description="Jumlah download tersimpan"
                  delay={140}
                />
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Resource manager
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Resource saya
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Kelola karya dan pantau status review resource milikmu.
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-sm text-zinc-400">
                <DatabaseIcon />
                {resources.length} resource
              </span>
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
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
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition duration-200 ${
                    filter === value
                      ? 'border-white bg-white text-black'
                      : 'border-white/[0.09] bg-white/[0.025] text-zinc-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {label}

                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                      filter === value ? 'bg-black/10' : 'bg-white/[0.06]'
                    }`}
                  >
                    {counts[value]}
                  </span>
                </button>
              ))}
            </div>

            {filteredResources.length === 0 ? (
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] px-5 py-12 text-center sm:py-16">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                  <Code2 size={25} className="text-zinc-400" />
                </div>

                <h3 className="mt-5 font-semibold text-white">
                  {resources.length === 0
                    ? 'Belum ada resource'
                    : 'Tidak ada resource di filter ini'}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  {resources.length === 0
                    ? 'Resource yang kamu upload akan muncul di sini beserta status review-nya.'
                    : 'Pilih status lain untuk melihat resource milikmu.'}
                </p>

                {resources.length === 0 ? (
                  <Link
                    to="/scripts/upload"
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                  >
                    <Upload size={16} />
                    Upload pertama
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="mt-5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    Tampilkan semua
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredResources.map((resource, index) => {
                  const status = resource.status || 'pending';
                  const type = getResourceType(resource);
                  const isEditing = editingId === resource.id;
                  const isDeleting = deletingId === resource.id;

                  return (
                    <article
                      key={resource.id}
                      className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] transition duration-300 hover:border-white/[0.14] hover:bg-white/[0.035]"
                      style={{
                        animation: 'dashboard-enter .35s ease-out both',
                        animationDelay: `${Math.min(index * 35, 280)}ms`,
                      }}
                    >
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.12] to-transparent opacity-50 transition group-hover:opacity-100" />

                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-[11px] text-zinc-400">
                                {type}
                              </span>

                              <StatusBadge status={status} />
                            </div>

                            <h3 className="mt-4 break-words text-lg font-semibold tracking-tight text-white">
                              {resource.title || 'Tanpa judul'}
                            </h3>

                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
                              {resource.description || 'Tidak ada deskripsi.'}
                            </p>

                            <p className="mt-3 text-xs text-zinc-600">
                              Dibuat: {formatDate(resource.createdAt)}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => startEditing(resource)}
                                disabled={
                                  Boolean(editingId) ||
                                  Boolean(deletingId) ||
                                  Boolean(deleteConfirmation)
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.025] px-3.5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteConfirmation({
                                    id: resource.id,
                                    title: resource.title || 'Tanpa judul',
                                  })
                                }
                                disabled={
                                  Boolean(deletingId) ||
                                  Boolean(editingId) ||
                                  Boolean(deleteConfirmation)
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.04] px-3.5 py-2.5 text-xs font-medium text-red-300 transition hover:border-red-400/30 hover:bg-red-400/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {isDeleting ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                Hapus
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 lg:w-44 lg:shrink-0">
                            <MiniStat
                              icon={<Eye size={14} />}
                              value={resource.views ?? 0}
                              label="Views"
                            />

                            <MiniStat
                              icon={<Download size={14} />}
                              value={resource.downloads ?? 0}
                              label="Downloads"
                            />
                          </div>
                        </div>

                        {isEditing && (
                          <div className="mt-5 border-t border-white/[0.07] pt-5">
                            <div className="mb-4">
                              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                                Resource editor
                              </p>

                              <h4 className="mt-1.5 text-lg font-semibold text-white">
                                Edit resource
                              </h4>

                              <p className="mt-1 text-xs leading-5 text-zinc-500">
                                Perubahan akan mengembalikan status resource
                                menjadi menunggu review.
                              </p>
                            </div>

                            <label
                              htmlFor={`edit-title-${resource.id}`}
                              className="mb-2 block text-xs font-medium text-zinc-400"
                            >
                              Nama resource
                            </label>

                            <input
                              id={`edit-title-${resource.id}`}
                              value={editTitle}
                              onChange={(event) =>
                                setEditTitle(event.target.value)
                              }
                              maxLength={120}
                              className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-white/25 focus:bg-black/40"
                            />

                            <div className="mb-2 flex items-center justify-between gap-3">
                              <label
                                htmlFor={`edit-description-${resource.id}`}
                                className="block text-xs font-medium text-zinc-400"
                              >
                                Deskripsi
                              </label>

                              <span className="text-[11px] text-zinc-600">
                                {editDescription.length}/5000
                              </span>
                            </div>

                            <textarea
                              id={`edit-description-${resource.id}`}
                              value={editDescription}
                              onChange={(event) =>
                                setEditDescription(event.target.value)
                              }
                              maxLength={5000}
                              rows={5}
                              className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-white/25 focus:bg-black/40"
                            />

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                onClick={() => void saveEdit(resource)}
                                disabled={savingEdit}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingEdit && (
                                  <Loader2
                                    size={15}
                                    className="animate-spin"
                                  />
                                )}

                                {savingEdit
                                  ? 'Menyimpan...'
                                  : 'Simpan perubahan'}
                              </button>

                              <button
                                type="button"
                                onClick={cancelEditing}
                                disabled={savingEdit}
                                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-10">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Quick access
              </p>

              <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                Lanjutkan aktivitas
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ActionCard
                href="/scripts/upload"
                icon={<Upload size={20} />}
                title="Upload Resource"
                description="Bagikan script, snippet, atau Baileys baru."
                delay={0}
              />

              <ActionCard
                href="/scripts"
                icon={<Code2 size={20} />}
                title="Jelajahi Resource"
                description="Temukan resource yang tersedia di komunitas."
                delay={60}
              />

              <ActionCard
                href="/rooms"
                icon={<MessageCircle size={20} />}
                title="Global Chat"
                description="Bergabung dengan diskusi komunitas."
                delay={120}
              />

              <ActionCard
                href="/marketplace"
                icon={<Store size={20} />}
                title="Marketplace"
                description="Lihat produk dan tools dari admin."
                delay={180}
              />
            </div>
          </section>

          <footer className="mt-10 border-t border-white/[0.07] pt-5">
            <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-zinc-600 sm:flex-row sm:text-left">
              <p>ScriptStationV2 · Developer Dashboard</p>

              <p className="inline-flex items-center gap-2">
                <ShieldCheck size={13} />
                Akun dan resource milikmu
              </p>
            </div>
          </footer>
        </div>

        {deleteConfirmation && (
          <DeleteModal
            resource={deleteConfirmation}
            deleting={deletingId === deleteConfirmation.id}
            onCancel={() => {
              if (!deletingId) setDeleteConfirmation(null);
            }}
            onConfirm={() => void confirmDeleteResource()}
          />
        )}
      </main>
    </Shell>
  );
}

function DatabaseIcon() {
  return <FileCode2 size={14} />;
}