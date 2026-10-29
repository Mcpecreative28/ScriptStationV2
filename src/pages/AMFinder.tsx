import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  ExternalLink,
  FileCode2,
  Film,
  Link2,
  LoaderCircle,
  LockKeyhole,
  ScanSearch,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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

type FinderResult = {
  found: boolean;
  totalPresets: number;
  platform: string;
  author?: string;
  videoUrl?: string;
  video?: {
    title?: string;
    cover?: string;
    url?: string;
    stats?: {
      views?: number;
      likes?: number;
      comments?: number;
    };
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
    direct: 'Direct link',
    facebook: 'Facebook',
    twitter: 'X / Twitter',
    threads: 'Threads',
    capcut: 'CapCut',
    general: 'Sumber lain',
  };

  return labels[(value || '').toLowerCase()] || value || 'Sumber';
}

function hostLabel(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'Link preset';
  }
}

function presetType(value?: string): string {
  const type = (value || '').toLowerCase();

  if (type === '5mb') return 'ALIGHT LINK';
  if (type === 'xml') return 'XML PRESET';

  return type ? type.toUpperCase() : 'PRESET';
}

export default function AMFinder() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FinderResult | null>(null);
  const [copied, setCopied] = useState('');

  async function copyText(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Gagal menyalin. Coba salin link secara manual.');
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = url.trim();

    setError('');
    setResult(null);
    setCopied('');

    if (!value) {
      setError('Masukkan link video atau link preset terlebih dahulu.');
      return;
    }

    if (!validUrl(value)) {
      setError('Format URL tidak valid. Gunakan link yang diawali https://.');
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

      const json = (await response.json()) as ApiResponse;

      if (!response.ok || json.success === false || json.status === false) {
        throw new Error(
          json.error ||
            json.message ||
            `Permintaan gagal (HTTP ${response.status}).`,
        );
      }

      const data = json.data || json.result;

      if (!data || !Array.isArray(data.presetLinks)) {
        throw new Error(
          'Format respons API tidak sesuai. Periksa api/amfinder.ts.',
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
            'Tidak ditemukan link preset yang cocok. Coba periksa deskripsi atau komentar pada sumber aslinya.',
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat memindai link.',
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

  return (
    <Shell>
      <main className="relative min-h-screen overflow-hidden bg-[#070b08] px-4 pb-20 pt-7 text-white sm:px-6 sm:pt-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-36 top-24 h-80 w-80 rounded-full bg-[#48ff85]/10 blur-[120px]" />
          <div className="absolute -right-32 top-72 h-96 w-96 rounded-full bg-emerald-500/10 blur-[130px]" />
          <div className="absolute left-1/2 top-[750px] h-72 w-72 -translate-x-1/2 rounded-full bg-lime-400/[0.06] blur-[110px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(140,255,174,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(140,255,174,0.025)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 backdrop-blur-xl transition hover:border-[#7dffa5]/30 hover:text-white"
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>

          {/* Hero */}
          <section className="mx-auto mt-12 max-w-3xl text-center sm:mt-16">
            <div className="mx-auto mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-[25px] border border-[#83ffa5]/30 bg-gradient-to-br from-[#a2ffb6]/20 via-[#28d95e]/10 to-transparent shadow-[0_0_55px_rgba(70,255,122,0.12)] backdrop-blur-2xl">
              <Film size={35} className="text-[#9dffb5]" strokeWidth={1.5} />
            </div>

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#70ff98]/20 bg-[#5dff87]/[0.06] px-3 py-1.5 text-[10px] font-semibold tracking-[0.22em] text-[#9affb1] sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#80ffa1] shadow-[0_0_10px_#80ffa1]" />
              SCRIPTSTATION LABS
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-[-0.045em] sm:text-6xl">
              Alight Motion
              <span className="mt-1 block bg-gradient-to-r from-[#d4ffdd] via-[#70ff98] to-[#29d75c] bg-clip-text text-transparent">
                Preset Finder
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
              Temukan link preset 5MB dan XML dari video atau link yang
              dibagikan kreator. Satu tempat untuk memindai sumber preset.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {['5MB Preset', 'XML', 'Auto Password', 'Rasio'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[11px] text-white/55 backdrop-blur-xl"
                >
                  {item}
                </span>
              ))}
            </div>
          </section>

          {/* Search */}
          <section className="mx-auto mt-10 max-w-3xl rounded-[28px] border border-[#9dffb5]/15 bg-[#101710]/75 p-4 shadow-[0_24px_100px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:mt-12 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#83ffa5]/15 bg-[#70ff98]/[0.08] text-[#9affb1]">
                <ScanSearch size={19} />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-white/90">
                  Pindai sumber preset
                </h2>
                <p className="mt-1 text-xs text-white/40">
                  Tempel link yang ingin kamu periksa.
                </p>
              </div>
            </div>

            <form onSubmit={handleSearch}>
              <label
                htmlFor="amfinder-url"
                className="mb-2 block text-xs font-medium text-white/65"
              >
                Link video atau preset
              </label>

              <div className="relative">
                <Link2
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8affaa]/60"
                />

                <input
                  id="amfinder-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://vt.tiktok.com/..."
                  autoComplete="url"
                  className="min-h-[56px] w-full rounded-2xl border border-white/10 bg-black/30 py-4 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#7dffa5]/50 focus:ring-4 focus:ring-[#64ff8a]/[0.07]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#b0ffc1]/25 bg-gradient-to-r from-[#9affad] via-[#61f887] to-[#36d966] px-5 py-3 text-sm font-bold text-[#07160b] shadow-[0_8px_30px_rgba(74,255,125,0.12)] transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Memindai sumber...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Cari preset
                    <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-white/35">
              <CircleAlert size={14} className="mt-0.5 shrink-0" />
              <p>
                Hasil bergantung pada informasi yang dapat diakses scraper.
                Tidak semua video memiliki link preset publik.
              </p>
            </div>
          </section>

          {/* Error */}
          {error && !loading && (
            <section
              role="status"
              className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 backdrop-blur-xl"
            >
              <TriangleAlert
                size={19}
                className="mt-0.5 shrink-0 text-amber-300"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-amber-100">
                  {result ? 'Belum ada preset ditemukan' : 'Pencarian gagal'}
                </p>
                <p className="mt-1 break-words text-xs leading-6 text-amber-100/65">
                  {error}
                </p>
              </div>
            </section>
          )}

          {/* Loading */}
          {loading && (
            <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-[#8cffaa]/15 bg-[#101710]/70 p-8 text-center backdrop-blur-2xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#8cffaa]/20 bg-[#70ff98]/[0.07]">
                <LoaderCircle
                  size={26}
                  className="animate-spin text-[#8dffaa]"
                />
              </div>
              <h2 className="mt-5 font-semibold text-white/90">
                Memindai link preset
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/40">
                Memeriksa informasi sumber yang tersedia. Tunggu sebentar...
              </p>
              <div className="mx-auto mt-6 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#b0ffc1] to-[#31e56a]" />
              </div>
            </section>
          )}

          {/* Results */}
          {!loading && result && (
            <section className="mt-12">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8dffaa]/70">
                    SCAN RESULTS
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {result.found ? 'Preset ditemukan' : 'Hasil pemindaian'}
                  </h2>
                  <p className="mt-2 text-sm text-white/45">
                    {result.totalPresets} link preset ·{' '}
                    {platformLabel(result.platform)}
                    {result.author ? ` · ${result.author}` : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetSearch}
                  className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/65 transition hover:bg-white/[0.08] sm:self-auto"
                >
                  <ScanSearch size={15} />
                  Pencarian baru
                </button>
              </div>

              {result.video?.title && (
                <div className="mb-6 rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 backdrop-blur-xl">
                  <p className="text-[10px] font-semibold tracking-[0.16em] text-white/35">
                    SUMBER VIDEO
                  </p>
                  <p className="mt-2 break-words text-sm font-medium text-white/80">
                    {result.video.title}
                  </p>
                  {result.videoUrl && (
                    <a
                      href={result.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#94ffad] hover:underline"
                    >
                      Lihat video sumber
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              )}

              {result.presetLinks.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {result.presetLinks.map((preset, index) => {
                    const id = `${index}-${preset.url}`;

                    return (
                      <article
                        key={id}
                        className="group relative overflow-hidden rounded-[24px] border border-[#a0ffb5]/15 bg-[#111811]/80 p-5 shadow-[0_12px_45px_rgba(0,0,0,0.15)] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-[#a0ffb5]/30 hover:bg-[#142016]/90"
                      >
                        <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#5bff83]/[0.07] blur-3xl transition group-hover:bg-[#5bff83]/[0.13]" />

                        <div className="relative">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#8dffaa]/20 bg-gradient-to-br from-[#8dffaa]/15 to-[#38e66a]/[0.04] text-[#a3ffb8]">
                              <FileCode2 size={23} strokeWidth={1.6} />
                            </div>

                            <span className="rounded-full border border-[#8dffaa]/20 bg-[#8dffaa]/[0.07] px-2.5 py-1.5 text-[9px] font-bold tracking-[0.12em] text-[#9dffb3]">
                              {presetType(preset.type)}
                            </span>
                          </div>

                          <h3 className="mt-5 break-words text-base font-semibold leading-6 text-white/90">
                            {preset.title || 'Alight Motion Preset'}
                          </h3>

                          <p className="mt-1 truncate text-xs text-white/35">
                            {hostLabel(preset.url)}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {preset.size && (
                              <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-[11px] text-white/60">
                                Ukuran: {preset.size}
                              </span>
                            )}

                            {preset.ratio && (
                              <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-[11px] text-white/60">
                                Rasio: {preset.ratio}
                              </span>
                            )}

                            {preset.pinned && (
                              <span className="rounded-lg border border-[#8dffaa]/15 bg-[#8dffaa]/[0.05] px-2.5 py-1.5 text-[11px] text-[#a0ffb5]">
                                Link disematkan
                              </span>
                            )}
                          </div>

                          {preset.password && (
                            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200/10 bg-amber-200/[0.04] p-3">
                              <div className="flex min-w-0 items-center gap-2">
                                <LockKeyhole
                                  size={15}
                                  className="shrink-0 text-amber-200/80"
                                />
                                <div className="min-w-0">
                                  <p className="text-[10px] text-white/35">
                                    PASSWORD PRESET
                                  </p>
                                  <p className="mt-1 break-all font-mono text-xs text-amber-100">
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
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition hover:text-white"
                              >
                                {copied === `pw-${id}` ? (
                                  <Check size={15} />
                                ) : (
                                  <Copy size={15} />
                                )}
                              </button>
                            </div>
                          )}

                          {preset.detail && (
                            <p className="mt-3 break-words text-xs leading-5 text-white/45">
                              {preset.detail}
                            </p>
                          )}

                          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2 border-t border-white/[0.07] pt-4">
                            <a
                              href={preset.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a5ffb7] to-[#51ed7b] px-3 py-2.5 text-xs font-bold text-[#07160b] transition hover:brightness-105"
                            >
                              Buka link preset
                              <ArrowUpRight size={15} />
                            </a>

                            <button
                              type="button"
                              onClick={() => copyText(preset.url, `url-${id}`)}
                              aria-label="Salin link preset"
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#8dffaa]/20 bg-[#8dffaa]/[0.05] px-3 text-[#a1ffb6] transition hover:bg-[#8dffaa]/10"
                            >
                              {copied === `url-${id}` ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <p className="mt-7 text-center text-xs leading-6 text-white/30">
                Periksa tujuan link sebelum mengunduh. Informasi ukuran,
                rasio, dan password hanya ditampilkan jika berhasil
                ditemukan oleh scraper.
              </p>
            </section>
          )}

          {/* Empty / first view */}
          {!loading && !result && !error && (
            <section className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#8dffaa]/15 bg-[#8dffaa]/[0.06] text-[#9dffb1]">
                  <Link2 size={19} />
                </div>
                <h3 className="text-sm font-semibold text-white/85">
                  Link preset langsung
                </h3>
                <p className="mt-2 text-xs leading-6 text-white/45">
                  Tempel link Alight Motion, MediaFire, Google Drive, atau
                  sumber preset lain yang didukung.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 backdrop-blur-xl">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[#8dffaa]/15 bg-[#8dffaa]/[0.06] text-[#9dffb1]">
                  <Film size={19} />
                </div>
                <h3 className="text-sm font-semibold text-white/85">
                  Link video kreator
                </h3>
                <p className="mt-2 text-xs leading-6 text-white/45">
                  Scraper memeriksa teks yang tersedia, seperti deskripsi
                  dan komentar TikTok, untuk mencari link preset.
                </p>
              </div>
            </section>
          )}

          <footer className="mt-16 border-t border-white/[0.07] pt-6 text-center">
            <p className="text-xs text-white/30">
              AMFinder · ScriptStationV2
            </p>
            <p className="mt-1 text-[10px] text-white/20">
              Community preset discovery · Respect original creators
            </p>
          </footer>
        </div>
      </main>
    </Shell>
  );
}