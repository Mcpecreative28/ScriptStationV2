
import type { VercelRequest, VercelResponse } from '@vercel/node';

const NEXRAY_BASE = 'https://api.nexray.eu.cc/downloader/';
const THERESA_URL = 'https://api.theresav.eu/api/download/threads';

const ALLOWED_PLATFORMS = new Set([
  'aio',
  'facebook',
  'instagram',
  'snackvideo',
  'spotify',
  'spotifyplay',
  'threads',
  'tiktok',
  'twitter',
  'ytmp3',
  'ytmp4',
]);

const ALLOWED_SERVERS: Record<string, string[]> = {
  instagram: ['instagram', 'v1/instagram', 'v2/instagram'],
  spotify: ['spotify', 'v1/spotify'],
  ytmp3: ['ytmp3', 'v1/ytmp3'],
  ytmp4: ['ytmp4', 'v1/ytmp4'],
};

const VALID_HOSTS: Record<string, string[]> = {
  aio: [
    'tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com',
    'facebook.com', 'www.facebook.com', 'm.facebook.com',
    'instagram.com', 'www.instagram.com',
    'threads.net', 'www.threads.net', 'www.threads.com',
    'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com',
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
    'open.spotify.com',
    'snackvideo.com', 'www.snackvideo.com',
  ],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  snackvideo: ['snackvideo.com', 'www.snackvideo.com'],
  spotify: ['open.spotify.com'],
  threads: ['threads.net', 'www.threads.net', 'www.threads.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
  twitter: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  ytmp3: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
  ytmp4: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
};

function jsonError(
  res: VercelResponse,
  status: number,
  message: string,
) {
  return res.status(status).json({
    success: false,
    message,
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonError(res, 405, 'Metode tidak didukung.');
  }

  const platform = String(req.query.platform || '');
  const url = String(req.query.url || '');
  const query = String(req.query.q || '');
  const requestedServer = String(req.query.server || platform);
  const resolution = String(req.query.resolusi || '720');

  if (!ALLOWED_PLATFORMS.has(platform)) {
    return jsonError(res, 400, 'Platform tidak valid.');
  }

  if (platform === 'spotifyplay') {
    if (!query.trim() || query.length > 200) {
      return jsonError(res, 400, 'Judul lagu tidak valid.');
    }
  } else {
    if (!url || url.length > 2048) {
      return jsonError(res, 400, 'Tautan tidak valid.');
    }

    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      return jsonError(res, 400, 'Format tautan tidak valid.');
    }

    if (!['https:', 'http:'].includes(parsed.protocol)) {
      return jsonError(res, 400, 'Protokol tautan tidak didukung.');
    }

    if (!(VALID_HOSTS[platform] || []).includes(parsed.hostname.toLowerCase())) {
      return jsonError(
        res,
        400,
        'Domain tautan tidak sesuai dengan platform.',
      );
    }
  }

  if (
    platform === 'ytmp4' &&
    !['360', '480', '720', '1080', '1440', '2160'].includes(resolution)
  ) {
    return jsonError(res, 400, 'Resolusi tidak didukung.');
  }

  if (platform === 'threads') {
    const apiKey = process.env.THERESA_API_KEY;

    if (!apiKey) {
      console.error('THERESA_API_KEY belum diatur.');
      return jsonError(res, 500, 'Konfigurasi provider Threads belum tersedia.');
    }

    const endpoint = new URL(THERESA_URL);
    endpoint.searchParams.set('url', url);

    try {
      const upstream = await fetch(endpoint.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-apikey': apiKey,
        },
        signal: AbortSignal.timeout(25000),
      });

      const raw = await upstream.text();
      let data: unknown;

      try {
        data = JSON.parse(raw);
      } catch {
        data = { raw };
      }

      if (!upstream.ok) {
        console.error('Theresa Threads status:', upstream.status);
        return res.status(502).json({
          success: false,
          message: 'Provider Threads gagal memproses tautan.',
          upstreamStatus: upstream.status,
          data,
        });
      }

      return res.status(200).json({
        success: true,
        platform,
        provider: 'theresa',
        data,
      });
    } catch (error) {
      console.error('Theresa Threads error:', error);
      return jsonError(
        res,
        502,
        'Tidak dapat menghubungi provider Threads. Coba lagi nanti.',
      );
    }
  }

  const available = ALLOWED_SERVERS[platform] || [platform];
  const server = available.includes(requestedServer)
    ? requestedServer
    : platform;

  const endpoint = new URL(server, NEXRAY_BASE);

  if (platform === 'spotifyplay') {
    endpoint.searchParams.set('q', query.trim());
  } else {
    endpoint.searchParams.set('url', url);
  }

  if (platform === 'ytmp4') {
    endpoint.searchParams.set('resolusi', resolution);
  }

  try {
    const upstream = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(25000),
    });

    const raw = await upstream.text();
    let data: unknown;

    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: 'Server NexRay gagal memproses media.',
        upstreamStatus: upstream.status,
        data,
      });
    }

    return res.status(200).json({
      success: true,
      platform,
      provider: 'nexray',
      server,
      data,
    });
  } catch (error) {
    console.error('NexRay downloader error:', error);
    return jsonError(
      res,
      502,
      'Tidak dapat menghubungi server downloader. Coba lagi nanti.',
    );
  }
}