import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
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

  useEffect(() => {
    if (!auth || !db) {
      return;
    }

    let mounted = true;

    const handleUser = async (user: User | null) => {
      if (!user || !mounted) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        await createUserProfile(user);

        if (mounted) {
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error('Failed to create user profile:', err);

        if (mounted) {
          setError(
            'Login berhasil, tetapi profil pengguna gagal disimpan. Silakan coba lagi.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, handleUser);

    getRedirectResult(auth).catch((err: unknown) => {
      console.error('Google redirect login error:', err);

      if (mounted) {
        setError(getFirebaseErrorMessage(err));
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigate]);

  const handleGoogleLogin = async () => {
    if (!auth || !db || !firebaseConfigured) {
      setError(
        'Firebase belum terkonfigurasi. Pastikan Environment Variables Vercel sudah benar.'
      );
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Google login error:', err);

      setError(getFirebaseErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <Shell>
      <main className="grid min-h-[85vh] place-items-center px-4 pt-20">
        <div className="glass w-full max-w-md rounded-3xl p-7 text-center">
          {/* Logo */}
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-black">
            <Command />
          </div>

          {/* Title */}
          <h1 className="mt-5 text-2xl font-semibold">
            Welcome to ScriptStationV2
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Login untuk upload, rating, comment, dan mengelola resource.
          </p>

          {/* Firebase warning */}
          {!firebaseConfigured && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-left text-xs leading-5 text-red-300">
              Firebase belum terkonfigurasi pada deployment ini.
              <br />
              Pastikan Environment Variables Vercel sudah benar.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-left text-xs leading-5 text-red-300">
              {error}
            </div>
          )}

          {/* Google Login */}
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

/**
 * Membuat atau memperbarui profil user di Firestore.
 *
 * Struktur:
 *
 * users/{uid}
 *   uid
 *   displayName
 *   email
 *   photoURL
 *   role
 *   createdAt
 *   updatedAt
 */
async function createUserProfile(user: User) {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }

  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      photoURL: user.photoURL ?? '',
      role: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return;
  }

  await setDoc(
    userRef,
    {
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}

/**
 * Google icon.
 */
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

/**
 * Mengubah Firebase error menjadi pesan yang lebih mudah dipahami.
 */
function getFirebaseErrorMessage(error: unknown) {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Domain website belum diizinkan oleh Firebase Authentication.';

    case 'auth/operation-not-allowed':
      return 'Google Authentication belum diaktifkan di Firebase.';

    case 'auth/network-request-failed':
      return 'Koneksi jaringan gagal. Periksa koneksi internet kamu.';

    case 'auth/popup-blocked':
      return 'Login diblokir oleh browser. Coba lagi.';

    case 'auth/user-disabled':
      return 'Akun ini telah dinonaktifkan.';

    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Coba lagi beberapa saat nanti.';

    default:
      return 'Login Google gagal. Silakan coba lagi.';
  }
}