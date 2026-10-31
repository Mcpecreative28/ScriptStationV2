const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const BASE_URL = "https://anikai.org";
const IMAGE_BASE_URL = "https://img.anikai.org";
const CACHE_FILE_PATH = path.join("/tmp", "anikai_catalog_cache.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam TTL

let memoryCatalogCache = null;
let memoryCacheTimestamp = 0;
const externalIdCache = new Map();

function request(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const req = client.request(
        parsed,
        {
          method: options.method || "GET",
          family: 4,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
            Referer: BASE_URL + "/",
            ...options.headers,
          },
          timeout: options.timeout || 10000,
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const redirectUrl = new URL(res.headers.location, urlStr).toString();
            return resolve(request(redirectUrl, options));
          }

          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const body = Buffer.concat(chunks).toString("utf-8");
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body,
              json: () => JSON.parse(body),
            });
          });
        }
      );

      req.on("error", (err) =>
        reject(new Error(`AnimeKai Request Error: ${err.message}`))
      );
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("AnimeKai Request Timeout"));
      });

      if (options.body) req.write(options.body);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function cleanAttrValue(val) {
  if (!val) return "";
  return String(val)
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
}

function extractHtmlAttr(html, attrName) {
  if (!html) return "";
  const regex = new RegExp(
    `${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`,
    "i"
  );
  const match = html.match(regex);
  if (!match) return "";
  return cleanAttrValue(match[1] ?? match[2] ?? match[3] ?? "");
}

function extractAllHtmlAttrs(html, attrName) {
  if (!html) return [];
  const regex = new RegExp(
    `${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>"']+))`,
    "gi"
  );
  const results = [];
  for (const match of html.matchAll(regex)) {
    const val = cleanAttrValue(match[1] ?? match[2] ?? match[3] ?? "");
    if (val && !results.includes(val)) {
      results.push(val);
    }
  }
  return results;
}

function stripTrailingNumericId(slug, id) {
  const s = String(slug || "").replace(/^\/watch\/|\/$/g, "");
  if (id && s.endsWith(`-${id}`)) {
    return s.slice(0, -String(`-${id}`).length);
  }
  return s.replace(/-\d{3,}$/, "");
}

function buildImages(slug, id) {
  const cleanSlug = String(slug || "").replace(/^\/watch\/|\/$/g, "");
  const fileKey =
    id && !cleanSlug.endsWith(`-${id}`) ? `${cleanSlug}-${id}` : cleanSlug;
  return {
    poster: `${IMAGE_BASE_URL}/poster/w_360/h_480/${fileKey}.webp`,
    poster_sm: `${IMAGE_BASE_URL}/poster-sm/w_200/h_267/${fileKey}.webp`,
    thumb: `${IMAGE_BASE_URL}/thumb/w_128/h_176/${fileKey}.webp`,
    banner: `${IMAGE_BASE_URL}/banner/w_1900/h_400/${fileKey}.webp`,
  };
}

function formatAnimeItem(item) {
  const slug = item.s || "";
  const id = item.i || null;
  const imgs = buildImages(slug, id);

  return {
    id: id,
    slug: slug,
    title: item.n || item.j || slug,
    title_english: item.n || null,
    title_romaji: item.j || null,
    title_kanji: item.na || null,
    format: item.f || "TV",
    status: item.st || "Released",
    genres: Array.isArray(item.g) ? item.g : [],
    year: item.y || null,
    rating: item.r || null,
    score: typeof item.sc === "number" ? item.sc : null,
    episodes_total: typeof item.tt === "number" ? item.tt : null,
    release_date: item.rd || null,
    latest_episode_date: item.le || null,
    updated_at: item.u || null,
    poster: imgs.poster,
    poster_sm: imgs.poster_sm,
    banner: imgs.banner,
    image: imgs.poster,
    images: imgs,
    watch_url: `${BASE_URL}/watch/${slug}/`,
  };
}

async function getCatalog(forceRefresh = false) {
  const now = Date.now();

  if (
    !forceRefresh &&
    memoryCatalogCache &&
    now - memoryCacheTimestamp < CACHE_TTL_MS
  ) {
    return memoryCatalogCache;
  }

  if (!forceRefresh && fs.existsSync(CACHE_FILE_PATH)) {
    try {
      const stats = fs.statSync(CACHE_FILE_PATH);
      if (now - stats.mtimeMs < CACHE_TTL_MS) {
        const raw = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
        memoryCatalogCache = JSON.parse(raw);
        memoryCacheTimestamp = now;
        return memoryCatalogCache;
      }
    } catch {}
  }

  const res = await request(`${BASE_URL}/catalog-index.json`);
  if (res.status !== 200) {
    throw new Error(`Gagal memuat catalog-index (HTTP ${res.status})`);
  }

  const catalog = res.json();
  memoryCatalogCache = catalog;
  memoryCacheTimestamp = now;

  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(catalog), "utf-8");
  } catch {}

  return catalog;
}

/**
 * Resolusi AniList ID & MyAnimeList ID agar server mirror (VidSrc / VidLink)
 * dapat memutar episode secara akurat.
 */
async function resolveExternalIds(titleEn, titleRomaji, year) {
  const searchTitle = String(titleRomaji || titleEn || "").trim();
  if (!searchTitle) return { anilistId: null, malId: null };

  const cacheKey = `${searchTitle.toLowerCase()}:${year || ""}`;
  if (externalIdCache.has(cacheKey)) {
    return externalIdCache.get(cacheKey);
  }

  try {
    const query = `
      query ($search: String) {
        Media (search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          idMal
        }
      }
    `;

    const body = JSON.stringify({
      query,
      variables: { search: searchTitle },
    });

    const res = await request("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      timeout: 3500,
    });

    if (res.status === 200) {
      const parsed = res.json();
      const media = parsed?.data?.Media;
      if (media && (media.id || media.idMal)) {
        const result = {
          anilistId: media.id || null,
          malId: media.idMal || null,
        };
        externalIdCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {}

  return { anilistId: null, malId: null };
}

async function searchAnime(query = "", options = {}) {
  const catalog = await getCatalog();
  const q = String(query || "").trim().toLowerCase();
  const limit = Math.max(1, parseInt(options.limit || 24, 10));
  const page = Math.max(1, parseInt(options.page || 1, 10));
  const genreFilter = options.genre
    ? String(options.genre).trim().toLowerCase()
    : null;
  const formatFilter = options.format
    ? String(options.format).trim().toLowerCase()
    : null;
  const statusFilter = options.status
    ? String(options.status).trim().toLowerCase()
    : null;
  const yearFilter = options.year ? parseInt(options.year, 10) : null;
  const sortMode = options.sort
    ? String(options.sort).trim().toLowerCase()
    : "popular";

  const matches = [];

  for (const item of catalog) {
    if (q) {
      const titleEn = (item.n || "").toLowerCase();
      const titleJp = (item.j || "").toLowerCase();
      const titleKanji = (item.na || "").toLowerCase();
      const slug = (item.s || "").toLowerCase();

      const isMatch =
        titleEn.includes(q) ||
        titleJp.includes(q) ||
        titleKanji.includes(q) ||
        slug.includes(q);
      if (!isMatch) continue;
    }

    if (
      genreFilter &&
      (!item.g || !item.g.some((g) => String(g).toLowerCase() === genreFilter))
    ) {
      continue;
    }
    if (formatFilter && (item.f || "").toLowerCase() !== formatFilter) {
      continue;
    }
    if (statusFilter && (item.st || "").toLowerCase() !== statusFilter) {
      continue;
    }
    if (yearFilter && !Number.isNaN(yearFilter) && item.y !== yearFilter) {
      continue;
    }

    matches.push(item);
  }

  if (sortMode === "latest") {
    matches.sort((a, b) => {
      const dateA = a.le || a.u || a.ca || "";
      const dateB = b.le || b.u || b.ca || "";
      return String(dateB).localeCompare(String(dateA));
    });
  } else if (sortMode === "year") {
    matches.sort((a, b) => (b.y || 0) - (a.y || 0));
  } else if (sortMode === "az") {
    matches.sort((a, b) =>
      String(a.n || a.j || "").localeCompare(String(b.n || b.j || ""))
    );
  } else {
    matches.sort((a, b) => (b.sc || 0) - (a.sc || 0));
  }

  const totalResults = matches.length;
  const totalPages = Math.ceil(totalResults / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = matches.slice(startIndex, startIndex + limit);

  return {
    status: true,
    creator: "Kyno",
    query: q,
    page: page,
    limit: limit,
    total_results: totalResults,
    total_pages: totalPages,
    has_more: page < totalPages,
    results: paginated.map(formatAnimeItem),
  };
}

async function getLatest(options = {}) {
  return searchAnime("", { ...options, sort: "latest" });
}

async function getPopular(options = {}) {
  return searchAnime("", { ...options, sort: "popular" });
}

async function getEpisodes(animeId) {
  if (!animeId) {
    throw new Error("Parameter animeId wajib diisi");
  }

  const res = await request(`${BASE_URL}/episodes/${animeId}.json`);
  if (res.status !== 200) {
    throw new Error(
      `Daftar episode tidak ditemukan untuk ID ${animeId} (HTTP ${res.status})`
    );
  }

  const rawEpisodes = res.json();
  const episodes = (Array.isArray(rawEpisodes) ? rawEpisodes : []).map((ep) => ({
    episode: Number(ep[0]),
    title: ep[1] || `Episode ${ep[0]}`,
    release_date: ep[2] || null,
    is_filler: Boolean(ep[3]),
    is_recap: Boolean(ep[4]),
  }));

  return {
    status: true,
    creator: "Kyno",
    anime_id: parseInt(animeId, 10),
    total_episodes: episodes.length,
    episodes: episodes,
  };
}

function findEntryInCatalog(catalog, slugOrId) {
  const raw = String(slugOrId || "").trim().replace(/^\/watch\/|\/$/g, "");
  const numericId = parseInt(raw, 10);

  if (!Number.isNaN(numericId) && String(numericId) === raw) {
    return catalog.find((item) => item.i === numericId) || null;
  }

  const lower = raw.toLowerCase();
  let found = catalog.find(
    (item) =>
      String(item.s || "").toLowerCase() === lower ||
      `${String(item.s || "").toLowerCase()}-${item.i}` === lower
  );

  if (!found) {
    const trailingIdMatch = lower.match(/-(\d+)$/);
    if (trailingIdMatch) {
      const extractedId = parseInt(trailingIdMatch[1], 10);
      found = catalog.find((item) => item.i === extractedId);
    }
  }

  return found || null;
}

async function getDetail(slugOrId) {
  if (!slugOrId) {
    throw new Error("Parameter slug atau animeId wajib diisi");
  }

  const catalog = await getCatalog();
  const animeEntry = findEntryInCatalog(catalog, slugOrId);

  const candidateSlugs = [];
  if (animeEntry && animeEntry.s) {
    candidateSlugs.push(animeEntry.s);
    if (animeEntry.i && !animeEntry.s.endsWith(`-${animeEntry.i}`)) {
      candidateSlugs.push(`${animeEntry.s}-${animeEntry.i}`);
    }
  }
  const cleanInputSlug = String(slugOrId)
    .trim()
    .replace(/^\/watch\/|\/$/g, "");
  if (!candidateSlugs.includes(cleanInputSlug)) {
    candidateSlugs.push(cleanInputSlug);
  }

  let watchPageRes = null;
  let activeSlug = candidateSlugs[0];

  for (const s of candidateSlugs) {
    try {
      const res = await request(`${BASE_URL}/watch/${s}/`);
      if (res.status === 200 && res.body) {
        watchPageRes = res;
        activeSlug = s;
        break;
      }
    } catch {}
  }

  const html = watchPageRes ? watchPageRes.body : "";

  const dataId = extractHtmlAttr(html, "data-id");
  let dataSeal = extractHtmlAttr(html, "data-seal");
  const dataPlayer = (
    extractHtmlAttr(html, "data-player") || "https://play.anikai.org"
  ).replace(/\/+$/, "");
  const dataServerDefault =
    extractHtmlAttr(html, "data-server-default") || "2";

  // Tangkap URL iframe langsung jika ada di dalam HTML watch page
  const directIframeMatch = html.match(
    /<iframe[^>]+src=["']?(https?:\/\/[^"'\s>]*play\.anikai\.org[^"'\s>]*)["'\s>]/i
  );
  const directIframeUrl = directIframeMatch ? directIframeMatch[1] : "";

  if (!dataSeal && directIframeUrl) {
    const hashMatch = directIframeUrl.match(/#([^.]+)\./);
    if (hashMatch) dataSeal = hashMatch[1];
  }

  if (!dataSeal && html) {
    const scriptSealMatch =
      html.match(/data-seal=([^\s>"']+)/i) ||
      html.match(/["']?seal["']?\s*:\s*["']([^"']+)["']/i) ||
      html.match(/watch#([a-zA-Z0-9+/=_-]+)\.\d+\./i);
    if (scriptSealMatch) {
      dataSeal = cleanAttrValue(scriptSealMatch[1]);
    }
  }

  const availableServers = extractAllHtmlAttrs(html, "data-server");
  const availableAudios = extractAllHtmlAttrs(html, "data-audio");

  const synopsisMatch = html.match(
    /<p[^>]*id=["']?synopsis-text["']?[^>]*>([\s\S]*?)<\/p>/i
  );
  const synopsis = synopsisMatch
    ? synopsisMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .trim()
    : null;

  const id =
    animeEntry && animeEntry.i
      ? animeEntry.i
      : dataId
        ? parseInt(dataId, 10)
        : null;

  let episodesData = [];
  if (id) {
    try {
      const epRes = await getEpisodes(id);
      episodesData = epRes.episodes;
    } catch {}
  }

  const totalExpected =
    animeEntry && typeof animeEntry.tt === "number" && animeEntry.tt > 0
      ? animeEntry.tt
      : 12;

  if (episodesData.length === 0) {
    episodesData = Array.from({ length: totalExpected }, (_, i) => ({
      episode: i + 1,
      title: `Episode ${i + 1}`,
      release_date: null,
      is_filler: false,
      is_recap: false,
    }));
  }

  const canonicalSlug = animeEntry ? animeEntry.s : activeSlug;
  const imgs = buildImages(canonicalSlug, id || 0);
  const baseFormatted = animeEntry
    ? formatAnimeItem(animeEntry)
    : {
        id: id,
        slug: canonicalSlug,
        title:
          (html.match(/<title>([^<]+)<\/title>/i) || [])[1]
            ?.replace(/\s*\|\s*AnimeKai.*$/i, "")
            .trim() || canonicalSlug,
        format: "TV",
        status: "Released",
        genres: [],
        poster: imgs.poster,
        poster_sm: imgs.poster_sm,
        banner: imgs.banner,
        image: imgs.poster,
        images: imgs,
        watch_url: `${BASE_URL}/watch/${canonicalSlug}/`,
      };

  let recommendations = [];
  if (Array.isArray(baseFormatted.genres) && baseFormatted.genres.length > 0) {
    const primaryGenre = baseFormatted.genres[0].toLowerCase();
    recommendations = catalog
      .filter(
        (item) =>
          item.s !== canonicalSlug &&
          Array.isArray(item.g) &&
          item.g.some((g) => String(g).toLowerCase() === primaryGenre)
      )
      .sort((a, b) => (b.sc || 0) - (a.sc || 0))
      .slice(0, 8)
      .map(formatAnimeItem);
  }

  return {
    status: true,
    creator: "Kyno",
    data: {
      ...baseFormatted,
      poster: baseFormatted.poster || imgs.poster,
      image: baseFormatted.image || imgs.poster,
      banner: baseFormatted.banner || imgs.banner,
      synopsis: synopsis,
      player: {
        player_host: dataPlayer,
        seal: dataSeal || null,
        direct_iframe: directIframeUrl || null,
        server_default: dataServerDefault,
        available_servers:
          availableServers.length > 0 ? availableServers : ["1", "2", "3"],
        available_audios:
          availableAudios.length > 0 ? availableAudios : ["sub", "dub"],
      },
      episodes: episodesData,
      recommendations,
    },
  };
}

/**
 * Multi-Engine Stream Resolver:
 * Mendukung Server AnimeKai (1, 2, 3) + VidSrc Pro (AniList ID) + VidLink (MAL ID) + 2Embed
 */
async function getStream(
  slugOrId,
  episodeNumber = 1,
  server = null,
  audio = "sub"
) {
  if (!slugOrId) {
    throw new Error("Parameter slug atau animeId wajib diisi");
  }

  const ep = Math.max(1, parseInt(episodeNumber || 1, 10));
  const detailRes = await getDetail(slugOrId);
  const anime = detailRes.data;

  const selectedAudio =
    audio && String(audio).toLowerCase() === "dub" ? "dub" : "sub";
  const playerHost = (
    anime.player?.player_host || "https://play.anikai.org"
  ).replace(/\/+$/, "");
  const seal = anime.player?.seal || "";

  // Ambil AniList ID & MAL ID untuk server mirror
  const extIds = await resolveExternalIds(
    anime.title_english || anime.title,
    anime.title_romaji,
    anime.year
  );

  const cleanSlugNoId = stripTrailingNumericId(anime.slug, anime.id);

  // Tentukan server aktif: jika seal kosong, otomatis gunakan mirror1 (VidSrc Pro)
  let selectedServer = cleanAttrValue(
    server ? String(server) : anime.player?.server_default || "2"
  );
  if (!seal && ["1", "2", "3"].includes(selectedServer)) {
    selectedServer = "mirror1";
  }

  let streamUrl = "";

  if (selectedServer === "mirror1") {
    if (extIds.anilistId) {
      streamUrl = `https://vidsrc.cc/v2/embed/anime/ani${extIds.anilistId}/${ep}/${selectedAudio}`;
    } else if (extIds.malId) {
      streamUrl = `https://vidsrc.cc/v2/embed/anime/${extIds.malId}/${ep}/${selectedAudio}`;
    } else {
      streamUrl = `https://www.2embed.cc/embedanime/${encodeURIComponent(cleanSlugNoId)}-episode-${ep}`;
    }
  } else if (selectedServer === "mirror2") {
    if (extIds.malId) {
      streamUrl = `https://vidlink.pro/anime/${extIds.malId}/${ep}/${selectedAudio}?fallback=true`;
    } else if (extIds.anilistId) {
      streamUrl = `https://vidsrc.icu/embed/anime/${extIds.anilistId}/${ep}/${selectedAudio === "dub" ? 1 : 0}`;
    } else {
      streamUrl = `https://www.2embed.cc/embedanime/${encodeURIComponent(cleanSlugNoId)}-episode-${ep}`;
    }
  } else if (selectedServer === "mirror3") {
    streamUrl = `https://www.2embed.cc/embedanime/${encodeURIComponent(cleanSlugNoId)}-episode-${ep}`;
  } else if (seal) {
    const srvNum = ["1", "2", "3"].includes(selectedServer)
      ? selectedServer
      : "2";
    const streamHash = `${seal}.${ep}.${srvNum}.${selectedAudio}`;
    streamUrl = `${playerHost}/watch#${streamHash}`;
  } else if (anime.player?.direct_iframe) {
    streamUrl = anime.player.direct_iframe;
  } else {
    streamUrl = `https://www.2embed.cc/embedanime/${encodeURIComponent(cleanSlugNoId)}-episode-${ep}`;
  }

  const iframeHtml = `<iframe src="${streamUrl}" title="${anime.title} Episode ${ep}" referrerpolicy="no-referrer" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen frameborder="0" width="100%" height="100%"></iframe>`;

  const episodeItem = anime.episodes?.find((e) => Number(e.episode) === ep) || {
    episode: ep,
    title: `Episode ${ep}`,
  };

  return {
    status: true,
    creator: "Kyno",
    data: {
      anime_id: anime.id,
      anilist_id: extIds.anilistId,
      mal_id: extIds.malId,
      slug: anime.slug,
      title: anime.title,
      title_romaji: anime.title_romaji,
      poster: anime.poster,
      banner: anime.banner,
      format: anime.format,
      score: anime.score,
      genres: anime.genres || [],
      synopsis: anime.synopsis,
      episode: ep,
      total_episodes: anime.episodes?.length || anime.episodes_total || 0,
      episode_info: episodeItem,
      server: selectedServer,
      audio: selectedAudio,
      stream_url: streamUrl,
      external_watch_url: anime.watch_url,
      iframe_embed: iframeHtml,
      player_options: {
        servers: [
          { id: "2", label: "Kai Fast" },
          { id: "1", label: "Kai HD" },
          { id: "3", label: "Kai Backup" },
          { id: "mirror1", label: "VidSrc Pro" },
          { id: "mirror2", label: "VidLink HD" },
          { id: "mirror3", label: "2Embed" },
        ],
        audios: ["sub", "dub"],
      },
      episodes_list: anime.episodes || [],
      recommendations: anime.recommendations || [],
    },
  };
}

module.exports = {
  searchAnime,
  getLatest,
  getPopular,
  getDetail,
  getEpisodes,
  getStream,
  getCatalog,
};