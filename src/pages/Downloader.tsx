
import { useState } from 'react';
import {
  Download,
  Search,
  Music,
  Video,
  Instagram,
  Facebook,
  LoaderCircle,
  Link2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';

type Platform =
  | 'aio'
  | 'facebook'
  | 'instagram'
  | 'snackvideo'
  | 'spotify'
  | 'spotifyplay'
  | 'threads'
  | 'tiktok'
  | 'twitter'
  | 'ytmp3'
  | 'ytmp4';

const platforms: {
  id: Platform;
  name: string;
  description: string;
  icon: typeof Download;
}[] = [
  { id: 'aio', name: 'All Downloader', description: 'Berbagai platform', icon: Download },
  { id: 'tiktok', name: 'TikTok', description: 'Video TikTok', icon: Video },
  { id: 'facebook', name: 'Facebook', description: 'Video Facebook', icon: Facebook },
  { id: 'instagram', name: 'Instagram', description: 'Post dan Reels', icon: Instagram },
  { id: 'snackvideo', name: 'SnackVideo', description: 'Video SnackVideo', icon: Video },
  { id: 'threads', name: 'Threads', description: 'Post Threads', icon: Link2 },
  { id: 'twitter', name: 'X / Twitter', description: 'Video dari X', icon: Video },
  { id: 'spotify', name: 'Spotify', description: 'Lagu dari tautan', icon: Music },
  { id: 'spotifyplay', name: 'Cari Lagu', description: 'Cari berdasarkan judul', icon: Search },
  { id: 'ytmp3', name: 'YouTube MP3', description: 'Audio YouTube', icon: Music },
  { id: 'ytmp4', name: 'YouTube MP4', description: 'Video YouTube', icon: Video },
];

const resolutions: Record<string, string[]> = {
  ytmp4: ['360', '480', '720', '1080', '1440', '2160'],
};

const servers: Record<string, { label: string; value: string }[]> = {
  instagram: [
    { label: 'Server Utama', value: 'instagram' },
    { label: 'Server V1', value: 'v1/instagram' },
    { label: 'Server V2', value: 'v2/instagram' },
  ],
  spotify: [
    { label: 'Server Utama', value: 'spotify' },
    { label: 'Server V1', value: 'v1/spotify' },
  ],
  ytmp3: [
    { label: 'Server Utama', value: 'ytmp3' },
    { label: 'Server V1', value: 'v1/ytmp3' },
  ],
  ytmp4: [
    { label: 'Server 2160p', value: 'ytmp4' },
    { label: 'Server V1 (maks. 1080p)', value: 'v1/ytmp4' },
  ],
};

export default function Downloader() {
  const [platform, setPlatform] = useState<Platform>('aio');
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');
  const [resolution, setResolution] = useState('720');
  const [server, setServer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [stage, setStage] = useState('Menunggu tautan kamu');

  const availableServers = servers[platform] || [];
  const selectedServer =
    availableServers.find((item) => item.value === server)?.value ||
    availableServers[0]?.value ||
    platform;

  const getDownloadUrl = (data: any): string[] => {
    const links: string[] = [];
    const visit = (value: any, depth = 0) => {
      if (depth > 5 || value == null) return;

      if (typeof value === 'string') {
        if (/^https?:\/\//i.test(value)) {
          if (
            /\.(mp4|mp3|m4a|webm|mov)(\?|$)/i.test(value) ||
            /download|media|video|audio|cdn|\.mp4|\.mp3/i.test(value)
          ) {
            links.push(value);
          }
        }
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, depth + 1));
        return;
      }

      if (typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => {
          if (
            typeof item === 'string' &&
            /^https?:\/\//i.test(item) &&
            /url|link|download|video|audio|media|src/i.test(key)
          ) {
            links.push(item);
          } else {
            visit(item, depth + 1);
          }
        });
      }
    };

    visit(data);
    return [...new Set(links)];
  };

  async function handleDownload(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (platform === 'spotifyplay' && !query.trim()) {
      setError('Masukkan judul lagu terlebih dahulu.');
      return;
    }

    if (platform !== 'spotifyplay' && !url.trim()) {
      setError('Masukkan tautan terlebih dahulu.');
      return;
    }

    if (url.trim() && !/^https?:\/\//i.test(url.trim())) {
      setError('Tautan harus diawali http:// atau https://.');
      return;
    }

    setLoading(true);
    setStage('Memeriksa permintaan...');

    try {
      const params = new URLSearchParams();

      if (platform === 'spotifyplay') {
        params.set('q', query.trim());
      } else {
        params.set('url', url.trim());
      }

      if (platform === 'ytmp4') {
        params.set('resolusi', resolution);
      }

      if (availableServers.length > 0) {
        params.set('server', selectedServer);
      }

      setStage('Menghubungi server downloader...');

      const response = await fetch(
        `/api/downloader?platform=${encodeURIComponent(platform)}&${params.toString()}`
      );

      setStage('Membaca hasil dari server...');

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Server gagal memproses permintaan.');
      }

      const links = getDownloadUrl(data);

      setResult({ data, links });
      setStage('Permintaan selesai');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan. Coba lagi beberapa saat.'
      );
    } finally {
      setLoading(false);
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError('Gagal menyalin. Salin tautan secara manual.');
    }
  };

  return (
    <main className="min-h-screen bg-[#070914] px-4 pb-16 pt-8 text-white sm:px-6 sm:pt-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-64 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <section className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-xs font-medium text-violet-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
            SCRIPTSTATION V2 · DOWNLOADER HUB
          </div>

          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            Download <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">Anything.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Satu tempat untuk mengolah tautan video, audio, dan media favoritmu.
            Pilih platform, tempel tautan, lalu mulai.
          </p>
        </section>

        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {platforms.map((item) => {
            const Icon = item.icon;
            const active = platform === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setPlatform(item.id);
                  setResult(null);
                  setError('');
                  setServer('');
                }}
                className={`group rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
                  active
                    ? 'border-violet-400/60 bg-violet-500/15 shadow-lg shadow-violet-950/30'
                    : 'border-white/[0.08] bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <Icon
                    size={22}
                    className={active ? 'text-violet-300' : 'text-slate-400'}
                  />
                  {active && <CheckCircle2 size={16} className="text-cyan-300" />}
                </div>
                <div className="text-sm font-semibold">{item.name}</div>
                <div className="mt-1 text-xs text-slate-500">{item.description}</div>
              </button>
            );
          })}
        </section>

        <section className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleDownload}
            className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-violet-400/10 p-3 text-violet-300">
                <Download size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Mulai Download</h2>
                <p className="text-xs text-slate-400">
                  Platform: {platforms.find((p) => p.id === platform)?.name}
                </p>
              </div>
            </div>

            {platform === 'spotifyplay' ? (
              <label className="mb-5 block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Judul lagu atau nama artis
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Contoh: Judul lagu - Nama artis"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/10"
                />
              </label>
            ) : (
              <label className="mb-5 block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Tautan media
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 transition focus-within:border-violet-400/60">
                  <Link2 size={18} className="shrink-0 text-slate-500" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Tempel tautan di sini..."
                    className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-slate-600"
                    type="url"
                  />
                  {url && (
                    <button
                      type="button"
                      onClick={() => setUrl('')}
                      className="text-xs text-slate-500 hover:text-white"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </label>
            )}

            {availableServers.length > 0 && (
              <label className="mb-5 block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Pilih server
                </span>
                <select
                  value={selectedServer}
                  onChange={(e) => setServer(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#101222] px-4 py-3.5 text-sm outline-none focus:border-violet-400/60"
                >
                  {availableServers.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {platform === 'ytmp4' && (
              <label className="mb-5 block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Resolusi video
                </span>
                <select
                  value={resolution}
                  onChange={(e) => {
                    const next = e.target.value;
                    setResolution(next);
                    if (next === '1440' || next === '2160') {
                      setServer('ytmp4');
                    } else if (server === 'ytmp4') {
                      setServer('v1/ytmp4');
                    }
                  }}
                  className="w-full rounded-xl border border-white/10 bg-[#101222] px-4 py-3.5 text-sm outline-none focus:border-violet-400/60"
                >
                  {resolutions.ytmp4.map((item) => (
                    <option key={item} value={item}>
                      {item}p
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs text-slate-500">
                  Server V1 mendukung hingga 1080p. Resolusi lebih tinggi menggunakan server utama.
                </span>
              </label>
            )}

            {error && (
              <div className="mb-5 flex gap-2 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-4 text-sm font-bold shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" size={19} />
                  Sedang memproses...
                </>
              ) : (
                <>
                  <Search size={19} />
                  Proses Sekarang
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Gunakan hanya untuk konten yang kamu miliki atau diizinkan untuk diunduh.
            </p>
          </form>

          <section className="min-h-72 rounded-3xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-bold">Hasil Proses</h2>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400">
                {loading ? 'Processing' : result ? 'Completed' : 'Ready'}
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <div className="relative mb-7 flex h-20 w-20 items-center justify-center">
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-300" />
                  <div className="absolute inset-2 animate-[spin_2s_linear_infinite_reverse] rounded-full border-2 border-cyan-400/20 border-b-cyan-300" />
                  <Download className="animate-pulse text-violet-200" size={25} />
                </div>
                <p className="font-semibold">{stage}</p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  Tunggu sebentar. Waktu proses bergantung pada server penyedia.
                </p>
                <div className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-1/3 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" />
                </div>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <CheckCircle2 size={18} />
                  Respons server diterima
                </div>

                {result.links.length > 0 ? (
                  result.links.map((link: string, index: number) => (
                    <div
                      key={`${link}-${index}`}
                      className="rounded-xl border border-white/10 bg-black/20 p-4"
                    >
                      <p className="mb-2 text-xs text-slate-400">
                        Tautan media {index + 1}
                      </p>
                      <p className="break-all text-xs leading-5 text-slate-300">
                        {link}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-violet-500/20 px-3 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/30"
                        >
                          <Download size={15} />
                          Buka media
                        </a>
                        <button
                          type="button"
                          onClick={() => copyText(link)}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                        >
                          <Copy size={15} />
                          Salin tautan
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100">
                    Respons diterima, tetapi tautan unduhan belum dikenali. Periksa JSON mentah di bawah.
                  </div>
                )}

                <details className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer text-sm text-slate-300">
                    Lihat JSON mentah
                  </summary>
                  <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-slate-400">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <RotateCw size={28} className="text-slate-500" />
                </div>
                <p className="font-semibold text-slate-300">Siap memproses</p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  Pilih platform dan masukkan tautan. Hasil akan muncul di sini.
                </p>
              </div>
            )}
          </section>
        </section>

        <footer className="mt-12 text-center text-xs text-slate-600">
          ScriptStationV2 · Downloader Hub
        </footer>
      </div>
    </main>
  );
}