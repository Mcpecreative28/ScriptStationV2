import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import Shell from '../components/Shell';
import { auth, db } from '../lib/firebase';

function Field({
  label,
  value,
  onChange,
  area,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs text-zinc-500">
        {label}
      </span>

      {area ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-28 w-full rounded-2xl border border-white/8 bg-black/25 p-3 text-sm outline-none focus:border-white/20"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm outline-none focus:border-white/20"
        />
      )}
    </label>
  );
}

export default function Upload() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('Script');
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const [sourceCode, setSourceCode] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check login status
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

  async function handleSubmit() {
    setError('');
    setSuccess('');

    if (!user) {
      setError('Kamu harus login terlebih dahulu.');
      return;
    }

    if (!db) {
      setError('Firebase Firestore belum terkonfigurasi.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();
    const cleanLanguage = language.trim();
    const cleanDescription = description.trim();
    const cleanSourceCode = sourceCode.trim();

    if (!cleanTitle) {
      setError('Nama resource wajib diisi.');
      return;
    }

    if (cleanTitle.length < 3) {
      setError('Nama resource minimal 3 karakter.');
      return;
    }

    if (!cleanDescription) {
      setError('Description wajib diisi.');
      return;
    }

    if (!cleanSourceCode) {
      setError('Source code wajib diisi.');
      return;
    }

    if (cleanSourceCode.length > 200000) {
      setError('Source code terlalu besar. Maksimal 200.000 karakter.');
      return;
    }

    setSubmitting(true);

    try {
      const firestore = db;

      await addDoc(collection(firestore, 'scripts'), {
        title: cleanTitle,
        description: cleanDescription,

        category,
        language: cleanLanguage || 'Unknown',

        author: cleanAuthor || user.displayName || 'Anonymous',

        ownerId: user.uid,
        ownerName: user.displayName || 'Anonymous',
        ownerEmail: user.email || null,

        sourceType: 'code',
        sourceCode: cleanSourceCode,

        thumbnailUrl: null,

        status: 'pending',

        views: 0,
        downloads: 0,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setTitle('');
      setAuthor('');
      setCategory('Script');
      setLanguage('');
      setDescription('');
      setSourceCode('');

      setSuccess(
        'Resource berhasil dikirim dan sedang menunggu review admin.'
      );

      setTimeout(() => {
        navigate('/dashboard');
      }, 1800);
    } catch (err) {
      console.error(err);
      setError(
        'Gagal mengirim resource. Silakan coba lagi.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Shell>
        <main className="mx-auto max-w-4xl px-4 pb-12 pt-32 sm:px-6">
          <div className="glass rounded-3xl p-8 text-center text-zinc-500">
            Checking authentication...
          </div>
        </main>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <main className="mx-auto max-w-4xl px-4 pb-12 pt-32 sm:px-6">
          <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
            Create
          </p>

          <h1 className="mt-2 text-4xl font-semibold">
            Upload resource
          </h1>

          <div className="glass mt-8 rounded-3xl p-6 sm:p-8">
            <p className="text-zinc-400">
              Kamu harus login terlebih dahulu untuk mengupload
              resource.
            </p>

            <button
              onClick={() => navigate('/login')}
              className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black"
            >
              Login with Google
            </button>
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="mx-auto max-w-4xl px-4 pb-12 pt-32 sm:px-6">
        <p className="text-xs uppercase tracking-[.2em] text-zinc-600">
          Create
        </p>

        <h1 className="mt-2 text-4xl font-semibold">
          Upload resource
        </h1>

        <p className="mt-2 text-zinc-500">
          Bagikan script, snippet, atau Baileys resource kepada
          komunitas ScriptStationV2.
        </p>

        <div className="glass mt-8 rounded-3xl p-5 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">

            <Field
              label="Resource name"
              value={title}
              onChange={setTitle}
              placeholder="Contoh: WhatsApp Bot Starter"
            />

            <Field
              label="Original author"
              value={author}
              onChange={setAuthor}
              placeholder="Nama author asli"
            />

            <label className="block">
              <span className="mb-2 block text-xs text-zinc-500">
                Category
              </span>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-white/8 bg-black/25 px-3 py-3 text-sm outline-none focus:border-white/20"
              >
                <option value="Script">Script</option>
                <option value="Snippet">Snippet</option>
                <option value="Baileys">Baileys</option>
              </select>
            </label>

            <Field
              label="Language"
              value={language}
              onChange={setLanguage}
              placeholder="JavaScript, TypeScript, Python..."
            />

            <div className="sm:col-span-2">
              <Field
                label="Description"
                value={description}
                onChange={setDescription}
                area
                placeholder="Jelaskan resource ini..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs text-zinc-500">
                Source code
              </label>

              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="code h-64 w-full rounded-2xl border border-white/8 bg-black/25 p-4 text-sm outline-none focus:border-white/20"
                placeholder="Paste your source code here..."
              />

              <p className="mt-2 text-xs text-zinc-600">
                Maximum 200.000 characters.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Submitting...'
                : 'Submit for review'}
            </button>
          </div>
        </div>
      </main>
    </Shell>
  );
}