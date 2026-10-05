```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import {
  doc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { Command, Loader2 } from 'lucide-react';

import Shell from '../components/Shell';
import {
  auth,
  db,
  firebaseConfigured,
  googleProvider,
} from '../lib/firebase';

export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const processingUid = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setError('Firebase Authentication tidak tersedia.');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      await processUser(user);
    });

    return () => unsubscribe();
  }, []);

  async function processUser(user: User) {
    if (processingUid.current === user.uid) {
      return;
    }

    processingUid.current = user.uid;

    setLoading(true);
    setError('');

    try {
      if (!db) {
        throw new Error(
          'Firestore tidak tersedia. Periksa konfigurasi Firebase.'
        );
      }

      const userRef = doc(db, 'users', user.uid);

      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
          role: 'user',
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      console.error('USER PROFILE ERROR:', err);

      setError(getFirebaseErrorMessage(err));

      processingUid.current = null;
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleLogin = async () => {
    if (!firebaseConfigured || !auth) {
      setError(
        'Firebase belum terkonfigurasi. Periksa Environment Variables Vercel.'
      );
      return;
    }

    if (!db) {
      setError(
        'Firestore tidak tersedia. Firebase App belum terkonfigurasi dengan benar.'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);

      await processUser(result.user);
    } catch (err: unknown) {
      console.error('GOOGLE LOGIN ERROR:', err);

      setError(getFirebaseErrorMessage(err));
      setLoading(false);
      processingUid.current = null;
    }
  };

  return (
    <Shell>
      <main className="grid min-h-[85vh] place-items-center px-4 pt-20">
        <div className="glass w-full max-w-md rounded-3xl p-7 text-center">

          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-black">
            <Command />
          </div>

          <h1 className="mt-5 text-2xl font-semibold">
            Welcome to ScriptStationV2
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Login untuk upload, rating, comment, dan mengelola resource.
          </p>

          {!firebaseConfigured && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-left text-xs leading-5 text-red-300">
              Firebase belum terkonfigurasi pada deployment ini.
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-left text-xs leading-5 text-red-300">
              <div className="font-semibold">
                Login gagal
              </div>

              <div className="mt-1 break-words">
                {error}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || !firebaseConfigured}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-3.5 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Menghubungkan...
              </>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          <p className="mt-5 text-[11px] leading-5 text-zinc-600">
            Login menggunakan Google melalui Firebase Authentication.
          </p>

        </div>
      </main>
    </Shell>
  );
}

function getFirebaseErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Terjadi kesalahan yang tidak diketahui.';
  }

  const firebaseError = error as {
    code?: string;
    message?: string;
  };

  const code = firebaseError.code ?? '';
  const message = firebaseError.message ?? '';

  if (code === 'permission-denied') {
    return 'Firestore menolak akses. Periksa Firestore Rules yang aktif di Firebase Console.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Jendela Google ditutup sebelum login selesai.';
  }

  if (code === 'auth/popup-blocked') {
    return 'Browser memblokir popup Google. Izinkan popup untuk situs ini lalu coba lagi.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'Domain Vercel belum diizinkan di Firebase Authentication → Settings → Authorized domains.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Google Authentication belum diaktifkan di Firebase.';
  }

  if (code === 'auth/network-request-failed') {
    return 'Koneksi ke Firebase gagal. Periksa koneksi internet.';
  }

  if (message) {
    return `${code ? `${code}: ` : ''}${message}`;
  }

  return code || 'Terjadi kesalahan Firebase.';
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.74-.07-1.45-.21-2.13H12v4.03h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.69 2.91-4.18 2.91-7.28Z"
      />

      <path
        fill="#34A853"
        d="M12 21.99c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.75 9.75 0 0 0 12 21.99Z"
      />

      <path
        fill="#FBBC05"
        d="M6.54 14.09a5.86 5.86 0 0 1 0-4.18V7.39H3.3a9.75 9.75 0 0 0 0 9.22l3.24-2.52Z"
      />

      <path
        fill="#EA4335"
        d="M12 5.88c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 2.91 14.63 2 12 2a9.75 9.75 0 0 0-8.7 5.39l3.24 2.52C7.31 7.6 9.46 5.88 12 5.88Z"
      />
    </svg>
  );
}