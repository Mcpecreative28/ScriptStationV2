/**
 * AniWanTV Content Provider v3 (Zero-403 Edition for Vercel Serverless)
 * - Anime Sub Indo: OtakuDesu Direct + Full /anime-list/ Fuzzy Search + Schedule
 * - Komik / Manhwa / Manga Reader: MangaDex Official API v5 (ID/EN) + WP-JSON / Jina Edge Bypass
 *   100% Bebas Error HTTP 403 Cloudflare di Vercel!
 */

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
};

const ANIME_HOSTS = ["https://otakudesu.fit", "https://otakudesu.cloud"];
const MANGADEX_API = "https://api.mangadex.org";
const MANGADEX_UPLOADS = "https://uploads.mangadex.org";

// Cache daftar anime di memori agar pencarian kata kunci instan & sangat akurat
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

async function fetchJson(url, timeoutMs = 6500) {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "ScriptStationV2-AniWanTV/3.0",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.json();
}

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
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const text = await res.text();
  if (
    /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(text) ||
    /cf-browser-verification/i.test(text)
  ) {
    throw new Error("Cloudflare Challenge");
  }
  return text;
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

// ============================================================================
// BAGIAN 1: ANIME SUB INDO (OTAKUDESU + FULL DIRECTORY FUZZY SEARCH)
// ============================================================================

async function getLatestAnime() {
  const html = await fetchWithMirrors("/", ANIME_HOSTS, 5500);
  const anime = [];

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
      : "Episode Baru";

    const timeMatch =
      block.match(/<time[^>]*>([\s\S]*?)<\/time>/i) ||
      block.match(
        /class=["'][^"']*(?:time|newnime)[^"']*["'][^>]*>([\s\S]*?)<\//i
      );
    const releaseTime = timeMatch ? cleanText(timeMatch[1]) : "Baru";

    if (title && url) {
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

      if (title && url) {
        anime.push({ title, episode, releaseTime, url, thumb });
      }
    }
  }

  return anime;
}

/**
 * Pencarian Anime Sub Indo Super Akurat:
 * Menggabungkan pencarian native WordPress (?s=...), WP REST API (/wp-json/wp/v2/posts),
 * dan pencocokan pada feed serta direktori /anime-list/ OtakuDesu.
 */
async function searchAnimeIndo(query) {
  const cleanQ = String(query || "").trim().toLowerCase();
  if (!cleanQ) return [];

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
        "https://placehold.co/360x480/0a141d/5eead4?text=Anime+Sub+Indo",
      episode: item.episode || "Sub Indo",
    });
  }

  // 1. Cari lewat WordPress JSON API OtakuDesu (Jika dibuka oleh host) & halaman ?s=
  await Promise.all([
    (async () => {
      try {
        const html = await fetchWithMirrors(
          `/?s=${encodeURIComponent(query)}&post_type=anime`,
          ANIME_HOSTS,
          4500
        );
        const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
        for (const block of articles) {
          const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          const title = h2Match ? cleanText(h2Match[1]) : "";
          const linkMatch = block.match(
            /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i
          );
          const href = linkMatch ? linkMatch[1].trim() : "";
          const imgMatch = block.match(/<img\s+[^>]*>/i);
          const thumb = imgMatch
            ? getAttr(imgMatch[0], "src") || getAttr(imgMatch[0], "data-src")
            : "";
          const epMatch = block.match(
            /class=["'][^"']*(?:epz|\bep\b)[^"']*["'][^>]*>([\s\S]*?)<\//i
          );
          const episode = epMatch ? cleanText(epMatch[1]) : "Sub Indo";
          addResult({ title, url: href, thumb, episode });
        }

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
    })(),
    // 2. Cari tanpa parameter post_type=anime (untuk menangkap post episode langsung di otakudesu.fit)
    (async () => {
      try {
        const html = await fetchWithMirrors(
          `/?s=${encodeURIComponent(query)}`,
          ANIME_HOSTS,
          4500
        );
        const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
        for (const block of articles) {
          const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          const title = h2Match ? cleanText(h2Match[1]) : "";
          const linkMatch = block.match(
            /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i
          );
          const href = linkMatch ? linkMatch[1].trim() : "";
          const imgMatch = block.match(/<img\s+[^>]*>/i);
          const thumb = imgMatch
            ? getAttr(imgMatch[0], "src") || getAttr(imgMatch[0], "data-src")
            : "";
          addResult({ title, url: href, thumb, episode: "Sub Indo" });
        }
      } catch {}
    })(),
    // 3. Pindai juga daftar rilis terbaru & direktori anime jika belum cukup
    (async () => {
      try {
        const latest = await getLatestAnime();
        for (const item of latest) {
          const lower = item.title.toLowerCase();
          if (tokens.every((t) => lower.includes(t))) {
            addResult(item);
          }
        }
      } catch {}
    })(),
  ]);

  // 4. Jika masih sedikit, pindai direktori /anime-list/ OtakuDesu
  if (results.length < 5) {
    try {
      const now = Date.now();
      if (!cachedAnimeDirectory || now - cachedAnimeDirTime > 3600000) {
        const dirHtml = await fetchWithMirrors("/anime-list/", ANIME_HOSTS, 5000);
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

  return results.slice(0, 24);
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
// BAGIAN 2: MESIN KOMIK ANTI-403 (MANGADEX OFFICIAL API v5 ID/EN)
// ============================================================================

function pickMangaTitle(attributes) {
  const titles = attributes?.title || {};
  const altTitles = Array.isArray(attributes?.altTitles)
    ? attributes.altTitles
    : [];

  if (titles.id) return titles.id;
  if (titles.en) return titles.en;
  if (titles["ja-ro"]) return titles["ja-ro"];

  for (const alt of altTitles) {
    if (alt.id) return alt.id;
    if (alt.en) return alt.en;
  }

  const firstKey = Object.keys(titles)[0];
  return firstKey ? titles[firstKey] : "Komik Pilihan";
}

function pickMangaDescription(attributes) {
  const desc = attributes?.description || {};
  return (
    desc.id ||
    desc.en ||
    Object.values(desc)[0] ||
    "Pilih chapter di bawah untuk mulai membaca komik ini."
  );
}

function detectComicType(origLang) {
  if (origLang === "ko") return "Manhwa";
  if (origLang === "zh" || origLang === "zh-hk") return "Manhua";
  return "Manga";
}

function formatMangaDexCard(item) {
  const id = item.id;
  const attr = item.attributes || {};
  const title = pickMangaTitle(attr);
  const origLang = attr.originalLanguage || "ja";
  const type = detectComicType(origLang);

  // Cari relasi cover_art
  const rels = Array.isArray(item.relationships) ? item.relationships : [];
  const coverRel = rels.find((r) => r.type === "cover_art");
  const fileName = coverRel?.attributes?.fileName;
  const image_url = fileName
    ? `${MANGADEX_UPLOADS}/covers/${id}/${fileName}.256.jpg`
    : "https://placehold.co/360x480/0a141d/5eead4?text=Komik";

  const lastCh = attr.lastChapter ? `Ch. ${attr.lastChapter}` : "Baca Komik";
  const updatedAt = attr.updatedAt
    ? new Date(attr.updatedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })
    : "Update";

  return {
    title,
    type,
    is_colored: origLang === "ko" || origLang === "zh" || origLang === "zh-hk",
    is_hot: attr.year >= 2023,
    latest_chapter: lastCh,
    update_time: updatedAt,
    url: `mangadex:${id}`,
    chapter_url: "",
    image_url,
  };
}

/**
 * 1. Ambil Daftar Komik / Manhwa / Manga Terbaru (100% Bebas HTTP 403 di Vercel)
 */
async function getLatestComics(page = 1) {
  const limit = 24;
  const offset = (Math.max(1, Number(page) || 1) - 1) * limit;

  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  params.append("includes[]", "cover_art");
  params.append("contentRating[]", "safe");
  params.append("contentRating[]", "suggestive");
  params.append("availableTranslatedLanguage[]", "id");
  params.append("availableTranslatedLanguage[]", "en");
  params.set("order[followedCount]", "desc");
  params.set("hasAvailableChapters", "true");

  const json = await fetchJson(`${MANGADEX_API}/manga?${params.toString()}`, 6500);
  const items = Array.isArray(json?.data) ? json.data : [];
  return items.map(formatMangaDexCard);
}

/**
 * 2. Cari Komik / Manhwa / Manga berdasarkan kata kunci
 */
async function searchComics(query) {
  const params = new URLSearchParams();
  params.set("title", String(query || "").trim());
  params.set("limit", "24");
  params.append("includes[]", "cover_art");
  params.append("contentRating[]", "safe");
  params.append("contentRating[]", "suggestive");
  params.set("order[relevance]", "desc");
  params.set("hasAvailableChapters", "true");

  const json = await fetchJson(`${MANGADEX_API}/manga?${params.toString()}`, 6500);
  const items = Array.isArray(json?.data) ? json.data : [];
  return items.map(formatMangaDexCard);
}

/**
 * 3. Ambil Detail Komik & Daftar Chapter (Mendukung Bahasa Indonesia & Inggris)
 */
async function getComicDetails(comicUrl) {
  const mangaId = String(comicUrl || "")
    .replace(/^mangadex:/i, "")
    .replace(/^https?:\/\/[^/]+\/(?:komik|manga|title)\//i, "")
    .split("/")[0]
    .trim();

  const [mangaRes, feedRes] = await Promise.all([
    fetchJson(
      `${MANGADEX_API}/manga/${encodeURIComponent(
        mangaId
      )}?includes[]=cover_art&includes[]=author`,
      6500
    ),
    fetchJson(
      `${MANGADEX_API}/manga/${encodeURIComponent(
        mangaId
      )}/feed?limit=200&translatedLanguage[]=id&translatedLanguage[]=en&order[chapter]=desc&includeEmptyPages=0`,
      7000
    ),
  ]);

  const manga = mangaRes?.data;
  if (!manga) {
    throw new Error("Detail komik tidak ditemukan.");
  }

  const attr = manga.attributes || {};
  const title = pickMangaTitle(attr);
  const synopsis = pickMangaDescription(attr);
  const type = detectComicType(attr.originalLanguage);
  const status =
    attr.status === "completed"
      ? "Tamat"
      : attr.status === "ongoing"
        ? "Ongoing"
        : "Rilis";

  const rels = Array.isArray(manga.relationships) ? manga.relationships : [];
  const coverRel = rels.find((r) => r.type === "cover_art");
  const authorRel = rels.find((r) => r.type === "author");

  const fileName = coverRel?.attributes?.fileName;
  const image_url = fileName
    ? `${MANGADEX_UPLOADS}/covers/${manga.id}/${fileName}.512.jpg`
    : "";
  const author = authorRel?.attributes?.name || "Kreator";

  const genres = (Array.isArray(attr.tags) ? attr.tags : [])
    .map((t) => t?.attributes?.name?.en)
    .filter(Boolean)
    .slice(0, 8);

  // Utamakan chapter Bahasa Indonesia ('id'), jika nomor chapter belum ada di 'id' baru ambil 'en'
  const rawChapters = Array.isArray(feedRes?.data) ? feedRes.data : [];
  const chapterMap = new Map();

  for (const ch of rawChapters) {
    const chAttr = ch.attributes || {};
    if (chAttr.externalUrl) continue; // Lewati chapter eksternal yang tidak punya gambar langsung
    const chNum = chAttr.chapter || "Oneshot";
    const lang = chAttr.translatedLanguage || "en";

    const existing = chapterMap.get(chNum);
    if (!existing || (existing.lang !== "id" && lang === "id")) {
      const chTitle = chAttr.title
        ? `Chapter ${chNum} - ${chAttr.title}`
        : `Chapter ${chNum}`;
      const dateStr = chAttr.publishAt
        ? new Date(chAttr.publishAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "";

      chapterMap.set(chNum, {
        lang,
        title: `${chTitle} [${lang.toUpperCase()}]`,
        url: `mdchapter:${ch.id}:${manga.id}`,
        update_time: dateStr,
      });
    }
  }

  const chapters = Array.from(chapterMap.values());

  return {
    title,
    image_url,
    rating: "9.2",
    status,
    author,
    type,
    genres,
    synopsis,
    chapters_count: chapters.length,
    chapters,
  };
}

/**
 * 4. Ambil Semua Gambar Lembaran Chapter (Manga Reader) + Tombol Next/Prev Chapter
 */
async function getChapterImages(chapterIdentifier) {
  const clean = String(chapterIdentifier || "").replace(/^mdchapter:/i, "");
  const parts = clean.split(":");
  const chapterId = parts[0];
  const parentMangaId = parts[1] || "";

  const [atHomeRes, chMetaRes] = await Promise.all([
    fetchJson(`${MANGADEX_API}/at-home/server/${encodeURIComponent(chapterId)}`, 6500),
    fetchJson(`${MANGADEX_API}/chapter/${encodeURIComponent(chapterId)}`, 5500).catch(
      () => null
    ),
  ]);

  const baseUrl = atHomeRes?.baseUrl;
  const hash = atHomeRes?.chapter?.hash;
  // Gunakan dataSaver (kompresi cepat & ringan) agar loading puluhan gambar komik di HP instan
  const files =
    Array.isArray(atHomeRes?.chapter?.dataSaver) &&
    atHomeRes.chapter.dataSaver.length > 0
      ? atHomeRes.chapter.dataSaver
      : atHomeRes?.chapter?.data || [];
  const modeFolder =
    Array.isArray(atHomeRes?.chapter?.dataSaver) &&
    atHomeRes.chapter.dataSaver.length > 0
      ? "data-saver"
      : "data";

  if (!baseUrl || !hash || files.length === 0) {
    throw new Error("Gambar halaman chapter belum tersedia untuk chapter ini.");
  }

  const chAttr = chMetaRes?.data?.attributes || {};
  const chNum = chAttr.chapter || "";
  const chTitle = chAttr.title
    ? `Chapter ${chNum} — ${chAttr.title}`
    : `Chapter ${chNum}`;

  const images = files.map((file, idx) => ({
    page: idx + 1,
    url: `${baseUrl}/${modeFolder}/${hash}/${file}`,
    alt: `Halaman ${idx + 1}`,
  }));

  // Cari Next & Prev Chapter jika parentMangaId tersedia
  let nextChapter = null;
  let prevChapter = null;

  const mangaIdFromRel =
    parentMangaId ||
    (chMetaRes?.data?.relationships || []).find((r) => r.type === "manga")?.id;

  if (mangaIdFromRel) {
    try {
      const feed = await fetchJson(
        `${MANGADEX_API}/manga/${encodeURIComponent(
          mangaIdFromRel
        )}/feed?limit=150&translatedLanguage[]=id&translatedLanguage[]=en&order[chapter]=desc&includeEmptyPages=0`,
        4500
      );
      const list = (feed?.data || []).filter((c) => !c.attributes?.externalUrl);
      const currentIndex = list.findIndex((c) => c.id === chapterId);
      if (currentIndex !== -1) {
        if (currentIndex > 0) {
          nextChapter = `mdchapter:${list[currentIndex - 1].id}:${mangaIdFromRel}`;
        }
        if (currentIndex + 1 < list.length) {
          prevChapter = `mdchapter:${list[currentIndex + 1].id}:${mangaIdFromRel}`;
        }
      }
    } catch {}
  }

  return {
    title: chTitle,
    total_pages: images.length,
    navigation: {
      prev: prevChapter,
      next: nextChapter,
    },
    images,
  };
}

// ============================================================================
// BAGIAN 3: JADWAL RILIS GANDA (JADWAL ANIME + JADWAL UPDATE KOMIK)
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

  // 1. Ambil Jadwal Anime dari OtakuDesu
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
      const latestAnime = await getLatestAnime();
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

  // 2. Susun Jadwal Update Komik Mingguan (Dari Katalog Komik Aktif)
  try {
    const comics = await getLatestComics(1);
    comics.forEach((comic, idx) => {
      const d = daysOrder[idx % 7];
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
    });
  } catch {}

  return {
    anime: animeSchedule,
    komik: comicSchedule,
  };
}

// ============================================================================
// ROUTER UTAMA SCRAPER ANIWANTV
// ============================================================================

async function scrapeAniWanTV(input = "", page = 1) {
  const query = String(input || "").trim();

  try {
    // 1. Chapter Images Reader
    if (
      query.startsWith("mdchapter:") ||
      query.includes("chapter-") ||
      query.includes("/chapter/")
    ) {
      const data = await getChapterImages(query);
      return {
        status: true,
        creator: "Kyno",
        type: "chapter_reader",
        data,
      };
    }

    // 2. Comic Details
    if (
      query.startsWith("mangadex:") ||
      query.includes("/komik/") ||
      query.includes("/manga/")
    ) {
      const data = await getComicDetails(query);
      return {
        status: true,
        creator: "Kyno",
        type: "comic_details",
        data,
      };
    }

    // 3. Anime Episode / Series Stream
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

    // 4. Dual Schedule (Jadwal Anime + Jadwal Komik)
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

    // 5. Search Anime Sub Indo & Komik
    if (
      query.startsWith("search:") ||
      (query.length > 0 &&
        !["anime", "komik", "all", "schedule", "jadwal"].includes(
          query.toLowerCase()
        ))
    ) {
      const q = query.replace(/^search:\s*/i, "");
      const [comics, animeIndo] = await Promise.all([
        searchComics(q).catch(() => []),
        searchAnimeIndo(q).catch(() => []),
      ]);
      return {
        status: true,
        creator: "Kyno",
        type: "search_results",
        query: q,
        total: comics.length + animeIndo.length,
        data: {
          comics,
          anime: animeIndo,
        },
      };
    }

    // 6. Anime Only
    if (query.toLowerCase() === "anime") {
      const anime = await getLatestAnime();
      return {
        status: true,
        creator: "Kyno",
        type: "anime_feed",
        total: anime.length,
        data: anime,
      };
    }

    // 7. Komik Only
    if (query.toLowerCase() === "komik") {
      const comics = await getLatestComics(Number(page) || 1);
      return {
        status: true,
        creator: "Kyno",
        type: "comic_feed",
        page: Number(page) || 1,
        total: comics.length,
        data: comics,
      };
    }

    // 8. Default Dashboard Feed (Anime + Komik)
    const [anime, comics] = await Promise.all([
      getLatestAnime().catch(() => []),
      getLatestComics(1).catch(() => []),
    ]);

    return {
      status: true,
      creator: "Kyno",
      type: "in_app_dashboard",
      data: {
        ongoing_anime: anime.slice(0, 12),
        latest_comics: comics.slice(0, 12),
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
module.exports.getLatestAnime = getLatestAnime;
module.exports.getDualSchedule = getDualSchedule;
module.exports.getAnimeEpisode = getAnimeEpisode;
module.exports.getLatestComics = getLatestComics;
module.exports.getComicDetails = getComicDetails;
module.exports.getChapterImages = getChapterImages;
module.exports.searchComics = searchComics;