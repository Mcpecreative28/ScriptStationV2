const URL_REGEX = /https?:\/\/[^\s"'<>\)]+/gi;
const PRESET_5MB_REGEX = /alight\.link|alightcreative\.com/i;
const PRESET_XML_REGEX = /drive\.google\.com|mediafire\.com|sfile\.mobi|\.xml(?:\?|$)/i;
const SHORTLINK_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:s\.id|bit\.ly|tinyurl\.com|cutt\.ly|t\.co|rb\.gy|linktr\.ee|heylink\.me|beacons\.ai|taplink\.cc|snipfeed\.co)\//i;

function parseMetaFromText(text) {
  const ratioMatch = text.match(/\b(9:16|16:9|1:1|4:5|3:4|4:3)\b/i);
  const ratio = ratioMatch ? ratioMatch[1] : undefined;

  const pwMatch = text.match(/(?:pw|pass(?:word)?|sandi|kode)\s*[:=]\s*([a-zA-Z0-9_@#!]+)/i);
  const password = pwMatch ? pwMatch[1] : undefined;
  const detail = pwMatch ? `Password: ${pwMatch[1]}` : undefined;

  const sizeMatch = text.match(/\b([<>]?\s*\d+(?:\.\d+)?\s*(?:mb|kb|gb))\b/i);
  const rawSize = sizeMatch ? sizeMatch[1].toUpperCase() : undefined;

  return { ratio, detail, password, rawSize };
}

async function resolveUrlAndExtract(rawUrl) {
  const nestedPresets = [];
  let resolvedUrl = rawUrl;

  try {
    const res = await fetch(rawUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });

    resolvedUrl = res.url || rawUrl;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("text/html") || contentType.includes("json")) {
      const html = await res.text();
      const matches = html.match(URL_REGEX) || [];
      for (const m of matches) {
        if (PRESET_5MB_REGEX.test(m) || PRESET_XML_REGEX.test(m)) {
          if (!nestedPresets.includes(m)) {
            nestedPresets.push(m);
          }
        }
      }
    }
  } catch {}

  return { resolvedUrl, nestedPresets };
}

function detectPlatform(url) {
  const u = url.toLowerCase();
  if (/tiktok\.com/i.test(u) || /^\d{10,}$/.test(u)) return "tiktok";
  if (/youtu\.be|youtube\.com/i.test(u)) return "youtube";
  if (/instagram\.com|instagr\.am/i.test(u)) return "instagram";
  if (/facebook\.com|fb\.watch|fb\.com/i.test(u)) return "facebook";
  if (/twitter\.com|x\.com/i.test(u)) return "twitter";
  if (/threads\.(net|com)/i.test(u)) return "threads";
  if (/capcut\.com/i.test(u)) return "capcut";
  if (PRESET_5MB_REGEX.test(u) || PRESET_XML_REGEX.test(u) || SHORTLINK_REGEX.test(u)) return "direct";
  return "general";
}

function extractYouTubeId(urlOrId) {
  const str = (urlOrId || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i
  );
  return match ? match[1] : null;
}

async function extractPresetsFromScanItems(scanItems) {
  const presetsMap = new Map();
  const otherLinksMap = new Map();

  await Promise.all(
    scanItems.map(async (item) => {
      const urlsInText = item.text.match(URL_REGEX) || [];
      if (urlsInText.length === 0) return;

      const meta = parseMetaFromText(item.text);

      for (const rawUrl of urlsInText) {
        if (PRESET_5MB_REGEX.test(rawUrl)) {
          if (!presetsMap.has(rawUrl)) {
            presetsMap.set(rawUrl, {
              type: "5mb",
              url: rawUrl,
              title: "Preset Alight Motion 5MB",
              size: meta.rawSize || "Under 5MB",
              pinned: item.pinned,
              byAuthor: item.byAuthor,
              detail: meta.detail,
              password: meta.password,
              ratio: meta.ratio,
            });
          }
          continue;
        }

        if (PRESET_XML_REGEX.test(rawUrl)) {
          if (!presetsMap.has(rawUrl)) {
            presetsMap.set(rawUrl, {
              type: "xml",
              url: rawUrl,
              title: "Preset Alight Motion XML File",
              size: meta.rawSize,
              pinned: item.pinned,
              byAuthor: item.byAuthor,
              detail: meta.detail,
              password: meta.password,
              ratio: meta.ratio,
            });
          }
          continue;
        }

        if (SHORTLINK_REGEX.test(rawUrl) || rawUrl.includes("alight")) {
          const { resolvedUrl, nestedPresets } = await resolveUrlAndExtract(rawUrl);

          if (PRESET_5MB_REGEX.test(resolvedUrl)) {
            if (!presetsMap.has(resolvedUrl)) {
              presetsMap.set(resolvedUrl, {
                type: "5mb",
                url: resolvedUrl,
                title: "Preset Alight Motion 5MB",
                size: meta.rawSize || "Under 5MB",
                pinned: item.pinned,
                byAuthor: item.byAuthor,
                detail: meta.detail,
                password: meta.password,
                ratio: meta.ratio,
              });
            }
          } else if (PRESET_XML_REGEX.test(resolvedUrl)) {
            if (!presetsMap.has(resolvedUrl)) {
              presetsMap.set(resolvedUrl, {
                type: "xml",
                url: resolvedUrl,
                title: "Preset Alight Motion XML File",
                size: meta.rawSize,
                pinned: item.pinned,
                byAuthor: item.byAuthor,
                detail: meta.detail,
                password: meta.password,
                ratio: meta.ratio,
              });
            }
          }

          for (const nested of nestedPresets) {
            const is5 = PRESET_5MB_REGEX.test(nested);
            if (!presetsMap.has(nested)) {
              presetsMap.set(nested, {
                type: is5 ? "5mb" : "xml",
                url: nested,
                title: is5 ? "Preset Alight Motion 5MB" : "Preset Alight Motion XML File",
                size: is5 ? "Under 5MB" : undefined,
                pinned: item.pinned,
                byAuthor: item.byAuthor,
                detail: meta.detail,
                password: meta.password,
                ratio: meta.ratio,
              });
            }
          }

          if (
            !PRESET_5MB_REGEX.test(resolvedUrl) &&
            !PRESET_XML_REGEX.test(resolvedUrl) &&
            nestedPresets.length === 0
          ) {
            if (!otherLinksMap.has(resolvedUrl)) {
              otherLinksMap.set(resolvedUrl, {
                url: resolvedUrl,
                origin: item.sourceType,
              });
            }
          }
        } else {
          if (!otherLinksMap.has(rawUrl)) {
            otherLinksMap.set(rawUrl, {
              url: rawUrl,
              origin: item.sourceType,
            });
          }
        }
      }
    })
  );

  return {
    presetLinks: Array.from(presetsMap.values()),
    otherLinks: Array.from(otherLinksMap.values()),
  };
}

async function scrapeYouTube(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error("Invalid YouTube video ID or URL.");

  const scanItems = [];
  let videoTitle = "";
  let author = "";

  try {
    const playerRes = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "com.google.android.youtube/19.09.37" },
      body: JSON.stringify({
        context: {
          client: { clientName: "ANDROID", clientVersion: "19.09.37", hl: "id", gl: "ID" },
        },
        videoId,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (playerRes.ok) {
      const data = await playerRes.json();
      const details = data?.videoDetails || {};
      videoTitle = details.title || "";
      author = details.author || "";
      const description = details.shortDescription || "";
      if (description) {
        scanItems.push({ text: description, pinned: true, byAuthor: true, sourceType: "description" });
      }
    }
  } catch {}

  const { presetLinks, otherLinks } = await extractPresetsFromScanItems(scanItems);
  const found = presetLinks.length > 0;

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  return {
    status: true,
    code: 200,
    creator: "Vamz Spectre",
    result: {
      found,
      totalPresets: presetLinks.length,
      platform: "youtube",
      author,
      authorDetail: {
        nickname: author,
        profileUrl: author ? `https://www.youtube.com/${encodeURIComponent(author)}` : ""
      },
      videoUrl: canonicalUrl,
      video: {
        id: videoId,
        url: canonicalUrl,
        title: videoTitle,
        cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      },
      presetLinks,
      message: found ? `Berhasil menemukan ${presetLinks.length} preset Alight Motion.` : "Tidak ditemukan preset pada video YouTube ini.",
      otherLinks: otherLinks.length > 0 ? otherLinks : undefined,
    },
  };
}


async function scrapeTikTok(url) {
  const cleanUrl = url.trim();
  let vData = null;
  let lastError = null;

  // 1. Ambil informasi video TikTok.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const body = new URLSearchParams({
        url: cleanUrl,
        count: "50",
      });

      const res = await fetch("https://www.tikwm.com/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(6000),
      });

      const json = await res.json();

      if ((json.code === 0 || json.code === "0") && json.data) {
        vData = json.data;
        break;
      }

      lastError = new Error(
        json.msg || "Layanan TikTok tidak memberikan data video."
      );

      if (/limit|频繁|rate/i.test(json.msg || "")) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        continue;
      }
    } catch (error) {
      lastError = error;
    }
  }

  // Fallback untuk mendapatkan URL kanonis dan metadata dasar.
  if (!vData) {
    try {
      const res = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(cleanUrl)}`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(4000),
        }
      );

      if (res.ok) {
        const data = await res.json();

        vData = {
          title: data.title || "",
          author: {
            unique_id: data.author_unique_id || "",
            nickname: data.author_name || "",
          },
        };
      }
    } catch {
      // Jika fallback gagal, laporkan error di bawah.
    }
  }

  if (!vData) {
    throw lastError || new Error("Gagal mengambil data video TikTok.");
  }

  const authorUniqueId = vData.author?.unique_id || "";
  const authorNickname = vData.author?.nickname || "";
  const authorAvatar = vData.author?.avatar || "";
  const videoId = String(vData.id || "");

  const canonicalVideoUrl =
    authorUniqueId && videoId
      ? `https://www.tiktok.com/@${authorUniqueId}/video/${videoId}`
      : cleanUrl;

  // Menyimpan semua teks yang akan diperiksa oleh ekstraktor preset.
  const scanItems = [];

  if (vData.title) {
    scanItems.push({
      text: vData.title,
      pinned: false,
      byAuthor: true,
      sourceType: "description",
    });
  }

  // 2. Ambil beberapa halaman komentar menggunakan cursor.
  let cursor = 0;
  const seenCursors = new Set();
  const commentsMap = new Map();

  for (let page = 0; page < 3; page++) {
    try {
      const params = new URLSearchParams({
        url: canonicalVideoUrl,
        count: "50",
        cursor: String(cursor),
      });

      const res = await fetch(
        `https://www.tikwm.com/api/comment/list?${params.toString()}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "application/json",
            Referer: "https://www.tikwm.com/",
          },
          signal: AbortSignal.timeout(3500),
        }
      );

      if (!res.ok) break;

      const json = await res.json();

      if (json.code !== 0 && json.code !== "0") break;

      const data = json.data;
      const comments = Array.isArray(data)
        ? data
        : Array.isArray(data?.comments)
          ? data.comments
          : [];

      for (const comment of comments) {
        const id = String(comment?.id || "");
        const text = comment?.text || comment?.content || "";

        if (typeof text !== "string" || !text.trim()) continue;

        const user =
          comment?.user || comment?.author || comment?.user_info || {};

        const userId =
          user?.unique_id || user?.uniqueId || user?.unique_id_str || "";

        commentsMap.set(id || `${userId}:${text}`, {
          id,
          text,
          userId,
          pinned: Boolean(
            comment?.is_pinned ||
            comment?.pinned ||
            comment?.stick_position
          ),
          byAuthor: Boolean(
            authorUniqueId && userId === authorUniqueId
          ),
          replyTotal: Number(
            comment?.reply_total || comment?.reply_count || 0
          ),
        });
      }

      const hasMore = Boolean(data?.hasMore ?? data?.has_more);
      const nextCursor = data?.cursor;

      if (
        !hasMore ||
        nextCursor == null ||
        seenCursors.has(String(nextCursor))
      ) {
        break;
      }

      seenCursors.add(String(nextCursor));
      cursor = nextCursor;
    } catch {
      // Tetap gunakan komentar yang berhasil diambil sebelumnya.
      break;
    }
  }

  const comments = Array.from(commentsMap.values());

  // 3. Ambil balasan komentar dari beberapa komentar yang punya replies.
  // Dibatasi agar waktu eksekusi server tidak berlebihan.
  const replyTargets = comments
    .filter((comment) => comment.id && comment.replyTotal > 0)
    .slice(0, 6);

  const replyResults = await Promise.all(
    replyTargets.map(async (comment) => {
      try {
        const params = new URLSearchParams({
          comment_id: comment.id,
          count: "50",
          cursor: "0",
        });

        const res = await fetch(
          `https://www.tikwm.com/api/comment/reply?${params.toString()}`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0",
              Accept: "application/json",
              Referer: "https://www.tikwm.com/",
            },
            signal: AbortSignal.timeout(3500),
          }
        );

        if (!res.ok) return [];

        const json = await res.json();

        if (json.code !== 0 && json.code !== "0") return [];

        const data = json.data;
        const replies = Array.isArray(data)
          ? data
          : Array.isArray(data?.comments)
            ? data.comments
            : [];

        return replies
          .filter(
            (reply) =>
              typeof (reply?.text || reply?.content) === "string"
          )
          .map((reply) => {
            const user =
              reply?.user || reply?.author || reply?.user_info || {};

            const userId =
              user?.unique_id ||
              user?.uniqueId ||
              user?.unique_id_str ||
              "";

            return {
              text: reply.text || reply.content,
              pinned: false,
              byAuthor: Boolean(
                authorUniqueId && userId === authorUniqueId
              ),
              sourceType: "reply",
            };
          });
      } catch {
        return [];
      }
    })
  );

  for (const comment of comments) {
    scanItems.push({
      text: comment.text,
      pinned: comment.pinned,
      byAuthor: comment.byAuthor,
      sourceType: "comment",
    });
  }

  for (const replies of replyResults) {
    scanItems.push(...replies);
  }

  // 4. Ekstrak dan deduplikasi link preset.
  const { presetLinks, otherLinks } =
    await extractPresetsFromScanItems(scanItems);

  const found = presetLinks.length > 0;

  return {
    status: true,
    code: 200,
    creator: "Vamz Spectre",
    result: {
      found,
      totalPresets: presetLinks.length,
      platform: "tiktok",
      author: authorUniqueId ? `@${authorUniqueId}` : authorNickname,
      authorDetail: {
        uniqueId: authorUniqueId,
        nickname: authorNickname,
        avatar: authorAvatar,
        profileUrl: authorUniqueId
          ? `https://www.tiktok.com/@${authorUniqueId}`
          : "",
      },
      videoUrl: canonicalVideoUrl,
      video: {
        id: videoId,
        url: canonicalVideoUrl,
        title: vData.title || "",
        cover: vData.cover || vData.origin_cover || "",
        duration: Number(vData.duration || 0),
        stats: {
          views: Number(vData.play_count || 0),
          likes: Number(vData.digg_count || 0),
          comments: Number(vData.comment_count || 0),
          shares: Number(vData.share_count || 0),
        },
      },
      presetLinks,
      message: found
        ? `Berhasil menemukan ${presetLinks.length} preset Alight Motion.`
        : comments.length === 0
          ? "Komentar tidak berhasil diakses. Coba lagi nanti atau periksa apakah video dapat diakses publik."
          : `Sudah memeriksa ${comments.length} komentar dan ${replyResults.reduce((sum, replies) => sum + replies.length, 0)} balasan, tetapi tidak menemukan link preset yang dikenali.`,
      otherLinks: otherLinks.length > 0 ? otherLinks : undefined,
    },
  };
}

async function scrapeInstagram(url) {
  const shortcodeMatch = url.match(/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;
  if (!shortcode) throw new Error("Shortcode Instagram tidak valid.");

  const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";
  const homeRes = await fetch("https://www.instagram.com/", {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.8",
    },
    signal: AbortSignal.timeout(10000),
  });

  const rawCookies = homeRes.headers.getSetCookie ? homeRes.headers.getSetCookie() : [];
  const cookieStr = rawCookies.map((c) => c.split(";")[0]).join("; ");
  const csrfMatch = cookieStr.match(/csrftoken=([^;]+)/);
  const csrf = csrfMatch ? csrfMatch[1] : "";

  const payload = new URLSearchParams({
    variables: JSON.stringify({
      shortcode,
      __relay_internal__pv__PolarisAIGMMediaWebLabelEnabledrelayprovider: false,
    }),
    doc_id: "27128499623469141",
    server_timestamps: "true",
  });

  const res = await fetch("https://www.instagram.com/graphql/query", {
    method: "POST",
    headers: {
      "User-Agent": userAgent,
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRFToken": csrf,
      "X-IG-App-ID": "936619743392459",
      Cookie: cookieStr,
      Referer: `https://www.instagram.com/p/${shortcode}/`,
    },
    body: payload.toString(),
    signal: AbortSignal.timeout(15000),
  });

  const json = await res.json();
  const items = json?.data?.xdt_api__v1__media__shortcode__web_info?.items;
  if (!items || !items.length) {
    throw new Error("Media Instagram tidak ditemukan atau akun privat.");
  }

  const item = items[0];
  const caption = item.caption?.text || "";
  const username = item.user?.username || "";

  const scanItems = [
    { text: caption, pinned: true, byAuthor: true, sourceType: "description" },
  ];

  const { presetLinks, otherLinks } = await extractPresetsFromScanItems(scanItems);
  const found = presetLinks.length > 0;

  const canonicalUrl = `https://www.instagram.com/p/${shortcode}/`;
  return {
    status: true,
    code: 200,
    creator: "Vamz Spectre",
    result: {
      found,
      totalPresets: presetLinks.length,
      platform: "instagram",
      author: username ? `@${username}` : "",
      authorDetail: {
        uniqueId: username,
        profileUrl: username ? `https://www.instagram.com/${username}/` : ""
      },
      videoUrl: canonicalUrl,
      video: {
        shortcode,
        url: canonicalUrl,
        title: caption,
      },
      presetLinks,
      message: found
        ? `Berhasil menemukan ${presetLinks.length} preset Alight Motion.`
        : "Tidak ditemukan preset pada postingan Instagram ini.",
      otherLinks: otherLinks.length > 0 ? otherLinks : undefined,
    },
  };
}

async function scrapeDirect(url) {
  const scanItems = [{ text: url, pinned: true, byAuthor: true, sourceType: "direct" }];
  const { presetLinks, otherLinks } = await extractPresetsFromScanItems(scanItems);
  const found = presetLinks.length > 0;

  return {
    status: true,
    code: 200,
    creator: "Vamz Spectre",
    result: {
      found,
      totalPresets: presetLinks.length,
      platform: "direct",
      author: "",
      videoUrl: url,
      presetLinks,
      message: found ? `Berhasil menemukan ${presetLinks.length} preset Alight Motion.` : "Link preset tidak dapat diekstrak.",
      otherLinks: otherLinks.length > 0 ? otherLinks : undefined,
    },
  };
}

/**
 * Universal preset finder for all social media URLs
 * @param {string} inputUrl - Social media URL (TikTok, YouTube, IG, FB, CapCut, Direct link)
 */
async function findAmPresets(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") {
    throw new Error("Parameter URL wajib disertakan.");
  }

  const platform = detectPlatform(inputUrl);
  switch (platform) {
    case "youtube":
      return await scrapeYouTube(inputUrl);
    case "tiktok":
      return await scrapeTikTok(inputUrl);
    case "instagram":
      return await scrapeInstagram(inputUrl);
    case "direct":
      return await scrapeDirect(inputUrl);
    default: {
      // General scanner
      const scanItems = [{ text: inputUrl, pinned: true, byAuthor: true, sourceType: "general" }];
      const { presetLinks, otherLinks } = await extractPresetsFromScanItems(scanItems);
      const found = presetLinks.length > 0;
      return {
        status: true,
        code: 200,
        creator: "Vamz Spectre",
        result: {
          found,
          totalPresets: presetLinks.length,
          platform,
          author: "",
          videoUrl: inputUrl,
          presetLinks,
          message: found ? `Berhasil menemukan ${presetLinks.length} preset Alight Motion.` : "Preset tidak ditemukan.",
          otherLinks: otherLinks.length > 0 ? otherLinks : undefined,
        },
      };
    }
  }
}

// Module exports (CJS & ESM compatibility)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findAmPresets, detectPlatform };
}

// CLI Execution support (Respon JSON Murni 1:1)
const isDirectRun = (typeof require !== 'undefined' && require.main === module) ||
  (typeof process !== 'undefined' && process.argv[1] && (process.argv[1].endsWith('amfinder-preset-scraper.js') || process.argv[1].endsWith('amfinder.js')));

if (isDirectRun) {
  const targetUrl = process.argv[2] || "https://vt.tiktok.com/ZS6e6k5jF/";
  findAmPresets(targetUrl)
    .then((res) => {
      console.log(JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error(JSON.stringify({ status: false, code: 500, error: err.message }, null, 2));
      process.exit(1);
    });
}