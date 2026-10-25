
import { useState, type FormEvent } from 'react';
import {
  AudioLines,
  Disc3,
  Film,
  Globe2,
  Camera,
  Radio,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileVideo,
  Heart,
  Link2,
  Music2,
  Search,
  Sparkles,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import Shell from '../components/Shell';

type ServiceId =
  | 'aio'
  | 'facebook'
  | 'instagram'
  | 'instagram-v1'
  | 'instagram-v2'
  | 'snackvideo'
  | 'spotify'
  | 'spotify-v1'
  | 'spotifyplay'
  | 'threads'
  | 'tiktok'
  | 'twitter'
  | 'ytmp3'
  | 'ytmp3-v1'
  | 'ytmp4'
  | 'ytmp4-v1';

type Service = {
  id: ServiceId;
  name: string;
  group: 'Semua' | 'Video' | 'Audio';
  description: string;
  placeholder: string;
  query?: boolean;
  resolutions?: string[];
};

type Media = {
  url: string;
  label: string;
  kind: 'video' | 'audio' | 'file';
  quality?: string;
};

type Metadata = {
  title?: string;
  description?: string;
  author?: string;
  thumbnail?: string;
  duration?: string;
  views?: string;
  likes?: string;
  size?: string;
};

const SERVICES: Service[] = [
  {
    id: 'aio',
    name: 'All-in-One',
    group: 'Semua',
    description: 'Deteksi platform otomatis',
    placeholder: 'Tempel tautan media...',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    group: 'Video',
    description: 'Video TikTok',
    placeholder: 'https://www.tiktok.com/...',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    group: 'Video',
    description: 'Video Facebook',
    placeholder: 'https://www.facebook.com/...',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    group: 'Video',
    description: 'Server utama',
    placeholder: 'https://www.instagram.com/...',
  },
  {
    id: 'instagram-v1',
    name: 'Instagram V1',
    group: 'Video',
    description: 'Server alternatif 1',
    placeholder: 'https://www.instagram.com/...',
  },
  {
    id: 'instagram-v2',
    name: 'Instagram V2',
    group: 'Video',
    description: 'Server alternatif 2',
    placeholder: 'https://www.instagram.com/...',
  },
  {
    id: 'snackvideo',
    name: 'SnackVideo',
    group: 'Video',
    description: 'Video SnackVideo',
    placeholder: 'https://www.snackvideo.com/...',
  },
  {
    id: 'threads',
    name: 'Threads',
    group: 'Video',
    description: 'Media dari Threads',
    placeholder: 'https://www.threads.net/...',
  },
  {
    id: 'twitter',
    name: 'X / Twitter',
    group: 'Video',
    description: 'Video dari X',
    placeholder: 'https://x.com/...',
  },
  {
    id: 'ytmp4',
    name: 'YouTube MP4',
    group: 'Video',
    description: 'Video berbagai resolusi',
    placeholder: 'https://www.youtube.com/watch?v=...',
    resolutions: ['360', '480', '720', '1080', '1440', '2160'],
  },
  {
    id: 'ytmp4-v1',
    name: 'YouTube MP4 V1',
    group: 'Video',
    description: 'Server alternatif',
    placeholder: 'https://youtu.be/...',
    resolutions: ['144', '240', '360', '480', '720', '1080'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    group: 'Audio',
    description: 'Audio dari tautan Spotify',
    placeholder: 'https://open.spotify.com/track/...',
  },
  {
    id: 'spotify-v1',
    name: 'Spotify V1',
    group: 'Audio',
    description: 'Server alternatif Spotify',
    placeholder: 'https://open.spotify.com/track/...',
  },
  {
    id: 'spotifyplay',
    name: 'Cari Lagu',
    group: 'Audio',
    description: 'Cari judul atau artis',
    placeholder: 'Masukkan judul lagu atau nama artis...',
    query: true,
  },
  {
    id: 'ytmp3',
    name: 'YouTube MP3',
    group: 'Audio',
    description: 'Audio dari YouTube',
    placeholder: 'https://www.youtube.com/watch?v=...',
  },
  {
    id: 'ytmp3-v1',
    name: 'YouTube MP3 V1',
    group: 'Audio',
    description: 'Server audio alternatif',
    placeholder: 'https://youtu.be/...',
  },
];

const PLATFORMS: Record<ServiceId, string> = {
  aio: 'aio',
  facebook: 'facebook',
  instagram: 'instagram',
  'instagram-v1': 'instagram',
  'instagram-v2': 'instagram',
  snackvideo: 'snackvideo',
  spotify: 'spotify',
  'spotify-v1': 'spotify',
  spotifyplay: 'spotifyplay',
  threads: 'threads',
  tiktok: 'tiktok',
  twitter: 'twitter',
  ytmp3: 'ytmp3',
  'ytmp3-v1': 'ytmp3',
  ytmp4: 'ytmp4',
  'ytmp4-v1': 'ytmp4',
};

const ENDPOINTS: Record<ServiceId, string> = {
  aio: 'aio',
  facebook: 'facebook',
  instagram: 'instagram',
  'instagram-v1': 'v1/instagram',
  'instagram-v2': 'v2/instagram',
  snackvideo: 'snackvideo',
  spotify: 'spotify',
  'spotify-v1': 'v1/spotify',
  spotifyplay: 'spotifyplay',
  threads: 'threads',
  tiktok: 'tiktok',
  twitter: 'twitter',
  ytmp3: 'ytmp3',
  'ytmp3-v1': 'v1/ytmp3',
  ytmp4: 'ytmp4',
  'ytmp4-v1': 'v1/ytmp4',
};

const VIDEO_SERVICES: ServiceId[] = [
  'facebook',
  'instagram',
  'instagram-v1',
  'instagram-v2',
  'snackvideo',
  'threads',
  'tiktok',
  'twitter',
  'ytmp4',
  'ytmp4-v1',
];

const AUDIO_SERVICES: ServiceId[] = [
  'spotify',
  'spotify-v1',
  'spotifyplay',
  'ytmp3',
  'ytmp3-v1',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function formatNumber(value?: string) {
  if (!value) return undefined;

  const number = Number(value.replace(/[, ]/g, ''));

  if (!Number.isFinite(number)) return value;

  return new Intl.NumberFormat('id-ID', {
    notation: number >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(number);
}

function formatDuration(value?: string) {
  if (!value) return undefined;
  if (value.includes(':')) return value;

  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds < 0) {
    return value;
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = String(Math.floor(seconds % 60)).padStart(2, '0');
  const hours = Math.floor(minutes / 60);

  return hours
    ? `${hours}:${String(minutes % 60).padStart(2, '0')}:${remaining}`
    : `${minutes}:${remaining}`;
}

function extractMetadata(data: unknown): Metadata {
  const result: Metadata = {};

  const aliases: Record<keyof Metadata, RegExp> = {
    title: /^(title|name|track|song|video_title|music_title)$/i,
    description: /^(description|caption|text|desc)$/i,
    author: /^(author|artist|creator|username|channel|uploader|owner)$/i,
    thumbnail: /^(thumbnail|thumbnail_url|cover|cover_url|image|image_url|thumb)$/i,
    duration: /^(duration|length|time)$/i,
    views: /^(views|view_count|play_count|plays)$/i,
    likes: /^(likes|like_count|favorite_count)$/i,
    size: /^(filesize|file_size|size|content_length)$/i,
  };

  function walk(value: unknown, depth = 0) {
    if (!isRecord(value) || depth > 7) {
      if (Array.isArray(value) && depth <= 7) {
        value.forEach((item) => walk(item, depth + 1));
      }

      return;
    }

    for (const [key, item] of Object.entries(value)) {
      for (const field of Object.keys(aliases) as (keyof Metadata)[]) {
        if (result[field] !== undefined || !aliases[field].test(key)) {
          continue;
        }

        const candidate = stringValue(item);

        if (!candidate) continue;

        if (
          field !== 'thumbnail' ||
          /^https?:\/\//i.test(candidate)
        ) {
          result[field] = candidate;
        }
      }

      if (isRecord(item) || Array.isArray(item)) {
        walk(item, depth + 1);
      }
    }
  }

  walk(data);

  return result;
}

function extractMedia(data: unknown, service: ServiceId): Media[] {
  const output: Media[] = [];
  const seen = new Set<string>();

  function walk(value: unknown, key = '', depth = 0) {
    if (depth > 8 || value == null) return;

    if (Array.isArray(value)) {
      value
        .slice(0, 80)
        .forEach((item, index) => walk(item, `${key}[${index}]`, depth + 1));

      return;
    }

    if (!isRecord(value)) return;

    for (const [childKey, child] of Object.entries(value)) {
      if (
        typeof child === 'string' &&
        /^https?:\/\//i.test(child)
      ) {
        let pathname = '';

        try {
          pathname = new URL(child).pathname.toLowerCase();
        } catch {
          continue;
        }

        const field = childKey.toLowerCase();

        const extension = pathname.match(
          /\.(mp4|m4v|webm|mov|mp3|m4a|aac|ogg|wav|flac)(?:$)/,
        )?.[1];

        const imageField =
          /(thumb|thumbnail|cover|avatar|profile|image)/i.test(field);

        const mediaField =
          /(url|link|download|video|audio|media|stream|play|file|mp3|mp4|src)/i.test(
            field,
          );

        if (
          imageField ||
          (!extension && !mediaField) ||
          seen.has(child)
        ) {
          continue;
        }

        seen.add(child);

        const audio =
          /mp3|m4a|aac|ogg|wav|flac|audio|music/i.test(
            `${field} ${extension || ''}`,
          ) || AUDIO_SERVICES.includes(service);

        const video =
          /mp4|m4v|webm|mov|video/i.test(
            `${field} ${extension || ''}`,
          ) || VIDEO_SERVICES.includes(service);

        const quality = field.match(
          /(144|240|360|480|720|1080|1440|2160)p?/i,
        )?.[0];

        output.push({
          url: child,
          kind: audio ? 'audio' : video ? 'video' : 'file',
          label: audio ? 'Audio' : video ? 'Video' : 'Media',
          quality,
        });
      } else if (isRecord(child) || Array.isArray(child)) {
        walk(child, childKey, depth + 1);
      }
    }
  }

  walk(data);

  return output.slice(0, 12);
}

function LoadingPanel({ serviceId }: { serviceId: ServiceId }) {
  const service =
    SERVICES.find((item) => item.id === serviceId) ?? SERVICES[0];

  const isAudio = AUDIO_SERVICES.includes(serviceId);
  const isVideo = VIDEO_SERVICES.includes(serviceId);
  const isTikTok = serviceId === 'tiktok';
  const isInstagram = serviceId.startsWith('instagram');
  const isYouTube = serviceId.startsWith('ytmp');
  const isSpotify = serviceId.startsWith('spotify');
  const isAio = serviceId === 'aio';
  const isFacebook = serviceId === 'facebook';
  const isThreads = serviceId === 'threads';
  const isTwitter = serviceId === 'twitter';
  const isSnackVideo = serviceId === 'snackvideo';

  const accent = isTikTok
    ? 'from-cyan-300 via-white to-rose-400'
    : isInstagram
      ? 'from-amber-300 via-pink-400 to-violet-500'
      : isYouTube
        ? 'from-rose-400 via-red-500 to-orange-400'
        : isSpotify
          ? 'from-emerald-300 via-green-400 to-lime-300'
          : isFacebook
            ? 'from-blue-300 via-blue-500 to-cyan-300'
            : isThreads
              ? 'from-zinc-200 via-white to-zinc-400'
              : isTwitter
                ? 'from-sky-300 via-blue-400 to-cyan-200'
                : isSnackVideo
                  ? 'from-orange-300 via-amber-400 to-pink-400'
                  : isAudio
                    ? 'from-cyan-300 via-sky-400 to-violet-400'
                    : 'from-violet-300 via-fuchsia-400 to-cyan-300';

  const loadingTitle = isAio
    ? 'Memindai sumber media'
    : isTikTok
      ? 'Membuka portal TikTok'
      : isInstagram
        ? 'Menjelajahi Instagram'
        : isYouTube
          ? 'Menyiapkan media YouTube'
          : isSpotify
            ? 'Menyelaraskan audio Spotify'
            : isFacebook
              ? 'Menghubungi Facebook'
              : isThreads
                ? 'Menelusuri Threads'
                : isTwitter
                  ? 'Memeriksa media X'
                  : isSnackVideo
                    ? 'Mengambil media SnackVideo'
                    : `Menghubungi ${service.name}`;

  const loadingDescription = isAio
    ? 'Mendeteksi platform dan mencari format yang tersedia...'
    : isAudio
      ? 'Mencari informasi audio dan menyiapkan tautan unduhan...'
      : 'Mengambil detail media dan memeriksa pilihan unduhan...';

  return (
    <div className="relative grid min-h-72 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[#090a10] p-6 text-center sm:min-h-80">
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-[0.07]`}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 top-0 h-40 w-40 animate-pulse rounded-full bg-violet-500/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 animate-pulse rounded-full bg-cyan-400/10 blur-3xl [animation-delay:700ms]"
      />

      <div className="relative z-10 w-full max-w-sm">
        {isTikTok ? (
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[2rem] border border-white/10 bg-black/50 shadow-[0_0_45px_rgba(34,211,238,0.12)]">
            <div className="relative grid h-14 w-14 place-items-center">
              <Music2
                size={46}
                className="absolute -translate-x-1.5 animate-pulse text-cyan-300"
              />
              <Music2
                size={46}
                className="absolute translate-x-1.5 animate-pulse text-rose-400 [animation-delay:300ms]"
              />
              <Music2
                size={42}
                className="relative text-white"
              />
            </div>
          </div>
        ) : isInstagram ? (
          <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center rounded-[2rem] border border-pink-300/20 bg-gradient-to-br from-amber-400/15 via-pink-500/15 to-violet-500/20">
            <div className="absolute inset-2 animate-[spin_5s_linear_infinite] rounded-[1.5rem] border-2 border-pink-300/60" />
            <Camera size={42} className="text-pink-200" />
            <span className="absolute -right-1 -top-1 h-4 w-4 animate-ping rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]" />
          </div>
        ) : isYouTube ? (
          <div className="mx-auto mb-6 grid h-24 w-32 place-items-center rounded-3xl border border-red-400/20 bg-red-500/10 shadow-[0_0_45px_rgba(239,68,68,0.12)]">
            <div className="relative grid h-14 w-20 place-items-center rounded-2xl bg-gradient-to-br from-red-400 to-rose-600">
              <Film size={34} className="text-white" />
              <span className="absolute -inset-2 animate-ping rounded-2xl border border-red-300/50" />
            </div>
          </div>
        ) : isSpotify ? (
          <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 shadow-[0_0_50px_rgba(52,211,153,0.12)]">
            <Disc3
              size={58}
              className="animate-[spin_3s_linear_infinite] text-emerald-300"
            />
            <span className="absolute h-5 w-5 rounded-full border-4 border-[#090a10] bg-emerald-200" />
            <span className="absolute inset-1 animate-pulse rounded-full border border-emerald-200/30" />
          </div>
        ) : isAio ? (
          <div className="relative mx-auto mb-6 h-24 w-32">
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-[spin_4s_linear_infinite] rounded-full border border-violet-300/30" />
            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-[spin_8s_linear_infinite_reverse] rounded-full border border-dashed border-cyan-300/30" />
            <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-violet-200/30 bg-violet-400/15 text-violet-200 shadow-[0_0_35px_rgba(167,139,250,0.2)]">
              <Globe2 size={27} className="animate-pulse" />
            </div>
            <span className="absolute left-1 top-4 h-2.5 w-2.5 animate-ping rounded-full bg-cyan-300" />
            <span className="absolute right-1 top-8 h-2 w-2 animate-ping rounded-full bg-fuchsia-300 [animation-delay:400ms]" />
            <span className="absolute bottom-1 left-1/2 h-2 w-2 animate-ping rounded-full bg-violet-300 [animation-delay:800ms]" />
          </div>
        ) : isFacebook ? (
          <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl border border-blue-300/20 bg-blue-500/10 shadow-[0_0_45px_rgba(59,130,246,0.15)]">
            <Globe2 size={48} className="animate-pulse text-blue-300" />
            <span className="absolute inset-2 animate-[ping_2.5s_ease-in-out_infinite] rounded-2xl border border-blue-300/30" />
          </div>
        ) : isThreads ? (
          <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full border border-white/15 bg-white/[0.04]">
            <Radio size={48} className="animate-pulse text-white" />
            <span className="absolute inset-2 animate-[spin_6s_linear_infinite] rounded-full border border-dashed border-white/30" />
          </div>
        ) : isTwitter ? (
          <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl border border-sky-300/20 bg-sky-400/[0.08]">
            <Video size={46} className="animate-bounce text-sky-200 [animation-duration:1.8s]" />
            <span className="absolute inset-2 animate-pulse rounded-2xl border border-sky-200/30" />
          </div>
        ) : isSnackVideo ? (
          <div className="relative mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl border border-orange-300/20 bg-orange-400/[0.08]">
            <Film size={46} className="animate-pulse text-orange-200" />
            <span className="absolute inset-2 animate-[spin_5s_linear_infinite] rounded-2xl border border-dashed border-amber-200/40" />
          </div>
        ) : isAudio ? (
          <div className="mx-auto mb-6 flex h-24 w-32 items-center justify-center gap-1.5 rounded-3xl border border-cyan-300/15 bg-cyan-400/[0.06]">
            {[22, 38, 52, 30, 44, 60, 34, 48, 24].map(
              (height, index) => (
                <span
                  key={index}
                  style={{
                    height: `${height}px`,
                    animationDelay: `${index * 90}ms`,
                  }}
                  className="w-1.5 animate-[pulse_700ms_ease-in-out_infinite] rounded-full bg-gradient-to-t from-cyan-400 to-violet-300"
                />
              ),
            )}
          </div>
        ) : isVideo ? (
          <div className="relative mx-auto mb-6 grid h-24 w-32 place-items-center rounded-3xl border border-violet-300/20 bg-violet-400/[0.07]">
            <Video size={45} className="animate-pulse text-violet-200" />
            <span className="absolute inset-2 animate-[ping_2s_ease-in-out_infinite] rounded-2xl border border-violet-200/30" />
          </div>
        ) : (
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl border border-white/10 bg-white/[0.04]">
            <Radio size={42} className="animate-pulse text-violet-200" />
          </div>
        )}

        <div className="mb-3 flex items-center justify-center gap-2">
          <span className={`h-2 w-2 animate-pulse rounded-full bg-gradient-to-r ${accent}`} />
          <p className="text-sm font-bold text-white">
            {loadingTitle}
          </p>
          <span className={`h-2 w-2 animate-pulse rounded-full bg-gradient-to-r ${accent} [animation-delay:350ms]`} />
        </div>

        <p className="text-sm leading-6 text-zinc-400">
          {loadingDescription}
        </p>

        <div className="mx-auto mt-6 flex max-w-56 gap-1.5">
          {Array.from({ length: 7 }, (_, index) => (
            <span
              key={index}
              style={{ animationDelay: `${index * 100}ms` }}
              className={`h-1.5 flex-1 animate-pulse rounded-full bg-gradient-to-r ${accent}`}
            />
          ))}
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
          ScriptStation · Media Hub
        </p>
      </div>
    </div>
  );
}

function isSafeMediaUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export default function Downloader() {
  const [serviceId, setServiceId] = useState<ServiceId>('aio');
  const [input, setInput] = useState('');
  const [resolution, setResolution] = useState('720');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    media: Media[];
    metadata: Metadata;
    raw: unknown;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const selected =
    SERVICES.find((service) => service.id === serviceId) ?? SERVICES[0];

  function selectService(id: ServiceId) {
    setServiceId(id);
    setError('');
    setResult(null);
    setShowDetails(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');
    setResult(null);
    setShowDetails(false);

    const value = input.trim();

    if (!value) {
      setError(
        selected.query
          ? 'Masukkan judul lagu atau nama artis.'
          : 'Tempel tautan media terlebih dahulu.',
      );
      return;
    }

    if (!selected.query) {
      try {
        const parsed = new URL(value);

        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error();
        }
      } catch {
        setError(
          'Tautan tidak valid. Gunakan URL lengkap yang diawali https://.',
        );
        return;
      }
    }

    setLoading(true);

    try {
      const params = new URLSearchParams();

      params.set('platform', PLATFORMS[serviceId]);
      params.set('server', ENDPOINTS[serviceId]);
      params.set(selected.query ? 'q' : 'url', value);

      if (selected.resolutions) {
        params.set('resolusi', resolution);
      }

      const response = await fetch(
        `/api/downloader?${params.toString()}`,
      );

      const payload: unknown = await response.json();

      if (!response.ok) {
        const message = isRecord(payload)
          ? stringValue(payload.error) ||
            stringValue(payload.message)
          : undefined;

        throw new Error(
          message || 'Server gagal memproses media ini.',
        );
      }

      if (
        isRecord(payload) &&
        (
          payload.success === false ||
          payload.ok === false ||
          payload.status === false
        )
      ) {
        throw new Error(
          stringValue(payload.error) ||
            stringValue(payload.message) ||
            'Media tidak ditemukan oleh server.',
        );
      }

      const media = extractMedia(payload, serviceId);
      const metadata = extractMetadata(payload);

      setResult({
        media,
        metadata,
        raw: payload,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Terjadi kesalahan. Coba beberapa saat lagi.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <main className="relative min-h-[70vh] overflow-hidden px-4 pb-16 pt-8 text-white sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-violet-600/15 blur-[110px]" />
          <div className="absolute -right-24 top-64 h-80 w-80 rounded-full bg-cyan-500/10 blur-[120px]" />
          <div className="absolute left-1/3 top-[35rem] h-64 w-64 rounded-full bg-fuchsia-500/[0.07] blur-[110px]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3.5 py-2 text-xs font-semibold text-violet-100 backdrop-blur-xl">
                <Sparkles size={15} />
                SCRIPTSTATION V2 / MEDIA HUB
              </div>

              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Download,{' '}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-200 bg-clip-text text-transparent">
                  Anything.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                Tempel tautan, pilih layanan, lihat detail media, lalu
                unduh format yang tersedia. Dirancang supaya tetap
                nyaman dipakai di HP.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-64">
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
                <p className="text-xs text-zinc-500">Layanan</p>
                <p className="mt-1 text-2xl font-bold">
                  {SERVICES.length}
                </p>
                <p className="text-[11px] text-zinc-500">tersedia</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
                <p className="text-xs text-zinc-500">Format</p>
                <p className="mt-1 text-2xl font-bold">MP4 / MP3</p>
                <p className="text-[11px] text-zinc-500">
                  jika disediakan server
                </p>
              </div>
            </div>
          </header>

          <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {SERVICES.map((service) => {
              const active = serviceId === service.id;

              const Icon =
                service.group === 'Audio'
                  ? Music2
                  : service.group === 'Semua'
                    ? Sparkles
                    : Video;

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => selectService(service.id)}
                  aria-pressed={active}
                  className={`group rounded-2xl border p-3.5 text-left backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 sm:p-4 ${
                    active
                      ? 'border-violet-300/50 bg-violet-400/[0.12] shadow-lg shadow-violet-950/20'
                      : 'border-white/[0.08] bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.065]'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`grid h-10 w-10 place-items-center rounded-xl border ${
                        active
                          ? 'border-violet-300/20 bg-violet-300/10 text-violet-200'
                          : 'border-white/[0.08] bg-white/[0.04] text-zinc-400 group-hover:text-white'
                      }`}
                    >
                      <Icon size={19} />
                    </span>

                    {active && (
                      <CheckCircle2
                        size={16}
                        className="text-cyan-200"
                      />
                    )}
                  </div>

                  <p className="text-sm font-semibold">
                    {service.name}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    {service.description}
                  </p>
                </button>
              );
            })}
          </section>

          <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-white/10 bg-zinc-950/45 p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl sm:p-7"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200">
                  <Download size={22} />
                </div>

                <div>
                  <h2 className="font-bold">Siapkan media</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {selected.name} · {selected.description}
                  </p>
                </div>
              </div>

              <label
                htmlFor="media-input"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                {selected.query
                  ? 'Judul lagu atau nama artis'
                  : 'Tautan media'}
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 transition focus-within:border-violet-300/60">
                {selected.query ? (
                  <Search
                    size={17}
                    className="shrink-0 text-zinc-500"
                  />
                ) : (
                  <Link2
                    size={17}
                    className="shrink-0 text-zinc-500"
                  />
                )}

                <input
                  id="media-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={selected.placeholder}
                  type={selected.query ? 'text' : 'url'}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-zinc-600"
                />

                {input && (
                  <button
                    type="button"
                    aria-label="Hapus input"
                    onClick={() => setInput('')}
                    className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {selected.resolutions && (
                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-medium text-zinc-300">
                    Kualitas video
                  </span>

                  <select
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#11121b] px-4 py-3.5 text-sm outline-none focus:border-violet-300/60"
                  >
                    {selected.resolutions.map((quality) => (
                      <option key={quality} value={quality}>
                        {quality}p
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-200"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 px-5 py-3.5 text-sm font-bold shadow-lg shadow-violet-950/30 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sedang memproses...
                  </>
                ) : (
                  <>
                    <Download size={17} />
                    Cari media dan unduh
                  </>
                )}
              </button>

              <p className="mt-4 text-xs leading-5 text-zinc-500">
                Gunakan hanya untuk media yang kamu miliki atau yang
                boleh kamu unduh. Hasil bergantung pada ketersediaan
                server sumber.
              </p>
            </form>

            <section className="min-w-0 rounded-3xl border border-white/10 bg-zinc-950/40 p-5 shadow-xl shadow-black/10 backdrop-blur-2xl sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Hasil media</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Preview, detail, dan pilihan unduhan
                  </p>
                </div>

                {result && (
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/[0.08] px-3 py-1.5 text-xs text-emerald-200">
                    {result.media.length} file
                  </span>
                )}
              </div>

              {!result && !loading && (
                <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                  <div>
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400">
                      <FileVideo size={25} />
                    </div>

                    <p className="font-semibold text-zinc-200">
                      Belum ada hasil
                    </p>

                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                      Pilih platform, masukkan tautan, lalu tekan tombol
                      untuk memulai.
                    </p>
                  </div>
                </div>
              )}

              {loading && <LoadingPanel serviceId={serviceId} />}

              {result && (
                <div className="space-y-5">
                  <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                    {result.metadata.thumbnail &&
                      isSafeMediaUrl(result.metadata.thumbnail) && (
                        <img
                          src={result.metadata.thumbnail}
                          alt="Thumbnail media"
                          loading="lazy"
                          className="max-h-72 w-full bg-black/30 object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none';
                          }}
                        />
                      )}

                    <div className="p-4 sm:p-5">
                      <p className="text-lg font-bold leading-7">
                        {result.metadata.title || 'Media berhasil diproses'}
                      </p>

                      {result.metadata.description && (
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
                          {result.metadata.description}
                        </p>
                      )}

                      {result.metadata.author && (
                        <p className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                          <UserRound size={15} />
                          {result.metadata.author}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {result.metadata.duration && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                            <Clock3 size={14} />
                            {formatDuration(result.metadata.duration)}
                          </span>
                        )}

                        {result.metadata.views && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                            <Eye size={14} />
                            {formatNumber(result.metadata.views)} views
                          </span>
                        )}

                        {result.metadata.likes && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                            <Heart size={14} />
                            {formatNumber(result.metadata.likes)} likes
                          </span>
                        )}

                        {result.metadata.size && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                            Ukuran: {result.metadata.size}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>

                  {result.media.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-zinc-200">
                        File yang tersedia
                      </h3>

                      {result.media.map((media, index) => (
                        <article
                          key={`${media.url}-${index}`}
                          className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                                media.kind === 'audio'
                                  ? 'border-cyan-300/20 bg-cyan-400/10 text-cyan-200'
                                  : 'border-violet-300/20 bg-violet-400/10 text-violet-200'
                              }`}
                            >
                              {media.kind === 'audio' ? (
                                <AudioLines size={20} />
                              ) : (
                                <Video size={20} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">
                                {media.kind === 'audio'
                                  ? 'Audio'
                                  : media.kind === 'video'
                                    ? 'Video'
                                    : 'File media'}{' '}
                                {media.quality ? `· ${media.quality}` : ''}
                              </p>

                              <p className="mt-1 break-all text-xs text-zinc-500">
                                {media.kind === 'audio'
                                  ? 'Format audio dari server'
                                  : media.kind === 'video'
                                    ? 'Format video dari server'
                                    : 'Format mengikuti server'}
                              </p>
                            </div>

                            <a
                              href={media.url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-3 py-2.5 text-xs font-bold transition hover:brightness-110 sm:px-4 sm:text-sm"
                            >
                              <Download size={15} />
                              Unduh
                            </a>
                          </div>

                          {media.kind === 'video' && (
                            <video
                              controls
                              preload="none"
                              playsInline
                              className="mt-4 max-h-80 w-full rounded-xl bg-black"
                              src={media.url}
                            >
                              Browser kamu tidak mendukung pemutar video.
                            </video>
                          )}

                          {media.kind === 'audio' && (
                            <audio
                              controls
                              preload="none"
                              className="mt-4 w-full"
                              src={media.url}
                            >
                              Browser kamu tidak mendukung pemutar audio.
                            </audio>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.06] p-4">
                      <p className="font-semibold text-amber-100">
                        File media belum dikenali
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        Server sudah memberi respons, tetapi format file
                        unduhan tidak ditemukan pada data yang diterima.
                        Buka detail respons untuk pemeriksaan teknis.
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setShowDetails((current) => !current)
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.07]"
                  >
                    {showDetails
                      ? 'Sembunyikan detail teknis'
                      : 'Lihat detail teknis API'}
                  </button>

                  {showDetails && (
                    <pre className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-5 text-cyan-100/80">
                      {JSON.stringify(result.raw, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </section>
          </section>

          <p className="mt-6 text-center text-xs leading-5 text-zinc-600">
            Gunakan secara bertanggung jawab dan hormati hak cipta
            pemilik media.
          </p>
        </div>
      </main>
    </Shell>
  );
}