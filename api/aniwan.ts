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

function getStringParam(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return fallback;
}

function normalizeErrorText(err: unknown): string {
  if (!err) return 'Gagal mengambil data dari sumber.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    return JSON.stringify(obj);
  }
  return String(err);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=90, stale-while-revalidate=300'
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({
      status: false,
      error: 'Method tidak diizinkan.',
    });
  }

  try {
    const query = getStringParam(
      req.query?.q ?? req.query?.url ?? req.body?.q,
      ''
    ).trim();
    const pageRaw = Number.parseInt(getStringParam(req.query?.page, '1'), 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    if (query.length > 500) {
      return res.status(400).json({
        status: false,
        error: 'Parameter pencarian atau URL terlalu panjang.',
      });
    }

    const result = await scrapeAniWanTV(query, page);

    if (!result || result.status === false) {
      return res.status(502).json({
        status: false,
        error: normalizeErrorText(result?.error),
      });
    }

    return res.status(200).json(result);
  } catch (error: unknown) {
    return res.status(502).json({
      status: false,
      error: normalizeErrorText(error),
    });
  }
}