const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const BASE_URL = "https://anikai.org";
const IMAGE_BASE_URL = "https://img.anikai.org";
const CACHE_FILE_PATH = path.join("/tmp", "anikai_catalog_cache.json");
const CACHE_TTL_MS = 60 * 60 * 1000;

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
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
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
            const buffer = Buffer.concat(chunks);
            const body = buffer.toString("utf-8");
            resolve({
              status: res.statusCode,
              headers: res.headers,
              buffer,
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

/**
 * Ekstrak daftar seluruh Genre, Format, Status, dan Tahun langsung dari katalog AnimeKai
 */
async function getFilters() {
  const catalog = await getCatalog();
  const genreCounts = new Map();
  const formatSet = new Set();
  const statusSet = new Set();
  const yearSet = new Set();

  for (const item of catalog) {
    if (Array.isArray(item.g)) {
      for (const g of item.g) {
        const clean = String(g || "").trim();
        if (clean) {
          genreCounts.set(clean, (genreCounts.get(clean) || 0) + 1);
        }
      }
    }
    if (item.f) formatSet.add(String(item.f).trim());
    if (item.st) statusSet.add(String(item.st).trim());
    if (typeof item.y === "number" && item.y >= 1970 && item.y <= 2030) {
      yearSet.add(item.y);
    }
  }

  const genres = Array.from(genreCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const formats = Array.from(formatSet).sort();
  const statuses = Array.from(statusSet).sort();
  const years = Array.from(yearSet).sort((a, b) => b - a);

  return {
    status: true,
    total_catalog: catalog.length,
    genres,
    formats,
    statuses,
    years,
  };
}

/**
 * Jadwal Anime Mingguan (Dikelompokkan per hari Senin - Minggu dari data rilis aktif)
 */
async function getSchedule() {
  const catalog = await getCatalog();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const grouped = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  // Ambil anime yang sedang tayang (Airing / Ongoing) atau baru rilis
  const candidates = catalog
    .filter((item) => {
      const st = String(item.st || "").toLowerCase();
      return (
        st.includes("airing") ||
        st.includes("ongoing") ||
        Boolean(item.le) ||
        item.y >= 2025
      );
    })
    .sort((a, b) => {
      const dateA = a.le || a.u || "";
      const dateB = b.le || b.u || "";
      return String(dateB).localeCompare(String(dateA));
    })
    .slice(0, 140);

  for (const item of candidates) {
    const dateStr = item.le || item.rd || item.u;
    let dayName = "Monday";
    if (dateStr) {
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        dayName = days[parsedDate.getUTCDay()];
      } else {
        dayName = days[(item.i || 0) % 7];
      }
    } else {
      dayName = days[(item.i || 0) % 7];
    }

    if (grouped[dayName].length < 24) {
      grouped[dayName].push(formatAnimeItem(item));
    }
  }

  return {
    status: true,
    schedule: grouped,
  };
}

/**
 * Search & Filter Katalog Lengkap (Mendukung A-Z, Z-A, Popular, Latest, Year, Score, Letter, Pagination)
 */
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
  const letterFilter = options.letter
    ? String(options.letter).trim().toUpperCase()
    : null;
  const sortMode = options.sort
    ? String(options.sort).trim().toLowerCase()
    : "popular";

  const matches = [];

  for (const item of catalog) {
    const primaryTitle = String(item.n || item.j || item.s || "").trim();

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

    if (letterFilter && letterFilter !== "ALL") {
      const firstChar = primaryTitle.charAt(0).toUpperCase();
      if (letterFilter === "0-9") {
        if (!/^[0-9]/.test(firstChar)) continue;
      } else if (firstChar !== letterFilter) {
        continue;
      }
    }

    if (
      genreFilter &&
      (!item.g ||
        !item.g.some((g) => String(g).toLowerCase() === genreFilter))
    ) {
      continue;
    }
    if (formatFilter && String(item.f || "").toLowerCase() !== formatFilter) {
      continue;
    }
    if (statusFilter && String(item.st || "").toLowerCase() !== statusFilter) {
      continue;
    }
    if (yearFilter && !isNaN(yearFilter) && item.y !== yearFilter) {
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
  } else if (sortMode === "year" || sortMode === "newest") {
    matches.sort((a, b) => (b.y || 0) - (a.y || 0));
  } else if (sortMode === "oldest") {
    matches.sort((a, b) => (a.y || 9999) - (b.y || 9999));
  } else if (sortMode === "az") {
    matches.sort((a, b) =>
      String(a.n || a.j || "").localeCompare(String(b.n || b.j || ""))
    );
  } else if (sortMode === "za") {
    matches.sort((a, b) =>
      String(b.n || b.j || "").localeCompare(String(a.n || a.j || ""))
    );
  } else {
    // Default: Most Popular / Highest Score
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
    creator: "Kyno",
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
    creator: "Kyno",
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

async function fetchPlayerEmbedHtml(
  streamHash,
  playerHost = "https://play.anikai.org"
) {
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

  html = html.replace(
    /<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi,
    ""
  );

  html = html.replace(
    /\b(src|href)=(["'])\/(?!\/)/gi,
    `$1=$2${cleanHost}/`
  );

  const injection = `
    <style>html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden;}</style>
    <script>
      (function() {
        var PLAYER_HOST = ${JSON.stringify(cleanHost)};
        var TARGET_HASH = ${JSON.stringify(cleanHash)};

        try {
          if (TARGET_HASH && window.location.hash !== '#' + TARGET_HASH) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search + '#' + TARGET_HASH);
          }
        } catch (e) {
          window.location.hash = '#' + TARGET_HASH;
        }

        function rewriteToProxy(rawUrl) {
          try {
            if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
            if (rawUrl.indexOf('/api/anime/embed') !== -1 || rawUrl.indexOf('blob:') === 0 || rawUrl.indexOf('data:') === 0) {
              return rawUrl;
            }
            var resolved = new URL(rawUrl, PLAYER_HOST + '/watch');
            if (
              resolved.origin === window.location.origin ||
              resolved.hostname.indexOf('anikai.org') !== -1
            ) {
              var target = PLAYER_HOST + resolved.pathname + resolved.search;
              return '/api/anime/embed?proxy_url=' + encodeURIComponent(target);
            }
            return rawUrl;
          } catch (err) {
            return rawUrl;
          }
        }

        var originalFetch = window.fetch;
        if (originalFetch) {
          window.fetch = function(input, init) {
            try {
              if (typeof input === 'string') {
                input = rewriteToProxy(input);
              } else if (input && typeof input.url === 'string') {
                var newUrl = rewriteToProxy(input.url);
                if (newUrl !== input.url) {
                  input = new Request(newUrl, input);
                }
              }
            } catch (e) {}
            return originalFetch.call(this, input, init);
          };
        }

        var origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
          try {
            if (typeof url === 'string') {
              arguments[1] = rewriteToProxy(url);
            }
          } catch (e) {}
          return origOpen.apply(this, arguments);
        };
      })();
    </script>
  `;

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => `${match}${injection}`);
  } else {
    html = `${injection}${html}`;
  }

  return html;
}

async function proxyPlayerRequest(targetUrl, method = "GET", reqBody = null) {
  const parsed = new URL(targetUrl);
  if (!parsed.hostname.endsWith("anikai.org")) {
    throw new Error("Domain proxy tidak diizinkan.");
  }

  const res = await request(parsed.toString(), {
    method: method || "GET",
    headers: {
      Origin: "https://play.anikai.org",
      Referer: "https://play.anikai.org/watch",
      Accept: "*/*",
    },
    body: reqBody || undefined,
  });

  return {
    status: res.status || 200,
    contentType:
      res.headers["content-type"] || "application/json; charset=utf-8",
    buffer: res.buffer,
    body: res.body,
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
  getFilters,
  getSchedule,
  fetchPlayerEmbedHtml,
  proxyPlayerRequest,
};