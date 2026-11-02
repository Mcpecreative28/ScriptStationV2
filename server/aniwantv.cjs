/**
 * Scraper: AniWanTV Mobile - In-App Anime Streaming & Manga Reader Scraper
 * Target: https://otakudesu.fit & https://komikindo.ch
 * Zero-Dependency Native Fetch + HTML Parser (Fallback otomatis jika axios/cheerio tidak terinstall di Vercel)
 */

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
};

const ANIME_BASE = "https://otakudesu.fit";
const COMIC_BASE = "https://komikindo.ch";

async function fetchHtml(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat mengakses ${url}`);
  }
  return await res.text();
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

/**
 * 1. Mengambil daftar anime ongoing / rilis terbaru dari feed AniWanTV (otakudesu.fit)
 */
async function getLatestAnime() {
  const html = await fetchHtml(ANIME_BASE);
  const anime = [];

  const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
  for (const block of articles) {
    const h2Match = block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const title = h2Match ? cleanText(h2Match[1]) : "";

    const firstLinkMatch = block.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
    const url = firstLinkMatch ? firstLinkMatch[1].trim() : "";

    const imgMatch = block.match(/<img\s+[^>]*>/i);
    const thumb = imgMatch
      ? getAttr(imgMatch[0], "src") ||
        getAttr(imgMatch[0], "data-src") ||
        getAttr(imgMatch[0], "data-lazy-src")
      : "";

    const epMatch =
      block.match(/class=["'][^"']*(?:epz|\bep\b)[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
      block.match(/Episode\s+\d+/i);
    const episode = epMatch
      ? cleanText(epMatch[1] || epMatch[0])
      : "Ongoing";

    const timeMatch =
      block.match(/<time[^>]*>([\s\S]*?)<\/time>/i) ||
      block.match(/class=["'][^"']*time[^"']*["'][^>]*>([\s\S]*?)<\//i);
    const releaseTime = timeMatch ? cleanText(timeMatch[1]) : null;

    if (title && url) {
      anime.push({
        title,
        episode,
        releaseTime,
        url,
        thumb,
      });
    }
  }

  return anime;
}

/**
 * Mencari anime di OtakuDesu (Tambahan agar pencarian bisa mencari Anime Sub Indo & Komik sekaligus)
 */
async function searchAnimeIndo(query) {
  try {
    const url = `${ANIME_BASE}/?s=${encodeURIComponent(query)}&post_type=anime`;
    const html = await fetchHtml(url);
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
    return results;
  } catch {
    return [];
  }
}

/**
 * 2. Mengambil detail episode anime, iframe streaming video player, dan link download
 */
async function getAnimeEpisode(url) {
  const html = await fetchHtml(url);

  const h1Match =
    html.match(/<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? cleanText(h1Match[1]) : "Episode Anime";

  const thumbMatch =
    html.match(/class=["'][^"']*(?:fotoanime|thumb)[^"']*["'][\s\S]*?<img\s+[^>]*>/i) ||
    html.match(/<img[^>]*class=["'][^"']*wp-post-image[^"']*["'][^>]*>/i);
  const thumb = thumbMatch
    ? getAttr(thumbMatch[0], "src") || getAttr(thumbMatch[0], "data-src")
    : null;

  const synMatch =
    html.match(/class=["'][^"']*sinopc[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/class=["'][^"']*entry-content[^"']*["'][^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
  const synopsis = synMatch ? cleanText(synMatch[1]) : null;

  const iframeMatch = html.match(/<iframe\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
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
        server: text || "Mirror Download",
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

  return {
    title,
    thumb,
    synopsis,
    streamIframe,
    downloads,
    episodes,
  };
}

/**
 * Helper pemecah blok .animepost pada KomikIndo
 */
function parseComicPosts(html) {
  const comics = [];
  const blocks = html.split(/<div[^>]*class=["'][^"']*animepost[^"']*["'][^>]*>/i).slice(1);

  for (const rawBlock of blocks) {
    const block = rawBlock.split(/<\/article>|<div[^>]*class=["'][^"']*pagination/i)[0] || rawBlock;

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

    const imgMatch =
      block.match(/<img\s+[^>]*itemprop=["']image["'][^>]*>/i) ||
      block.match(/<img\s+[^>]*>/i);
    const image_url = imgMatch
      ? getAttr(imgMatch[0], "src") ||
        getAttr(imgMatch[0], "data-src") ||
        getAttr(imgMatch[0], "data-lazy-src")
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
 * 3. Mengambil daftar komik terbaru dari feed AniWanTV (komikindo.ch)
 */
async function getLatestComics(page = 1) {
  const url =
    page === 1
      ? `${COMIC_BASE}/komik-terbaru/`
      : `${COMIC_BASE}/komik-terbaru/page/${page}/`;
  const html = await fetchHtml(url);
  return parseComicPosts(html);
}

/**
 * 4. Mengambil detail komik dan seluruh daftar chapter
 */
async function getComicDetails(comicUrl) {
  const html = await fetchHtml(comicUrl);

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

  const statusMatch = html.match(/<span>\s*<b>\s*Status\s*[:<][\s\S]*?<\/span>/i);
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
  const chListSection =
    html.match(/<div[^>]*id=["']chapter_list["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div[^>]*class=["'][^"']*eps_lst[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  const targetChHtml = chListSection ? chListSection[1] : html;
  for (const liMatch of targetChHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
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
 * 5. Mengambil semua gambar lembaran komik dari satu chapter (Manga Reader)
 */
async function getChapterImages(chapterUrl) {
  const html = await fetchHtml(chapterUrl);

  const titleMatch =
    html.match(
      /<h1[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i
    ) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : "Chapter Reader";

  const readerBlock =
    html.match(/<div[^>]*id=["']chimg-auh["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div[^>]*class=["'][^"']*reader-area[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

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
      !/logo|avatar|icon|banner-ads/i.test(src) &&
      !images.some((img) => img.url === src)
    ) {
      images.push({
        page: images.length + 1,
        url: src,
        alt,
      });
    }
  }

  const nextMatch =
    html.match(/<a\s+[^>]*rel=["']next["'][^>]*>/i) ||
    html.match(/<a\s+[^>]*class=["'][^"']*next[^"']*["'][^>]*>/i);
  const prevMatch =
    html.match(/<a\s+[^>]*rel=["']prev["'][^>]*>/i) ||
    html.match(/<a\s+[^>]*class=["'][^"']*prev[^"']*["'][^>]*>/i);

  const nextChapter = nextMatch ? getAttr(nextMatch[0], "href") || null : null;
  const prevChapter = prevMatch ? getAttr(prevMatch[0], "href") || null : null;

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

/**
 * 6. Mencari komik di KomikIndo
 */
async function searchComics(query) {
  const url = `${COMIC_BASE}/?s=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  return parseComicPosts(html);
}

/**
 * Router utama fungsi scraper (1:1 Kompatibel penuh dengan snippet asli)
 */
async function scrapeAniWanTV(input = "", page = 1) {
  const query = String(input || "").trim();

  try {
    // 1. Chapter Images reader
    if (query.includes("chapter-") || query.includes("/chapter/")) {
      const data = await getChapterImages(query);
      return {
        status: true,
        creator: "Vamz Spectre",
        type: "chapter_reader",
        data,
      };
    }

    // 2. Comic Details
    if (query.includes("komikindo") && query.includes("/komik/")) {
      const data = await getComicDetails(query);
      return {
        status: true,
        creator: "Vamz Spectre",
        type: "comic_details",
        data,
      };
    }

    // 3. Anime Episode Stream & Download (OtakuDesu)
    if (query.includes("otakudesu") || query.includes("-episode-")) {
      const data = await getAnimeEpisode(query);
      return {
        status: true,
        creator: "Vamz Spectre",
        type: "anime_episode_stream",
        data,
      };
    }

    // 4. Search Anime & Komik
    if (
      query.startsWith("search:") ||
      (query.length > 0 &&
        !["anime", "komik", "all"].includes(query.toLowerCase()))
    ) {
      const q = query.replace(/^search:\s*/i, "");
      const [comics, animeIndo] = await Promise.all([
        searchComics(q).catch(() => []),
        searchAnimeIndo(q).catch(() => []),
      ]);
      return {
        status: true,
        creator: "Vamz Spectre",
        type: "search_results",
        query: q,
        total: comics.length + animeIndo.length,
        data: {
          comics,
          anime: animeIndo,
        },
      };
    }

    // 5. Anime Only (OtakuDesu Sub Indo Feed)
    if (query.toLowerCase() === "anime") {
      const anime = await getLatestAnime();
      return {
        status: true,
        creator: "Vamz Spectre",
        type: "anime_feed",
        total: anime.length,
        data: anime,
      };
    }

    // 6. Komik Only
    if (query.toLowerCase() === "komik") {
      const comics = await getLatestComics(Number(page) || 1);
      return {
        status: true,
        creator: "Vamz Spectre",
        type: "comic_feed",
        page: Number(page) || 1,
        total: comics.length,
        data: comics,
      };
    }

    // 7. Default Dashboard Feed (Anime + Komik)
    const [anime, comics] = await Promise.all([
      getLatestAnime().catch(() => []),
      getLatestComics(1).catch(() => []),
    ]);

    return {
      status: true,
      creator: "Vamz Spectre",
      type: "in_app_dashboard",
      data: {
        ongoing_anime: anime.slice(0, 12),
        latest_comics: comics.slice(0, 12),
      },
    };
  } catch (error) {
    return {
      status: false,
      creator: "Vamz Spectre",
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data dari AniWanTV APK content provider",
    };
  }
}

module.exports = scrapeAniWanTV;
module.exports.scrapeAniWanTV = scrapeAniWanTV;
module.exports.getLatestAnime = getLatestAnime;
module.exports.getAnimeEpisode = getAnimeEpisode;
module.exports.getLatestComics = getLatestComics;
module.exports.getComicDetails = getComicDetails;
module.exports.getChapterImages = getChapterImages;
module.exports.searchComics = searchComics;