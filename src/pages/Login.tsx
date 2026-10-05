import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Command, Loader2 } from 'lucide-react';

import Shell from '../components/Shell';
import { auth, googleProvider, firebaseConfigured } from '../lib/firebase';

export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard', { replace: true });
      }
    });

    getRedirectResult(auth).catch((err) => {
      console.error('Google login error:', err);
      setError(getFirebaseErrorMessage(err));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    if (!auth) {
      setError(
        'Firebase belum terkonfigurasi. Pastikan Environment Variables Vercel sudah benar.'
      );
      return;
    }

    setError('');
    setLoading(true);

    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      console.error('Google login error:', err);
      setError(getFirebaseErrorMessage(err));
      setLoading(false);
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
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-left text-xs text-red-300">
              Firebase belum terkonfigurasi pada deployment ini.
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-left text-xs leading-5 text-red-300">
              {error}
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
    case 'auth/popup-blocked':
      return 'Login diblokir oleh browser. Coba lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi jaringan gagal. Periksa internet kamu.';
    default:
      return 'Login Google gagal. Silakan coba lagi.';
  }
}