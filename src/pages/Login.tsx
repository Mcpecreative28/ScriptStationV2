import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithPopup,
  signOut,
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // =========================
      // CHECK FIREBASE
      // =========================

      if (!firebaseConfigured) {
        throw new Error(
          'Firebase belum terkonfigurasi pada deployment ini.'
        );
      }

      if (!auth) {
        throw new Error(
          'Firebase Authentication tidak tersedia.'
        );
      }

      if (!db) {
        throw new Error(
          'Firestore tidak tersedia.'
        );
      }

      // =========================
      // GOOGLE LOGIN
      // =========================

      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      const user: User = result.user;

      console.log('GOOGLE LOGIN SUCCESS:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });

      // =========================
      // SAVE USER TO FIRESTORE
      // =========================

      const userRef = doc(
        db,
        'users',
        user.uid
      );

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

      console.log(
        'FIRESTORE USER SAVED:',
        user.uid
      );

      // =========================
      // SUCCESS
      // =========================

      navigate('/dashboard', {
        replace: true,
      });

    } catch (error: unknown) {
      console.error(
        'LOGIN ERROR:',
        error
      );

      setError(
        getFirebaseErrorMessage(error)
      );

      setLoading(false);
    }
  };

  const handleLogoutTest = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }

      setError('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Shell>
      <main className="grid min-h-[85vh] place-items-center px-4 pt-20">

        <div className="glass w-full max-w-md rounded-3xl p-7 text-center">

          {/* LOGO */}

          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-black">
            <Command />
          </div>

          {/* TITLE */}

          <h1 className="mt-5 text-2xl font-semibold">
            Welcome to ScriptStationV2
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Login untuk upload, rating,
            comment, dan mengelola resource.
          </p>

          {/* FIREBASE STATUS */}

          {!firebaseConfigured && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-left text-xs leading-5 text-red-300">
              <strong>Firebase belum aktif.</strong>
              <br />
              Environment Variables Vercel
              belum terbaca.
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left text-xs leading-5 text-red-300">

              <div className="font-semibold">
                ❌ Login gagal
              </div>

              <div className="mt-2 break-words">
                {error}
              </div>

            </div>
          )}

          {/* LOGIN */}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={
              loading ||
              !firebaseConfigured
            }
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

          {/* TEST LOGOUT */}

          <button
            type="button"
            onClick={handleLogoutTest}
            className="mt-3 text-xs text-zinc-500 underline"
          >
            Reset login
          </button>

          <p className="mt-5 text-[11px] leading-5 text-zinc-600">
            Google Authentication menggunakan
            Firebase Authentication.
          </p>

        </div>

      </main>
    </Shell>
  );
}


// ========================================
// FIREBASE ERROR HANDLER
// ========================================

function getFirebaseErrorMessage(
  error: unknown
): string {

  if (
    error &&
    typeof error === 'object'
  ) {

    const firebaseError =
      error as {
        code?: string;
        message?: string;
      };

    const code =
      firebaseError.code ?? '';

    const message =
      firebaseError.message ?? '';

    switch (code) {

      case 'auth/unauthorized-domain':
        return (
          'Domain Vercel belum diizinkan di Firebase Authentication → Authorized domains.'
        );

      case 'auth/operation-not-allowed':
        return (
          'Google Authentication belum diaktifkan di Firebase.'
        );

      case 'auth/popup-blocked':
        return (
          'Popup Google diblokir browser. Izinkan popup lalu coba lagi.'
        );

      case 'auth/popup-closed-by-user':
        return (
          'Popup Google ditutup sebelum login selesai.'
        );

      case 'auth/cancelled-popup-request':
        return (
          'Permintaan login dibatalkan karena ada popup lain.'
        );

      case 'auth/network-request-failed':
        return (
          'Koneksi ke Firebase gagal. Periksa internet.'
        );

      case 'auth/account-exists-with-different-credential':
        return (
          'Email tersebut sudah terdaftar dengan metode login berbeda.'
        );

      case 'permission-denied':
      case 'firestore/permission-denied':
        return (
          'Firestore menolak akses. Periksa Firestore Rules yang aktif.'
        );

      default:

        if (message) {
          return `${code ? `${code}: ` : ''}${message}`;
        }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi error yang tidak diketahui.';
}


// ========================================
// GOOGLE ICON
// ========================================

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
        d="M12 21.99c2.63 0 4.84-.87 6.45-2.35l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3a9.75 9.75 0 0 0 8.7 5.99Z"
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