
import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE = 'https://api.nexray.eu.cc/downloader/';

const allowedPlatforms = new Set([
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

const allowedServers: Record<string, string[]> = {
  instagram: ['instagram', 'v1/instagram', 'v2/instagram'],
  spotify: ['spotify', 'v1/spotify'],
  ytmp3: ['ytmp3', 'v1/ytmp3'],
  ytmp4: ['ytmp4', 'v1/ytmp4'],
};

const validHosts: Record<string, string[]> = {
  aio: [
    'tiktok.com',
    'www.tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
    'facebook.com',
    'www.facebook.com',
    'm.facebook.com',
    'instagram.com',
    'www.instagram.com',
    'threads.com',
    'www.threads.com',
    'x.com',
    'www.x.com',
    'twitter.com',
    'www.twitter.com',
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
    'open.spotify.com',
    'snackvideo.com',
    'www.snackvideo.com',
  ],
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  snackvideo: ['snackvideo.com', 'www.snackvideo.com'],
  spotify: ['open.spotify.com'],
  threads: ['threads.com', 'www.threads.com'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
  twitter: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  ytmp3: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
  ytmp4: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      success: false,
      message: 'Metode tidak didukung.',
    });
  }

  const platform = String(req.query.platform || '');
  const url = String(req.query.url || '');
  const query = String(req.query.q || '');
  const requestedServer = String(req.query.server || platform);
  const resolution = String(req.query.resolusi || '720');

  if (!allowedPlatforms.has(platform)) {
    return res.status(400).json({
      success: false,
      message: 'Platform tidak valid.',
    });
  }

  const available = allowedServers[platform] || [platform];
  const server = available.includes(requestedServer)
    ? requestedServer
    : platform;

  if (platform === 'spotifyplay') {
    if (!query.trim() || query.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Judul lagu tidak valid.',
      });
    }
  } else {
    if (!url || url.length > 2048) {
      return res.status(400).json({
        success: false,
        message: 'Tautan tidak valid.',
      });
    }

    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Format tautan tidak valid.',
      });
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return res.status(400).json({
        success: false,
        message: 'Protokol tautan tidak didukung.',
      });
    }

    const hosts = validHosts[platform] || [];

    if (!hosts.includes(parsed.hostname.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Domain tautan tidak sesuai dengan platform.',
      });
    }
  }

  
if (platform === 'ytmp4') {
  const allowedResolutions = server === 'v1/ytmp4'
    ? ['144', '240', '360', '480', '720', '1080']
    : ['360', '480', '720', '1080', '1440', '2160'];

  if (!allowedResolutions.includes(resolution)) {
    return res.status(400).json({
      success: false,
      message: 'Resolusi tidak didukung oleh server ini.',
    });
  }
}

  const endpoint = new URL(server, API_BASE);

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
        message: 'Server downloader gagal merespons.',
        upstreamStatus: upstream.status,
        data,
      });
    }

    return res.status(200).json({
      success: true,
      platform,
      server,
      data,
    });
  } catch (error) {
    console.error('Downloader upstream error:', error);

    return res.status(502).json({
      success: false,
      message:
        'Tidak dapat menghubungi server downloader. Silakan coba lagi.',
    });
  }
}