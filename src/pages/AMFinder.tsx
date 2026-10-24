
import { useState, type FormEvent } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell';

type Preset = {
  type?: string;
  url: string;
  title?: string;
  thumb?: string;
  thumbs?: string[];
  size?: string;
  ratio?: string;
  source?: string;
  detail?: string;
  verified?: boolean;
};

type FinderResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    ok?: boolean;
    found?: boolean;
    author?: string;
    videoUrl?: string;
    presetLinks?: Preset[];
    input?: string;
    video?: {
      description?: string;
      cover?: string;
      stats?: {
        views?: number;
        likes?: number;
        comments?: number;
      };
    };
    authorDetail?: {
      nickname?: string;
      avatar?: string;
    };
  };
};

function formatNumber(value?: number) {
  if (typeof value !== 'number') return '—';
  return new Intl.NumberFormat('id-ID', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function isSupportedVideoUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return (
      url.protocol === 'https:' &&
      (
        host === 'tiktok.com' ||
        host.endsWith('.tiktok.com') ||
        host === 'youtu.be' ||
        host === 'youtube.com' ||
        host.endsWith('.youtube.com')
      )
    );
  } catch {
    return false;
  }
}

export default function AMFinder() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<FinderResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function searchPreset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = url.trim();
    setResult(null);
    setError('');

    if (!isSupportedVideoUrl(input)) {
      setError('Masukkan link video TikTok atau YouTube yang valid dan menggunakan HTTPS.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/amfinder?url=${encodeURIComponent(input)}`,
        { headers: { Accept: 'application/json' } }
      );

      const payload = (await response.json()) as FinderResponse;

      if (!response.ok) {
        throw new Error(
          payload.error || payload.message || 'Pencarian gagal. Coba lagi nanti.'
        );
      }

      if (!payload.success || !payload.data?.ok) {
        throw new Error(
          payload.error || payload.message || 'API belum berhasil memproses video ini.'
        );
      }

      setResult(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mencari preset.'
      );
    } finally {
      setLoading(false);
    }
  }

  const data = result?.data;
  const presets = data?.presetLinks ?? [];

  return (
    <Shell>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
        >
          <ArrowUpRight className="h-4 w-4 rotate-[-135deg]" />
          Kembali ke Home
        </Link>

        <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0d18] p-5 shadow-2xl shadow-violet-950/20 sm:p-9 lg:p-12">
          <div className="pointer-events-none absolute -right-20 -top-28 -z-10 h-72 w-72 rounded-full bg-violet-600/25 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-32 left-1/4 -z-10 h-64 w-64 rounded-full bg-cyan-500/15 blur-[100px]" />

          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            SCRIPTSTATION TOOLS
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
              Temukan preset
              <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                lebih praktis.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Tempel link video TikTok atau YouTube. AMFinder akan mencoba
              menemukan tautan preset yang tersedia dari sumber yang didukung.
            </p>
          </div>

          <form onSubmit={searchPreset} className="mt-8 max-w-3xl">
            <label htmlFor="amfinder-url" className="mb-2 block text-sm font-medium text-white/80">
              Link video
            </label>
            <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <Video className="h-5 w-5 shrink-0 text-violet-300" />
                <input
                  id="amfinder-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://www.tiktok.com/..."
                  autoComplete="url"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-white outline-none placeholder:text-white/30"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? 'Mencari...' : 'Cari Preset'}
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-white/40">
              Hasil bergantung pada ketersediaan tautan dan kemampuan API. Tidak
              semua video memiliki preset yang ditemukan.
            </p>
          </form>
        </section>

        {loading && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-violet-300" />
            <p className="mt-4 font-semibold text-white">Sedang memindai video...</p>
            <p className="mt-2 text-sm text-white/50">
              Tunggu sebentar, hasil akan muncul di sini.
            </p>
          </section>
        )}

        {error && !loading && (
          <section role="alert" className="mt-8 flex gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-5">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <div>
              <h2 className="font-bold text-white">Pencarian belum berhasil</h2>
              <p className="mt-1 text-sm leading-6 text-white/65">{error}</p>
            </div>
          </section>
        )}

        {data && !loading && (
          <section className="mt-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
                  Hasil pemindaian
                </p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                  {presets.length > 0 ? `${presets.length} preset ditemukan` : 'Belum ada preset'}
                </h2>
              </div>
              {data.videoUrl && (
                <a
                  href={data.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/5"
                >
                  Buka video <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            {data.video && (
              <div className="mb-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[120px_1fr] sm:p-5">
                {data.video.cover ? (
                  <img
                    src={data.video.cover}
                    alt="Thumbnail video sumber"
                    loading="lazy"
                    className="aspect-[9/16] w-full max-w-[120px] rounded-xl bg-white/5 object-cover"
                  />
                ) : (
                  <div className="flex aspect-[9/16] max-w-[120px] items-center justify-center rounded-xl bg-white/5">
                    <Video className="h-7 w-7 text-white/30" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-white">
                    {data.authorDetail?.nickname || data.author || 'Video sumber'}
                  </p>
                  {data.video.description && (
                    <p className="mt-2 line-clamp-4 whitespace-pre-line break-words text-sm leading-6 text-white/55">
                      {data.video.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/45">
                    <span>{formatNumber(data.video.stats?.views)} tayangan</span>
                    <span>{formatNumber(data.video.stats?.likes)} suka</span>
                    <span>{formatNumber(data.video.stats?.comments)} komentar</span>
                  </div>
                </div>
              </div>
            )}

            {presets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-5 py-12 text-center">
                <ScanSearch className="mx-auto h-9 w-9 text-white/30" />
                <h3 className="mt-4 font-bold text-white">Preset belum ditemukan</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/50">
                  Coba video lain atau pastikan link video bisa diakses. Hasil kosong
                  tidak selalu berarti preset tidak ada.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {presets.map((preset, index) => (
                  <article
                    key={`${preset.url}-${index}`}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/[0.055]"
                  >
                    {preset.thumb ? (
                      <a href={preset.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={preset.thumb}
                          alt={preset.title || 'Thumbnail preset'}
                          loading="lazy"
                          className="aspect-video w-full bg-black/20 object-cover"
                        />
                      </a>
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-violet-500/15 to-cyan-500/10">
                        <ScanSearch className="h-10 w-10 text-white/25" />
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg border border-violet-300/15 bg-violet-300/10 px-2.5 py-1 text-xs font-bold uppercase text-violet-200">
                          {preset.type || 'Preset'}
                        </span>
                        {preset.verified && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            API terverifikasi
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 break-words text-lg font-bold text-white">
                        {preset.title || `Preset ${index + 1}`}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-white/45">
                        {preset.size && <span>{preset.size}</span>}
                        {preset.ratio && <span>Rasio {preset.ratio}</span>}
                        {preset.source && <span>Sumber: {preset.source}</span>}
                      </div>

                      {preset.detail && (
                        <p className="mt-2 break-words text-xs text-white/45">
                          Info sumber: {preset.detail}
                        </p>
                      )}

                      <a
                        href={preset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white transition hover:border-violet-300/30 hover:bg-violet-400/10"
                      >
                        Buka Preset <ExternalLink className="h-4 w-4" />
                      </a>
                      {preset.verified && (
                        <p className="mt-3 text-xs leading-5 text-white/35">
                          Status ini berasal dari API dan bukan jaminan keamanan file.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </Shell>
  );
}