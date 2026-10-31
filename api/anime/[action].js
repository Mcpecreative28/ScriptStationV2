export const maxDuration = 60;
export const config = {
  maxDuration: 60,
};

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const anime = require('../../server/anikai.cjs');

function getParam(value, fallback = '') {
  if (Array.isArray(value)) return String(value[0] ?? fallback);
  return String(value ?? fallback);
}

function getNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(getParam(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function send(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
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
    const action = getParam(req.query.action).toLowerCase();
    const page = getNumber(req.query.page, 1, 1, 10000);
    const limit = getNumber(req.query.limit, 24, 1, 40);

    let result;

    switch (action) {
      case 'search': {
        const query = getParam(req.query.q).trim();
        if (!query || query.length > 100) {
          return send(res, 400, {
            status: false,
            error: 'Masukkan kata kunci pencarian.',
          });
        }

        result = await anime.searchAnime(query, {
          page,
          limit,
          genre: getParam(req.query.genre),
          format: getParam(req.query.format),
          status: getParam(req.query.status),
          year: getParam(req.query.year),
        });
        break;
      }

      case 'latest':
        result = await anime.getLatest({ page, limit });
        break;

      case 'popular':
        result = await anime.getPopular({ page, limit });
        break;

      case 'detail': {
        const slug = getParam(req.query.slug).trim();
        if (!slug || slug.length > 150) {
          return send(res, 400, {
            status: false,
            error: 'Slug anime tidak valid.',
          });
        }
        result = await anime.getDetail(slug);
        break;
      }

      case 'episodes': {
        const id = getParam(req.query.id).trim();
        if (!/^\d+$/.test(id)) {
          return send(res, 400, {
            status: false,
            error: 'ID anime harus berupa angka.',
          });
        }
        result = await anime.getEpisodes(id);
        break;
      }

      case 'stream': {
        const slug = getParam(req.query.slug).trim();
        const episode = getNumber(req.query.episode, 1, 1, 100000);
        const server = getParam(req.query.server, '');
        const audio = getParam(req.query.audio, 'sub').toLowerCase();

        if (!slug || slug.length > 150) {
          return send(res, 400, {
            status: false,
            error: 'Slug anime tidak valid.',
          });
        }

        result = await anime.getStream(
          slug,
          episode,
          server || null,
          ['sub', 'dub'].includes(audio) ? audio : 'sub'
        );
        break;
      }

      default:
        return send(res, 404, {
          status: false,
          error: 'Endpoint AnimeHub tidak ditemukan.',
        });
    }

    return send(res, 200, result);
  } catch (error) {
    console.error('ANIME_API_ERROR:', error);
    return send(res, 502, {
      status: false,
      error: error instanceof Error ? error.message : 'Gagal mengambil data anime.',
    });
  }
}