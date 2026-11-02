export const maxDuration = 60;
export const config = {
  maxDuration: 60,
};

import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

let scrapeAniWanTV: (input?: string, page?: number) => Promise<any>;
try {
  scrapeAniWanTV = require('../server/aniwantv.cjs');
} catch {
  scrapeAniWanTV = require(path.join(process.cwd(), 'server', 'aniwantv.cjs'));
}

function getParam(value: unknown, fallback = ''): string {
  if (Array.isArray(value)) return String(value[0] ?? fallback);
  return String(value ?? fallback);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=90, stale-while-revalidate=300');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({
      status: false,
      error: 'Method tidak diizinkan.',
    });
  }

  try {
    const query = getParam(
      req.query?.q ?? req.query?.url ?? req.body?.q ?? '',
      ''
    ).trim();
    const pageRaw = Number.parseInt(getParam(req.query?.page, '1'), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    if (query.length > 500) {
      return res.status(400).json({
        status: false,
        error: 'Parameter query atau URL terlalu panjang.',
      });
    }

    const result = await scrapeAniWanTV(query, page);

    if (!result || result.status === false) {
      return res.status(502).json({
        status: false,
        error: result?.error || 'Gagal mengambil data dari AniWanTV.',
      });
    }

    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(502).json({
      status: false,
      error:
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan pada server AniWanTV.',
    });
  }
}