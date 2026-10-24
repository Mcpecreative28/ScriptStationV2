
type ApiRequest = {
  method?: string;
  query?: {
    url?: string | string[];
  };
};

type ApiResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};

const ALLOWED_HOSTS = [
  'tiktok.com',
  'youtube.com',
  'youtu.be',
];

function isAllowedVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:') return false;

    const hostname = url.hostname.toLowerCase();

    return ALLOWED_HOSTS.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    );
  } catch {
    return false;
  }
}

export default async function handler(
  req: ApiRequest,
  res: ApiResponse
) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      success: false,
      error: 'Metode tidak didukung.',
    });
  }

  const input = req.query?.url;

  if (typeof input !== 'string' || input.length > 2048) {
    return res.status(400).json({
      success: false,
      error: 'Masukkan satu link video yang valid.',
    });
  }

  const videoUrl = input.trim();

  if (!isAllowedVideoUrl(videoUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Link harus berasal dari TikTok atau YouTube dan menggunakan HTTPS.',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const endpoint = new URL('https://api.ikyyxd.my.id/tools/amfinder');
    endpoint.searchParams.set('url', videoUrl);

    const upstream = await fetch(endpoint.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        error: 'Layanan pencarian preset sedang bermasalah. Coba lagi nanti.',
      });
    }

    const contentType = upstream.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('application/json')) {
      return res.status(502).json({
        success: false,
        error: 'Layanan pencarian memberikan respons yang tidak valid.',
      });
    }

    const body = await upstream.text();

    if (body.length > 1_000_000) {
      return res.status(502).json({
        success: false,
        error: 'Respons layanan terlalu besar.',
      });
    }

    let payload: unknown;

    try {
      payload = JSON.parse(body);
    } catch {
      return res.status(502).json({
        success: false,
        error: 'Respons layanan tidak dapat dibaca.',
      });
    }

    return res.status(200).json(payload);
  } catch {
    return res.status(504).json({
      success: false,
      error: 'Pencarian melewati batas waktu. Coba lagi.',
    });
  } finally {
    clearTimeout(timeout);
  }
}