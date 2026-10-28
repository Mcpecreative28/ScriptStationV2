
import { createHmac, randomUUID } from 'node:crypto';

type ApiRequest = {
  method?: string;
  query?: {
    url?: string | string[];
    q?: string | string[];
    mode?: string | string[];
  };
};

type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  json(body: unknown): void;
};

const BASE = 'https://amfinder.web.id';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

const CHALLENGE_PATH = '/api/v/2b51359f';
const SSE_TIMEOUT_MS = 38_000;
const ALLOWED_HOSTS = ['tiktok.com', 'youtube.com', 'youtu.be'];

function getQuery(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function validVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

    return (
      url.protocol === 'https:' &&
      ALLOWED_HOSTS.some(
        (allowed) =>
          host === allowed || host.endsWith(`.${allowed}`)
      )
    );
  } catch {
    return false;
  }
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function getHashtags(value: string) {
  return [...new Set(value.match(/#[\p{L}\p{N}_]+/gu) || [])];
}

function detectSource(value: string) {
  return /youtube|youtu\.be/i.test(value) ? 'YouTube' : 'TikTok';
}

async function fetchJson(
  url: string,
  init: RequestInit = {},
  timeout = 12_000
): Promise<{ response: globalThis.Response; body: any }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
        ...(init.headers || {}),
      },
    });

    const text = await response.text();

    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }

    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------- SCRAPER HANDSHAKE -------------------- */

async function getScraperToken(): Promise<string> {
  const deviceId = randomUUID();

  const first = await fetchJson(
    BASE + CHALLENGE_PATH,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: BASE,
        Referer: BASE + '/',
      },
      body: JSON.stringify({ did: deviceId }),
    }
  );

  const challenge = first.body || {};

  if (
    !first.response.ok ||
    challenge.ok !== true ||
    !challenge.salt ||
    !challenge.cid ||
    !challenge.ts
  ) {
    throw new Error(
      challenge.error || 'Handshake scraper gagal.'
    );
  }

  const rounds = Math.max(
    1,
    Math.min(10000, Math.floor(Number(challenge.rounds) || 1))
  );

  let proof = Buffer.from(
    `${challenge.cid}|${deviceId}|${challenge.ts}`
  );

  for (let i = 0; i < rounds; i++) {
    proof = createHmac(
      'sha256',
      Buffer.from(String(challenge.salt), 'hex')
    )
      .update(proof)
      .digest();
  }

  const second = await fetchJson(
    BASE + CHALLENGE_PATH,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: BASE,
        Referer: BASE + '/',
      },
      body: JSON.stringify({
        cid: challenge.cid,
        did: deviceId,
        ts: challenge.ts,
        proof: proof.toString('hex'),
        score: 0,
        reasons: [],
      }),
    }
  );

  const result = second.body || {};

  if (
    !second.response.ok ||
    result.ok !== true ||
    typeof result.token !== 'string'
  ) {
    throw new Error(
      result.error || 'Token scraper tidak tersedia.'
    );
  }

  return result.token;
}

/* ----------------------- SSE READER ----------------------- */

type SseResult = {
  result: any;
  candidates: any;
  error: string;
};

async function readSse(path: string): Promise<SseResult> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    SSE_TIMEOUT_MS
  );

  try {
    const response = await fetch(BASE + path, {
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Referer: BASE + '/',
      },
    });

    if (!response.ok || !response.body) {
      throw new Error(`Scraper SSE HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';

    const output: SseResult = {
      result: null,
      candidates: null,
      error: '',
    };

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder
        .decode(value, { stream: true })
        .replace(/\r\n/g, '\n');

      let boundary: number;

      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let event = 'message';
        const dataLines: string[] = [];

        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) {
            event = line.slice(6).trim();
          }

          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }

        const data = dataLines.join('\n');

        if (event === 'candidates') {
          try {
            output.candidates = JSON.parse(data);
          } catch {
            output.candidates = null;
          }
        }

        if (event === 'result') {
          try {
            output.result = JSON.parse(data);
          } catch {
            throw new Error('Hasil scraper tidak valid.');
          }
        }

        if (event === 'error') {
          try {
            output.error =
              JSON.parse(data)?.message ||
              'Scraper melaporkan kesalahan.';
          } catch {
            output.error = data || 'Scraper gagal.';
          }
        }

        if (output.result || output.error) {
          await reader.cancel().catch(() => undefined);
          return output;
        }
      }
    }

    if (output.result || output.candidates) {
      return output;
    }

    throw new Error('Scraper selesai tanpa mengirim hasil.');
  } finally {
    clearTimeout(timer);
  }
}

async function runScraper(path: string) {
  const token = await getScraperToken();
  const separator = path.includes('?') ? '&' : '?';

  const result = await readSse(
    `${path}${separator}t=${encodeURIComponent(token)}`
  );

  if (result.error) {
    throw new Error(result.error);
  }

  if (result.result?.ok === false) {
    throw new Error(
      result.result.error || 'Scraper tidak dapat memproses permintaan.'
    );
  }

  return result;
}

/* ---------------------- RESULT MAPPER ---------------------- */

function mapVideoResult(result: any, input: string) {
  const video = result?.video || {};
  const stats = video.stats || {};
  const author = result?.authorDetail || {};

  const rawLinks = Array.isArray(result?.presetLinks)
    ? result.presetLinks
    : [];

  const videoUrl = safeUrl(
    result?.videoUrl || video.url
  ) || input;

  const presetLinks = rawLinks
    .map((item: any, index: number) => ({
      type: String(item?.type || 'Preset'),
      url: safeUrl(item?.url) || '',
      title: String(item?.title || `Preset ${index + 1}`),
      thumb: safeUrl(item?.thumb),
      thumbs: Array.isArray(item?.thumbs)
        ? item.thumbs.map(safeUrl).filter(Boolean)
        : [],
      size: item?.size ? String(item.size) : undefined,
      ratio: item?.ratio ? String(item.ratio) : undefined,
      source: item?.source ? String(item.source) : undefined,
      detail: item?.detail ? String(item.detail) : undefined,
      verified: item?.verified === true,
    }))
    .filter((item: any) => item.url);

  return {
    success: true,
    message: presetLinks.length
      ? 'Pemindaian selesai.'
      : 'Pemindaian selesai, tetapi belum ada preset yang ditemukan.',
    data: {
      ok: true,
      found: result?.found !== false && presetLinks.length > 0,
      mode: 'url',
      input,
      author: author.nickname || result?.author || undefined,
      videoUrl,
      presetLinks,
      video: {
        description: video.description || '',
        cover: safeUrl(video.cover),
        stats: {
          views: stats.views != null ? Number(stats.views) : undefined,
          likes: stats.likes != null ? Number(stats.likes) : undefined,
          comments: stats.comments != null
            ? Number(stats.comments)
            : undefined,
        },
      },
      authorDetail: {
        nickname: author.nickname || result?.author || undefined,
        avatar: safeUrl(author.avatar),
      },
      scan: {
        comments: result?.scanned?.comments ?? null,
        replies: result?.scanned?.replies ?? null,
        commentsDisabled:
          result?.checked?.commentsDisabled === true,
      },
      message:
        result?.checked?.commentsDisabled && !presetLinks.length
          ? 'Komentar video dinonaktifkan. Tautan preset di komentar mungkin tidak dapat diperiksa.'
          : undefined,
    },
  };
}

function mapKeywordResult(result: any, keyword: string) {
  const items = Array.isArray(result?.candidates?.items)
    ? result.candidates.items
    : [];

  const searchItems = items
    .map((item: any) => ({
      url: safeUrl(item?.url),
      title: String(
        item?.snippet || item?.title || 'Video kandidat'
      ),
      thumb: safeUrl(item?.thumb),
      source: detectSource(String(item?.url || '')),
      author: item?.handle ? String(item.handle) : undefined,
      views:
        item?.stats?.playCount != null
          ? Number(item.stats.playCount)
          : undefined,
      likes:
        item?.stats?.likeCount != null
          ? Number(item.stats.likeCount)
          : undefined,
      duration:
        item?.duration != null
          ? String(item.duration)
          : undefined,
      hashtags: getHashtags(String(item?.snippet || '')),
    }))
    .filter((item: any) => item.url);

  return {
    success: true,
    message: searchItems.length
      ? `${searchItems.length} video kandidat ditemukan.`
      : 'Tidak ada video yang cocok dengan kata kunci tersebut.',
    data: {
      ok: true,
      found: searchItems.length > 0,
      mode: 'keyword',
      input: keyword,
      searchItems,
    },
  };
}

/* ----------------------- API FALLBACK ----------------------- */

async function legacyFallback(url: string) {
  const endpoint = new URL(
    'https://api.ikyyxd.my.id/tools/amfinder'
  );

  endpoint.searchParams.set('url', url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(endpoint.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('API cadangan tidak tersedia.');
    }

    const text = await response.text();

    if (text.length > 1_000_000) {
      throw new Error('Respons API cadangan terlalu besar.');
    }

    const payload = JSON.parse(text);

    return {
      ...payload,
      fallback: true,
      message: payload?.message || 'Hasil berasal dari API cadangan.',
    };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------ API HANDLER ------------------------ */

export const config = { maxDuration: 60 };

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

  const mode =
    getQuery(req.query?.mode) ||
    (getQuery(req.query?.q) ? 'keyword' : 'url');

  // Mode pencarian menggunakan kata kunci.
  if (mode === 'keyword') {
    const keyword = getQuery(req.query?.q).trim();

    if (keyword.length < 2 || keyword.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Kata kunci harus terdiri dari 2–100 karakter.',
      });
    }

    try {
      const path =
        `/api/search?mode=pick&q=${encodeURIComponent(keyword)}`;

      const result = await runScraper(path);

      return res.status(200).json(
        mapKeywordResult(result, keyword)
      );
    } catch (error) {
      return res.status(502).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Pencarian kata kunci gagal.',
      });
    }
  }

  // Mode pencarian berdasarkan link video.
  const input = getQuery(req.query?.url).trim();

  if (input.length > 2048 || !validVideoUrl(input)) {
    return res.status(400).json({
      success: false,
      error: 'Masukkan link HTTPS TikTok atau YouTube yang valid.',
    });
  }

  try {
    const result = await runScraper(
      `/api/find?url=${encodeURIComponent(input)}`
    );

    return res.status(200).json(
      mapVideoResult(result.result, input)
    );
  } catch (scraperError) {
    // API lama hanya menjadi fallback untuk pencarian link video.
    try {
      const backup = await legacyFallback(input);

      return res.status(200).json(backup);
    } catch {
      return res.status(502).json({
        success: false,
        error:
          'Scraper utama dan API cadangan sedang tidak tersedia. Coba lagi nanti.',
        detail:
          scraperError instanceof Error
            ? scraperError.message
            : undefined,
      });
    }
  }
}