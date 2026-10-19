
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
  ArrowRight,
  CheckCircle2,
  Command,
  Fingerprint,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

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
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    if (loading || resetting) return;

    setLoading(true);
    setError('');

    try {
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

      const result = await signInWithPopup(
        auth,
        googleProvider
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
        }
      );

      navigate('/dashboard', {
        replace: true,
      });
    } catch (error: unknown) {
      console.error('LOGIN ERROR:', error);
      setError(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutTest = async () => {
    if (loading || resetting) return;

    setResetting(true);
    setError('');

    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (error: unknown) {
      setError(getFirebaseErrorMessage(error));
    } finally {
      setResetting(false);
    }
  };

  return (
    <Shell>
      <main className="relative isolate flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[25rem] w-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.12] blur-[110px] sm:h-[34rem] sm:w-[34rem]"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[8%] top-[15%] -z-10 h-32 w-32 rounded-full bg-blue-500/[0.08] blur-[75px]"
        />

        <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1fr_0.88fr] lg:gap-12">
          <section className="hidden lg:block">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-3.5 py-2 text-xs font-medium text-zinc-300">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" />
              <span>One account. More possibilities.</span>
            </div>

            <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.12] tracking-tight text-white xl:text-6xl">
              Your next idea
              <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent">
                starts here.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-zinc-400">
              Masuk ke ScriptStationV2 untuk berbagi
              resource, menemukan karya komunitas,
              dan mengelola kontribusimu dalam satu
              tempat.
            </p>

            <div className="mt-9 grid max-w-md gap-3">
              <Feature
                icon={<Command className="h-4 w-4" />}
                title="Satu ruang untuk developer"
                description="Temukan scripts, snippets, dan Baileys."
              />

              <Feature
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Login melalui Google"
                description="Gunakan akun Google milikmu untuk masuk."
              />

              <Feature
                icon={<Fingerprint className="h-4 w-4" />}
                title="Profil tersimpan"
                description="Informasi profil disimpan di Firestore."
              />
            </div>

            <div className="mt-10 flex items-center gap-2 text-xs text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Built for the developer community
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-[#0c0c12]/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-gradient-to-br from-white to-zinc-300 text-black shadow-lg shadow-white/[0.04]">
                  <Command className="h-6 w-6" />
                </div>

                <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[11px] text-zinc-400">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Secure sign-in
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">
                  Welcome back
                </p>

                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[2.1rem]">
                  Masuk ke akunmu
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Gunakan akun Google untuk melanjutkan
                  ke ScriptStationV2.
                </p>
              </div>

              {!firebaseConfigured && (
                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] p-4"
                >
                  <p className="text-sm font-semibold text-amber-200">
                    Firebase belum aktif
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-100/70">
                    Periksa konfigurasi Firebase pada
                    deployment sebelum mencoba login.
                  </p>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-4"
                >
                  <p className="text-sm font-semibold text-red-300">
                    Login tidak berhasil
                  </p>
                  <p className="mt-2 break-words text-xs leading-5 text-red-200/80">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || resetting || !firebaseConfigured}
                className="group mt-7 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-xl hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0c12] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Menghubungkan akun...</span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Lanjutkan dengan Google</span>
                    <ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                  Simple and secure
                </span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />

                  <div>
                    <p className="text-xs font-medium text-zinc-200">
                      Autentikasi Google
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                      Proses masuk ditangani oleh Firebase
                      Authentication.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />

                  <div>
                    <p className="text-xs font-medium text-zinc-200">
                      Data profil
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                      Profil pengguna diperbarui setelah
                      login berhasil.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogoutTest}
                disabled={loading || resetting}
                className="mt-5 w-full rounded-xl px-3 py-2.5 text-xs text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetting ? 'Mereset sesi...' : 'Reset sesi login'}
              </button>

              <p className="mt-5 text-center text-[10px] leading-5 text-zinc-600">
                Dengan masuk, kamu menggunakan layanan
                autentikasi Google melalui Firebase.
              </p>
            </div>

            <p className="mt-5 text-center text-[11px] text-zinc-600">
              ScriptStationV2
              <span className="mx-2 text-zinc-700">/</span>
              Developer resource hub
            </p>
          </section>
        </div>
      </main>
    </Shell>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/10 bg-violet-400/[0.08] text-violet-300">
        {icon}
      </div>

      <div>
        <p className="text-sm font-medium text-zinc-200">
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function getFirebaseErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const firebaseError = error as {
      code?: string;
      message?: string;
    };

    const code = firebaseError.code ?? '';
    const message = firebaseError.message ?? '';

    switch (code) {
      case 'auth/unauthorized-domain':
        return 'Domain Vercel belum diizinkan di Firebase Authentication → Authorized domains.';

      case 'auth/operation-not-allowed':
        return 'Google Authentication belum diaktifkan di Firebase.';

      case 'auth/popup-blocked':
        return 'Popup Google diblokir browser. Izinkan popup lalu coba lagi.';

      case 'auth/popup-closed-by-user':
        return 'Popup Google ditutup sebelum proses login selesai.';

      case 'auth/cancelled-popup-request':
        return 'Permintaan login dibatalkan karena ada popup lain.';

      case 'auth/network-request-failed':
        return 'Koneksi ke Firebase gagal. Periksa koneksi internetmu.';

      case 'auth/account-exists-with-different-credential':
        return 'Email tersebut sudah terdaftar dengan metode login berbeda.';

      case 'permission-denied':
      case 'firestore/permission-denied':
        return 'Firestore menolak akses. Periksa Firestore Rules yang aktif.';

      default:
        if (message) {
          return `${code ? `${code}: ` : ''}${message}`;
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
      className="h-5 w-5 shrink-0"
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