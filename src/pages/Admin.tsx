import { useEffect, useState } from 'react';
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


export default function Admin() {
  const [user, setUser] = useState<User | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [resources, setResources] = useState<Resource[]>([]);

  const [loading, setLoading] = useState(true);

  const [loadingResources, setLoadingResources] = useState(false);

  const [error, setError] = useState('');

  const [processingId, setProcessingId] = useState<string | null>(null);


  useEffect(() => {
    if (!auth) {
      setLoading(false);
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

          if (active) {
            setIsAdmin(token.claims.admin === true);
          }
        } catch (err) {
          console.error(err);

          if (active) {
            setError(
              'Gagal memeriksa akses admin. Silakan login ulang.'
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }
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
        return;
      }

      setLoadingResources(true);
      setError('');

      try {
        const firestore = db;

        const resourcesQuery = query(
          collection(firestore, 'scripts'),
          orderBy('createdAt', 'desc')
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
            'Gagal memuat resource. Periksa Firestore Rules dan koneksi.'
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
  }, [user, isAdmin]);


  async function verifyAdmin() {
    if (!user || !db) {
      throw new Error('Akun atau Firebase belum siap.');
    }

    const token = await user.getIdTokenResult(true);

    if (token.claims.admin !== true) {
      setIsAdmin(false);

      throw new Error(
        'Akses ditolak. Akun ini bukan admin.'
      );
    }
  }


  async function updateResourceStatus(
    resourceId: string,
    status: 'approved' | 'rejected'
  ) {
    if (!user || !db || !isAdmin) {
      setError('Akses admin tidak tersedia.');
      return;
    }

    const action =
      status === 'approved'
        ? 'menyetujui'
        : 'menolak';

    const confirmed = window.confirm(
      `Yakin ingin ${action} resource ini?`
    );

    if (!confirmed) return;

    setProcessingId(resourceId);
    setError('');

    try {
      await verifyAdmin();

      const firestore = db!;

      await updateDoc(
        doc(firestore, 'scripts', resourceId),
        {
          status,
          reviewedAt: serverTimestamp(),
          reviewedBy: user.uid,
          reviewedByEmail: user.email || null,
          updatedAt: serverTimestamp(),
        }
      );

      setResources((current) =>
        current.map((resource) =>
          resource.id === resourceId
            ? { ...resource, status }
            : resource
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memperbarui status resource.'
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
      'Hapus resource ini secara permanen? Tindakan ini tidak dapat dibatalkan.'
    );

    if (!confirmed) return;

    setProcessingId(resourceId);
    setError('');

    try {
      await verifyAdmin();

      const firestore = db!;

      await deleteDoc(
        doc(firestore, 'scripts', resourceId)
      );

      setResources((current) =>
        current.filter(
          (resource) => resource.id !== resourceId
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus resource. Periksa Firestore Rules.'
      );
    } finally {
      setProcessingId(null);
    }
  }


  if (loading) {
    return (
      <Shell>
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass rounded-3xl p-8 text-center text-zinc-500">
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
          <h1 className="text-4xl font-semibold">
            Admin Panel
          </h1>

          <div className="glass mt-8 rounded-3xl p-6 text-zinc-400">
            Silakan login terlebih dahulu.
          </div>
        </main>
      </Shell>
    );
  }


  if (!isAdmin) {
    return (
      <Shell>
        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <h1 className="text-4xl font-semibold">
            Admin Panel
          </h1>

          <div className="glass mt-8 rounded-3xl p-6 text-red-300">
            Akses ditolak. Custom claim admin: true tidak ditemukan.
          </div>
        </main>
      </Shell>
    );
  }


  return (
    <Shell>
      <main className="mx-auto w-full max-w-6xl min-w-0 px-4 pb-12 pt-32 sm:px-6">

        <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
          Administration
        </p>


        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold">
              Admin Panel
            </h1>

            <p className="mt-2 text-zinc-500">
              Kelola semua resource ScriptStationV2.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-zinc-500">
              Admin login
            </p>

            <p className="mt-1 break-all text-sm text-zinc-300">
              {user.email || user.displayName || 'Unknown'}
            </p>
          </div>
        </div>


        {error && (
          <div className="mt-6 break-words rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
            {error}
          </div>
        )}


        <section className="mt-8">

          <div className="mb-4">
            <h2 className="text-xl font-semibold">
              All Resources
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {resources.length} resource ditemukan
            </p>
          </div>


          {loadingResources ? (
            <div className="glass rounded-3xl p-8 text-center text-zinc-500">
              Memuat resource...
            </div>
          ) : resources.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center text-zinc-400">
              Belum ada resource atau data tidak dapat ditampilkan.
            </div>
          ) : (
            <div className="grid gap-5">

              {resources.map((resource) => {
                const isPending =
                  resource.status === 'pending';

                const isProcessing =
                  processingId === resource.id;


                return (
                  <article
                    key={resource.id}
                    className="glass w-full min-w-0 overflow-hidden rounded-3xl p-4 sm:p-6"
                  >

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                        {resource.status || 'unknown'}
                      </span>

                      {(resource.resourceType || resource.category) && (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                          {resource.resourceType || resource.category}
                        </span>
                      )}

                      {resource.language && (
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                          {resource.language}
                        </span>
                      )}

                    </div>


                    <h3 className="mt-4 break-words text-2xl font-semibold">
                      {resource.title || 'Untitled resource'}
                    </h3>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-500">
                      {resource.description || 'Tidak ada deskripsi.'}
                    </p>


                    <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2">

                      <div>
                        <p className="text-xs text-zinc-600">
                          Author
                        </p>

                        <p className="mt-1 break-words text-sm text-zinc-300">
                          {resource.author || resource.ownerName || 'Anonymous'}
                        </p>
                      </div>


                      <div>
                        <p className="text-xs text-zinc-600">
                          Owner email
                        </p>

                        <p className="mt-1 break-all text-sm text-zinc-300">
                          {resource.ownerEmail || '-'}
                        </p>
                      </div>


                      <div className="sm:col-span-2">
                        <p className="text-xs text-zinc-600">
                          Resource ID
                        </p>

                        <p className="mt-1 break-all text-xs text-zinc-500">
                          {resource.id}
                        </p>
                      </div>

                    </div>


                    {resource.sourceCode && (
                      <div className="mt-5">

                        <p className="mb-2 text-xs text-zinc-500">
                          Source code
                        </p>

                        <pre className="code max-h-72 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
                          {resource.sourceCode}
                        </pre>

                      </div>
                    )}


                    <div className="mt-5 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:justify-end">

                      {isPending && (
                        <>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              void updateResourceStatus(
                                resource.id,
                                'rejected'
                              )
                            }
                            className="w-full rounded-xl border border-red-400/20 bg-red-400/5 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-400/10 disabled:opacity-50 sm:w-auto"
                          >
                            {isProcessing
                              ? 'Processing...'
                              : 'Reject'}
                          </button>


                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() =>
                              void updateResourceStatus(
                                resource.id,
                                'approved'
                              )
                            }
                            className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50 sm:w-auto"
                          >
                            {isProcessing
                              ? 'Processing...'
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
                        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50 sm:w-auto"
                      >
                        {isProcessing
                          ? 'Processing...'
                          : 'Delete'}
                      </button>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

        </section>

      </main>
    </Shell>
  );
}