import { useState, useEffect, type FormEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  ExternalLink,
  FileCode2,
  Film,
  Layers,
  Link2,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import Shell from '../components/Shell';

type Preset = {
  type?: string;
  title?: string;
  url: string;
  size?: string;
  ratio?: string;
  password?: string;
  detail?: string;
  pinned?: boolean;
  byAuthor?: boolean;
};

type ScanStage = {
  stage: string;
  status: 'done' | 'partial' | 'error';
  detail: string;
};

type FinderResult = {
  found: boolean;
  totalPresets: number;
  platform: string;
  author?: string;
  videoUrl?: string;
  video?: {
    id?: string;
    title?: string;
    cover?: string;
    url?: string;
    duration?: number;
    stats?: {
      views?: number;
      likes?: number;
      comments?: number;
      shares?: number;
    };
  };
  scan?: {
    comments?: number;
    replies?: number;
    commentPages?: number;
    incomplete?: boolean;
    error?: string;
    stages?: ScanStage[];
  };
  presetLinks: Preset[];
  message?: string;
  otherLinks?: Array<{
    url: string;
    origin?: string;
  }>;
};

type ApiResponse = {
  success?: boolean;
  status?: boolean;
  error?: string;
  message?: string;
  data?: FinderResult;
  result?: FinderResult;
};

const PROGRESS_PHASES = [
  {
    id: 'metadata',
    title: 'Inisialisasi & Resolusi Sumber',
    desc: 'Mengekstrak ID video kanonik, profil kreator, dan deskripsi utama.',
  },
  {
    id: 'comments',
    title: 'Paginasi Komentar Berkala',
    desc: 'Memindai halaman komentar publik secara bertahap dengan proteksi jeda.',
  },
  {
    id: 'replies',
    title: 'Inspeksi Sub-Balasan & Thread',
    desc: 'Menelusuri balasan pada komentar tersemat dan diskusi kata kunci preset.',
  },
  {
    id: 'extraction',
    title: 'Dekripsi Shortlink & Validasi XML/5MB',
    desc: 'Membuka tautan pendek berlapis serta mendeteksi password dan rasio.',
  },
];

function validUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function platformLabel(value?: string): string {
  const labels: Record<string, string> = {
    tiktok: 'TikTok',
    youtube: 'YouTube',
    instagram: 'Instagram',
    direct: 'Tautan Langsung',
    facebook: 'Facebook',
    twitter: 'X / Twitter',
    threads: 'Threads',
    capcut: 'CapCut',
    general: 'Sumber Eksternal',
  };

  return labels[(value || '').toLowerCase()] || value || 'Sumber';
}

function hostLabel(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'Tautan preset';
  }
}

function presetType(value?: string): string {
  const type = (value || '').toLowerCase();
  if (type === '5mb') return 'ALIGHT LINK 5MB';
  if (type === 'xml') return 'XML DRIVE / FILE';
  return type ? type.toUpperCase() : 'PRESET';
}

function formatCompactNumber(num?: number): string {
  if (!num || Number.isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(num);
}

/**
 * Emblem Kustom AM Finder:
 * Lensa Kaca Pembesar Berefraksi dengan Logo Gelombang Alight Motion di Dalamnya
 */
function AmFinderLensEmblem({ active = false }: { active?: boolean }) {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      <div
        className={`absolute inset-0 rounded-[26px] bg-gradient-to-br from-[#39ff78]/30 via-[#0b8a39]/15 to-transparent blur-xl transition-opacity duration-700 ${
          active ? 'opacity-100 scale-110' : 'opacity-65'
        }`}
      />
      <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-[24px] border border-[#8effb2]/35 bg-[linear-gradient(135deg,rgba(46,245,109,0.20),rgba(6,38,18,0.65))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),inset_0_-1px_1px_rgba(20,235,95,0.2),0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-11 w-11"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="amLensRim" x1="10" y1="8" x2="46" y2="46" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#d8ffe3" />
              <stop offset="50%" stopColor="#43f980" />
              <stop offset="100%" stopColor="#058c38" />
            </linearGradient>
            <linearGradient id="amWaveGrad" x1="16" y1="18" x2="40" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#7bffa4" />
              <stop offset="100%" stopColor="#14d459" />
            </linearGradient>
            <radialGradient id="amLensGlass" cx="27" cy="27" r="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3dff81" stopOpacity="0.24" />
              <stop offset="70%" stopColor="#093819" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#04170a" stopOpacity="0.85" />
            </radialGradient>
          </defs>

          {/* Gagang Kaca Pembesar */}
          <path
            d="M41.5 41.5L55 55"
            stroke="url(#amLensRim)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M43 43L53.5 53.5"
            stroke="#062912"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Lingkaran Lensa Kaca Pembesar */}
          <circle
            cx="27.5"
            cy="27.5"
            r="18.5"
            fill="url(#amLensGlass)"
            stroke="url(#amLensRim)"
            strokeWidth="3"
          />

          {/* Kilau Refraksi Lensa Atas */}
          <path
            d="M16.5 18.5C19.2 15.2 23.1 13.3 27.5 13.3"
            stroke="#ffffff"
            strokeOpacity="0.55"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Emblem Gelombang / Keyframe Alight Motion di Dalam Lensa */}
          <path
            d="M17.5 31.5C19.8 25.2 22.8 19.5 26.2 19.5C29.6 19.5 28.4 34.5 31.8 34.5C34.5 34.5 36.8 28.5 38.2 24.5"
            stroke="url(#amWaveGrad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21.5 35.5C24.2 31.5 26.8 27.8 29.8 27.8C32.4 27.8 33.5 35.8 36.5 33.2"
            stroke="#59ff8f"
            strokeOpacity="0.65"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="38.2" cy="24.5" r="2.2" fill="#e6ffed" />
        </svg>
      </div>
    </div>
  );
}

export default function AMFinder() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePhase, setActivePhase] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FinderResult | null>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!loading) {
      setActivePhase(0);
      return;
    }

    const timer1 = window.setTimeout(() => setActivePhase(1), 1600);
    const timer2 = window.setTimeout(() => setActivePhase(2), 4200);
    const timer3 = window.setTimeout(() => setActivePhase(3), 7800);

    return () => {
      window.clearTimeout(timer1);
      window.clearTimeout(timer2);
      window.clearTimeout(timer3);
    };
  }, [loading]);

  async function copyText(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Gagal menyalin otomatis. Silakan salin tautan secara manual.');
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = url.trim();

    setError('');
    setResult(null);
    setCopied('');

    if (!value) {
      setError('Masukkan tautan video atau tautan preset terlebih dahulu.');
      return;
    }

    if (!validUrl(value)) {
      setError('Format URL tidak valid. Gunakan tautan lengkap yang diawali https://.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/amfinder?url=${encodeURIComponent(value)}`,
        {
          method: 'GET',
          headers: { Accept: 'application/json' },
        },
      );

      // Baca sebagai teks terlebih dahulu agar tidak pernah crash dengan "Unexpected end of JSON input"
      const rawText = await response.text();
      if (!rawText || !rawText.trim()) {
        throw new Error(
          response.status === 504
            ? 'Waktu pemindaian habis di server (Timeout). Silakan coba klik analisis sekali lagi.'
            : `Server mengembalikan respons kosong (HTTP ${response.status}).`,
        );
      }

      let json: ApiResponse;
      try {
        json = JSON.parse(rawText) as ApiResponse;
      } catch {
        throw new Error(
          response.status === 504
            ? 'Server membutuhkan waktu terlalu lama untuk memindai komentar video ini. Coba ulangi sekali lagi.'
            : `Respons server tidak dapat dibaca (HTTP ${response.status}).`,
        );
      }

      if (!response.ok || json.success === false || json.status === false) {
        throw new Error(
          json.error ||
            json.message ||
            `Permintaan gagal diproses (HTTP ${response.status}).`,
        );
      }

      const data = json.data || json.result;

      if (!data || !Array.isArray(data.presetLinks)) {
        throw new Error(
          'Format respons API tidak sesuai. Pastikan backend mengembalikan properti presetLinks.',
        );
      }

      const presets = data.presetLinks.filter(
        (preset) => preset && validUrl(preset.url),
      );

      setResult({
        ...data,
        presetLinks: presets,
        totalPresets: presets.length,
        found: presets.length > 0,
      });

      if (presets.length === 0) {
        setError(
          data.message ||
            'Belum ditemukan tautan preset publik pada sumber ini. Pastikan kreator mencantumkan tautan di deskripsi atau komentar.',
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi gangguan jaringan saat menganalisis tautan.',
      );
    } finally {
      setLoading(false);
    }
  }

  function resetSearch() {
    setUrl('');
    setResult(null);
    setError('');
    setCopied('');
  }

  const scannedComments = result?.scan?.comments ?? 0;
  const scannedReplies = result?.scan?.replies ?? 0;
  const scannedPages = result?.scan?.commentPages ?? (scannedComments > 0 ? 1 : 0);

  return (
    <Shell>
      <main className="relative min-h-[100dvh] overflow-hidden bg-[#040a06] px-4 pb-24 pt-24 text-[#ecfff2] selection:bg-[#38f878]/30 selection:text-[#d8ffe4] sm:px-6 sm:pt-28">
        {/* Atmosfer Latar Hijau Gelap & Terang Berlapis */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden"
        >
          <div className="absolute -left-32 top-10 h-[380px] w-[380px] rounded-full bg-[#19e65c]/12 blur-[130px]" />
          <div className="absolute -right-28 top-64 h-[420px] w-[420px] rounded-full bg-[#065f28]/25 blur-[140px]" />
          <div className="absolute bottom-10 left-1/2 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-[#4dff88]/[0.06] blur-[130px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(66,255,126,0.08),transparent_55%)]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* Hero Section — Langsung fokus ke Emblem Lensa AM Finder tanpa tombol atas yang menghalangi Navbar */}
          <section className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="flex flex-col items-center text-center lg:col-span-5 lg:items-start lg:text-left">
              <AmFinderLensEmblem active={loading} />

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-5xl lg:leading-[1.08]">
                Alight Motion
                <span className="mt-1 block bg-gradient-to-r from-[#e2ffea] via-[#6bff9c] to-[#12c952] bg-clip-text text-transparent">
                  AM Finder
                </span>
              </h1>

              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#b4dec0]/75 sm:text-base">
                Mesin pencari preset 5MB dan XML dengan pemindaian bertahap.
                Menelusuri deskripsi, komentar tersemat, sub-balasan, hingga
                tautan pendek secara menyeluruh.
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                {['5MB Alight Link', 'XML Google Drive', 'Deteksi Password', 'Multi-Hop Resolver'].map(
                  (badge) => (
                    <span
                      key={badge}
                      className="rounded-xl border border-[#8effb2]/15 bg-[#0c2114]/65 px-3 py-1.5 text-[11px] font-medium text-[#b5f5c8]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl"
                    >
                      {badge}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Panel Utama Input Pencarian — Liquid Glass Emerald */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-[28px] border border-[#8effb2]/25 bg-[linear-gradient(145deg,rgba(18,51,30,0.62),rgba(6,18,10,0.82))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(38,242,106,0.14),0_28px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#42ff81]/15 blur-3xl"
                />

                <div className="relative flex items-center justify-between gap-3 border-b border-[#8effb2]/12 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#7aff9f]/30 bg-[#194728]/70 text-[#88ffab] shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                      <Layers size={19} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">
                        Inspeksi Tautan Video atau Preset
                      </h2>
                      <p className="text-xs text-[#a5d6b4]/70">
                        Mendukung TikTok, YouTube, Instagram Reels, dan tautan pendek.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSearch} className="relative mt-5">
                  <label
                    htmlFor="amfinder-url"
                    className="mb-2 block text-xs font-semibold text-[#c8f7d6]/90"
                  >
                    Tautan Video Kreator atau Preset
                  </label>

                  <div className="relative">
                    <Link2
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6bff9b]/75"
                    />

                    <input
                      id="amfinder-url"
                      type="url"
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://vt.tiktok.com/... atau https://www.instagram.com/reel/..."
                      autoComplete="url"
                      className="min-h-[54px] w-full rounded-2xl border border-[#8effb2]/25 bg-[#040d07]/80 py-3.5 pl-11 pr-4 text-sm text-white shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] outline-none transition placeholder:text-[#86b895]/45 focus:border-[#4dff88]/70 focus:bg-[#06130a]/95 focus:ring-4 focus:ring-[#39ff78]/15"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-3.5 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-[#c7ffd6]/45 bg-[linear-gradient(135deg,#7dff9f_0%,#25e866_55%,#0ca640_100%)] px-5 py-3 text-sm font-bold text-[#031709] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_30px_rgba(32,232,98,0.28)] transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={18} className="animate-spin text-[#031709]" />
                        Menganalisis Secara Bertahap...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Mulai Analisis Mendalam
                        <ArrowUpRight size={17} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#8effb2]/12 bg-[#07170d]/65 px-3.5 py-2.5 text-[11px] leading-relaxed text-[#a8dbb7]/75">
                  <CircleAlert size={14} className="mt-0.5 shrink-0 text-[#5dff90]" />
                  <p>
                    Pemindaian dilakukan berlapis mulai dari deskripsi video,
                    seluruh halaman komentar, hingga balasan pada thread diskusi.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Panel Progres Analisis Bertahap (Tampil Saat Loading) */}
          {loading && (
            <section
              aria-live="polite"
              className="mt-8 rounded-[26px] border border-[#8effb2]/25 bg-[linear-gradient(145deg,rgba(15,43,25,0.72),rgba(5,16,9,0.88))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-[#8effb2]/15 pb-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#6bff9c]/35 bg-[#123820] text-[#6bff9c]">
                    <LoaderCircle size={20} className="animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Menganalisis Sumber Secara Bertahap
                    </h2>
                    <p className="text-xs text-[#9ed4ae]/75">
                      Harap tunggu, sistem sedang mengekstrak seluruh komentar dan balasan.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center self-start rounded-full border border-[#6bff9c]/30 bg-[#143d23]/80 px-3 py-1 font-mono text-xs font-semibold text-[#8affb0] sm:self-auto">
                  Tahap {activePhase + 1} / {PROGRESS_PHASES.length}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PROGRESS_PHASES.map((phase, idx) => {
                  const isDone = idx < activePhase;
                  const isCurrent = idx === activePhase;

                  return (
                    <div
                      key={phase.id}
                      className={`rounded-2xl border p-4 transition-all duration-300 ${
                        isCurrent
                          ? 'border-[#5eff93]/55 bg-[#143d23]/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]'
                          : isDone
                            ? 'border-[#8effb2]/25 bg-[#0c2616]/65'
                            : 'border-white/10 bg-[#07140b]/45 opacity-55'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-[#7dff9f]">
                          0{idx + 1}
                        </span>
                        {isDone ? (
                          <CheckCircle2 size={16} className="text-[#49ff85]" />
                        ) : isCurrent ? (
                          <LoaderCircle size={16} className="animate-spin text-[#6bff9c]" />
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-xs font-semibold text-white">
                        {phase.title}
                      </h3>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#a8dbb7]/70">
                        {phase.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Peringatan / Error State */}
          {error && !loading && (
            <section
              role="status"
              className="mt-8 flex items-start gap-3.5 rounded-2xl border border-amber-300/30 bg-[linear-gradient(135deg,rgba(69,47,11,0.55),rgba(28,19,5,0.75))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl"
            >
              <TriangleAlert
                size={20}
                className="mt-0.5 shrink-0 text-amber-300"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-100">
                  {result ? 'Belum ada tautan preset publik yang terdeteksi' : 'Pemindaian Terkendala'}
                </p>
                <p className="mt-1 break-words text-xs leading-relaxed text-amber-100/80">
                  {error}
                </p>
              </div>
            </section>
          )}

          {/* Hasil Pemindaian & Telemetri Lengkap */}
          {!loading && result && (
            <section className="mt-10 space-y-6">
              {/* Ringkasan Telemetri Pemindaian */}
              <div className="rounded-[26px] border border-[#8effb2]/25 bg-[linear-gradient(145deg,rgba(14,41,24,0.68),rgba(6,19,11,0.86))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-6">
                <div className="flex flex-col justify-between gap-4 border-b border-[#8effb2]/15 pb-5 sm:flex-row sm:items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-lg border border-[#6bff9c]/25 bg-[#123820]/80 px-2.5 py-1 text-[11px] font-semibold text-[#84ffa6]">
                      <ShieldCheck size={14} />
                      Laporan Analisis Selesai
                    </div>
                    <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      {result.found
                        ? `Ditemukan ${result.totalPresets} Preset Alight Motion`
                        : 'Hasil Inspeksi Sumber'}
                    </h2>
                    <p className="mt-1 text-xs text-[#a5d6b4]/80 sm:text-sm">
                      Platform: <strong className="text-white">{platformLabel(result.platform)}</strong>
                      {result.author ? ` (${result.author})` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetSearch}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 self-start rounded-xl border border-[#8effb2]/25 bg-[#10301c]/80 px-4 py-2 text-xs font-semibold text-[#d2ffe0] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:border-[#6bff9c]/50 hover:bg-[#174227] active:scale-[0.98] sm:self-auto"
                  >
                    <RotateCcw size={14} />
                    Pindai Tautan Baru
                  </button>
                </div>

                {/* Metrik Pemeriksaan Komentar & Balasan */}
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-[#8effb2]/15 bg-[#07170d]/70 p-3.5">
                    <p className="text-[11px] text-[#9ac9a8]/70">Preset Valid</p>
                    <p className="mt-1 font-mono text-xl font-bold text-[#6bff9c]">
                      {result.totalPresets}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#8effb2]/15 bg-[#07170d]/70 p-3.5">
                    <p className="text-[11px] text-[#9ac9a8]/70">Komentar Diperiksa</p>
                    <p className="mt-1 font-mono text-xl font-bold text-white">
                      {scannedComments}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#8effb2]/15 bg-[#07170d]/70 p-3.5">
                    <p className="text-[11px] text-[#9ac9a8]/70">Balasan Diperiksa</p>
                    <p className="mt-1 font-mono text-xl font-bold text-white">
                      {scannedReplies}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#8effb2]/15 bg-[#07170d]/70 p-3.5">
                    <p className="text-[11px] text-[#9ac9a8]/70">Halaman Komentar</p>
                    <p className="mt-1 font-mono text-xl font-bold text-white">
                      {scannedPages}
                    </p>
                  </div>
                </div>

                {/* Rincian Tahapan dari Backend jika tersedia */}
                {result.scan?.stages && result.scan.stages.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {result.scan.stages.map((st, idx) => (
                      <div
                        key={`${st.stage}-${idx}`}
                        className="flex items-center gap-2.5 rounded-xl border border-[#8effb2]/12 bg-[#06130a]/65 px-3 py-2 text-xs text-[#bde8c9]"
                      >
                        <CheckCircle2
                          size={14}
                          className="shrink-0 text-[#49ff85]"
                        />
                        <span className="truncate">{st.detail}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Informasi Video Sumber */}
                {result.video?.title && (
                  <div className="mt-5 flex flex-col justify-between gap-4 rounded-2xl border border-[#8effb2]/15 bg-[#07170d]/85 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-[#7dff9f]">
                        Deskripsi Video Sumber
                      </p>
                      <p className="mt-1 line-clamp-2 break-words text-sm font-medium text-white/90">
                        {result.video.title}
                      </p>
                      {result.video.stats && (
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-[#9ac9a8]/75">
                          {result.video.stats.views !== undefined && (
                            <span>Tayangan: {formatCompactNumber(result.video.stats.views)}</span>
                          )}
                          {result.video.stats.likes !== undefined && (
                            <span>Suka: {formatCompactNumber(result.video.stats.likes)}</span>
                          )}
                          {result.video.stats.comments !== undefined && (
                            <span>Total Komentar: {formatCompactNumber(result.video.stats.comments)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {result.videoUrl && (
                      <a
                        href={result.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-[#8effb2]/25 bg-[#11331e] px-3.5 py-2 text-xs font-semibold text-[#94ffad] transition hover:bg-[#19472b] sm:self-center"
                      >
                        Buka Video Asli
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Daftar Kartu Preset yang Ditemukan */}
              {result.presetLinks.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {result.presetLinks.map((preset, index) => {
                    const id = `${index}-${preset.url}`;

                    return (
                      <article
                        key={id}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-[#8effb2]/25 bg-[linear-gradient(150deg,rgba(17,51,30,0.72),rgba(6,19,11,0.9))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_45px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-[#6bff9c]/50"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#8effb2]/30 bg-gradient-to-br from-[#52ff8b]/25 to-[#0b4720]/40 text-[#9effb8] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                              <FileCode2 size={23} strokeWidth={1.7} />
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {preset.byAuthor && (
                                <span className="rounded-full border border-[#6bff9c]/35 bg-[#194d2c]/90 px-2.5 py-1 text-[10px] font-semibold text-[#a6ffbe]">
                                  Kreator Asli
                                </span>
                              )}
                              {preset.pinned && (
                                <span className="rounded-full border border-[#8effb2]/25 bg-[#10331d]/80 px-2.5 py-1 text-[10px] font-medium text-[#8effb2]">
                                  Disematkan
                                </span>
                              )}
                              <span className="rounded-full border border-[#5eff93]/35 bg-[#39ff78]/15 px-2.5 py-1 font-mono text-[10px] font-bold text-[#9effb8]">
                                {presetType(preset.type)}
                              </span>
                            </div>
                          </div>

                          <h3 className="mt-4 break-words text-base font-bold text-white">
                            {preset.title || 'Alight Motion Preset'}
                          </h3>

                          <p className="mt-1 truncate font-mono text-xs text-[#8ec49e]/75">
                            {hostLabel(preset.url)}
                          </p>

                          <div className="mt-3.5 flex flex-wrap gap-2">
                            {preset.size && (
                              <span className="rounded-lg border border-[#8effb2]/15 bg-[#07170d]/80 px-2.5 py-1 text-[11px] font-medium text-[#c2f2d0]">
                                Ukuran: {preset.size}
                              </span>
                            )}

                            {preset.ratio && (
                              <span className="rounded-lg border border-[#8effb2]/15 bg-[#07170d]/80 px-2.5 py-1 text-[11px] font-medium text-[#c2f2d0]">
                                Rasio: {preset.ratio}
                              </span>
                            )}
                          </div>

                          {preset.password && (
                            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300/25 bg-amber-400/[0.07] p-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <LockKeyhole
                                  size={16}
                                  className="shrink-0 text-amber-300"
                                />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold text-amber-200/75">
                                    PASSWORD TERDETEKSI
                                  </p>
                                  <p className="mt-0.5 break-all font-mono text-xs font-bold text-amber-100">
                                    {preset.password}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  copyText(preset.password!, `pw-${id}`)
                                }
                                aria-label="Salin password"
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/25 bg-amber-300/10 text-amber-100 transition hover:bg-amber-300/20"
                              >
                                {copied === `pw-${id}` ? (
                                  <Check size={15} />
                                ) : (
                                  <Copy size={15} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2.5 border-t border-[#8effb2]/15 pt-4">
                          <a
                            href={preset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#c7ffd6]/40 bg-[linear-gradient(135deg,#8affaa_0%,#29e868_100%)] px-4 py-2.5 text-xs font-bold text-[#04190b] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition hover:brightness-105 active:scale-[0.99]"
                          >
                            Buka Preset Sekarang
                            <ArrowUpRight size={15} />
                          </a>

                          <button
                            type="button"
                            onClick={() => copyText(preset.url, `url-${id}`)}
                            aria-label="Salin tautan preset"
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[#8effb2]/25 bg-[#0c2616]/90 px-3 text-[#9effb8] transition hover:border-[#6bff9c]/50 hover:bg-[#143d23]"
                          >
                            {copied === `url-${id}` ? (
                              <Check size={16} />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {/* Tautan Pendukung Lainnya (Jika Ada Link Bio / Sound / Grup) */}
              {result.otherLinks && result.otherLinks.length > 0 && (
                <div className="rounded-2xl border border-[#8effb2]/15 bg-[#081a0f]/75 p-5 backdrop-blur-xl">
                  <h3 className="text-xs font-semibold text-[#8effb2]">
                    Tautan Eksternal Lain yang Ditemukan ({result.otherLinks.length})
                  </h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {result.otherLinks.map((item, idx) => (
                      <a
                        key={`${item.url}-${idx}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-xl border border-[#8effb2]/12 bg-[#051109]/80 px-3.5 py-2.5 text-xs text-[#c2f0cf] transition hover:border-[#6bff9c]/40 hover:text-white"
                      >
                        <span className="truncate font-mono">{item.url}</span>
                        <ExternalLink size={13} className="shrink-0 text-[#6bff9c]" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Tampilan Awal (Empty State) — Bento 2 Kolom */}
          {!loading && !result && !error && (
            <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-[#8effb2]/20 bg-[linear-gradient(145deg,rgba(14,41,24,0.55),rgba(5,16,9,0.78))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl border border-[#8effb2]/25 bg-[#123820]/80 text-[#88ffab]">
                  <Film size={19} />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Analisis Komentar & Balasan Berlapis
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#a5d6b4]/75">
                  Tidak berhenti di halaman pertama. Sistem memindai halaman
                  komentar berikutnya dan membuka sub-balasan tempat kreator
                  biasa menyembunyikan tautan preset maupun password.
                </p>
              </div>

              <div className="rounded-[24px] border border-[#8effb2]/20 bg-[linear-gradient(145deg,rgba(14,41,24,0.55),rgba(5,16,9,0.78))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-xl border border-[#8effb2]/25 bg-[#123820]/80 text-[#88ffab]">
                  <Link2 size={19} />
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Ekstraksi Shortlink & Bio-Link Otomatis
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#a5d6b4]/75">
                  Menembus pengalihan tautan pendek seperti s.id, bit.ly,
                  Linktree, dan Heylink untuk mengambil file XML Google Drive,
                  MediaFire, atau Alight Link 5MB di dalamnya.
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
    </Shell>
  );
}