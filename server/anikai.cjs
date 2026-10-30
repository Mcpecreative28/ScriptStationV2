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

/**
 * Lightweight native HTTP/HTTPS client (IPv4 forced, auto redirect, fast keepalive)
 */
function request(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const isHttps = parsed.protocol === "https:";
      const client = isHttps ? https : http;

      const req = client.request(parsed, {
        method: options.method || "GET",
        family: 4,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": BASE_URL + "/",
          ...options.headers
        },
        timeout: options.timeout || 15000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, urlStr).toString();
          return resolve(request(redirectUrl, options));
        }

        const chunks = [];
        res.on("data", chunk => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            json: () => JSON.parse(body)
          });
        });
      });

      req.on("error", (err) => reject(new Error(`AnimeKai Request Error: ${err.message}`)));
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

/**
 * Build image URLs helper
 */
function buildImages(slug, id) {
  const fileKey = slug.endsWith(`-${id}`) ? slug : `${slug}-${id}`;
  return {
    poster: `${IMAGE_BASE_URL}/poster/w_360/h_480/${fileKey}.webp`,
    poster_sm: `${IMAGE_BASE_URL}/poster-sm/w_200/h_267/${fileKey}.webp`,
    thumb: `${IMAGE_BASE_URL}/thumb/w_128/h_176/${fileKey}.webp`,
    banner: `${IMAGE_BASE_URL}/banner/w_1900/h_400/${fileKey}.webp`
  };
}

/**
 * Normalisasi item anime dari catalog-index.json
 */
function formatAnimeItem(item) {
  const slug = item.s || "";
  const id = item.i || null;
  return {
    id: id,
    slug: slug,
    title: item.n || item.j || slug,
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
    images: buildImages(slug, id),
    watch_url: `${BASE_URL}/watch/${slug}/`
  };
}

/**
 * Fetch dan cache catalog-index.json (in-memory + /tmp)
 */
async function getCatalog(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && memoryCatalogCache && (now - memoryCacheTimestamp < CACHE_TTL_MS)) {
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
 * Search anime berdasarkan kata kunci dan filter opsional
 */
async function searchAnime(query, options = {}) {
  if (!query || typeof query !== "string" || !query.trim()) {
    throw new Error("Parameter query pencarian wajib diisi");
  }

  const catalog = await getCatalog();
  const q = query.trim().toLowerCase();
  const limit = Math.max(1, parseInt(options.limit || 20, 10));
  const page = Math.max(1, parseInt(options.page || 1, 10));
  const genreFilter = options.genre ? options.genre.toLowerCase() : null;
  const formatFilter = options.format ? options.format.toLowerCase() : null;
  const statusFilter = options.status ? options.status.toLowerCase() : null;
  const yearFilter = options.year ? parseInt(options.year, 10) : null;

  const matches = [];

  for (const item of catalog) {
    const titleEn = (item.n || "").toLowerCase();
    const titleJp = (item.j || "").toLowerCase();
    const titleKanji = (item.na || "").toLowerCase();
    const slug = (item.s || "").toLowerCase();

    const isMatch = titleEn.includes(q) || titleJp.includes(q) || titleKanji.includes(q) || slug.includes(q);
    if (!isMatch) continue;

    if (genreFilter && (!item.g || !item.g.some(g => g.toLowerCase() === genreFilter))) {
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

  const totalResults = matches.length;
  const startIndex = (page - 1) * limit;
  const paginated = matches.slice(startIndex, startIndex + limit);

  return {
    status: true,
    creator: "Vamz Spectre",
    query: query.trim(),
    page: page,
    limit: limit,
    total_results: totalResults,
    total_pages: Math.ceil(totalResults / limit) || 1,
    results: paginated.map(formatAnimeItem)
  };
}

/**
 * Dapatkan anime terbaru (berdasarkan episode terbaru atau update date)
 */
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
    results: paginated.map(formatAnimeItem)
  };
}

/**
 * Dapatkan anime populer / top score
 */
async function getPopular(options = {}) {
  const catalog = await getCatalog();
  const limit = Math.max(1, parseInt(options.limit || 20, 10));
  const page = Math.max(1, parseInt(options.page || 1, 10));

  const filtered = catalog.filter(item => typeof item.sc === "number" && item.sc > 0);
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
    results: paginated.map(formatAnimeItem)
  };
}

/**
 * Ambil daftar episode anime dari /episodes/${animeId}.json
 */
async function getEpisodes(animeId) {
  if (!animeId) {
    throw new Error("Parameter animeId wajib diisi");
  }

  const res = await request(`${BASE_URL}/episodes/${animeId}.json`);
  if (res.status !== 200) {
    throw new Error(`Daftar episode tidak ditemukan untuk ID ${animeId} (HTTP ${res.status})`);
  }

  const rawEpisodes = res.json();
  const episodes = (Array.isArray(rawEpisodes) ? rawEpisodes : []).map(ep => ({
    episode: ep[0],
    title: ep[1] || `Episode ${ep[0]}`,
    release_date: ep[2] || null,
    is_filler: Boolean(ep[3]),
    is_recap: Boolean(ep[4])
  }));

  return {
    status: true,
    creator: "Vamz Spectre",
    anime_id: parseInt(animeId, 10),
    total_episodes: episodes.length,
    episodes: episodes
  };
}

/**
 * Dapatkan detail lengkap anime: metadata + synopsis + watch info + full episodes list
 */
async function getDetail(slugOrId) {
  if (!slugOrId) {
    throw new Error("Parameter slug atau animeId wajib diisi");
  }

  const catalog = await getCatalog();
  let animeEntry = null;

  const numericId = parseInt(slugOrId, 10);
  if (!isNaN(numericId) && String(numericId) === String(slugOrId).trim()) {
    animeEntry = catalog.find(item => item.i === numericId);
  } else {
    const cleanSlug = String(slugOrId).trim().replace(/^\/watch\/|\/$/g, "");
    animeEntry = catalog.find(item => item.s === cleanSlug || item.s === cleanSlug.toLowerCase());
  }

  const slug = animeEntry ? animeEntry.s : String(slugOrId).trim().replace(/^\/watch\/|\/$/g, "");
  const watchPageRes = await request(`${BASE_URL}/watch/${slug}/`);

  if (watchPageRes.status !== 200) {
    throw new Error(`Halaman anime tidak ditemukan untuk slug "${slug}" (HTTP ${watchPageRes.status})`);
  }

  const html = watchPageRes.body;

  const dataId = (html.match(/data-id=([^\s>]+)/) || [])[1];
  const dataSeal = (html.match(/data-seal=([^\s>]+)/) || [])[1];
  const dataPlayer = (html.match(/data-player=([^\s>]+)/) || [])[1] || "https://play.anikai.org";
  const dataServerDefault = (html.match(/data-server-default=([^\s>]+)/) || [])[1] || "2";

  const rawServers = [...html.matchAll(/data-server=([^\s>]+)/g)].map(m => m[1]);
  const availableServers = [...new Set(rawServers)];

  const rawAudios = [...html.matchAll(/data-audio=([^\s>]+)/g)].map(m => m[1]);
  const availableAudios = [...new Set(rawAudios)];

  const synopsisMatch = html.match(/<p id=synopsis-text[^>]*>([\s\S]*?)<\/p>/i);
  const synopsis = synopsisMatch ? synopsisMatch[1].replace(/<[^>]+>/g, "").trim() : null;

  const id = (animeEntry && animeEntry.i) ? animeEntry.i : (dataId ? parseInt(dataId, 10) : null);

  let episodesData = [];
  if (id) {
    try {
      const epRes = await getEpisodes(id);
      episodesData = epRes.episodes;
    } catch {}
  }

  const baseFormatted = animeEntry ? formatAnimeItem(animeEntry) : {
    id: id,
    slug: slug,
    title: (html.match(/<title>([^<]+)<\/title>/) || [])[1]?.replace(/\s*\|\s*AnimeKai.*$/, "").trim() || slug,
    images: buildImages(slug, id || 0),
    watch_url: `${BASE_URL}/watch/${slug}/`
  };

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
        available_servers: availableServers.length > 0 ? availableServers : ["1", "2", "3"],
        available_audios: availableAudios.length > 0 ? availableAudios : ["sub", "dub"]
      },
      episodes: episodesData
    }
  };
}

/**
 * Resolve direct video player URL dan iframe embed
 */
async function getStream(slugOrId, episodeNumber = 1, server = null, audio = "sub") {
  if (!slugOrId) {
    throw new Error("Parameter slug atau animeId wajib diisi");
  }

  const ep = parseInt(episodeNumber || 1, 10);
  const detailRes = await getDetail(slugOrId);
  const anime = detailRes.data;

  if (!anime.player || !anime.player.seal) {
    throw new Error("Video player seal tidak tersedia untuk judul ini (kemungkinan masih preview)");
  }

  const selectedServer = server ? String(server) : (anime.player.server_default || "2");
  const selectedAudio = (audio && audio.toLowerCase() === "dub") ? "dub" : "sub";
  const playerHost = anime.player.player_host || "https://play.anikai.org";

  const streamHash = `${anime.player.seal}.${ep}.${selectedServer}.${selectedAudio}`;
  const streamUrl = `${playerHost}/watch#${streamHash}`;
  const iframeHtml = `<iframe src="${streamUrl}" title="${anime.title} Episode ${ep}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen frameborder="0" width="100%" height="100%"></iframe>`;

  const episodeItem = anime.episodes.find(e => e.episode === ep) || null;

  return {
    status: true,
    creator: "Vamz Spectre",
    data: {
      anime_id: anime.id,
      slug: anime.slug,
      title: anime.title,
      episode: ep,
      episode_info: episodeItem,
      server: selectedServer,
      audio: selectedAudio,
      stream_url: streamUrl,
      iframe_embed: iframeHtml,
      player_options: {
        servers: anime.player.available_servers,
        audios: anime.player.available_audios
      }
    }
  };
}

// ==========================================
// CLI Runner (1:1 Konsisten dengan download)
// ==========================================
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] ? args[0].toLowerCase() : "";

  if (command === "search") {
    const query = args[1];
    const limit = args[2] ? parseInt(args[2], 10) : 20;

    if (!query) {
      console.error(JSON.stringify({
        status: false,
        creator: "Vamz Spectre",
        error: "Harap masukkan kata kunci pencarian. Contoh: node anikai.js search \"naruto\""
      }, null, 2));
      process.exit(1);
    }

    searchAnime(query, { limit })
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error(JSON.stringify({ status: false, creator: "Vamz Spectre", error: err.message }, null, 2));
        process.exit(1);
      });
  } else if (command === "latest") {
    const limit = args[1] ? parseInt(args[1], 10) : 20;

    getLatest({ limit })
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error(JSON.stringify({ status: false, creator: "Vamz Spectre", error: err.message }, null, 2));
        process.exit(1);
      });
  } else if (command === "popular") {
    const limit = args[1] ? parseInt(args[1], 10) : 20;

    getPopular({ limit })
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error(JSON.stringify({ status: false, creator: "Vamz Spectre", error: err.message }, null, 2));
        process.exit(1);
      });
  } else if (command === "detail") {
    const slugOrId = args[1];

    if (!slugOrId) {
      console.error(JSON.stringify({
        status: false,
        creator: "Vamz Spectre",
        error: "Harap masukkan slug atau ID anime. Contoh: node anikai.js detail \"one-piece-5773\""
      }, null, 2));
      process.exit(1);
    }

    getDetail(slugOrId)
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error(JSON.stringify({ status: false, creator: "Vamz Spectre", error: err.message }, null, 2));
        process.exit(1);
      });
  } else if (command === "episodes") {
    const animeId = args[1];

    if (!animeId) {
      console.error(JSON.stringify({
        status: false,
        creator: "Vamz Spectre",
        error: "Harap masukkan animeId. Contoh: node anikai.js episodes 5773"
      }, null, 2));
      process.exit(1);
    }

    getEpisodes(animeId)
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error(JSON.stringify({ status: false, creator: "Vamz Spectre", error: err.message }, null, 2));
        process.exit(1);
      });
  } else if (command === "stream") {
    const slugOrId = args[1];
    const episode = args[2] ? parseInt(args[2], 10) : 1;
    const server = args[3] || null;
    const audio = args[4] || "sub";

    if (!slugOrId) {
      console.error(JSON.stringify({
        status: false,
        creator: "Vamz Spectre",
        error: "Harap masukkan slug atau animeId. Contoh: node anikai.js stream \"one-piece-5773\" 1180"
      }, null, 2));
      process.exit(1);
    }

    getStream(slugOrId, episode, server, audio)
      .then(res => console.log(JSON.stringify(res, null, 2)))
      .catch(err => {
        console.error(JSON.stringify({ status: false, creator: "Vamz Spectre", error: err.message }, null, 2));
        process.exit(1);
      });
  } else {
    console.log(JSON.stringify({
      status: false,
      creator: "Vamz Spectre",
      message: "AnimeKai (anikai.org) Web Scraper & Stream Resolver API",
      download: 'curl -sL "https://code.vamxapi.my.id/snippet/raw/anikai" -o anikai.js',
      commands: {
        search: "node anikai.js search <query> [limit]",
        latest: "node anikai.js latest [limit]",
        popular: "node anikai.js popular [limit]",
        detail: "node anikai.js detail <slug_or_id>",
        episodes: "node anikai.js episodes <anime_id>",
        stream: "node anikai.js stream <slug_or_id> [episode] [server] [audio]"
      },
      examples: [
        'node anikai.js search "naruto"',
        'node anikai.js latest 10',
        'node anikai.js popular 10',
        'node anikai.js detail "one-piece-5773"',
        'node anikai.js episodes 5773',
        'node anikai.js stream "one-piece-5773" 1180 2 sub'
      ]
    }, null, 2));
  }
}

module.exports = {
  searchAnime,
  getLatest,
  getPopular,
  getDetail,
  getEpisodes,
  getStream,
  getCatalog
};
