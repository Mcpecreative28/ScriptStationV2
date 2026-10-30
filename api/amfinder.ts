export const maxDuration = 60;
export const config = {
  maxDuration: 60,
};

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const { findAmPresets } = require('./amfinder-preset-scraper.cjs') as {
  findAmPresets: (url: string) => Promise<{
    status: boolean;
    code: number;
    creator?: string;
    result?: {
      found: boolean;
      totalPresets: number;
      platform: string;
      author?: string;
      authorDetail?: Record<string, unknown>;
      videoUrl?: string;
      video?: Record<string, unknown>;
      scan?: {
        comments?: number;
        replies?: number;
        commentPages?: number;
        incomplete?: boolean;
        requiresApiKey?: boolean;
        error?: string;
        stages?: Array<{
          stage: string;
          status: 'done' | 'partial' | 'error';
          detail: string;
        }>;
      };
      presetLinks: Array<{
        type?: string;
        title?: string;
        url: string;
        size?: string;
        ratio?: string;
        password?: string;
        detail?: string;
        pinned?: boolean;
        byAuthor?: boolean;
      }>;
      message?: string;
      otherLinks?: Array<{
        url: string;
        origin?: string;
      }>;
    };
    error?: string;
  }>;
};

const ALLOWED_HOSTS = [
  'tiktok.com',
  'youtu.be',
  'youtube.com',
  'instagram.com',
  'instagr.am',
  'ig.me',
  'facebook.com',
  'fb.watch',
  'fb.com',
  'x.com',
  'twitter.com',
  'threads.net',
  'threads.com',
  'capcut.com',
  'alight.link',
  'alightcreative.com',
  'alightmotion.com',
  'drive.google.com',
  'drive.usercontent.google.com',
  'mediafire.com',
  'sfile.mobi',
  'mega.nz',
  'dropbox.com',
  '1drv.ms',
  'onedrive.live.com',
  'pixeldrain.com',
  'gofile.io',
  'catbox.moe',
  'we.tl',
  's.id',
  'bit.ly',
  'tinyurl.com',
  'cutt.ly',
  't.co',
  'rb.gy',
  'linktr.ee',
  'heylink.me',
  'beacons.ai',
  'taplink.cc',
  'snipfeed.co',
];

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');

  return ALLOWED_HOSTS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

function isValidInputUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    if (parsed.username || parsed.password) {
      return false;
    }

    if (
      parsed.hostname === 'localhost' ||
      parsed.hostname.endsWith('.localhost') ||
      parsed.hostname.endsWith('.local') ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '::1' ||
      parsed.hostname.startsWith('10.') ||
      parsed.hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)
    ) {
      return false;
    }

    return isAllowedHost(parsed.hostname);
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');

    return res.status(405).json({
      status: false,
      success: false,
      error: 'Method tidak diizinkan.',
    });
  }

  const input =
    typeof req.query?.url === 'string'
      ? req.query.url.trim()
      : typeof req.body?.url === 'string'
        ? req.body.url.trim()
        : '';

  if (!input) {
    return res.status(400).json({
      status: false,
      success: false,
      error: 'Masukkan link video atau link preset terlebih dahulu.',
    });
  }

  if (input.length > 2048 || !isValidInputUrl(input)) {
    return res.status(400).json({
      status: false,
      success: false,
      error:
        'URL tidak valid atau domain belum didukung. Gunakan link HTTPS dari platform atau penyedia preset yang didukung.',
    });
  }

  try {
    const scraperResponse = await findAmPresets(input);
    const result = scraperResponse?.result;

    if (!scraperResponse?.status || !result) {
      return res.status(502).json({
        status: false,
        success: false,
        error:
          scraperResponse?.error ||
          'Scraper tidak memberikan hasil yang valid.',
      });
    }

    // Domain link tujuan preset tidak harus sama dengan domain input.
    // Tetap validasi protokol dan tolak alamat lokal.
    const presetLinks = Array.isArray(result.presetLinks)
      ? result.presetLinks.filter((preset) => {
          if (
            !preset ||
            typeof preset.url !== 'string' ||
            preset.url.length > 4096
          ) {
            return false;
          }

          try {
            const parsed = new URL(preset.url);
            const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

            const privateHost =
              host === 'localhost' ||
              host.endsWith('.localhost') ||
              host.endsWith('.local') ||
              host === '127.0.0.1' ||
              host === '::1' ||
              host.startsWith('10.') ||
              host.startsWith('192.168.') ||
              /^172\.(1[6-9]|2\d|3[01])\./.test(host);

            return (
              (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
              !privateHost &&
              !parsed.username &&
              !parsed.password
            );
          } catch {
            return false;
          }
        })
      : [];

    const normalizedResult = {
      ...result,
      found: presetLinks.length > 0,
      totalPresets: presetLinks.length,
      presetLinks,
    };

    return res.status(200).json({
      status: true,
      success: true,
      data: normalizedResult,
      result: normalizedResult,
      message:
        normalizedResult.message ||
        (presetLinks.length > 0
          ? `Berhasil menemukan ${presetLinks.length} preset.`
          : 'Tidak ditemukan link preset pada sumber ini.'),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan saat memindai sumber.';

    return res.status(502).json({
      status: false,
      success: false,
      error: message,
    });
  }
}