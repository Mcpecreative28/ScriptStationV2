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
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: BASE_URL + "/",
            ...options.headers,
          },
          timeout: options.timeout || 15000,
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
        reject(new Error("AnimeKai Request Timeout (15s)"));
      });

      if (options.body) req.write(options.body);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function stripQuotes(val) {
  if (!val) return "";
  return String(val).trim().replace(/^['"]+|['"]+$/g, "").trim();
}

function buildFullSlug(slug, id) {
  const clean = String(slug || "").trim().replace(/^\/watch\/|\/$/g, "");
  if (!id) return clean;
  return clean.endsWith(`-${id}`) ? clean : `${clean}-${id}`;
}

function buildImages(slug, id) {
  const fileKey = buildFullSlug(slug, id);
  return {
    poster: `${IMAGE_BASE_URL}/poster/w_360/h_480/${fileKey}.webp`,
    poster_sm: `${IMAGE_BASE_URL}/poster-sm/w_200/h_267/${fileKey}.webp`,
    thumb: `${IMAGE_BASE_URL}/thumb/w_128/h_176/${fileKey}.webp`,
    banner: `${IMAGE_BASE_URL}/banner/w_1900/h_400/${fileKey}.webp`,
  };
}

function formatAnimeItem(item) {
  const rawSlug = item.s || "";
  const id = item.i || null;
  const fullSlug = buildFullSlug(rawSlug, id);
  const imgs = buildImages(rawSlug, id);

  return {
    id: id,
    slug: fullSlug,
    raw_slug: rawSlug,
    title: item.n || item.j || fullSlug,
    title_english: item.n || null,
    title_romaji: item.j || null,
    title_kanji: item.na || null,
    format: item.f || null,
    status: item.st || null,
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
    watch_url: `${BASE_URL}/watch/${fullSlug}/`,
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

async function searchAnime(query = "", options = {}) {
  const catalog = await getCatalog();
  const q = String(query || "").trim().toLowerCase();
  const limit = Math.max(1, parseInt(options.limit || 24, 10));
  const page = Math.max(1, parseInt(options.page || 1, 10));
  const genreFilter = options.genre ? options.genre.toLowerCase() : null;
  const formatFilter = options.format ? options.format.toLowerCase() : null;
  const statusFilter = options.status ? options.status.toLowerCase() : null;
  const yearFilter = options.year ? parseInt(options.year, 10) : null;
  const sortMode = options.sort ? options.sort.toLowerCase() : "popular";

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
      (!item.g || !item.g.some((g) => g.toLowerCase() === genreFilter))
    ) {
      continue;
    }
    if (formatFilter && (item.f || "").toLowerCase() !== formatFilter) {
      continue;
    }
    if (statusFilter && (item.st || "").toLowerCase() !== statusFilter) {
      continue;
    }
    if (yearFilter && item.y !== yearFilter) {
      continue;
    }

    matches.push(item);
  }

  if (sortMode === "latest") {
    matches.sort((a, b) => {
      const dateA = a.le || a.u || a.ca || "";
      const dateB = b.le || b.u || b.ca || "";
      return dateB.localeCompare(dateA);
    });
  } else if (sortMode === "year") {
    matches.sort((a, b) => (b.y || 0) - (a.y || 0));
  } else if (sortMode === "az") {
    matches.sort((a, b) =>
      String(a.n || a.j || "").localeCompare(String(b.n || b.j || ""))
    );
  } else if (!q) {
    matches.sort((a, b) => (b.sc || 0) - (a.sc || 0));
  }

  const totalResults = matches.length;
  const startIndex = (page - 1) * limit;
  const paginated = matches.slice(startIndex, startIndex + limit);

  return {
    status: true,
    creator: "Vamz Spectre",
    query: q,
    page: page,
    limit: limit,
    total_results: totalResults,
    total_pages: Math.ceil(totalResults / limit) || 1,
    results: paginated.map(formatAnimeItem),
  };
}

async function getLatest(options = {}) {
  const catalog = await getCatalog();
  const limit = Math.max(1, parseInt(options.limit || 20, 10));
  const page = Math.max(1, parseInt(options.page || 1, 10));

  const sorted = [...catalog].sort((a, b) => {
    const dateA = a.le || a.u || a.ca || "";
    const dateB = b.le || b.u || b.ca || "";
    return dateB.localeCompare(dateA);
  });

  const totalResults = sorted.length;
  const startIndex = (page - 1) * limit;
  const paginated = sorted.slice(startIndex, startIndex + limit);

  return {
    status: true,
    creator: "Vamz Spectre",
    type: "latest",
    page: page,
    limit: limit,
    total_results: totalResults,
    results: paginated.map(formatAnimeItem),
  };
}

async function getPopular(options = {}) {
  const catalog = await getCatalog();
  const limit = Math.max(1, parseInt(options.limit || 20, 10));
  const page = Math.max(1, parseInt(options.page || 1, 10));

  const filtered = catalog.filter(
    (item) => typeof item.sc === "number" && item.sc > 0
  );
  filtered.sort((a, b) => (b.sc || 0) - (a.sc || 0));

  const totalResults = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    status: true,
    creator: "Vamz Spectre",
    type: "popular",
    page: page,
    limit: limit,
    total_results: totalResults,
    results: paginated.map(formatAnimeItem),
  };
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
    creator: "Vamz Spectre",
    anime_id: parseInt(animeId, 10),
    total_episodes: episodes.length,
    episodes: episodes,
  };
}

function findInCatalog(catalog, slugOrId) {
  const cleanInput = String(slugOrId || "")
    .trim()
    .replace(/^\/watch\/|\/$/g, "");
  const numericId = parseInt(cleanInput, 10);

  if (!isNaN(numericId) && String(numericId) === cleanInput) {
    return catalog.find((item) => item.i === numericId) || null;
  }

  const lower = cleanInput.toLowerCase();
  let match = catalog.find((item) => {
    const s = String(item.s || "").toLowerCase();
    return s === lower || `${s}-${item.i}` === lower;
  });

  if (!match) {
    const idSuffix = lower.match(/-(\d+)$/);
    if (idSuffix) {
      const targetId = parseInt(idSuffix[1], 10);
      match = catalog.find((item) => item.i === targetId) || null;
    }
  }

  return match;
}

async function getDetail(slugOrId) {
  if (!slugOrId) {
    throw new Error("Parameter slug atau animeId wajib diisi");
  }

  const catalog = await getCatalog();
  const animeEntry = findInCatalog(catalog, slugOrId);

  const cleanInput = String(slugOrId)
    .trim()
    .replace(/^\/watch\/|\/$/g, "");

  const slugCandidates = [];
  if (animeEntry) {
    const withId = buildFullSlug(animeEntry.s, animeEntry.i);
    slugCandidates.push(withId);
    if (animeEntry.s && animeEntry.s !== withId) {
      slugCandidates.push(animeEntry.s);
    }
  }
  if (!slugCandidates.includes(cleanInput)) {
    slugCandidates.push(cleanInput);
  }

  let watchPageRes = null;
  let resolvedSlug = slugCandidates[0];

  for (const candidate of slugCandidates) {
    const res = await request(`${BASE_URL}/watch/${candidate}/`);
    if (res.status === 200) {
      watchPageRes = res;
      resolvedSlug = candidate;
      break;
    }
  }

  if (!watchPageRes || watchPageRes.status !== 200) {
    throw new Error(
      `Halaman anime tidak ditemukan untuk slug "${resolvedSlug}"`
    );
  }

  const html = watchPageRes.body;

  const dataId = stripQuotes((html.match(/data-id=([^\s>]+)/) || [])[1]);
  const dataSeal = stripQuotes((html.match(/data-seal=([^\s>]+)/) || [])[1]);
  const dataPlayer =
    stripQuotes((html.match(/data-player=([^\s>]+)/) || [])[1]).replace(
      /\/+$/,
      ""
    ) || "https://play.anikai.org";
  const dataServerDefault =
    stripQuotes((html.match(/data-server-default=([^\s>]+)/) || [])[1]) || "2";

  const rawServers = [...html.matchAll(/data-server=([^\s>]+)/g)]
    .map((m) => stripQuotes(m[1]))
    .filter(Boolean);
  const availableServers = [...new Set(rawServers)];

  const rawAudios = [...html.matchAll(/data-audio=([^\s>]+)/g)]
    .map((m) => stripQuotes(m[1]))
    .filter(Boolean);
  const availableAudios = [...new Set(rawAudios)];

  const synopsisMatch = html.match(/<p id=synopsis-text[^>]*>([\s\S]*?)<\/p>/i);
  const synopsis = synopsisMatch
    ? synopsisMatch[1].replace(/<[^>]+>/g, "").trim()
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

  const imgs = buildImages(resolvedSlug, id || 0);
  const baseFormatted = animeEntry
    ? formatAnimeItem(animeEntry)
    : {
        id: id,
        slug: resolvedSlug,
        title:
          (html.match(/<title>([^<]+)<\/title>/) || [])[1]
            ?.replace(/\s*\|\s*AnimeKai.*$/, "")
            .trim() || resolvedSlug,
        poster: imgs.poster,
        poster_sm: imgs.poster_sm,
        banner: imgs.banner,
        image: imgs.poster,
        images: imgs,
        watch_url: `${BASE_URL}/watch/${resolvedSlug}/`,
      };

  let recommendations = [];
  if (Array.isArray(baseFormatted.genres) && baseFormatted.genres.length > 0) {
    const mainGenre = baseFormatted.genres[0].toLowerCase();
    recommendations = catalog
      .filter(
        (item) =>
          item.i !== id &&
          Array.isArray(item.g) &&
          item.g.some((g) => g.toLowerCase() === mainGenre)
      )
      .sort((a, b) => (b.sc || 0) - (a.sc || 0))
      .slice(0, 8)
      .map(formatAnimeItem);
  }

  return {
    status: true,
    creator: "Vamz Spectre",
    data: {
      ...baseFormatted,
      synopsis: synopsis,
      player: {
        player_host: dataPlayer,
        seal: dataSeal || null,
        server_default: dataServerDefault,
        available_servers:
          availableServers.length > 0 ? availableServers : ["2", "1", "3"],
        available_audios:
          availableAudios.length > 0 ? availableAudios : ["sub", "dub"],
      },
      episodes: episodesData,
      recommendations: recommendations,
    },
  };
}

/**
 * Resolve direct video player URL + Proxy Embed URL agar lolos X-Frame-Options
 */
async function getStream(
  slugOrId,
  episodeNumber = 1,
  server = "2",
  audio = "sub"
) {
  if (!slugOrId) {
    throw new Error("Parameter slug atau animeId wajib diisi");
  }

  const ep = parseInt(episodeNumber || 1, 10);
  const detailRes = await getDetail(slugOrId);
  const anime = detailRes.data;

  if (!anime.player || !anime.player.seal) {
    throw new Error(
      "Video player seal tidak tersedia untuk judul ini (kemungkinan masih preview)"
    );
  }

  // Default ke Server 2 karena Server 2 adalah server aktif utama di AnimeKai
  const selectedServer = stripQuotes(
    server ? String(server) : anime.player.server_default || "2"
  );
  const selectedAudio =
    audio && String(audio).toLowerCase() === "dub" ? "dub" : "sub";
  const playerHost = (
    anime.player.player_host || "https://play.anikai.org"
  ).replace(/\/+$/, "");

  const streamHash = `${anime.player.seal}.${ep}.${selectedServer}.${selectedAudio}`;
  const streamUrl = `${playerHost}/watch#${streamHash}`;
  const proxyEmbedUrl = `/api/anime/embed?hash=${encodeURIComponent(
    streamHash
  )}&host=${encodeURIComponent(playerHost)}`;

  const iframeHtml = `<iframe src="${proxyEmbedUrl}" title="${anime.title} Episode ${ep}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen frameborder="0" width="100%" height="100%"></iframe>`;

  const episodeItem =
    anime.episodes.find((e) => Number(e.episode) === ep) || null;

  return {
    status: true,
    creator: "Vamz Spectre",
    data: {
      anime_id: anime.id,
      slug: anime.slug,
      title: anime.title,
      poster: anime.poster,
      banner: anime.banner,
      format: anime.format,
      episode: ep,
      total_episodes: anime.episodes.length || anime.episodes_total || 0,
      episode_info: episodeItem,
      server: selectedServer,
      audio: selectedAudio,
      seal: anime.player.seal,
      stream_hash: streamHash,
      stream_url: streamUrl,
      proxy_embed_url: proxyEmbedUrl,
      iframe_embed: iframeHtml,
      player_options: {
        servers: anime.player.available_servers,
        audios: anime.player.available_audios,
      },
      episodes_list: anime.episodes,
    },
  };
}

/**
 * Mengambil halaman HTML dari play.anikai.org/watch dan menyuntikkan hash episode
 * sehingga bisa dimuat di dalam iframe ScriptStationV2 tanpa blokir X-Frame-Options / CSP!
 */
async function fetchPlayerEmbedHtml(streamHash, playerHost = "https://play.anikai.org") {
  const cleanHost = String(playerHost || "https://play.anikai.org").replace(
    /\/+$/,
    ""
  );
  const cleanHash = String(streamHash || "").replace(/^#+/, "").trim();

  const res = await request(`${cleanHost}/watch`, {
    headers: {
      Referer: "https://anikai.org/",
      Origin: "https://anikai.org",
    },
  });

  if (res.status !== 200 || !res.body) {
    throw new Error(`Gagal memuat player host (HTTP ${res.status})`);
  }

  let html = res.body;

  // Hapus meta CSP internal jika ada
  html = html.replace(
    /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
    ""
  );

  // Suntikkan <base href="https://play.anikai.org/"> dan set window.location.hash sebelum script player berjalan
  const injection = `
    <base href="${cleanHost}/">
    <meta name="referrer" content="no-referrer">
    <style>html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}</style>
    <script>
      try {
        if (${JSON.stringify(cleanHash)} && window.location.hash !== '#' + ${JSON.stringify(cleanHash)}) {
          window.location.hash = '#' + ${JSON.stringify(cleanHash)};
        }
      } catch (e) {}
    </script>
  `;

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => `${match}${injection}`);
  } else {
    html = `${injection}${html}`;
  }

  return html;
}

module.exports = {
  searchAnime,
  getLatest,
  getPopular,
  getDetail,
  getEpisodes,
  getStream,
  getCatalog,
  fetchPlayerEmbedHtml,
};