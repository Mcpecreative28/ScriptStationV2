export const maxDuration = 60;
export const config = {
  maxDuration: 60,
};

import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

let anime;
try {
  anime = require('../../server/anikai.cjs');
} catch {
  anime = require(path.join(process.cwd(), 'server', 'anikai.cjs'));
}

function getParam(value, fallback = '') {
  if (Array.isArray(value)) return String(value[0] ?? fallback);
  return String(value ?? fallback);
}

function getNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(getParam(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function extractAction(req) {
  const fromQuery = getParam(req.query?.action).trim().toLowerCase();
  if (fromQuery && fromQuery !== '[action]') {
    return fromQuery;
  }

  try {
    const parsedUrl = new URL(req.url || '', 'http://localhost');
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const animeIdx = segments.indexOf('anime');
    if (animeIdx !== -1 && segments[animeIdx + 1]) {
      return segments[animeIdx + 1].toLowerCase();
    }
  } catch {}

  return '';
}

function send(res, status, data, noCache = false) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    noCache
      ? 'no-store, max-age=0'
      : 'public, s-maxage=60, stale-while-revalidate=300'
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, {
      status: false,
      error: 'Method tidak diizinkan.',
    });
  }

  try {
    const action = extractAction(req);
    const page = getNumber(req.query?.page, 1, 1, 10000);
    const limit = getNumber(req.query?.limit, 24, 1, 48);

    let result;

    switch (action) {
      case 'search': {
        const query = getParam(req.query?.q).trim();
        if (query.length > 100) {
          return send(res, 400, {
            status: false,
            error: 'Kata kunci pencarian maksimal 100 karakter.',
          });
        }

        result = await anime.searchAnime(query, {
          page,
          limit,
          genre: getParam(req.query?.genre),
          format: getParam(req.query?.format),
          status: getParam(req.query?.status),
          year: getParam(req.query?.year),
          sort: getParam(req.query?.sort, 'popular'),
        });
        return send(res, 200, result);
      }

      case 'latest':
        result = await anime.getLatest({ page, limit });
        return send(res, 200, result);

      case 'popular':
        result = await anime.getPopular({ page, limit });
        return send(res, 200, result);

      case 'detail': {
        const slug = getParam(req.query?.slug).trim();
        if (!slug || slug.length > 150) {
          return send(res, 400, {
            status: false,
            error: 'Slug anime tidak valid.',
          });
        }
        result = await anime.getDetail(slug);
        return send(res, 200, result);
      }

      case 'episodes': {
        const id = getParam(req.query?.id).trim();
        if (!/^\d+$/.test(id)) {
          return send(res, 400, {
            status: false,
            error: 'ID anime harus berupa angka.',
          });
        }
        result = await anime.getEpisodes(id);
        return send(res, 200, result);
      }

      case 'stream': {
        const slug = getParam(req.query?.slug).trim();
        const episode = getNumber(req.query?.episode, 1, 1, 100000);
        const server = getParam(req.query?.server, '2');
        const audio = getParam(req.query?.audio, 'sub').toLowerCase();

        if (!slug || slug.length > 150) {
          return send(res, 400, {
            status: false,
            error: 'Slug anime tidak valid.',
          });
        }

        result = await anime.getStream(
          slug,
          episode,
          server || '2',
          ['sub', 'dub'].includes(audio) ? audio : 'sub'
        );
        return send(res, 200, result, true);
      }

      case 'embed': {
        const hash = getParam(req.query?.hash).trim();
        const host = getParam(req.query?.host, 'https://play.anikai.org').trim();

        if (!hash) {
          return res.status(400).send('Hash stream tidak ditemukan.');
        }

        const html = await anime.fetchPlayerEmbedHtml(hash, host);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        // Pastikan tidak ada X-Frame-Options agar iframe web kita diizinkan penuh
        res.removeHeader('X-Frame-Options');
        return res.status(200).send(html);
      }

      default:
        return send(res, 404, {
          status: false,
          error: `Endpoint AnimeHub (${action || 'kosong'}) tidak ditemukan.`,
          available: [
            'search',
            'latest',
            'popular',
            'detail',
            'episodes',
            'stream',
            'embed',
          ],
        });
    }
  } catch (error) {
    console.error('ANIME_API_ERROR:', error);
    return send(res, 502, {
      status: false,
      error:
        error instanceof Error ? error.message : 'Gagal mengambil data anime.',
    });
  }
}