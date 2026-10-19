
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Search,
  RefreshCw,
  ShieldCheck,
  Database,
  CheckCircle2,
  Clock3,
  XCircle,
  Trash2,
  Filter,
  Package,
  ChevronDown,
  AlertTriangle,
  Check,
  X,
  Sparkles,
  Activity,
  LockKeyhole,
} from 'lucide-react';

import Shell from '../components/Shell';
import { auth, db } from '../lib/firebase';

type Resource = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  resourceType?: string;
  language?: string;
  author?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string | null;
  sourceCode?: string;
  status?: string;
  createdAt?: Timestamp;
};

type StatusFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'unknown';

type ConfirmAction = {
  resourceId: string;
  title: string;
  description: string;
  confirmLabel: string;
  kind: 'approve' | 'reject' | 'delete';
  status?: 'approved' | 'rejected';
};

function StatCard({
  icon,
  label,
  value,
  description,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
  accent: string;
  delay: number;
}) {
  return (
    <article
      className="group relative min-w-0 animate-[admin-enter_.5s_ease-out_both] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition duration-300 hover:-translate-y-1 hover:border-white/[0.15] hover:bg-white/[0.045] sm:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-[0.09] blur-3xl transition duration-500 group-hover:opacity-20 ${accent}`}
      />

      <div className="relative flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-400">{label}</span>

        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 transition duration-300 group-hover:scale-105">
          {icon}
        </span>
      </div>

      <p className="relative mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {value.toLocaleString('id-ID')}
      </p>

      <p className="relative mt-2 text-xs leading-5 text-zinc-500">
        {description}
      </p>

      <div className="mt-5 h-px overflow-hidden bg-white/[0.06]">
        <div
          className={`h-full w-1/3 rounded-full opacity-60 transition-all duration-700 group-hover:w-2/3 ${accent}`}
        />
      </div>
    </article>
  );
}

function getStatusLabel(status?: string) {
  if (status === 'pending') return 'Menunggu Review';
  if (status === 'approved') return 'Disetujui';
  if (status === 'rejected') return 'Ditolak';

  return status || 'Tidak diketahui';
}

function getStatusClass(status?: string) {
  if (status === 'pending') {
    return 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300';
  }

  if (status === 'approved') {
    return 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300';
  }

  if (status === 'rejected') {
    return 'border-red-400/20 bg-red-400/[0.08] text-red-300';
  }

  return 'border-white/10 bg-white/[0.04] text-zinc-400';
}

function AdminSelect({
  value,
  onChange,
  label,
  icon,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  icon: React.ReactNode;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  const selected =
    options.find((option) => option.value === value) || options[0];

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm outline-none transition duration-200 ${
          open
            ? 'border-white/20 bg-white/[0.06]'
            : 'border-white/10 bg-black/20 hover:border-white/[0.16] hover:bg-white/[0.03]'
        }`}
      >
        <span className="shrink-0 text-zinc-500">{icon}</span>

        <span className="min-w-0 flex-1 truncate text-zinc-200">
          {selected?.label || label}
        </span>

        <ChevronDown
          size={15}
          className={`shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup pilihan"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-64 overflow-y-auto rounded-xl border border-white/[0.12] bg-[#111114] p-1.5 shadow-2xl shadow-black/50 animate-[admin-enter_.15s_ease-out_both]">
            {options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                  }`}
                >
                  <span className="min-w-0 flex-1 break-words">
                    {option.label}
                  </span>

                  {active && (
                    <Check
                      size={15}
                      className="shrink-0 text-emerald-300"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ConfirmModal({
  action,
  processing,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  processing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = action.kind === 'delete';
  const isApprove = action.kind === 'approve';

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !processing) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, processing]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md animate-[admin-fade_.18s_ease-out_both]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onCancel();
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
        className="my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/[0.12] bg-[#101013] shadow-2xl shadow-black/60 animate-[admin-enter_.22s_ease-out_both]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                isDelete || !isApprove
                  ? 'border-red-400/20 bg-red-400/[0.08] text-red-300'
                  : 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300'
              }`}
            >
              {isDelete ? (
                <Trash2 size={20} />
              ) : isApprove ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>

            <div className="min-w-0">
              <h2
                id="admin-confirm-title"
                className="text-lg font-semibold text-white"
              >
                {action.title}
              </h2>

              <p
                id="admin-confirm-description"
                className="mt-1 text-sm leading-6 text-zinc-400"
              >
                {action.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={processing}
            onClick={onCancel}
            aria-label="Tutup dialog"
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
            <p className="text-xs text-zinc-500">Resource yang dipilih</p>
            <p className="mt-1 break-words text-sm font-medium text-zinc-200">
              {action.resourceId}
            </p>
          </div>

          {isDelete && (
            <p className="mt-3 text-xs leading-5 text-red-300/80">
              Penghapusan bersifat permanen dan tidak dapat dibatalkan.
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={processing}
              onClick={onCancel}
              className="order-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50 sm:order-1"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={processing}
              onClick={onConfirm}
              className={`order-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:order-2 ${
                isDelete || !isApprove
                  ? 'bg-red-400 text-white hover:bg-red-300'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {processing ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : isDelete ? (
                <Trash2 size={15} />
              ) : isApprove ? (
                <CheckCircle2 size={15} />
              ) : (
                <XCircle size={15} />
              )}

              {processing ? 'Memproses...' : action.confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setError('Firebase Authentication belum tersedia.');
      return;
    }

    let active = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!active) return;

        setUser(currentUser);
        setIsAdmin(false);
        setLoading(true);
        setError('');
        setNotice('');

        if (!currentUser) {
          setLoading(false);
          return;
        }

        try {
          const token = await currentUser.getIdTokenResult(true);

          if (!active) return;

          setIsAdmin(token.claims.admin === true);
        } catch (err) {
          console.error(err);

          if (active) {
            setError(
              'Gagal memeriksa akses admin. Silakan login ulang.',
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadResources() {
      if (!user || !isAdmin || !db) {
        setResources([]);
        setLoadingResources(false);
        return;
      }

      setLoadingResources(true);
      setError('');

      try {
        const resourcesQuery = query(
          collection(db, 'scripts'),
          orderBy('createdAt', 'desc'),
        );

        const snapshot = await getDocs(resourcesQuery);

        const data: Resource[] = snapshot.docs.map((item) => ({
          ...(item.data() as Omit<Resource, 'id'>),
          id: item.id,
        }));

        if (active) {
          setResources(data);
        }
      } catch (err) {
        console.error(err);

        if (active) {
          setError(
            'Gagal memuat resource. Periksa koneksi dan Firestore Rules.',
          );
        }
      } finally {
        if (active) {
          setLoadingResources(false);
        }
      }
    }

    void loadResources();

    return () => {
      active = false;
    };
  }, [user, isAdmin, refreshKey]);

  async function verifyAdmin() {
    if (!user || !db) {
      throw new Error('Akun atau Firebase belum siap.');
    }

    const token = await user.getIdTokenResult(true);

    if (token.claims.admin !== true) {
      setIsAdmin(false);

      throw new Error('Akses ditolak. Akun ini bukan admin.');
    }
  }

  function requestStatusUpdate(
    resource: Resource,
    status: 'approved' | 'rejected',
  ) {
    const isApprove = status === 'approved';

    setConfirmAction({
      resourceId: resource.id,
      kind: isApprove ? 'approve' : 'reject',
      status,
      title: isApprove ? 'Setujui resource?' : 'Tolak resource?',
      description: isApprove
        ? 'Resource ini akan ditandai sebagai disetujui dan dapat ditampilkan sesuai alur publikasi situs.'
        : 'Resource ini akan ditandai sebagai ditolak. Pastikan kamu sudah memeriksa isinya.',
      confirmLabel: isApprove ? 'Ya, setujui' : 'Ya, tolak',
    });
  }

  function requestDelete(resource: Resource) {
    setConfirmAction({
      resourceId: resource.id,
      kind: 'delete',
      title: 'Hapus resource?',
      description:
        'Kamu akan menghapus resource ini dari database ScriptStationV2.',
      confirmLabel: 'Hapus permanen',
    });
  }

  async function executeConfirmedAction() {
    if (!confirmAction) return;

    const action = confirmAction;
    const resourceId = action.resourceId;

    if (!user || !db || !isAdmin) {
      setError('Akses admin tidak tersedia.');
      setConfirmAction(null);
      return;
    }

    setProcessingId(resourceId);
    setError('');
    setNotice('');

    try {
      await verifyAdmin();

      if (action.kind === 'delete') {
        await deleteDoc(doc(db, 'scripts', resourceId));

        setResources((current) =>
          current.filter((resource) => resource.id !== resourceId),
        );

        setNotice('Resource berhasil dihapus.');
      } else if (action.status) {
        await updateDoc(doc(db, 'scripts', resourceId), {
          status: action.status,
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
          reviewedByEmail: user.email || null,
          updatedAt: serverTimestamp(),
        });

        setResources((current) =>
          current.map((resource) =>
            resource.id === resourceId
              ? { ...resource, status: action.status }
              : resource,
          ),
        );

        setNotice(
          action.status === 'approved'
            ? 'Resource berhasil disetujui.'
            : 'Resource berhasil ditolak.',
        );
      }

      setConfirmAction(null);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Tindakan gagal dilakukan. Periksa koneksi dan Firestore Rules.',
      );
    } finally {
      setProcessingId(null);
    }
  }

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        resources
          .map((resource) => resource.resourceType || resource.category)
          .filter(
            (category): category is string =>
              Boolean(category?.trim()),
          ),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const stats = useMemo(
    () => ({
      total: resources.length,
      pending: resources.filter(
        (resource) => resource.status === 'pending',
      ).length,
      approved: resources.filter(
        (resource) => resource.status === 'approved',
      ).length,
      rejected: resources.filter(
        (resource) => resource.status === 'rejected',
      ).length,
    }),
    [resources],
  );

  const filteredResources = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return resources.filter((resource) => {
      const category =
        resource.resourceType || resource.category || '';

      const matchesSearch =
        !search ||
        [
          resource.title,
          resource.description,
          resource.author,
          resource.ownerName,
          resource.ownerEmail,
          resource.language,
          resource.id,
        ].some((value) => value?.toLowerCase().includes(search));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'unknown'
            ? !['pending', 'approved', 'rejected'].includes(
                resource.status || '',
              )
            : resource.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'all' || category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [resources, searchTerm, statusFilter, categoryFilter]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all';

  function resetFilters() {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
  }

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass overflow-hidden rounded-3xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <ShieldCheck
                size={26}
                className="animate-pulse text-zinc-300"
              />
            </div>

            <h1 className="text-lg font-semibold text-white">
              Memeriksa akses admin
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Memastikan sesi dan izin administrator...
            </p>

            <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-white/50" />
            </div>
          </div>
        </main>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass rounded-3xl p-7 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <LockKeyhole size={23} className="text-zinc-300" />
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Admin Panel
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-400">
              Silakan login terlebih dahulu untuk mengakses dashboard
              administrator ScriptStationV2.
            </p>

            {error && (
              <p className="mt-4 text-sm text-red-300">{error}</p>
            )}
          </div>
        </main>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass overflow-hidden rounded-3xl p-6 sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.07] text-red-300">
              <ShieldCheck size={28} />
            </div>

            <p className="mt-6 text-xs uppercase tracking-[0.22em] text-zinc-500">
              Restricted Area
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Akses ditolak
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              Akun ini tidak memiliki custom claim{' '}
              <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-red-200">
                admin: true
              </code>
              . Pastikan kamu login menggunakan akun administrator
              yang benar.
            </p>

            {error && (
              <p className="mt-4 break-words text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="mx-auto w-full max-w-7xl min-w-0 px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
        <style>{`
          @keyframes admin-enter {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes admin-fade {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .admin-motion,
            .admin-motion * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              scroll-behavior: auto !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>

        <div className="admin-motion">
          <section className="relative isolate overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0d0d10] p-5 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-violet-500/[0.09] blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-36 left-1/3 -z-10 h-72 w-72 rounded-full bg-blue-500/[0.06] blur-[100px]" />

            <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.035] px-3 py-1.5 text-xs text-zinc-300">
                  <Sparkles size={14} />
                  <span>ScriptStationV2</span>
                  <span className="h-1 w-1 rounded-full bg-emerald-300" />
                  Administration
                </div>

                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Admin <span className="text-zinc-500">Panel.</span>
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
                  Pusat kendali untuk meninjau upload komunitas,
                  mengelola publikasi, dan menjaga kualitas resource.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-1.5 text-xs text-emerald-300">
                    <ShieldCheck size={14} />
                    Admin terverifikasi
                  </span>

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs text-zinc-400">
                    <Activity size={14} />
                    Dashboard aktif
                  </span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-64 lg:items-end">
                <button
                  type="button"
                  onClick={() =>
                    setRefreshKey((current) => current + 1)
                  }
                  disabled={loadingResources}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white transition duration-200 hover:border-white/20 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                >
                  <RefreshCw
                    size={16}
                    className={loadingResources ? 'animate-spin' : ''}
                  />
                  {loadingResources ? 'Memuat data...' : 'Refresh Data'}
                </button>

                <div className="w-full min-w-0 rounded-xl border border-white/[0.08] bg-black/20 p-3.5 lg:max-w-72">
                  <p className="text-xs text-zinc-500">
                    Login sebagai administrator
                  </p>

                  <p className="mt-1.5 break-all text-sm text-zinc-200">
                    {user.email || user.displayName || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200 animate-[admin-enter_.2s_ease-out_both]"
            >
              <XCircle size={18} className="mt-0.5 shrink-0" />

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
              className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200 animate-[admin-enter_.2s_ease-out_both]"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

              <p className="min-w-0 flex-1 leading-6">{notice}</p>

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

          <section className="mt-9">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Overview
                </p>

                <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                  Statistik resource
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Ringkasan data yang tersedia di Firestore.
                </p>
              </div>

              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-xs text-zinc-400">
                <Database size={13} />
                {loadingResources ? 'Sinkronisasi...' : 'Data terkini'}
              </span>
            </div>

            {loadingResources && resources.length === 0 ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5"
                  >
                    <div className="h-3 w-24 max-w-full animate-pulse rounded bg-white/[0.08]" />
                    <div className="mt-6 h-9 w-16 animate-pulse rounded-lg bg-white/[0.08]" />
                    <div className="mt-4 h-3 w-32 max-w-full animate-pulse rounded bg-white/[0.05]" />
                    <div className="mt-6 h-px bg-white/[0.05]" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  icon={<Database size={18} />}
                  label="Total Resource"
                  value={stats.total}
                  description="Semua resource yang dimuat"
                  accent="bg-violet-400"
                  delay={0}
                />

                <StatCard
                  icon={<Clock3 size={18} />}
                  label="Menunggu Review"
                  value={stats.pending}
                  description="Memerlukan tindakan admin"
                  accent="bg-amber-400"
                  delay={70}
                />

                <StatCard
                  icon={<CheckCircle2 size={18} />}
                  label="Disetujui"
                  value={stats.approved}
                  description="Resource berstatus approved"
                  accent="bg-emerald-400"
                  delay={140}
                />

                <StatCard
                  icon={<XCircle size={18} />}
                  label="Ditolak"
                  value={stats.rejected}
                  description="Resource berstatus rejected"
                  accent="bg-red-400"
                  delay={210}
                />
              </div>
            )}
          </section>

          <section className="mt-10">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Resource Management
                </p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Semua Upload
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Cari, filter, tinjau, dan kelola resource komunitas.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2">
                  <span className="font-semibold text-white">
                    {filteredResources.length}
                  </span>
                  <span className="mx-1.5 text-zinc-600">/</span>
                  {resources.length} resource
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 sm:p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="relative min-w-0 md:col-span-1">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Cari nama, uploader, email..."
                    aria-label="Cari resource"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none transition duration-200 placeholder:text-zinc-600 focus:border-white/25 focus:bg-black/30"
                  />
                </div>

                <AdminSelect
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(value as StatusFilter)
                  }
                  label="Filter berdasarkan status"
                  icon={<Filter size={16} />}
                  options={[
                    { value: 'all', label: 'Semua Status' },
                    { value: 'pending', label: 'Menunggu Review' },
                    { value: 'approved', label: 'Disetujui' },
                    { value: 'rejected', label: 'Ditolak' },
                    { value: 'unknown', label: 'Status Lainnya' },
                  ]}
                />

                <AdminSelect
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  label="Filter berdasarkan kategori"
                  icon={<Package size={16} />}
                  options={[
                    { value: 'all', label: 'Semua Kategori' },
                    ...categories.map((category) => ({
                      value: category,
                      label: category,
                    })),
                  ]}
                />
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
                  <p className="text-xs text-zinc-500">
                    Filter sedang diterapkan.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Reset semua filter
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5">
              {loadingResources ? (
                <div className="grid gap-4">
                  {[0, 1].map((item) => (
                    <div
                      key={item}
                      className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
                    >
                      <div className="flex gap-2">
                        <div className="h-6 w-28 animate-pulse rounded-full bg-white/[0.08]" />
                        <div className="h-6 w-24 animate-pulse rounded-full bg-white/[0.05]" />
                      </div>
                      <div className="mt-5 h-6 w-2/3 max-w-72 animate-pulse rounded-lg bg-white/[0.08]" />
                      <div className="mt-3 h-3 w-full animate-pulse rounded bg-white/[0.05]" />
                      <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-white/[0.05]" />
                      <div className="mt-5 h-24 animate-pulse rounded-2xl bg-white/[0.035]" />
                      <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.05]" />
                        <div className="h-10 w-24 animate-pulse rounded-xl bg-white/[0.08]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : resources.length === 0 ? (
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center sm:py-16">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                    <Database size={26} className="text-zinc-500" />
                  </div>

                  <h3 className="mt-5 font-medium text-white">
                    Belum ada resource
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    Data belum tersedia atau belum berhasil dimuat dari
                    Firestore. Kamu bisa mencoba memuat ulang data.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setRefreshKey((current) => current + 1)
                    }
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.05]"
                  >
                    <RefreshCw size={15} />
                    Muat ulang
                  </button>
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center sm:py-16">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                    <Search size={25} className="text-zinc-500" />
                  </div>

                  <h3 className="mt-5 font-medium text-white">
                    Resource tidak ditemukan
                  </h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    Coba kata kunci atau filter lainnya.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    Reset filter
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredResources.map((resource, index) => {
                    const isPending = resource.status === 'pending';
                    const isProcessing = processingId === resource.id;
                    const category =
                      resource.resourceType || resource.category;

                    return (
                      <article
                        key={resource.id}
                        className="group min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] transition duration-300 hover:border-white/[0.14] hover:bg-white/[0.035] animate-[admin-enter_.35s_ease-out_both]"
                        style={{
                          animationDelay: `${Math.min(index * 35, 280)}ms`,
                        }}
                      >
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.13] to-transparent opacity-50 transition duration-300 group-hover:opacity-100" />

                        <div className="p-4 sm:p-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(resource.status)}`}
                            >
                              {getStatusLabel(resource.status)}
                            </span>

                            {category && (
                              <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1 text-xs text-zinc-400">
                                {category}
                              </span>
                            )}

                            {resource.language && (
                              <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1 text-xs text-zinc-400">
                                {resource.language}
                              </span>
                            )}
                          </div>

                          <h3 className="mt-4 break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">
                            {resource.title || 'Untitled resource'}
                          </h3>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-400">
                            {resource.description || 'Tidak ada deskripsi.'}
                          </p>

                          <div className="mt-5 grid gap-4 rounded-2xl border border-white/[0.07] bg-black/20 p-4 sm:grid-cols-2 sm:p-5">
                            <div className="min-w-0">
                              <p className="text-xs text-zinc-500">
                                Author / Uploader
                              </p>

                              <p className="mt-1.5 break-words text-sm text-zinc-200">
                                {resource.author ||
                                  resource.ownerName ||
                                  'Anonymous'}
                              </p>
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs text-zinc-500">
                                Email Uploader
                              </p>

                              <p className="mt-1.5 break-all text-sm text-zinc-200">
                                {resource.ownerEmail || '-'}
                              </p>
                            </div>

                            <div className="min-w-0 sm:col-span-2">
                              <p className="text-xs text-zinc-500">
                                Resource ID
                              </p>

                              <p className="mt-1.5 break-all font-mono text-xs leading-5 text-zinc-500">
                                {resource.id}
                              </p>
                            </div>
                          </div>

                          {resource.sourceCode && (
                            <details className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/20">
                              <summary className="cursor-pointer select-none px-4 py-3.5 text-sm text-zinc-300 transition hover:bg-white/[0.025] hover:text-white">
                                Lihat source code
                              </summary>

                              <pre className="max-h-80 overflow-auto border-t border-white/[0.07] p-4 text-xs leading-6 text-zinc-300">
                                <code>{resource.sourceCode}</code>
                              </pre>
                            </details>
                          )}

                          <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.06] pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    requestStatusUpdate(resource, 'rejected')
                                  }
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.04] px-5 py-3 text-sm font-medium text-red-300 transition duration-200 hover:border-red-400/30 hover:bg-red-400/[0.09] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                  <XCircle size={16} />
                                  Tolak
                                </button>

                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() =>
                                    requestStatusUpdate(resource, 'approved')
                                  }
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                >
                                  <CheckCircle2 size={16} />
                                  Setujui
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => requestDelete(resource)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/[0.04] px-5 py-3 text-sm font-medium text-red-300 transition duration-200 hover:border-red-400/30 hover:bg-red-400/[0.09] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              <Trash2 size={16} />
                              Hapus Resource
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <footer className="mt-10 border-t border-white/[0.07] pt-5">
            <div className="flex flex-col items-center justify-between gap-2 text-center text-xs text-zinc-600 sm:flex-row sm:text-left">
              <p>
                ScriptStationV2 Administration
              </p>

              <p className="inline-flex items-center gap-2">
                <ShieldCheck size={13} />
                Akses khusus administrator
              </p>
            </div>
          </footer>
        </div>

        {confirmAction && (
          <ConfirmModal
            action={confirmAction}
            processing={processingId === confirmAction.resourceId}
            onCancel={() => {
              if (!processingId) setConfirmAction(null);
            }}
            onConfirm={() => void executeConfirmedAction()}
          />
        )}
      </main>
    </Shell>
  );
}