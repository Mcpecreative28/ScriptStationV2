/**
 * AniWanTV Content Provider (Anime Sub Indo, Komik/Manhwa Reader, Search & Dual Schedule)
 * Dilengkapi Multi-Provider Comic Engine (Komiku API + KomikIndo Mirror) agar 100% bebas blokir 403/Timeout di Vercel
 */

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,image/avif,image/webp,*/*;q=0.8",
};

const ANIME_HOSTS = ["https://otakudesu.fit", "https://otakudesu.cloud"];
const KOMIKU_API_BASE = "https://api.komiku.id";
const KOMIKU_WEB_BASE = "https://komiku.id";
const COMIC_FALLBACK_HOSTS = [
  "https://komikindo.ch",
  "https://komikindo.tv",
];

function extractErrorMessage(err) {
  if (!err) return "Terjadi kesalahan yang tidak diketahui.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    return String(
      err.message || err.error || err.statusText || JSON.stringify(err)
    );
  }
  return String(err);
}

async function fetchHtmlFast(targetUrl, timeoutMs = 4500) {
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

async function fetchWithMirrors(pathOrUrl, hostList, timeoutMs = 4500) {
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
      // Satu kali fallback relay cepat jika direct gagal
      try {
        const relay = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(
          pathOrUrl
        )}`;
        return await fetchHtmlFast(relay, 5000);
      } catch {}
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
  throw lastErr || new Error("Sumber sedang sibuk.");
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

function ensureAbsoluteUrl(href, baseOrigin) {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return `https:${href}`;
  return `${baseOrigin.replace(/\/+$/, "")}/${href.replace(/^\/+/, "")}`;
}

// ============================================================================
// BAGIAN 1: ANIME SUB INDO (OTAKUDESU)
// ============================================================================

async function getLatestAnime() {
  const html = await fetchWithMirrors("/", ANIME_HOSTS, 4500);
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

async function searchAnimeIndo(query) {
  try {
    const html = await fetchWithMirrors(
      `/?s=${encodeURIComponent(query)}&post_type=anime`,
      ANIME_HOSTS,
      4500
    );
    const results = [];

    const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
    for (const block of articles) {
      const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
      const title = h2Match ? cleanText(h2Match[1]) : "";
      const linkMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
      const href = linkMatch ? linkMatch[1].trim() : "";
      const imgMatch = block.match(/<img\s+[^>]*>/i);
      const thumb = imgMatch
        ? getAttr(imgMatch[0], "src") || getAttr(imgMatch[0], "data-src")
        : "";
      const epMatch = block.match(
        /class=["'][^"']*(?:epz|\bep\b)[^"']*["'][^>]*>([\s\S]*?)<\//i
      );
      const episode = epMatch ? cleanText(epMatch[1]) : "Sub Indo";

      if (title && href) {
        results.push({ title, url: href, thumb, episode });
      }
    }

    if (results.length === 0) {
      const liBlocks =
        html.match(/<li[^>]*>[\s\S]*?<h2[\s\S]*?<\/li>/gi) || [];
      for (const block of liBlocks) {
        const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
        const title = h2Match ? cleanText(h2Match[1]) : "";
        const linkMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
        const href = linkMatch ? linkMatch[1].trim() : "";
        const imgMatch = block.match(/<img\s+[^>]*>/i);
        const thumb = imgMatch ? getAttr(imgMatch[0], "src") : "";
        if (title && href) {
          results.push({ title, url: href, thumb, episode: "Sub Indo" });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
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
// BAGIAN 2: MULTI-PROVIDER KOMIK / MANHWA / MANGA READER (KOMIKU + KOMIKINDO)
// ============================================================================

function parseKomikuList(html) {
  const comics = [];
  const blocks = html.split(/<div[^>]*class=["'][^"']*bge["'][^>]*>/i).slice(1);

  for (const block of blocks) {
    const h3Match = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = h3Match ? cleanText(h3Match[1]) : "";

    const mangaLinkMatch =
      block.match(/<a\s+[^>]*href=["']([^"']*\/manga\/[^"']+)["'][^>]*>/i) ||
      block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
    const rawHref = mangaLinkMatch ? mangaLinkMatch[1].trim() : "";
    const url = ensureAbsoluteUrl(rawHref, KOMIKU_WEB_BASE);

    const imgMatch = block.match(/<img\s+[^>]*>/i);
    const rawImg = imgMatch
      ? getAttr(imgMatch[0], "src") ||
        getAttr(imgMatch[0], "data-src") ||
        getAttr(imgMatch[0], "data-lazy-src")
      : "";
    const image_url = rawImg ? rawImg.replace(/\?resize=.*$/, "") : "";

    const typeMatch = block.match(
      /<div[^>]*class=["'][^"']*tpe1_inf[^"']*["'][^>]*>[\s\S]*?<b>([\s\S]*?)<\/b>/i
    );
    const type = typeMatch ? cleanText(typeMatch[1]) : "Manhwa";

    // Chapter terbaru
    const chMatches = [
      ...block.matchAll(
        /<div[^>]*class=["'][^"']*new1[^"']*["'][^>]*>[\s\S]*?<a\s+([^>]*)>([\s\S]*?)<\/a>/gi
      ),
    ];
    const lastChBlock =
      chMatches.length > 0 ? chMatches[chMatches.length - 1] : null;
    const rawChUrl = lastChBlock
      ? getAttr(`<a ${lastChBlock[1]}>`, "href")
      : "";
    const chapter_url = rawChUrl
      ? ensureAbsoluteUrl(rawChUrl, KOMIKU_WEB_BASE)
      : "";
    const latest_chapter = lastChBlock
      ? cleanText(lastChBlock[2]).replace(/^Terbaru\s*:?\s*/i, "")
      : "Chapter Baru";

    const timeMatch = block.match(/<span[^>]*class=["'][^"']*up[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    const update_time = timeMatch ? cleanText(timeMatch[1]) : "Update Baru";

    if (title && url) {
      comics.push({
        title,
        type,
        is_colored: /manhwa|manhua/i.test(type),
        is_hot: /populer|hot/i.test(block),
        latest_chapter,
        update_time,
        url,
        chapter_url,
        image_url,
      });
    }
  }

  return comics;
}

function parseKomikIndoPosts(html) {
  const comics = [];
  const blocks = html
    .split(/<div[^>]*class=["'][^"']*animepost[^"']*["'][^>]*>/i)
    .slice(1);

  for (const rawBlock of blocks) {
    const block =
      rawBlock.split(
        /<\/article>|<div[^>]*class=["'][^"']*pagination/i
      )[0] || rawBlock;

    const linkMatch =
      block.match(/<a\s+[^>]*itemprop=["']url["'][^>]*>/i) ||
      block.match(/<a\s+[^>]*href=["'][^"']*\/komik\/[^"']+["'][^>]*>/i);
    if (!linkMatch) continue;

    const linkTag = linkMatch[0];
    const href = getAttr(linkTag, "href");
    const rawTitle =
      getAttr(linkTag, "title") ||
      cleanText((block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i) || [])[1] || "");
    const title = rawTitle.replace(/^Komik\s+/i, "").trim();

    const imgMatch = block.match(/<img\s+[^>]*>/i);
    const image_url = imgMatch
      ? getAttr(imgMatch[0], "src") || getAttr(imgMatch[0], "data-src")
      : "";

    const typeMatch = block.match(/class=["']([^"']*typeflag[^"']*)["']/i);
    const type = typeMatch
      ? typeMatch[1].trim().split(/\s+/).pop() || "Manga"
      : "Manga";

    const is_colored = /warnalabel/i.test(block);
    const is_hot = /class=["'][^"']*\bhot\b[^"']*["']/i.test(block);

    const lschMatch = block.match(
      /<div[^>]*class=["'][^"']*lsch[^"']*["'][^>]*>[\s\S]*?<a\s+([^>]*)>([\s\S]*?)<\/a>/i
    );
    const chapter_url = lschMatch ? getAttr(`<a ${lschMatch[1]}>`, "href") : "";
    const latest_chapter = lschMatch ? cleanText(lschMatch[2]) : "Terbaru";

    const dateMatch = block.match(
      /<span[^>]*class=["'][^"']*datech[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
    );
    const update_time = dateMatch ? cleanText(dateMatch[1]) : "Baru";

    if (title && href) {
      comics.push({
        title,
        type,
        is_colored,
        is_hot,
        latest_chapter,
        update_time,
        url: href,
        chapter_url,
        image_url,
      });
    }
  }

  return comics;
}

/**
 * Mengambil daftar komik terbaru (Mengutamakan Komiku API yang cepat & bebas blokir Vercel, fallback ke KomikIndo)
 */
async function getLatestComics(page = 1) {
  // Jalur 1: Komiku API (Sangat cepat dari Vercel, mendukung page 1, 2, 3...)
  try {
    const apiPath =
      page <= 1 ? `${KOMIKU_API_BASE}/manga/` : `${KOMIKU_API_BASE}/manga/page/${page}/`;
    const html = await fetchHtmlFast(apiPath, 4500);
    const list = parseKomikuList(html);
    if (list.length > 0) return list;
  } catch {}

  // Jalur 2: Komiku Pustaka Web
  try {
    const webUrl =
      page <= 1
        ? `${KOMIKU_WEB_BASE}/pustaka/`
        : `${KOMIKU_WEB_BASE}/pustaka/page/${page}/`;
    const html = await fetchHtmlFast(webUrl, 4500);
    const list = parseKomikuList(html);
    if (list.length > 0) return list;
  } catch {}

  // Jalur 3: KomikIndo Mirror
  const path = page <= 1 ? "/komik-terbaru/" : `/komik-terbaru/page/${page}/`;
  const html = await fetchWithMirrors(path, COMIC_FALLBACK_HOSTS, 4500);
  return parseKomikIndoPosts(html);
}

/**
 * Mencari Komik di Komiku API & KomikIndo
 */
async function searchComics(query) {
  try {
    const url = `${KOMIKU_API_BASE}/?post_type=manga&s=${encodeURIComponent(query)}`;
    const html = await fetchHtmlFast(url, 4500);
    const list = parseKomikuList(html);
    if (list.length > 0) return list;
  } catch {}

  try {
    const html = await fetchWithMirrors(
      `/?s=${encodeURIComponent(query)}`,
      COMIC_FALLBACK_HOSTS,
      4500
    );
    return parseKomikIndoPosts(html);
  } catch {
    return [];
  }
}

/**
 * Mengambil Detail Komik & Seluruh Daftar Chapter (Mendukung URL Komiku maupun KomikIndo)
 */
async function getComicDetails(comicUrl) {
  const isKomiku = /komiku\.id/i.test(comicUrl);

  if (isKomiku) {
    const html = await fetchHtmlFast(comicUrl, 5500);

    const titleMatch =
      html.match(/<h1[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i) ||
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch
      ? cleanText(titleMatch[1]).replace(/^Komik\s+/i, "").trim()
      : "Detail Komik";

    const imgMatch = html.match(
      /<div[^>]*class=["'][^"']*ims[^"']*["'][^>]*>[\s\S]*?<img\s+([^>]*)>/i
    );
    const image_url = imgMatch
      ? getAttr(`<img ${imgMatch[1]}>`, "src").replace(/\?resize=.*$/, "")
      : "";

    const typeMatch = html.match(
      /<td[^>]*>\s*Jenis Komik\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i
    );
    const type = typeMatch ? cleanText(typeMatch[1]) : "Manhwa";

    const authorMatch = html.match(
      /<td[^>]*>\s*Pengarang\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i
    );
    const author = authorMatch ? cleanText(authorMatch[1]) : "Kreator";

    const statusMatch = html.match(
      /<td[^>]*>\s*Status\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i
    );
    const status = statusMatch ? cleanText(statusMatch[1]) : "Ongoing";

    const synMatch = html.match(
      /<p[^>]*class=["'][^"']*desc[^"']*["'][^>]*>([\s\S]*?)<\/p>/i
    );
    const synopsis = synMatch ? cleanText(synMatch[1]) : "";

    const genres = [];
    for (const gm of html.matchAll(
      /<li[^>]*class=["'][^"']*genre[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi
    )) {
      const g = cleanText(gm[1]);
      if (g && !genres.includes(g)) genres.push(g);
    }

    const chapters = [];
    for (const trMatch of html.matchAll(
      /<tr[^>]*>[\s\S]*?<td[^>]*class=["'][^"']*judulseries[^"']*["'][^>]*>[\s\S]*?<a\s+([^>]*)>([\s\S]*?)<\/a>[\s\S]*?<\/tr>/gi
    )) {
      const rawHref = getAttr(`<a ${trMatch[1]}>`, "href");
      const chUrl = ensureAbsoluteUrl(rawHref, KOMIKU_WEB_BASE);
      const chTitle = cleanText(trMatch[2]);
      const dateMatch = trMatch[0].match(
        /<td[^>]*class=["'][^"']*tanggalseries[^"']*["'][^>]*>([\s\S]*?)<\/td>/i
      );
      const chDate = dateMatch ? cleanText(dateMatch[1]) : "";

      if (chUrl && !chapters.some((c) => c.url === chUrl)) {
        chapters.push({
          title: chTitle || "Chapter",
          url: chUrl,
          update_time: chDate,
        });
      }
    }

    return {
      title,
      image_url,
      rating: "9.0",
      status,
      author,
      type,
      genres,
      synopsis,
      chapters_count: chapters.length,
      chapters,
    };
  }

  // Handler untuk URL KomikIndo
  const html = await fetchWithMirrors(comicUrl, COMIC_FALLBACK_HOSTS, 5500);

  const titleMatch = html.match(
    /<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i
  );
  const title = titleMatch
    ? cleanText(titleMatch[1]).replace(/^Komik\s+/i, "").trim()
    : "Detail Komik";

  const thumbMatch = html.match(
    /<div[^>]*class=["'][^"']*thumb[^"']*["'][^>]*>[\s\S]*?<img\s+([^>]*)>/i
  );
  const image_url = thumbMatch
    ? getAttr(`<img ${thumbMatch[1]}>`, "src") ||
      getAttr(`<img ${thumbMatch[1]}>`, "data-src")
    : "";

  const ratingMatch = html.match(
    /class=["'][^"']*archiveanime-rating[^"']*["'][\s\S]*?<i[^>]*>([\s\S]*?)<\/i>/i
  );
  const rating = ratingMatch ? cleanText(ratingMatch[1]) : "N/A";

  const statusMatch = html.match(
    /<span>\s*<b>\s*Status\s*[:<][\s\S]*?<\/span>/i
  );
  const status = statusMatch
    ? cleanText(statusMatch[0]).replace(/^Status\s*:\s*/i, "").trim()
    : "Ongoing";

  const authorMatch = html.match(
    /<span>\s*<b>\s*Pengarang\s*[:<][\s\S]*?<\/span>/i
  );
  const author = authorMatch
    ? cleanText(authorMatch[0]).replace(/^Pengarang\s*:\s*/i, "").trim()
    : "N/A";

  const typeMatch = html.match(
    /<span>\s*<b>\s*Jenis Komik\s*[:<][\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i
  );
  const type = typeMatch ? cleanText(typeMatch[1]) : "Manga";

  const synMatch =
    html.match(
      /class=["'][^"']*komik_info-description-sinopsis[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    ) ||
    html.match(
      /class=["'][^"']*entry-content-single[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );
  const synopsis = synMatch ? cleanText(synMatch[1]) : "";

  const genres = [];
  const genreSection = html.match(
    /<div[^>]*class=["'][^"']*genre-info[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (genreSection) {
    for (const gm of genreSection[1].matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)) {
      const gName = cleanText(gm[1]);
      if (gName && !genres.includes(gName)) genres.push(gName);
    }
  }

  const chapters = [];
  for (const liMatch of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const li = liMatch[1];
    const aMatch = li.match(/<a\s+([^>]*)>([\s\S]*?)<\/a>/i);
    if (!aMatch) continue;
    const chUrl = getAttr(`<a ${aMatch[1]}>`, "href");
    if (!chUrl || !/chapter/i.test(chUrl)) continue;

    const lchxMatch = li.match(
      /class=["'][^"']*(?:lchx|chapternum)[^"']*["'][^>]*>([\s\S]*?)<\//i
    );
    const chTitle = lchxMatch ? cleanText(lchxMatch[1]) : cleanText(aMatch[2]);

    const dtMatch = li.match(
      /class=["'][^"']*(?:dt|date)[^"']*["'][^>]*>([\s\S]*?)<\//i
    );
    const chDate = dtMatch ? cleanText(dtMatch[1]) : "";

    if (!chapters.some((c) => c.url === chUrl)) {
      chapters.push({
        title: chTitle || "Chapter",
        url: chUrl,
        update_time: chDate,
      });
    }
  }

  return {
    title,
    image_url,
    rating,
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
 * Mengambil seluruh gambar lembaran chapter (Mendukung Komiku & KomikIndo)
 */
async function getChapterImages(chapterUrl) {
  const isKomiku = /komiku\.id/i.test(chapterUrl);
  const html = isKomiku
    ? await fetchHtmlFast(chapterUrl, 5500)
    : await fetchWithMirrors(chapterUrl, COMIC_FALLBACK_HOSTS, 5500);

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : "Baca Chapter";

  const readerBlock =
    html.match(/<div[^>]*id=["']Baca_Komik["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div[^>]*id=["']chimg-auh["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(
      /<div[^>]*class=["'][^"']*reader-area[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    );

  const imgTargetHtml = readerBlock ? readerBlock[1] : html;
  const images = [];

  for (const imgMatch of imgTargetHtml.matchAll(/<img\s+([^>]*)>/gi)) {
    const tag = `<img ${imgMatch[1]}>`;
    const src =
      getAttr(tag, "src") ||
      getAttr(tag, "data-src") ||
      getAttr(tag, "data-lazy-src");
    const alt = getAttr(tag, "alt") || `Halaman ${images.length + 1}`;

    if (
      src &&
      /^https?:\/\//i.test(src) &&
      !/logo|avatar|icon|banner-ads|gravatar/i.test(src) &&
      !images.some((img) => img.url === src)
    ) {
      images.push({
        page: images.length + 1,
        url: src,
        alt,
      });
    }
  }

  let nextChapter = null;
  let prevChapter = null;

  if (isKomiku) {
    const nextMatch = html.match(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*title=["'][^"']*Chapter Selanjutnya[^"']*["']/i
    );
    const prevMatch = html.match(
      /<a\s+[^>]*href=["']([^"']+)["'][^>]*title=["'][^"']*Chapter Sebelumnya[^"']*["']/i
    );
    if (nextMatch)
      nextChapter = ensureAbsoluteUrl(nextMatch[1], KOMIKU_WEB_BASE);
    if (prevMatch)
      prevChapter = ensureAbsoluteUrl(prevMatch[1], KOMIKU_WEB_BASE);
  } else {
    const nextMatch =
      html.match(/<a\s+[^>]*rel=["']next["'][^>]*>/i) ||
      html.match(/<a\s+[^>]*class=["'][^"']*next[^"']*["'][^>]*>/i);
    const prevMatch =
      html.match(/<a\s+[^>]*rel=["']prev["'][^>]*>/i) ||
      html.match(/<a\s+[^>]*class=["'][^"']*prev[^"']*["'][^>]*>/i);
    if (nextMatch) nextChapter = getAttr(nextMatch[0], "href") || null;
    if (prevMatch) prevChapter = getAttr(prevMatch[0], "href") || null;
  }

  return {
    title,
    total_pages: images.length,
    navigation: {
      prev: prevChapter && prevChapter.startsWith("http") ? prevChapter : null,
      next: nextChapter && nextChapter.startsWith("http") ? nextChapter : null,
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
    const html = await fetchWithMirrors("/jadwal-rilis/", ANIME_HOSTS, 4500);
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
    const [page1, page2] = await Promise.all([
      getLatestComics(1).catch(() => []),
      getLatestComics(2).catch(() => []),
    ]);
    const allComics = [...page1, ...page2];

    allComics.forEach((comic, idx) => {
      const d = daysOrder[idx % 7];
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
    // 1. Chapter Images Reader (Mendukung URL chapter KomikIndo & Komiku)
    if (
      query.includes("chapter-") ||
      query.includes("/chapter/") ||
      (query.includes("komiku.id/") &&
        !query.includes("/manga/") &&
        !query.includes("/pustaka/"))
    ) {
      const data = await getChapterImages(query);
      return {
        status: true,
        creator: "Kyno",
        type: "chapter_reader",
        data,
      };
    }

    // 2. Comic Details (Mendukung /komik/ dan /manga/)
    if (query.includes("/komik/") || query.includes("/manga/")) {
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
    if (query.toLowerCase() === "schedule" || query.toLowerCase() === "jadwal") {
      const schedule = await getDualSchedule();
      return {
        status: true,
        creator: "Kyno",
        type: "schedule",
        data: schedule,
      };
    }

    // 5. Search Anime & Komik
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