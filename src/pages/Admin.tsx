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

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="glass min-w-0 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-500">{label}</span>
        <span className="text-zinc-400">{icon}</span>
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-600">
        {description}
      </p>
    </div>
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
    return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
  }

  if (status === 'approved') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  }

  if (status === 'rejected') {
    return 'border-red-400/20 bg-red-400/10 text-red-300';
  }

  return 'border-white/10 bg-white/[0.04] text-zinc-400';
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

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

      throw new Error(
        'Akses ditolak. Akun ini bukan admin.',
      );
    }
  }

  async function updateResourceStatus(
    resourceId: string,
    status: 'approved' | 'rejected',
  ) {
    if (!user || !db || !isAdmin) {
      setError('Akses admin tidak tersedia.');
      return;
    }

    const action =
      status === 'approved' ? 'menyetujui' : 'menolak';

    const confirmed = window.confirm(
      `Yakin ingin ${action} resource ini?`,
    );

    if (!confirmed) return;

    setProcessingId(resourceId);
    setError('');

    try {
      await verifyAdmin();

      await updateDoc(
        doc(db, 'scripts', resourceId),
        {
          status,
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
          reviewedByEmail: user.email || null,
          updatedAt: serverTimestamp(),
        },
      );

      setResources((current) =>
        current.map((resource) =>
          resource.id === resourceId
            ? { ...resource, status }
            : resource,
        ),
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memperbarui status resource.',
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function deleteResource(resourceId: string) {
    if (!user || !db || !isAdmin) {
      setError('Akses admin tidak tersedia.');
      return;
    }

    const confirmed = window.confirm(
      'Hapus resource ini secara permanen? Tindakan ini tidak dapat dibatalkan.',
    );

    if (!confirmed) return;

    setProcessingId(resourceId);
    setError('');

    try {
      await verifyAdmin();

      await deleteDoc(
        doc(db, 'scripts', resourceId),
      );

      setResources((current) =>
        current.filter(
          (resource) => resource.id !== resourceId,
        ),
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus resource. Periksa Firestore Rules.',
      );
    } finally {
      setProcessingId(null);
    }
  }

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        resources
          .map(
            (resource) =>
              resource.resourceType || resource.category,
          )
          .filter(
            (category): category is string =>
              Boolean(category?.trim()),
          ),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const stats = useMemo(() => {
    return {
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
    };
  }, [resources]);

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
        ].some((value) =>
          value?.toLowerCase().includes(search),
        );

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'unknown'
            ? ![
                'pending',
                'approved',
                'rejected',
              ].includes(resource.status || '')
            : resource.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'all' ||
        category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    resources,
    searchTerm,
    statusFilter,
    categoryFilter,
  ]);

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass rounded-3xl p-8 text-center text-zinc-400">
            <ShieldCheck className="mx-auto mb-3" size={28} />
            Memeriksa akses admin...
          </div>
        </main>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Admin Panel
          </h1>

          <div className="glass mt-8 rounded-3xl p-6 text-zinc-400">
            Silakan login terlebih dahulu untuk melanjutkan.
          </div>
        </main>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            Admin Panel
          </h1>

          <div className="glass mt-8 rounded-3xl border border-red-500/20 p-6 text-red-300">
            <ShieldCheck className="mb-3" size={26} />

            <p className="font-semibold">
              Akses ditolak
            </p>

            <p className="mt-2 text-sm leading-6 text-red-300/80">
              Akun ini tidak memiliki custom claim admin: true.
              Pastikan login menggunakan akun administrator.
            </p>

            {error && (
              <p className="mt-3 break-words text-sm">
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
        <section>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-400">
                <ShieldCheck size={14} />
                Administration
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Admin Panel
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
                Kelola upload komunitas, periksa resource,
                dan atur status publikasi ScriptStationV2.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <button
                type="button"
                onClick={() =>
                  setRefreshKey((current) => current + 1)
                }
                disabled={loadingResources}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <RefreshCw
                  size={16}
                  className={
                    loadingResources ? 'animate-spin' : ''
                  }
                />
                {loadingResources
                  ? 'Memuat...'
                  : 'Refresh Data'}
              </button>

              <div className="max-w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:max-w-72">
                <p className="text-xs text-zinc-600">
                  Login sebagai administrator
                </p>

                <p className="mt-1 break-all text-sm text-zinc-300">
                  {user.email || user.displayName || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 break-words rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300"
          >
            <XCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              {error}
            </div>

            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0 rounded-lg px-2 py-1 text-red-300/70 hover:bg-red-500/10 hover:text-red-200"
              aria-label="Tutup pesan error"
            >
              ×
            </button>
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
              Overview
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Statistik resource
            </h2>
          </div>

          {loadingResources && resources.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-sm text-zinc-500">
              Memuat statistik dari Firestore...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                icon={<Database size={19} />}
                label="Total Resource"
                value={stats.total}
                description="Semua resource yang dimuat"
              />

              <StatCard
                icon={<Clock3 size={19} />}
                label="Menunggu Review"
                value={stats.pending}
                description="Perlu tindakan admin"
              />

              <StatCard
                icon={<CheckCircle2 size={19} />}
                label="Disetujui"
                value={stats.approved}
                description="Status approved"
              />

              <StatCard
                icon={<XCircle size={19} />}
                label="Ditolak"
                value={stats.rejected}
                description="Status rejected"
              />
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
                Resource Management
              </p>

              <h2 className="mt-2 text-2xl font-semibold">
                Semua Upload
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Cari, filter, review, atau hapus resource.
              </p>
            </div>

            <div className="text-sm text-zinc-500">
              Menampilkan{' '}
              <span className="font-semibold text-zinc-300">
                {filteredResources.length}
              </span>{' '}
              dari {resources.length} resource
            </div>
          </div>

          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="relative min-w-0 md:col-span-1">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                />

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Cari nama, uploader, email..."
                  aria-label="Cari resource"
                  className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 focus:bg-black/30"
                />
              </div>

              <div className="relative min-w-0">
                <Filter
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                />

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as StatusFilter,
                    )
                  }
                  aria-label="Filter berdasarkan status"
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#111113] py-3 pl-10 pr-3 text-sm text-zinc-300 outline-none focus:border-white/25"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu Review</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
                  <option value="unknown">Status Lainnya</option>
                </select>
              </div>

              <div className="relative min-w-0">
                <Package
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                />

                <select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value)
                  }
                  aria-label="Filter berdasarkan kategori"
                  className="w-full appearance-none rounded-xl border border-white/10 bg-[#111113] py-3 pl-10 pr-3 text-sm text-zinc-300 outline-none focus:border-white/25"
                >
                  <option value="all">Semua Kategori</option>

                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(searchTerm ||
              statusFilter !== 'all' ||
              categoryFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                className="mt-3 rounded-lg px-2 py-1 text-xs text-zinc-500 transition hover:bg-white/5 hover:text-white"
              >
                Reset semua filter
              </button>
            )}
          </div>

          <div className="mt-5">
            {loadingResources ? (
              <div className="glass rounded-3xl p-8 text-center">
                <RefreshCw
                  size={24}
                  className="mx-auto mb-3 animate-spin text-zinc-500"
                />

                <p className="text-sm text-zinc-400">
                  Memuat resource...
                </p>
              </div>
            ) : resources.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center sm:p-12">
                <Database
                  size={30}
                  className="mx-auto mb-4 text-zinc-600"
                />

                <h3 className="font-medium text-zinc-300">
                  Belum ada resource
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Data belum tersedia atau belum berhasil dimuat
                  dari Firestore.
                </p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center sm:p-12">
                <Search
                  size={30}
                  className="mx-auto mb-4 text-zinc-600"
                />

                <h3 className="font-medium text-zinc-300">
                  Resource tidak ditemukan
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Coba kata kunci atau filter lainnya.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="mt-5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredResources.map((resource) => {
                  const isPending =
                    resource.status === 'pending';

                  const isProcessing =
                    processingId === resource.id;

                  const category =
                    resource.resourceType ||
                    resource.category;

                  return (
                    <article
                      key={resource.id}
                      className="glass min-w-0 overflow-hidden rounded-3xl p-4 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(resource.status)}`}
                        >
                          {getStatusLabel(resource.status)}
                        </span>

                        {category && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
                            {category}
                          </span>
                        )}

                        {resource.language && (
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
                            {resource.language}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 break-words text-xl font-semibold sm:text-2xl">
                        {resource.title || 'Untitled resource'}
                      </h3>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-500">
                        {resource.description ||
                          'Tidak ada deskripsi.'}
                      </p>

                      <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-600">
                            Author / Uploader
                          </p>

                          <p className="mt-1 break-words text-sm text-zinc-300">
                            {resource.author ||
                              resource.ownerName ||
                              'Anonymous'}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs text-zinc-600">
                            Email Uploader
                          </p>

                          <p className="mt-1 break-all text-sm text-zinc-300">
                            {resource.ownerEmail || '-'}
                          </p>
                        </div>

                        <div className="min-w-0 sm:col-span-2">
                          <p className="text-xs text-zinc-600">
                            Resource ID
                          </p>

                          <p className="mt-1 break-all font-mono text-xs text-zinc-500">
                            {resource.id}
                          </p>
                        </div>
                      </div>

                      {resource.sourceCode && (
                        <details className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                          <summary className="cursor-pointer px-4 py-3 text-sm text-zinc-400 transition hover:text-white">
                            Lihat source code
                          </summary>

                          <pre className="max-h-80 overflow-auto border-t border-white/10 p-4 text-xs leading-6 text-zinc-300">
                            <code>{resource.sourceCode}</code>
                          </pre>
                        </details>
                      )}

                      <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                void updateResourceStatus(
                                  resource.id,
                                  'rejected',
                                )
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-400/5 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              <XCircle size={16} />

                              {isProcessing
                                ? 'Memproses...'
                                : 'Reject'}
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() =>
                                void updateResourceStatus(
                                  resource.id,
                                  'approved',
                                )
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                            >
                              <CheckCircle2 size={16} />

                              {isProcessing
                                ? 'Memproses...'
                                : 'Approve'}
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            void deleteResource(resource.id)
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          <Trash2 size={16} />

                          {isProcessing
                            ? 'Memproses...'
                            : 'Hapus Resource'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-10 border-t border-white/5 pt-5 text-center text-xs leading-5 text-zinc-600">
          ScriptStationV2 Administration · Akses khusus administrator
        </footer>
      </main>
    </Shell>
  );
}