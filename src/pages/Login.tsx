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

import {
  Command,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

import Shell from '../components/Shell';

import {
  auth,
  db,
  firebaseConfigured,
  googleProvider,
} from '../lib/firebase';


type NoticeType =
  | 'success'
  | 'error'
  | 'info'
  | 'cancelled';


type Notice = {
  type: NoticeType;
  title: string;
  message: string;
};


export default function Login() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const [notice, setNotice] = useState<Notice | null>(
    null,
  );


  const handleGoogleLogin = async () => {
    if (loading) {
      return;
    }

    setLoading(true);

    setNotice(null);

    try {
      if (!firebaseConfigured) {
        throw new Error(
          'Firebase belum terkonfigurasi. Silakan coba lagi nanti.',
        );
      }

      if (!auth) {
        throw new Error(
          'Firebase Authentication tidak tersedia.',
        );
      }

      if (!db) {
        throw new Error(
          'Firestore tidak tersedia.',
        );
      }

      const result = await signInWithPopup(
        auth,
        googleProvider,
      );

      const user: User = result.user;

      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        },
      );

      setNotice({
        type: 'success',
        title: 'Login berhasil',
        message:
          'Akun berhasil terhubung. Mengarahkan ke profil...',
      });

      navigate('/profile', {
        replace: true,
      });
    } catch (error: unknown) {
      const firebaseError = error as {
        code?: string;
        message?: string;
      };

      if (
        firebaseError?.code ===
        'auth/popup-closed-by-user'
      ) {
        setNotice({
          type: 'cancelled',
          title: 'Login dibatalkan',
          message:
            'Jendela login Google ditutup sebelum proses selesai.',
        });

        return;
      }

      if (
        firebaseError?.code ===
        'auth/cancelled-popup-request'
      ) {
        setNotice({
          type: 'cancelled',
          title: 'Login dibatalkan',
          message:
            'Permintaan login dihentikan. Silakan coba lagi.',
        });

        return;
      }

      console.error('LOGIN ERROR:', error);

      setNotice({
        type: 'error',
        title: 'Login gagal',
        message: getFirebaseErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };


  const handleResetLogin = async () => {
    if (!auth) {
      return;
    }

    try {
      setNotice(null);

      await signOut(auth);

      setNotice({
        type: 'success',
        title: 'Berhasil keluar',
        message:
          'Akun telah keluar dari sesi login.',
      });
    } catch (error) {
      console.error('LOGOUT ERROR:', error);

      setNotice({
        type: 'error',
        title: 'Gagal keluar',
        message:
          'Sesi login tidak dapat diakhiri. Silakan coba lagi.',
      });
    }
  };


  return (
    <Shell>
      <main
        className="
          grid
          min-h-[85vh]
          place-items-center
          px-4
          pb-12
          pt-24
        "
      >
        <div
          className="
            glass
            w-full
            max-w-md
            rounded-3xl
            p-6
            text-center
            sm:p-8
          "
        >
          <div
            className="
              mx-auto
              grid
              h-16
              w-16
              place-items-center
              rounded-2xl
              bg-white
              text-black
            "
          >
            <Command size={30} />
          </div>


          <h1
            className="
              mt-6
              text-2xl
              font-semibold
              text-white
              sm:text-3xl
            "
          >
            Welcome to ScriptStationV2
          </h1>


          <p
            className="
              mt-3
              text-sm
              leading-6
              text-zinc-400
            "
          >
            Login untuk upload, rating, comment,
            dan mengelola resource.
          </p>


          {!firebaseConfigured && (
            <div
              className="
                mt-6
                rounded-2xl
                border
                border-red-500/20
                bg-red-500/10
                p-4
                text-left
                text-sm
                leading-6
                text-red-300
              "
            >
              <div className="font-semibold">
                Firebase belum aktif
              </div>

              <p className="mt-1">
                Periksa konfigurasi Environment Variables
                pada deployment Vercel.
              </p>
            </div>
          )}


          {notice && (
            <div
              role={
                notice.type === 'error'
                  ? 'alert'
                  : 'status'
              }
              aria-live="polite"
              className={`
                mt-6
                rounded-2xl
                border
                p-4
                text-left
                ${
                  notice.type === 'success'
                    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                    : notice.type === 'cancelled'
                      ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
                      : notice.type === 'info'
                        ? 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200'
                        : 'border-red-400/25 bg-red-500/10 text-red-200'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {notice.type === 'success' ? (
                    <CheckCircle2 size={22} />
                  ) : notice.type === 'cancelled' ||
                    notice.type === 'info' ? (
                    <Info size={22} />
                  ) : (
                    <XCircle size={22} />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-semibold">
                    {notice.title}
                  </p>

                  <p className="mt-1 break-words text-sm leading-6 opacity-90">
                    {notice.message}
                  </p>
                </div>
              </div>
            </div>
          )}


          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={
              loading || !firebaseConfigured
            }
            className="
              mt-7
              flex
              min-h-14
              w-full
              items-center
              justify-center
              gap-3
              rounded-2xl
              bg-white
              px-4
              py-4
              font-semibold
              text-black
              transition
              hover:bg-zinc-200
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {loading ? (
              <>
                <Loader2
                  className="h-5 w-5 animate-spin"
                />

                Menghubungkan...
              </>
            ) : (
              <>
                <GoogleIcon />

                Continue with Google
              </>
            )}
          </button>


          <button
            type="button"
            onClick={handleResetLogin}
            disabled={loading}
            className="
              mt-4
              rounded-lg
              px-3
              py-2
              text-sm
              text-zinc-500
              underline
              underline-offset-4
              transition
              hover:text-zinc-300
              disabled:opacity-50
            "
          >
            Reset login
          </button>


          <p
            className="
              mt-5
              text-xs
              leading-6
              text-zinc-600
            "
          >
            Google Authentication menggunakan Firebase
            Authentication.
          </p>
        </div>
      </main>
    </Shell>
  );
}


function getFirebaseErrorMessage(
  error: unknown,
): string {
  if (
    error &&
    typeof error === 'object'
  ) {
    const firebaseError = error as {
      code?: string;
      message?: string;
    };

    const code = firebaseError.code ?? '';

    const message = firebaseError.message ?? '';

    switch (code) {
      case 'auth/unauthorized-domain':
        return (
          'Domain website belum diizinkan di Firebase Authentication.'
        );

      case 'auth/operation-not-allowed':
        return (
          'Google Authentication belum diaktifkan di Firebase.'
        );

      case 'auth/popup-blocked':
        return (
          'Popup Google diblokir browser. Izinkan popup lalu coba lagi.'
        );

      case 'auth/network-request-failed':
        return (
          'Koneksi ke Firebase gagal. Periksa koneksi internet.'
        );

      case 'auth/account-exists-with-different-credential':
        return (
          'Email ini sudah terdaftar menggunakan metode login lain.'
        );

      case 'permission-denied':
      case 'firestore/permission-denied':
        return (
          'Firestore menolak penyimpanan profil. Periksa Firestore Rules.'
        );

      default:
        if (message) {
          return message;
        }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan yang tidak diketahui.';
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