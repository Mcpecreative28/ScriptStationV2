import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  ImageOff,
  LoaderCircle,
  Search,
  ScanSearch,
  Sparkles,
  Video,
  Youtube,
  Link2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Shell from '../components/Shell';

type Preset = {
  type?: string;
  url?: string;
  title?: string;
  thumb?: string;
  thumbs?: string[];
  size?: string;
  ratio?: string;
  source?: string;
  detail?: string;
  verified?: boolean;
  judul?: string;
  thumbnail?: string;
  link_preset?: string;
};

type SearchItem = {
  url?: string;
  url_video?: string;
  title?: string;
  thumb?: string;
  thumbnail?: string;
  source?: string;
  author?: string;
  views?: number | string;
  likes?: number | string;
  duration?: string;
  hashtags?: string[];
  snippet_caption?: string;
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
    searchItems?: SearchItem[];
    items?: SearchItem[];
    preset?: Preset[];
    sumber?: string;
    nama_creator?: string;
    handle_creator?: string;
    tautan_video?: string;
    judul_video?: string;
    caption?: string;
    thumbnail?: string;
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

type ResultItem = {
  id: string;
  title: string;
  url: string;
  thumb: string;
  source: string;
  author: string;
  description: string;
  verified: boolean;
};

type Mode = 'link' | 'keyword';

function getHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function detectSource(url: string, fallback?: string): string {
  const host = getHost(url).toLowerCase();

  if (host.includes('youtube.com') || host === 'youtu.be') {
    return 'YouTube';
  }

  if (host.includes('tiktok.com')) {
    return 'TikTok';
  }

  if (host.includes('instagram.com')) {
    return 'Instagram';
  }

  if (host.includes('facebook.com') || host.includes('fb.watch')) {
    return 'Facebook';
  }

  if (host.includes('mediafire.com')) {
    return 'MediaFire';
  }

  if (host.includes('github.com')) {
    return 'GitHub';
  }

  if (host.includes('drive.google.com')) {
    return 'Google Drive';
  }

  return fallback || (host || 'Sumber tidak diketahui');
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizePreset(preset: Preset, index: number): ResultItem | null {
  const url = preset.url || preset.link_preset || '';

  if (!isValidHttpUrl(url)) {
    return null;
  }

  return {
    id: `preset-${index}-${url}`,
    title:
      preset.title ||
      preset.judul ||
      `Link preset ${index + 1}`,
    url,
    thumb:
      preset.thumb ||
      preset.thumbnail ||
      preset.thumbs?.[0] ||
      '',
    source: detectSource(url, preset.source),
    author: '',
    description: preset.detail || '',
    verified: preset.verified === true,
  };
}

function normalizeSearchItem(
  item: SearchItem,
  index: number,
): ResultItem | null {
  const url = item.url || item.url_video || '';

  if (!isValidHttpUrl(url)) {
    return null;
  }

  return {
    id: `search-${index}-${url}`,
    title:
      item.title ||
      item.snippet_caption ||
      `Video referensi ${index + 1}`,
    url,
    thumb: item.thumb || item.thumbnail || '',
    source: detectSource(url, item.source),
    author: item.author || '',
    description: item.snippet_caption || '',
    verified: false,
  };
}

function formatCount(value?: number | string): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  const numberValue =
    typeof value === 'string' ? Number(value) : value;

  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  if (numberValue >= 1_000_000) {
    return `${(numberValue / 1_000_000).toFixed(1)} jt`;
  }

  if (numberValue >= 1_000) {
    return `${(numberValue / 1_000).toFixed(1)} rb`;
  }

  return String(numberValue);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan yang tidak diketahui.';
}

export default function AMFinder() {
  const [mode, setMode] = useState<Mode>('link');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [creator, setCreator] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoThumbnail, setVideoThumbnail] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [sourceName, setSourceName] = useState('');

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = input.trim();

    if (!value) {
      setError(
        mode === 'link'
          ? 'Masukkan link video terlebih dahulu.'
          : 'Masukkan kata kunci preset yang ingin dicari.',
      );
      return;
    }

    if (mode === 'link' && !isValidHttpUrl(value)) {
      setError('Link tidak valid. Pastikan menggunakan URL http:// atau https://.');
      return;
    }

    setLoading(true);
    setSearched(false);
    setError('');
    setResults([]);
    setCreator('');
    setVideoTitle('');
    setVideoThumbnail('');
    setVideoDescription('');
    setSourceName('');

    try {
      const endpoint =
        mode === 'link'
          ? `/api/amfinder?url=${encodeURIComponent(value)}`
          : `/api/amfinder?mode=keyword&q=${encodeURIComponent(value)}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      const rawText = await response.text();

      let result: FinderResponse;

      try {
        result = JSON.parse(rawText) as FinderResponse;
      } catch {
        throw new Error(
          response.ok
            ? 'Respons API bukan JSON yang valid. Periksa konfigurasi backend AMFinder.'
            : `Server mengembalikan HTTP ${response.status}.`,
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            `Permintaan gagal dengan status HTTP ${response.status}.`,
        );
      }

      if (result.success === false || result.data?.ok === false) {
        throw new Error(
          result.error ||
            result.message ||
            'Pencarian gagal. Coba lagi beberapa saat.',
        );
      }

      const data = result.data || {};

      setCreator(
        data.authorDetail?.nickname ||
          data.nama_creator ||
          data.handle_creator ||
          data.author ||
          '',
      );

      setVideoTitle(data.judul_video || '');
      setVideoThumbnail(
        data.video?.cover ||
          data.thumbnail ||
          '',
      );

      setVideoDescription(
        data.video?.description ||
          data.caption ||
          '',
      );

      setSourceName(data.sumber || '');

      let normalized: ResultItem[] = [];

      if (mode === 'link') {
        const presets = [
          ...(data.presetLinks || []),
          ...(data.preset || []),
        ];

        normalized = presets
          .map((preset, index) => normalizePreset(preset, index))
          .filter((item): item is ResultItem => item !== null);
      } else {
        const items = [
          ...(data.searchItems || []),
          ...(data.items || []),
        ];

        normalized = items
          .map((item, index) => normalizeSearchItem(item, index))
          .filter((item): item is ResultItem => item !== null);
      }

      const uniqueResults = normalized.filter(
        (item, index, array) =>
          array.findIndex((other) => other.url === item.url) === index,
      );

      setResults(uniqueResults);
      setSearched(true);

      if (uniqueResults.length === 0) {
        setError(
          mode === 'link'
            ? 'Belum ada link preset yang berhasil ditemukan. Video mungkin tidak menyertakan link preset yang bisa dibaca.'
            : 'Belum ada hasil yang bisa ditampilkan. Coba kata kunci lain atau periksa format respons API.',
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setResults([]);
    setSearched(false);
    setCreator('');
    setVideoTitle('');
    setVideoThumbnail('');
    setVideoDescription('');
    setSourceName('');
  }

  return (
    <Shell>
      <main className="relative min-h-screen overflow-hidden px-4 pb-20 pt-8 text-white sm:px-6 sm:pt-12">
        {/* Background decoration */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-32 top-16 h-72 w-72 rounded-full bg-violet-600/15 blur-[110px]" />
          <div className="absolute -right-32 top-72 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute left-1/2 top-[650px] h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          {/* Back navigation */}
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft size={16} />
            Kembali ke beranda
          </Link>

          {/* Hero */}
          <section className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-3.5 py-1.5 text-xs font-medium tracking-wide text-violet-200">
              <Sparkles size={14} />
              ALIGHT MOTION PRESET FINDER
            </div>

            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
              Temukan preset,
              <span className="block bg-gradient-to-r from-violet-300 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                bukan sekadar video.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
              Cari referensi preset Alight Motion dari link video atau
              kata kunci. Periksa deskripsi dan komentar sumber untuk
              menemukan link preset yang benar.
            </p>
          </section>

          {/* Search panel */}
          <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/10 bg-[#101018]/80 p-4 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:mt-12 sm:p-6">
            {/* Mode switch */}
            <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-black/20 p-1.5">
              <button
                type="button"
                onClick={() => changeMode('link')}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  mode === 'link'
                    ? 'bg-violet-500/20 text-violet-100 shadow-sm ring-1 ring-violet-400/20'
                    : 'text-white/45 hover:bg-white/[0.04] hover:text-white/80'
                }`}
              >
                <Link2 size={16} />
                Cari dari link
              </button>

              <button
                type="button"
                onClick={() => changeMode('keyword')}
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  mode === 'keyword'
                    ? 'bg-cyan-500/15 text-cyan-100 shadow-sm ring-1 ring-cyan-400/20'
                    : 'text-white/45 hover:bg-white/[0.04] hover:text-white/80'
                }`}
              >
                <Search size={16} />
                Cari kata kunci
              </button>
            </div>

            <form onSubmit={handleSearch}>
              <label
                htmlFor="amfinder-query"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                {mode === 'link'
                  ? 'Link video TikTok atau YouTube'
                  : 'Kata kunci preset'}
              </label>

              <div className="relative">
                {mode === 'link' ? (
                  <Link2
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                  />
                ) : (
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
                  />
                )}

                <input
                  id="amfinder-query"
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={
                    mode === 'link'
                      ? 'https://www.tiktok.com/@user/video/...'
                      : 'Contoh: preset jedag jedug XML'
                  }
                  autoComplete="off"
                  className="min-h-14 w-full rounded-2xl border border-white/10 bg-black/25 py-4 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={18} className="animate-spin" />
                    Sedang mencari...
                  </>
                ) : (
                  <>
                    <ScanSearch size={18} />
                    Temukan preset
                    <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            </form>

            <p className="mt-4 text-xs leading-5 text-white/35">
              {mode === 'link'
                ? 'Tempel link video publik. Hasil bergantung pada data yang bisa diakses oleh backend.'
                : 'Gunakan kata kunci yang spesifik agar hasil pencarian lebih relevan.'}
            </p>
          </section>

          {/* Loading */}
          {loading && (
            <section className="mx-auto mt-10 max-w-3xl">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10">
                  <LoaderCircle
                    size={25}
                    className="animate-spin text-violet-300"
                  />
                </div>

                <h2 className="font-medium text-white/90">
                  Sedang memeriksa sumber
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/45">
                  Mengambil informasi yang tersedia. Proses ini bisa
                  memerlukan beberapa saat.
                </p>

                <div className="mx-auto mt-6 h-1.5 max-w-xs overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
                </div>
              </div>
            </section>
          )}

          {/* Error / empty state */}
          {!loading && error && (
            <section
              role="status"
              className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-5"
            >
              <div className="flex items-start gap-3">
                <CircleAlert
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-300"
                />

                <div>
                  <h2 className="font-medium text-amber-100">
                    {results.length > 0
                      ? 'Ada catatan'
                      : 'Belum menemukan hasil'}
                  </h2>

                  <p className="mt-1 break-words text-sm leading-6 text-amber-100/65">
                    {error}
                  </p>

                  {results.length === 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setSearched(false);
                      }}
                      className="mt-3 text-sm font-medium text-amber-200 underline decoration-amber-200/30 underline-offset-4 hover:decoration-amber-200"
                    >
                      Coba lagi
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Video metadata */}
          {!loading &&
            mode === 'link' &&
            searched &&
            (videoTitle || videoThumbnail || videoDescription || creator) && (
              <section className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                  {videoThumbnail ? (
                    <img
                      src={videoThumbnail}
                      alt="Thumbnail video sumber"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="aspect-video w-full rounded-2xl border border-white/10 bg-black/30 object-cover sm:w-44"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/25 sm:w-44">
                      <Video size={28} />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-violet-300/80">
                      Video sumber
                    </p>

                    <h2 className="mt-2 break-words text-base font-semibold text-white/90">
                      {videoTitle || 'Informasi video'}
                    </h2>

                    {creator && (
                      <p className="mt-1 break-words text-sm text-white/50">
                        Oleh {creator}
                      </p>
                    )}

                    {sourceName && (
                      <p className="mt-2 text-xs text-white/35">
                        Sumber: {sourceName}
                      </p>
                    )}

                    {videoDescription && (
                      <p className="mt-3 line-clamp-4 whitespace-pre-line break-words text-sm leading-6 text-white/45">
                        {videoDescription}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

          {/* Results heading */}
          {!loading && results.length > 0 && (
            <section className="mt-12">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300/70">
                    Hasil pencarian
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {mode === 'link'
                      ? 'Link preset ditemukan'
                      : 'Video referensi'}
                  </h2>

                  <p className="mt-2 text-sm text-white/45">
                    {results.length} hasil dapat ditampilkan.
                  </p>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-1.5 text-xs text-white/45">
                  <CheckCircle2 size={14} className="text-emerald-300/80" />
                  URL diperiksa
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((item) => (
                  <article
                    key={item.id}
                    className="group overflow-hidden rounded-3xl border border-white/[0.09] bg-[#111119]/75 transition duration-300 hover:-translate-y-1 hover:border-violet-300/25 hover:bg-[#151520]"
                  >
                    <div className="relative aspect-video overflow-hidden bg-black/30">
                      {item.thumb ? (
                        <img
                          src={item.thumb}
                          alt={`Thumbnail ${item.title}`}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/25">
                          <ImageOff size={28} />
                          <span className="text-xs">
                            Thumbnail tidak tersedia
                          </span>
                        </div>
                      )}

                      <div className="absolute left-3 top-3 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md">
                        {item.source}
                      </div>

                      {item.verified && (
                        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-2 py-1.5 text-xs text-emerald-200 backdrop-blur-md">
                          <CheckCircle2 size={12} />
                          Terverifikasi sumber
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="line-clamp-2 min-h-12 break-words text-sm font-semibold leading-6 text-white/90">
                        {item.title}
                      </h3>

                      {item.author && (
                        <p className="mt-2 truncate text-xs text-white/40">
                          {item.author}
                        </p>
                      )}

                      {item.description && (
                        <p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-white/40">
                          {item.description}
                        </p>
                      )}

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                        <span className="max-w-[55%] truncate text-xs text-white/35">
                          {getHost(item.url)}
                        </span>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/20 bg-violet-400/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-400/15"
                        >
                          Buka sumber
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-6 text-white/35">
                Hasil ini berasal dari data yang diberikan API. Periksa
                halaman sumber sebelum mengunduh atau menggunakan preset.
                AMFinder tidak menjamin setiap video memiliki link preset.
              </p>
            </section>
          )}

          {/* Initial state */}
          {!loading && !searched && (
            <section className="mx-auto mt-12 max-w-3xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-violet-300/[0.08] text-violet-200">
                    <Youtube size={19} />
                  </div>

                  <h3 className="font-medium text-white/85">
                    Cari dari video
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/45">
                    Masukkan link video dan periksa informasi yang
                    tersedia, termasuk link preset dari sumber.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.07] text-cyan-200">
                    <Search size={19} />
                  </div>

                  <h3 className="font-medium text-white/85">
                    Jelajahi referensi
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-white/45">
                    Gunakan kata kunci seperti nama kreator, jenis
                    transisi, atau gaya edit yang kamu cari.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-xs leading-6 text-white/40">
                  <span className="font-semibold text-white/60">
                    Tips:
                  </span>{' '}
                  beberapa kreator menyimpan link preset di deskripsi,
                  komentar yang disematkan, atau halaman profil. Jika
                  link tidak ditemukan, periksa bagian tersebut secara
                  manual.
                </p>
              </div>
            </section>
          )}

          {/* Footer note */}
          <footer className="mt-16 border-t border-white/[0.07] pt-6 text-center">
            <p className="text-xs leading-6 text-white/30">
              AMFinder · Bagian dari ScriptStationV2
            </p>
            <p className="mt-1 text-xs text-white/25">
              Gunakan hasil pencarian secara bijak dan hormati kreator
              aslinya.
            </p>
          </footer>
        </div>
      </main>
    </Shell>
  );
}