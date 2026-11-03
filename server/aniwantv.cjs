/**
 * AniWanTV Content Provider v4
 * - Komik / Manhwa / Manga Engine: VoratoonClient (voratoon.co Next.js RSC initialData Extractor)
 * - Anime Sub Indo Engine: OtakuDesu Multi-Page + Full Directory Fuzzy Search + Dual Schedule
 */

"use strict";

const https = require("https");
const { execFile } = require("child_process");

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
};

const ANIME_HOSTS = ["https://otakudesu.fit", "https://otakudesu.cloud"];

let cachedAnimeDirectory = null;
let cachedAnimeDirTime = 0;

function extractErrorMessage(err) {
  if (!err) return "Terjadi kesalahan jaringan.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    return String(
      err.message || err.error || err.statusText || "Koneksi ke sumber terputus."
    );
  }
  return String(err);
}

// ============================================================================
// BAGIAN 1: VORATOON CLIENT (voratoon.co) - KOMIK / MANHWA / MANGA ENGINE
// ============================================================================

class VoratoonClient {
  static BASE_URL = "https://voratoon.co";
  static DEFAULT_UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
  static CLOUDFLARE_IPS = ["104.21.70.3", "172.67.217.41"];

  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || VoratoonClient.BASE_URL).replace(
      /\/+$/,
      ""
    );
    this.userAgent = options.userAgent || VoratoonClient.DEFAULT_UA;
    this.timeoutMs = options.timeoutMs || 15000;
  }

  static extractInitialData(html) {
    if (!html || typeof html !== "string") return null;

    const pushRegex = /self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g;
    let match;

    while ((match = pushRegex.exec(html)) !== null) {
      const rawChunk = match[1];
      if (!rawChunk.includes("initialData")) continue;

      const unescaped = rawChunk.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      const marker = '"initialData":';
      const markerIdx = unescaped.indexOf(marker);

      if (markerIdx === -1) continue;

      const start = markerIdx + marker.length;
      let openBraces = 0;
      let inString = false;
      let escape = false;
      let end = -1;

      for (let i = start; i < unescaped.length; i++) {
        const char = unescaped[i];
        if (escape) {
          escape = false;
          continue;
        }
        if (char === "\\") {
          escape = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (char === "{") {
            openBraces++;
          } else if (char === "}") {
            openBraces--;
            if (openBraces === 0) {
              end = i + 1;
              break;
            }
          }
        }
      }

      if (end !== -1) {
        const jsonSegment = unescaped.slice(start, end);
        try {
          return JSON.parse(jsonSegment);
        } catch (_) {}
      }
    }

    return null;
  }

  /**
   * Request HTML dengan 3 lapis failover:
   * 1. Native Fetch langsung
   * 2. Native HTTPS ke IP Anycast Cloudflare (Serverless-safe ketika curl tidak ada)
   * 3. cURL dengan DoH Google
   */
  async requestHtml(url, headers = {}) {
    const targetUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
    const reqHeaders = {
      "User-Agent": this.userAgent,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      ...headers,
    };

    // 1. Native Fetch
    try {
      const res = await fetch(targetUrl, {
        headers: reqHeaders,
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 200) return text;
      }
    } catch (_) {}

    // 2. Native HTTPS via Cloudflare Anycast IP (Bekerja di Vercel Serverless tanpa butuh binary curl)
    try {
      const htmlViaCf = await new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const cfIp = VoratoonClient.CLOUDFLARE_IPS[0];
        const req = https.request(
          {
            host: cfIp,
            port: 443,
            path: parsed.pathname + parsed.search,
            method: "GET",
            servername: parsed.hostname,
            headers: {
              ...reqHeaders,
              Host: parsed.hostname,
            },
            timeout: 7000,
          },
          (res) => {
            if (
              res.statusCode >= 300 &&
              res.statusCode < 400 &&
              res.headers.location
            ) {
              const nextUrl = new URL(
                res.headers.location,
                targetUrl
              ).toString();
              return resolve(this.requestHtml(nextUrl, headers));
            }
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
              const body = Buffer.concat(chunks).toString("utf-8");
              if (res.statusCode === 200 && body.length > 200) {
                resolve(body);
              } else {
                reject(new Error(`CF Anycast HTTP ${res.statusCode}`));
              }
            });
          }
        );
        req.on("error", reject);
        req.on("timeout", () => {
          req.destroy();
          reject(new Error("CF Anycast Timeout"));
        });
        req.end();
      });
      if (htmlViaCf) return htmlViaCf;
    } catch (_) {}

    // 3. Failover cURL dengan Cloudflare Anycast IP & DoH
    return new Promise((resolve, reject) => {
      const cfIp = VoratoonClient.CLOUDFLARE_IPS[0];
      const parsed = new URL(targetUrl);
      const args = [
        "-s",
        "-L",
        "--compressed",
        "--resolve",
        `${parsed.hostname}:443:${cfIp}`,
        "--doh-url",
        "https://dns.google/dns-query",
        "-A",
        this.userAgent,
        "-H",
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "-H",
        "Accept-Language: en-US,en;q=0.9,id;q=0.8",
      ];

      for (const [key, val] of Object.entries(headers)) {
        args.push("-H", `${key}: ${val}`);
      }

      args.push(targetUrl);

      execFile(
        "curl",
        args,
        { maxBuffer: 50 * 1024 * 1024, timeout: this.timeoutMs },
        (err, stdout, stderr) => {
          if (err) {
            return reject(
              new Error(
                `[VoratoonClient] Network request failed: ${
                  stderr || err.message
                }`
              )
            );
          }
          if (!stdout || stdout.trim().length === 0) {
            return reject(
              new Error("[VoratoonClient] Received empty response from server")
            );
          }
          resolve(stdout);
        }
      );
    });
  }

  async search(query, options = {}) {
    const page = Number(options.page) || 1;
    const params = new URLSearchParams();

    if (query && query.trim()) params.set("q", query.trim());
    if (page > 1) params.set("page", String(page));
    if (options.sort) params.set("sort", options.sort);
    if (options.status) params.set("status", options.status);
    if (options.format) params.set("format", options.format);

    const queryString = params.toString();
    const endpoint = `/browse${queryString ? `?${queryString}` : ""}`;
    const html = await this.requestHtml(endpoint);
    const data = VoratoonClient.extractInitialData(html);

    if (!data || !data.series) {
      return {
        results: [],
        pagination: { total: 0, page, lastPage: 1, hasMore: false },
      };
    }

    const results = data.series.map((item) => this._formatSeriesItem(item));
    const meta = data.seriesMeta || {};
    const lastPage =
      Number(meta.lastPage || meta.totalPages) ||
      (results.length >= 20 ? page + 1 : page);

    const pagination = {
      total: Number(meta.total || results.length),
      page,
      lastPage,
      hasMore: page < lastPage || results.length >= 20,
    };

    return { results, pagination };
  }

  async getLatest(page = 1, sort = "new") {
    return this.search("", { page, sort });
  }

  async getDetail(slugOrUrl) {
    const slug = this._sanitizeSlug(slugOrUrl);
    const endpoint = `/series/${encodeURIComponent(slug)}`;
    const html = await this.requestHtml(endpoint);
    const data = VoratoonClient.extractInitialData(html);

    if (!data || !data.series || data.series.length === 0) {
      throw new Error(
        `[VoratoonClient] Series "${slug}" tidak ditemukan di VoraToon`
      );
    }

    const seriesItem = data.series[0];
    const sData = seriesItem.data || {};
    const meta = seriesItem.dataMetadata || seriesItem.metadata || {};

    const chapters = (data.chapters || []).map((ch) => {
      const idx = ch.data?.index ?? ch.chapterIndex;
      const chTitle = ch.data?.title
        ? `Chapter ${idx} — ${ch.data.title}`
        : `Chapter ${idx}`;
      const dateStr = ch.createdAt
        ? new Date(ch.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";

      return {
        id: ch.id,
        seriesId: ch.seriesId || seriesItem.id,
        chapterIndex: idx,
        title: chTitle,
        views: Number(ch.views?.total || ch.data?.totalViews || 0),
        createdAt: ch.createdAt,
        update_time: dateStr,
        url: `${this.baseUrl}/series/${sData.slug || slug}/chapter/${idx}`,
      };
    });

    return {
      id: seriesItem.id,
      title: sData.title || "",
      nativeTitle: sData.nativeTitle || null,
      slug: sData.slug || slug,
      url: `${this.baseUrl}/series/${sData.slug || slug}`,
      coverImage: sData.coverImage || null,
      image_url: sData.coverImage || "",
      backgroundImage: sData.backgroundImage || null,
      synopsis: sData.synopsis
        ? sData.synopsis.replace(/\r\n/g, "\n").trim()
        : "",
      author: sData.author || "Kreator",
      status: sData.status || "Ongoing",
      format: sData.format || "Manhwa",
      type: (sData.format || "Manhwa").toUpperCase(),
      rating: Number(sData.rating || 0) || "9.0",
      isHot: Boolean(sData.isHot),
      totalChapters: chapters.length || Number(sData.totalChapters || 0),
      chapters_count: chapters.length,
      views: {
        total: Number(meta.totalViews || meta.views?.total || 0),
        monthly: Number(meta.monthlyViews || 0),
        weekly: Number(meta.weeklyViews || 0),
        daily: Number(meta.dailyViews || 0),
      },
      ranking: Number(meta.ranking || 0),
      bookmarks: Number(meta.bookmarkCount || 0),
      genres: Array.isArray(sData.genres)
        ? sData.genres.map((g) => g.data?.name || g.name).filter(Boolean)
        : [],
      chapters,
    };
  }

  async getChapter(slugOrUrl, chapterIndex) {
    let slug;
    let chIndex = chapterIndex;

    if (typeof slugOrUrl === "string" && slugOrUrl.includes("/chapter/")) {
      const match = slugOrUrl.match(/\/series\/([^/]+)\/chapter\/([^/?#]+)/);
      if (match) {
        slug = match[1];
        chIndex = match[2];
      }
    }

    if (!slug) slug = this._sanitizeSlug(slugOrUrl);
    if (chIndex === undefined || chIndex === null) {
      throw new Error("[VoratoonClient] Chapter index wajib diisi");
    }

    const endpoint = `/series/${encodeURIComponent(
      slug
    )}/chapter/${encodeURIComponent(chIndex)}`;
    const html = await this.requestHtml(endpoint);
    const data = VoratoonClient.extractInitialData(html);

    if (!data || !data.chapter) {
      throw new Error(
        `[VoratoonClient] Chapter ${chIndex} untuk "${slug}" tidak ditemukan`
      );
    }

    const ch = data.chapter;
    const chData = ch.data || {};
    const seriesItem = (data.series && data.series[0]) || {};
    const sData = seriesItem.data || {};

    const rawImages = Array.isArray(chData.images) ? chData.images : [];
    const formattedImages = rawImages.map((imgUrl, idx) => ({
      page: idx + 1,
      url: typeof imgUrl === "string" ? imgUrl : imgUrl?.url || "",
      alt: `Halaman ${idx + 1}`,
    }));

    const allChapters = (data.chapters || [])
      .map((c) => Number(c.data?.index ?? c.chapterIndex))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);

    const currentNum = Number(ch.chapterIndex ?? chIndex);
    const currIdx = allChapters.indexOf(currentNum);

    const prevChapter = currIdx > 0 ? allChapters[currIdx - 1] : null;
    const nextChapter =
      currIdx !== -1 && currIdx < allChapters.length - 1
        ? allChapters[currIdx + 1]
        : null;

    const prevUrl =
      prevChapter !== null
        ? `${this.baseUrl}/series/${sData.slug || slug}/chapter/${prevChapter}`
        : null;
    const nextUrl =
      nextChapter !== null
        ? `${this.baseUrl}/series/${sData.slug || slug}/chapter/${nextChapter}`
        : null;

    return {
      title: `${sData.title ? `${sData.title} — ` : ""}Chapter ${currentNum}${
        chData.title ? `: ${chData.title}` : ""
      }`,
      total_pages: formattedImages.length,
      totalImages: formattedImages.length,
      series: {
        id: seriesItem.id || ch.seriesId,
        title: sData.title || null,
        slug: sData.slug || slug,
        url: `${this.baseUrl}/series/${sData.slug || slug}`,
        coverImage: sData.coverImage || null,
      },
      chapter: {
        id: ch.id,
        index: currentNum,
        title: chData.title || null,
        url: `${this.baseUrl}/series/${sData.slug || slug}/chapter/${currentNum}`,
        views: Number(ch.views?.total || chData.totalViews || 0),
        createdAt: ch.createdAt,
      },
      navigation: {
        prev: prevUrl,
        next: nextUrl,
        prevChapter: prevUrl,
        nextChapter: nextUrl,
        prevIndex: prevChapter,
        nextIndex: nextChapter,
      },
      images: formattedImages,
    };
  }

  _formatSeriesItem(item) {
    const d = item.data || {};
    const meta = item.dataMetadata || item.metadata || {};
    const latestChapter = (item.chapters && item.chapters[0]) || null;
    const chIdx = latestChapter
      ? latestChapter.chapterIndex ?? latestChapter.data?.index
      : null;
    const createdAt = latestChapter?.createdAt;
    const timeStr = createdAt
      ? new Date(createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })
      : "Update Baru";

    const seriesSlug = d.slug || "";
    const seriesUrl = `${this.baseUrl}/series/${seriesSlug}`;
    const chapterUrl =
      chIdx !== null && chIdx !== undefined
        ? `${this.baseUrl}/series/${seriesSlug}/chapter/${chIdx}`
        : "";

    return {
      id: item.id,
      title: d.title || "",
      nativeTitle: d.nativeTitle || null,
      slug: seriesSlug,
      url: seriesUrl,
      coverImage: d.coverImage || null,
      image_url: d.coverImage || "",
      synopsis: d.synopsis ? d.synopsis.replace(/\r\n/g, "\n").trim() : "",
      author: d.author || null,
      rating: Number(d.rating || 0),
      status: d.status || "ongoing",
      format: d.format || "manhwa",
      type: (d.format || "manhwa").toUpperCase(),
      isHot: Boolean(d.isHot),
      is_hot: Boolean(d.isHot),
      is_colored: true,
      latest_chapter: chIdx !== null ? `Chapter ${chIdx}` : "Baca",
      update_time: timeStr,
      chapter_url: chapterUrl,
      latestChapter: latestChapter
        ? {
            index: chIdx,
            createdAt,
          }
        : null,
      totalViews: Number(meta.totalViews || 0),
      genres: Array.isArray(d.genres)
        ? d.genres.map((g) => g.data?.name || g.name).filter(Boolean)
        : [],
    };
  }

  _sanitizeSlug(input) {
    if (!input) throw new Error("[VoratoonClient] Slug atau URL wajib diisi");
    let str = String(input).trim();
    if (str.includes("/series/")) {
      const match = str.match(/\/series\/([^/?#]+)/);
      if (match) str = match[1];
    }
    return str.replace(/[^a-zA-Z0-9_-]/g, "");
  }
}

const voratoon = new VoratoonClient();

// ============================================================================
// BAGIAN 2: ANIME SUB INDO (OTAKUDESU MULTI-PAGE + DEEP SEARCH)
// ============================================================================

async function fetchHtmlFast(targetUrl, timeoutMs = 5500) {
  const parsed = new URL(targetUrl);
  const res = await fetch(targetUrl, {
    method: "GET",
    headers: {
      ...BROWSER_HEADERS,
      Referer: `${parsed.origin}/`,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function fetchWithMirrors(pathOrUrl, hostList, timeoutMs = 5500) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    try {
      return await fetchHtmlFast(pathOrUrl, timeoutMs);
    } catch (firstErr) {
      const parsed = new URL(pathOrUrl);
      const rel = parsed.pathname + parsed.search;
      for (const h of hostList) {
        if (h.includes(parsed.hostname)) continue;
        try {
          return await fetchHtmlFast(`${h}${rel}`, timeoutMs);
        } catch {}
      }
      throw firstErr;
    }
  }

  let lastErr = null;
  for (const host of hostList) {
    try {
      return await fetchHtmlFast(`${host}${pathOrUrl}`, timeoutMs);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Sumber anime sedang sibuk.");
}

function cleanText(htmlFragment) {
  if (!htmlFragment) return "";
  return String(htmlFragment)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#8217;|&#8216;/gi, "'")
    .replace(/&#8211;|&#8212;/gi, "-")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAttr(tagHtml, attrName) {
  if (!tagHtml) return "";
  const regex = new RegExp(
    `${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`,
    "i"
  );
  const m = tagHtml.match(regex);
  return m ? (m[1] ?? m[2] ?? m[3] ?? "").trim() : "";
}

function parseAnimeCardsFromHtml(html) {
  const anime = [];
  const seen = new Set();

  const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
  for (const block of articles) {
    const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = h2Match ? cleanText(h2Match[1]) : "";
    const firstLinkMatch = block.match(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i
    );
    const url = firstLinkMatch ? firstLinkMatch[1].trim() : "";
    const imgMatch = block.match(/<img\s+[^>]*>/i);
    const thumb = imgMatch
      ? getAttr(imgMatch[0], "src") ||
        getAttr(imgMatch[0], "data-src") ||
        getAttr(imgMatch[0], "data-lazy-src")
      : "";
    const epMatch =
      block.match(
        /class=["'][^"']*(?:epz|\bep\b)[^"']*["'][^>]*>([\s\S]*?)<\//i
      ) || block.match(/Episode\s+\d+/i);
    const episode = epMatch
      ? cleanText(epMatch[1] || epMatch[0])
      : "Sub Indo";
    const timeMatch =
      block.match(/<time[^>]*>([\s\S]*?)<\/time>/i) ||
      block.match(
        /class=["'][^"']*(?:time|newnime)[^"']*["'][^>]*>([\s\S]*?)<\//i
      );
    const releaseTime = timeMatch ? cleanText(timeMatch[1]) : "Baru";

    if (title && url && !seen.has(url)) {
      seen.add(url);
      anime.push({ title, episode, releaseTime, url, thumb });
    }
  }

  if (anime.length === 0) {
    const detposts =
      html.match(
        /<div[^>]*class=["'][^"']*detpost[^"']*["'][^>]*>[\s\S]*?<\/li>/gi
      ) || [];
    for (const block of detposts) {
      const titleMatch = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const title = titleMatch ? cleanText(titleMatch[1]) : "";
      const linkMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
      const url = linkMatch ? linkMatch[1].trim() : "";
      const imgMatch = block.match(/<img\s+[^>]*>/i);
      const thumb = imgMatch ? getAttr(imgMatch[0], "src") : "";
      const epMatch = block.match(
        /class=["'][^"']*epz[^"']*["'][^>]*>([\s\S]*?)<\//i
      );
      const episode = epMatch ? cleanText(epMatch[1]) : "Ongoing";
      const timeMatch = block.match(
        /class=["'][^"']*newnime[^"']*["'][^>]*>([\s\S]*?)<\//i
      );
      const releaseTime = timeMatch ? cleanText(timeMatch[1]) : "Baru";

      if (title && url && !seen.has(url)) {
        seen.add(url);
        anime.push({ title, episode, releaseTime, url, thumb });
      }
    }
  }

  return anime;
}

/**
 * Mengambil daftar anime ongoing / rilis terbaru dengan dukungan Multi-Page (Show More)
 */
async function getLatestAnime(page = 1) {
  const p = Math.max(1, Number(page) || 1);
  const pathsToTry =
    p === 1
      ? ["/", "/ongoing-anime/"]
      : [`/page/${p}/`, `/ongoing-anime/page/${p}/`];

  for (const pathStr of pathsToTry) {
    try {
      const html = await fetchWithMirrors(pathStr, ANIME_HOSTS, 5000);
      const parsed = parseAnimeCardsFromHtml(html);
      if (parsed.length > 0) return parsed;
    } catch {}
  }

  return [];
}

/**
 * Pencarian Anime Sub Indo Maksimal (Mendukung Multi-Page & Fuzzy Directory Match)
 */
async function searchAnimeIndo(query, page = 1) {
  const cleanQ = String(query || "").trim().toLowerCase();
  if (!cleanQ) return getLatestAnime(page);

  const p = Math.max(1, Number(page) || 1);
  const tokens = cleanQ.split(/\s+/).filter(Boolean);
  const results = [];
  const seenUrls = new Set();

  function addResult(item) {
    if (!item || !item.url || !item.title) return;
    const normUrl = item.url.replace(/\/+$/, "");
    if (seenUrls.has(normUrl)) return;
    seenUrls.add(normUrl);
    results.push({
      title: item.title,
      url: item.url,
      thumb:
        item.thumb ||
        "https://placehold.co/360x480/07131c/5eead4?text=Anime+Sub+Indo",
      episode: item.episode || "Sub Indo",
    });
  }

  const searchPaths =
    p === 1
      ? [
          `/?s=${encodeURIComponent(query)}&post_type=anime`,
          `/?s=${encodeURIComponent(query)}`,
        ]
      : [
          `/page/${p}/?s=${encodeURIComponent(query)}&post_type=anime`,
          `/page/${p}/?s=${encodeURIComponent(query)}`,
        ];

  await Promise.all(
    searchPaths.map(async (sp) => {
      try {
        const html = await fetchWithMirrors(sp, ANIME_HOSTS, 4500);
        const cards = parseAnimeCardsFromHtml(html);
        cards.forEach(addResult);

        const liBlocks =
          html.match(/<li[^>]*>[\s\S]*?<h2[\s\S]*?<\/li>/gi) || [];
        for (const block of liBlocks) {
          const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          const title = h2Match ? cleanText(h2Match[1]) : "";
          const linkMatch = block.match(
            /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i
          );
          const href = linkMatch ? linkMatch[1].trim() : "";
          const imgMatch = block.match(/<img\s+[^>]*>/i);
          const thumb = imgMatch ? getAttr(imgMatch[0], "src") : "";
          addResult({ title, url: href, thumb, episode: "Sub Indo" });
        }
      } catch {}
    })
  );

  // Jika halaman 1 dan hasil masih sedikit, pindai juga direktori lengkap /anime-list/
  if (p === 1 && results.length < 8) {
    try {
      const now = Date.now();
      if (!cachedAnimeDirectory || now - cachedAnimeDirTime > 3600000) {
        const dirHtml = await fetchWithMirrors(
          "/anime-list/",
          ANIME_HOSTS,
          5000
        );
        const dirList = [];
        for (const m of dirHtml.matchAll(
          /<a\s+([^>]*href=["'][^"']+["'][^>]*)>([\s\S]*?)<\/a>/gi
        )) {
          const href = getAttr(`<a ${m[1]}>`, "href");
          const title = cleanText(m[2]);
          if (
            title &&
            title.length > 2 &&
            href &&
            (href.includes("/anime/") || href.includes("otakudesu")) &&
            !/genre|jadwal|ongoing|complete|home|dmca/i.test(href)
          ) {
            dirList.push({ title, url: href });
          }
        }
        if (dirList.length > 10) {
          cachedAnimeDirectory = dirList;
          cachedAnimeDirTime = now;
        }
      }

      if (Array.isArray(cachedAnimeDirectory)) {
        for (const entry of cachedAnimeDirectory) {
          const lower = entry.title.toLowerCase();
          if (tokens.every((t) => lower.includes(t))) {
            addResult({
              title: entry.title,
              url: entry.url,
              episode: "Koleksi Lengkap",
            });
            if (results.length >= 24) break;
          }
        }
      }
    } catch {}
  }

  return results;
}

async function getAnimeEpisode(url) {
  const html = await fetchWithMirrors(url, ANIME_HOSTS, 5500);

  const h1Match =
    html.match(
      /<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i
    ) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? cleanText(h1Match[1]) : "Episode Anime";

  const thumbMatch =
    html.match(
      /class=["'][^"']*(?:fotoanime|thumb)[^"']*["'][\s\S]*?<img\s+[^>]*>/i
    ) || html.match(/<img[^>]*class=["'][^"']*wp-post-image[^"']*["'][^>]*>/i);
  const thumb = thumbMatch
    ? getAttr(thumbMatch[0], "src") || getAttr(thumbMatch[0], "data-src")
    : null;

  const synMatch =
    html.match(/class=["'][^"']*sinopc[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(
      /class=["'][^"']*entry-content[^"']*["'][^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i
    );
  const synopsis = synMatch ? cleanText(synMatch[1]) : null;

  const iframeMatch = html.match(
    /<iframe\s+[^>]*src=["']([^"']+)["'][^>]*>/i
  );
  const streamIframe = iframeMatch ? iframeMatch[1].trim() : null;

  const downloads = [];
  const episodes = [];

  const allLinks = html.matchAll(/<a\s+([^>]*)>([\s\S]*?)<\/a>/gi);
  for (const match of allLinks) {
    const attrs = match[1];
    const text = cleanText(match[2]);
    const href = getAttr(`<a ${attrs}>`, "href");
    if (!href) continue;

    if (
      /gofile|pixeldrain|drive\.google|mega\.nz|mediafire|krakenfiles|acefile|zippyshare/i.test(
        href
      )
    ) {
      downloads.push({
        server: text || "Unduh Video",
        url: href,
      });
    }

    if (
      href.includes("-episode-") &&
      !/facebook|twitter|whatsapp|t\.me|pinterest|telegram/i.test(href)
    ) {
      if (
        !episodes.some((e) => e.url === href) &&
        text &&
        !text.toLowerCase().includes("cancel")
      ) {
        episodes.push({
          title: text,
          url: href,
        });
      }
    }
  }

  if (!streamIframe && episodes.length > 0 && !url.includes("-episode-")) {
    try {
      const firstEp = await getAnimeEpisode(episodes[0].url);
      return {
        ...firstEp,
        thumb: firstEp.thumb || thumb,
        synopsis: firstEp.synopsis || synopsis,
        episodes: firstEp.episodes?.length ? firstEp.episodes : episodes,
      };
    } catch {}
  }

  return {
    title,
    thumb,
    synopsis,
    streamIframe,
    downloads,
    episodes,
  };
}

// ============================================================================
// BAGIAN 3: JADWAL RILIS GANDA (JADWAL ANIME + JADWAL KOMIK VORATOON)
// ============================================================================

async function getDualSchedule() {
  const daysOrder = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];

  const animeSchedule = {
    Senin: [],
    Selasa: [],
    Rabu: [],
    Kamis: [],
    Jumat: [],
    Sabtu: [],
    Minggu: [],
  };

  const comicSchedule = {
    Senin: [],
    Selasa: [],
    Rabu: [],
    Kamis: [],
    Jumat: [],
    Sabtu: [],
    Minggu: [],
  };

  await Promise.all([
    // 1. Jadwal Anime dari OtakuDesu
    (async () => {
      try {
        const html = await fetchWithMirrors("/jadwal-rilis/", ANIME_HOSTS, 5000);
        const sections = html
          .split(/<div[^>]*class=["'][^"']*kglist321[^"']*["'][^>]*>/i)
          .slice(1);

        for (const sec of sections) {
          const h2Match = sec.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          const rawDay = h2Match ? cleanText(h2Match[1]) : "";
          const matchedDay = daysOrder.find(
            (d) => d.toLowerCase() === rawDay.toLowerCase()
          );
          if (!matchedDay) continue;

          for (const aMatch of sec.matchAll(
            /<a\s+([^>]*href=["'][^"']+["'][^>]*)>([\s\S]*?)<\/a>/gi
          )) {
            const href = getAttr(`<a ${aMatch[1]}>`, "href");
            const title = cleanText(aMatch[2]);
            if (
              title &&
              href &&
              !animeSchedule[matchedDay].some((i) => i.url === href)
            ) {
              animeSchedule[matchedDay].push({
                title,
                url: href,
                day: matchedDay,
                kind: "anime",
              });
            }
          }
        }
      } catch {}

      const totalAnimeSched = Object.values(animeSchedule).reduce(
        (acc, arr) => acc + arr.length,
        0
      );
      if (totalAnimeSched === 0) {
        try {
          const latestAnime = await getLatestAnime(1);
          latestAnime.forEach((item, idx) => {
            const d = daysOrder[idx % 7];
            animeSchedule[d].push({
              title: item.title,
              url: item.url,
              thumb: item.thumb,
              episode: item.episode,
              day: d,
              kind: "anime",
            });
          });
        } catch {}
      }
    })(),

    // 2. Jadwal Rilis Komik dari VoraToon (Ongoing Updates)
    (async () => {
      try {
        const [p1, p2] = await Promise.all([
          voratoon
            .search("", { page: 1, sort: "update", status: "ongoing" })
            .catch(() => ({ results: [] })),
          voratoon
            .search("", { page: 2, sort: "update", status: "ongoing" })
            .catch(() => ({ results: [] })),
        ]);
        const allComics = [...(p1.results || []), ...(p2.results || [])];
        allComics.forEach((comic, idx) => {
          let dayIdx = idx % 7;
          if (comic.latestChapter?.createdAt) {
            const dt = new Date(comic.latestChapter.createdAt);
            if (!Number.isNaN(dt.getTime())) {
              const jsDay = dt.getDay(); // 0 Minggu .. 6 Sabtu
              dayIdx = jsDay === 0 ? 6 : jsDay - 1;
            }
          }
          const d = daysOrder[dayIdx];
          if (!comicSchedule[d].some((c) => c.url === comic.url)) {
            comicSchedule[d].push({
              title: comic.title,
              url: comic.url,
              chapter_url: comic.chapter_url,
              image_url: comic.image_url,
              type: comic.type,
              latest_chapter: comic.latest_chapter,
              update_time: comic.update_time,
              day: d,
              kind: "komik",
            });
          }
        });
      } catch {}
    })(),
  ]);

  return {
    anime: animeSchedule,
    komik: comicSchedule,
  };
}

// ============================================================================
// ROUTER UTAMA SCRAPER ANIWANTV + VORATOON
// ============================================================================

async function scrapeAniWanTV(input = "", page = 1, options = {}) {
  const query = String(input || "").trim();
  const pageNum = Math.max(1, Number(page) || 1);
  const sort = options.sort || "new";
  const status = options.status || "";
  const format = options.format || "";

  try {
    // 1. Chapter Reader VoraToon (/series/{slug}/chapter/{index})
    if (query.includes("/chapter/")) {
      const data = await voratoon.getChapter(query);
      return {
        status: true,
        creator: "Kyno",
        type: "chapter_reader",
        data,
      };
    }

    // 2. Detail Seri Komik VoraToon (/series/{slug})
    if (
      query.includes("voratoon.co/series/") ||
      query.startsWith("series:") ||
      query.includes("/series/")
    ) {
      const cleanSlug = query.replace(/^series:/i, "");
      const data = await voratoon.getDetail(cleanSlug);
      return {
        status: true,
        creator: "Kyno",
        type: "comic_details",
        data,
      };
    }

    // 3. Anime Episode / Series Stream (OtakuDesu)
    if (
      query.includes("otakudesu") ||
      query.includes("-episode-") ||
      query.includes("/anime/")
    ) {
      const data = await getAnimeEpisode(query);
      return {
        status: true,
        creator: "Kyno",
        type: "anime_episode_stream",
        data,
      };
    }

    // 4. Dual Schedule (Jadwal Anime + Jadwal Komik VoraToon)
    if (
      query.toLowerCase() === "schedule" ||
      query.toLowerCase() === "jadwal"
    ) {
      const schedule = await getDualSchedule();
      return {
        status: true,
        creator: "Kyno",
        type: "schedule",
        data: schedule,
      };
    }

    // 5. Search Terpadu (Komik VoraToon Multi-Filter + Anime Sub Indo Multi-Page)
    if (
      query.startsWith("search:") ||
      (query.length > 0 &&
        !["anime", "komik", "all", "schedule", "jadwal"].includes(
          query.toLowerCase()
        ))
    ) {
      const q = query.replace(/^search:\s*/i, "");
      const [voraRes, animeIndo] = await Promise.all([
        voratoon
          .search(q, { page: pageNum, sort, status, format })
          .catch(() => ({ results: [], pagination: { hasMore: false } })),
        searchAnimeIndo(q, pageNum).catch(() => []),
      ]);

      const comics = voraRes.results || [];
      return {
        status: true,
        creator: "Kyno",
        type: "search_results",
        query: q,
        page: pageNum,
        has_more: Boolean(
          voraRes.pagination?.hasMore ||
            comics.length >= 20 ||
            animeIndo.length >= 10
        ),
        total: comics.length + animeIndo.length,
        data: {
          comics,
          anime: animeIndo,
          pagination: voraRes.pagination,
        },
      };
    }

    // 6. Anime Only (Dengan dukungan Show More Page)
    if (query.toLowerCase() === "anime") {
      const anime = await getLatestAnime(pageNum);
      return {
        status: true,
        creator: "Kyno",
        type: "anime_feed",
        page: pageNum,
        has_more: anime.length >= 10,
        total: anime.length,
        data: anime,
      };
    }

    // 7. Komik VoraToon Only (Dengan dukungan Filter & Show More Page)
    if (query.toLowerCase() === "komik") {
      const voraRes = await voratoon.search("", {
        page: pageNum,
        sort: sort || "new",
        status,
        format,
      });
      const comics = voraRes.results || [];
      return {
        status: true,
        creator: "Kyno",
        type: "comic_feed",
        page: pageNum,
        pagination: voraRes.pagination,
        has_more: Boolean(voraRes.pagination?.hasMore || comics.length >= 20),
        total: comics.length,
        data: comics,
      };
    }

    // 8. Default Dashboard Feed (Anime Sub Indo + Komik VoraToon)
    const [anime, voraLatest] = await Promise.all([
      getLatestAnime(1).catch(() => []),
      voratoon
        .getLatest(1, "new")
        .then((r) => r.results || [])
        .catch(() => []),
    ]);

    return {
      status: true,
      creator: "Kyno",
      type: "in_app_dashboard",
      data: {
        ongoing_anime: anime.slice(0, 12),
        latest_comics: voraLatest.slice(0, 12),
      },
    };
  } catch (error) {
    return {
      status: false,
      creator: "Kyno",
      error: extractErrorMessage(error),
    };
  }
}

module.exports = scrapeAniWanTV;
module.exports.scrapeAniWanTV = scrapeAniWanTV;
module.exports.VoratoonClient = VoratoonClient;
module.exports.getLatestAnime = getLatestAnime;
module.exports.getDualSchedule = getDualSchedule;
module.exports.getAnimeEpisode = getAnimeEpisode;
module.exports.getLatestComics = getLatestComics;
module.exports.getComicDetails = getComicDetails;
module.exports.getChapterImages = getChapterImages;
module.exports.searchComics = searchComics;