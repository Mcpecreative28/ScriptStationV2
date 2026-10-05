import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

import Shell from '../components/Shell';
import { auth, db } from '../lib/firebase';

type Resource = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  language?: string;
  author?: string;
  ownerName?: string;
  ownerEmail?: string | null;
  sourceCode?: string;
  status?: string;
  createdAt?: Timestamp;
};

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingResources, setLoadingResources] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const firebaseAuth = auth;

    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    async function loadResources() {
      if (!user || !db) {
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

        const data: Resource[] = snapshot.docs
  .map((document) => {
    const item = document.data() as Omit<Resource, 'id'>;

    return {
      ...item,
      id: document.id,
    };
  })
  .filter((resource) => resource.status === 'pending');

      setResources(data);
      } catch (err) {
        console.error(err);
        setError(
          'Gagal mengambil resource. Pastikan akun memiliki akses admin.'
        );
      } finally {
        setLoadingResources(false);
      }
    }

    loadResources();
  }, [user]);

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass rounded-3xl p-8 text-center text-zinc-500">
            Checking admin access...
          </div>
        </main>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <main className="mx-auto max-w-6xl px-4 pb-12 pt-32 sm:px-6">
          <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
            Administration
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            Admin Panel
          </h1>

          <div className="glass mt-8 rounded-3xl p-6">
            <p className="text-zinc-400">
              Kamu harus login terlebih dahulu.
            </p>
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-32 sm:px-6">
        <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
          Administration
        </p>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold">
              Admin Panel
            </h1>

            <p className="mt-2 text-zinc-500">
              Review resource yang dikirim oleh komunitas.
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-zinc-500">
              Signed in as
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              {user.email || user.displayName || 'Unknown'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Pending Resources
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {resources.length} resource menunggu review
              </p>
            </div>
          </div>

          {loadingResources ? (
            <div className="glass rounded-3xl p-8 text-center text-zinc-500">
              Loading resources...
            </div>
          ) : resources.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center">
              <p className="text-zinc-400">
                Tidak ada resource yang menunggu review.
              </p>

              <p className="mt-2 text-sm text-zinc-600">
                Semua resource sudah diproses.
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {resources.map((resource) => (
                <article
                  key={resource.id}
                  className="glass rounded-3xl p-5 sm:p-7"
                >
                  <div className="flex flex-col gap-5">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1 text-xs text-amber-300">
                          Pending
                        </span>

                        {resource.category && (
                          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400">
                            {resource.category}
                          </span>
                        )}

                        {resource.language && (
                          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-zinc-500">
                            {resource.language}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-2xl font-semibold">
                        {resource.title || 'Untitled resource'}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        {resource.description ||
                          'Tidak ada deskripsi.'}
                      </p>
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-zinc-600">
                          Author
                        </p>

                        <p className="mt-1 text-sm text-zinc-300">
                          {resource.author ||
                            resource.ownerName ||
                            'Anonymous'}
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
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-zinc-500">
                        Source code
                      </p>

                      <pre className="code max-h-72 overflow-auto rounded-2xl border border-white/8 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
                        {resource.sourceCode ||
                          '// No source code'}
                      </pre>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        disabled
                        className="rounded-xl border border-white/8 bg-white/[0.03] px-5 py-3 text-sm font-medium text-zinc-600"
                      >
                        Reject
                      </button>

                      <button
                        disabled
                        className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black opacity-50"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}