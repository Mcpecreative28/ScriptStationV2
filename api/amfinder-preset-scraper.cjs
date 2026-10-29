const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:alight\.link|alightcreative\.com|alightmotion\.com|drive\.google\.com|drive\.usercontent\.google\.com|mediafire\.com|sfile\.mobi|mega\.nz|dropbox\.com|1drv\.ms|onedrive\.live\.com|pixeldrain\.com|gofile\.io|catbox\.moe|we\.tl|s\.id|bit\.ly|tinyurl\.com|cutt\.ly|t\.co|rb\.gy|linktr\.ee|heylink\.me|beacons\.ai|taplink\.cc|snipfeed\.co|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s"'<>]+)/gi;
const PRESET_5MB_REGEX = /alight\.link|alightcreative\.com|alightmotion\.com/i;
const PRESET_XML_REGEX = /drive\.google\.com|drive\.usercontent\.google\.com|mediafire\.com|sfile\.mobi|mega\.nz|dropbox\.com|1drv\.ms|onedrive\.live\.com|pixeldrain\.com|gofile\.io|catbox\.moe|we\.tl|\.xml(?:[?#]|$)/i;
const SHORTLINK_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:s\.id|bit\.ly|tinyurl\.com|cutt\.ly|t\.co|rb\.gy|linktr\.ee|heylink\.me|beacons\.ai|taplink\.cc|snipfeed\.co)\//i;

function cleanExtractedUrl(value) {
  return String(value || "").replace(/[.,!?;:]+$/g, "").replace(/[)\]}]+$/g, "");
}

function normalizeFoundUrls(text) {
  const matches = String(text || "").match(URL_REGEX) || [];
  return [...new Set(matches.map(cleanExtractedUrl).filter(Boolean).map(value =>
    /^https?:\/\//i.test(value) ? value : `https://${value}`
  ))];
}

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
      const urlsInText = normalizeFoundUrls(item.text);
      if (urlsInText.length === 0) return;

      const meta = parseMetaFromText(item.text);

      for (const foundUrl of urlsInText) {
        const rawUrl = cleanExtractedUrl(foundUrl);
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

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let youtubeCommentsScanned = 0;
  let youtubeRepliesScanned = 0;
  let youtubeCommentsUnavailable = false;
  const youtubeKey = process.env.YOUTUBE_API_KEY;

  // YouTube comments require an API key. If configured, paginate through
  // every public comment thread and fetch remaining replies when needed.
  if (youtubeKey) {
    let pageToken = "";
    const seenTokens = new Set();
    try {
      for (let page = 0; page < 500; page++) {
        const params = new URLSearchParams({
          part: "snippet,replies",
          videoId,
          maxResults: "100",
          textFormat: "plainText",
          key: youtubeKey,
        });
        if (pageToken) params.set("pageToken", pageToken);
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/commentThreads?${params}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || "YouTube comments API gagal.");

        for (const thread of payload.items || []) {
          const top = thread?.snippet?.topLevelComment;
          const topText = top?.snippet?.textDisplay || top?.snippet?.textOriginal || "";
          if (topText) {
            scanItems.push({ text: topText, pinned: false, byAuthor: false, sourceType: "comment" });
            youtubeCommentsScanned++;
          }

          const totalReplies = Number(thread?.snippet?.totalReplyCount || 0);
          const embedded = thread?.replies?.comments || [];
          for (const reply of embedded) {
            const replyText = reply?.snippet?.textDisplay || reply?.snippet?.textOriginal || "";
            if (replyText) {
              scanItems.push({ text: replyText, pinned: false, byAuthor: false, sourceType: "reply" });
              youtubeRepliesScanned++;
            }
          }

          if (top?.id && totalReplies > embedded.length) {
            let replyToken = "";
            const replyTokens = new Set();
            for (let rp = 0; rp < 500; rp++) {
              const rpParams = new URLSearchParams({
                part: "snippet",
                parentId: top.id,
                maxResults: "100",
                textFormat: "plainText",
                key: youtubeKey,
              });
              if (replyToken) rpParams.set("pageToken", replyToken);
              const rpResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/comments?${rpParams}`,
                { signal: AbortSignal.timeout(10000) }
              );
              const rpPayload = await rpResponse.json();
              if (!rpResponse.ok) throw new Error(rpPayload?.error?.message || "Gagal mengambil balasan YouTube.");
              for (const reply of rpPayload.items || []) {
                const replyText = reply?.snippet?.textDisplay || reply?.snippet?.textOriginal || "";
                if (replyText) {
                  scanItems.push({ text: replyText, pinned: false, byAuthor: false, sourceType: "reply" });
                  youtubeRepliesScanned++;
                }
              }
              const nextReplyToken = rpPayload.nextPageToken;
              if (!nextReplyToken || replyTokens.has(nextReplyToken)) break;
              replyTokens.add(nextReplyToken);
              replyToken = nextReplyToken;
            }
          }
        }

        const nextToken = payload.nextPageToken;
        if (!nextToken || seenTokens.has(nextToken)) break;
        seenTokens.add(nextToken);
        pageToken = nextToken;
      }
    } catch {
      youtubeCommentsUnavailable = true;
    }
  }

  const { presetLinks, otherLinks } = await extractPresetsFromScanItems(scanItems);
  const found = presetLinks.length > 0;
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
      scan: {
        comments: youtubeCommentsScanned,
        replies: youtubeRepliesScanned,
        incomplete: youtubeCommentsUnavailable || !youtubeKey,
        requiresApiKey: !youtubeKey,
      },
      message: found
        ? `Berhasil menemukan ${presetLinks.length} preset Alight Motion dari sumber video dan komentar yang tersedia.`
        : !youtubeKey
          ? "Deskripsi video diperiksa. Untuk memindai komentar dan balasan YouTube, tambahkan YOUTUBE_API_KEY di Environment Variables Vercel."
          : youtubeCommentsUnavailable
            ? "Sebagian komentar YouTube tidak berhasil diakses oleh API."
            : `Sudah memeriksa ${youtubeCommentsScanned} komentar dan ${youtubeRepliesScanned} balasan, tetapi belum menemukan preset yang dikenali.` ,
      otherLinks: otherLinks.length > 0 ? otherLinks : undefined,
    },
  };
}


async function scrapeTikTok(url) {
  const cleanUrl = url.trim();
  let vData = null;
  let lastError = null;

  // Ambil data video dan coba ulang jika layanan sedang membatasi request.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://www.tikwm.com/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
        },
        body: new URLSearchParams({ url: cleanUrl }).toString(),
        signal: AbortSignal.timeout(8000),
      });

      const json = await response.json();

      if ((json.code === 0 || json.code === "0") && json.data) {
        vData = json.data;
        break;
      }

      lastError = new Error(
        json.msg || "Gagal mengambil informasi video."
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 700));
    }
  }

  if (!vData) {
    throw lastError || new Error("Video TikTok tidak bisa diakses.");
  }

  const author = vData.author || {};
  const authorId = author.unique_id || "";
  const videoId = String(vData.id || "");

  const canonicalUrl =
    authorId && videoId
      ? `https://www.tiktok.com/@${authorId}/video/${videoId}`
      : cleanUrl;

  const scanItems = [];
  const seenComments = new Set();
  const seenReplies = new Set();
  const seenCursors = new Set();

  let commentCount = 0;
  let replyCount = 0;
  let commentPages = 0;
  let incomplete = false;

  if (vData.title) {
    scanItems.push({
      text: vData.title,
      pinned: false,
      byAuthor: true,
      sourceType: "description",
    });
  }

  function getCommentText(item) {
    const value = item?.text ?? item?.content ?? item?.comment ?? "";
    return typeof value === "string" ? value.trim() : "";
  }

  function getUserId(item) {
    const user = item?.user || item?.author || item?.user_info || {};
    return (
      user.unique_id ||
      user.uniqueId ||
      user.unique_id_str ||
      ""
    );
  }

  function addComment(item, sourceType = "comment") {
    const text = getCommentText(item);
    if (!text) return false;

    const id = String(
      item?.cid || item?.comment_id || item?.commentId || item?.id || ""
    );
    const userId = getUserId(item);
    const key = id || `${userId}:${text}`;

    const seen = sourceType === "reply" ? seenReplies : seenComments;

    if (seen.has(key)) return false;
    seen.add(key);

    scanItems.push({
  text,
  pinned: Boolean(
    item?.is_pinned ||
    item?.pinned ||
    item?.stick_position
  ),
  byAuthor: Boolean(authorId && userId === authorId),
  sourceType,
  commentId: String(
    item?.cid || item?.comment_id || item?.commentId || item?.id || ""
  ),
  replyTotal: Number(
    item?.reply_total || item?.reply_count || item?.reply_comment_total || item?.reply_comment_count || item?.replyCount || item?.total_reply_count || item?.totalReplyCount || 0
  ),
});

    if (sourceType === "reply") {
      replyCount++;
    } else {
      commentCount++;
    }

    return true;
  }

  async function fetchJson(endpoint, params) {
    const query = new URLSearchParams(params);
    const response = await fetch(
      `https://www.tikwm.com/api/${endpoint}?${query}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json",
          Referer: "https://www.tikwm.com/",
        },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!response.ok) {
      throw new Error(`Layanan komentar merespons HTTP ${response.status}`);
    }

    const json = await response.json();

    if (json.code !== 0 && json.code !== "0") {
      throw new Error(json.msg || "Gagal membaca komentar.");
    }

    return json.data;
  }

  function getItems(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.comments)) return data.comments;
    if (Array.isArray(data?.comment_list)) return data.comment_list;
    if (Array.isArray(data?.comments_list)) return data.comments_list;
    return [];
  }

  // Mengambil seluruh halaman komentar yang disediakan API.
  // Batas pengaman mencegah cursor yang rusak menyebabkan loop selamanya.
  let cursor = "0";

  for (let page = 0; page < 500; page++) {
    try {
      const data = await fetchJson("comment/list", {
        url: canonicalUrl,
        count: "50",
        cursor,
      });

      const comments = getItems(data);
      commentPages++;

      for (const comment of comments) {
        addComment(comment, "comment");
        const embeddedReplies = Array.isArray(comment?.replies)
          ? comment.replies
          : Array.isArray(comment?.reply_list)
            ? comment.reply_list
            : [];
        for (const reply of embeddedReplies) addComment(reply, "reply");
      }

      const hasMore = Boolean(data?.hasMore ?? data?.has_more ?? data?.has_more_comments);
      const nextCursor = data?.cursor ?? data?.next_cursor ?? data?.nextCursor;

      if (
        !hasMore ||
        nextCursor == null ||
        String(nextCursor) === cursor ||
        seenCursors.has(String(nextCursor))
      ) {
        break;
      }

      seenCursors.add(String(nextCursor));
      cursor = String(nextCursor);
    } catch (error) {
      incomplete = true;
      lastError = error;
      break;
    }
  }

  // Kumpulkan komentar yang mempunyai balasan.
  // Balasan juga dipaginasi sampai tidak ada halaman berikutnya.
  const replyTargets = Array.from(seenComments)
    .map(key => key)
    .map(key => {
      // scanItems menyimpan teks, jadi cari ID dari komentar asli
      // pada daftar yang dikumpulkan selama pemindaian.
      return key;
    });

  // Ambil ulang halaman komentar yang sudah tersimpan untuk
  // memperoleh ID dan jumlah balasan yang diperlukan endpoint reply.
  // ID komentar harus tersedia dari respons API.
  const replyJobs = [];

  // Ambil target balasan dari daftar komentar yang berhasil diproses.
  // Data ID disimpan terpisah supaya balasan tidak bergantung pada teks.
  // Jika API tidak mengembalikan ID, komentar tetap dipindai.
  //
  // Target ID dikumpulkan pada pemindaian komentar di bawah melalui
  // properti sementara yang diisi pada setiap item.
  const targets = scanItems
    .filter(item => item.sourceType === "comment" && item.commentId)
    .filter(item => Number(item.replyTotal || 0) > 0);

  for (const target of targets) {
    let replyCursor = "0";
    const replyCursors = new Set();

    for (let page = 0; page < 500; page++) {
      try {
        const data = await fetchJson("comment/reply", {
          comment_id: String(target.commentId),
          count: "50",
          cursor: replyCursor,
        });

        const replies = getItems(data);

        for (const reply of replies) {
          addComment(reply, "reply");
        }

        const hasMore = Boolean(data?.hasMore ?? data?.has_more ?? data?.has_more_comments);
        const nextCursor = data?.cursor ?? data?.next_cursor ?? data?.nextCursor;

        if (
          !hasMore ||
          nextCursor == null ||
          String(nextCursor) === replyCursor ||
          replyCursors.has(String(nextCursor))
        ) {
          break;
        }

        replyCursors.add(String(nextCursor));
        replyCursor = String(nextCursor);
      } catch {
        incomplete = true;
        break;
      }
    }
  }

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
      author: authorId ? `@${authorId}` : (author.nickname || ""),
      videoUrl: canonicalUrl,
      video: {
        id: videoId,
        url: canonicalUrl,
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
      scan: {
        comments: commentCount,
        replies: replyCount,
        commentPages,
        incomplete,
      },
      presetLinks,
      otherLinks: otherLinks.length ? otherLinks : undefined,
      message: found
        ? `Ditemukan ${presetLinks.length} preset dari ${commentCount} komentar dan ${replyCount} balasan.`
        : incomplete
          ? `Pemindaian belum lengkap: ${commentCount} komentar dan ${replyCount} balasan berhasil diperiksa. Layanan komentar membatasi atau gagal merespons.`
          : `Sudah memeriksa ${commentCount} komentar dan ${replyCount} balasan, tetapi belum menemukan link preset yang dikenali.`,
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

  // Scan comments/replies only when the public response actually provides them.
  const commentEdges =
    item.edge_media_to_parent_comment?.edges ||
    item.edge_media_to_comment?.edges ||
    item.comments?.edges ||
    [];
  for (const edge of commentEdges) {
    const comment = edge?.node || edge;
    const text = comment?.text || comment?.comment_text || "";
    if (text) scanItems.push({ text, pinned: false, byAuthor: false, sourceType: "comment" });

    const replies = comment?.edge_threaded_comments?.edges || comment?.replies?.edges || [];
    for (const replyEdge of replies) {
      const reply = replyEdge?.node || replyEdge;
      const replyText = reply?.text || reply?.comment_text || "";
      if (replyText) scanItems.push({ text: replyText, pinned: false, byAuthor: false, sourceType: "reply" });
    }
  }

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