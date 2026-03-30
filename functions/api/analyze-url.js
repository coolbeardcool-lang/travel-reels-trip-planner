import { CITY_ALIASES } from "./city-aliases.js";

const PLATFORM_MAP = {
  "instagram.com": "Instagram",
  "threads.net": "Threads",
  "facebook.com": "Facebook",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "tiktok.com": "TikTok",
  "twitter.com": "Twitter",
  "x.com": "Twitter",
};

const CITY_ALIAS_MAP = CITY_ALIASES.reduce((acc, entry) => {
  const alias = String(entry?.alias || "").trim().toLowerCase();
  const slug = String(entry?.slug || "").trim().toLowerCase();
  if (alias && slug) acc[alias] = slug;
  if (slug) acc[slug] = slug;
  return acc;
}, {});

const EVENT_KEYWORDS = [
  "活動",
  "展覽",
  "演唱會",
  "音樂節",
  "市集",
  "節慶",
  "開幕",
  "講座",
  "祭",
  "花火",
  "煙火",
  "限定",
  "快閃",
  "event",
  "festival",
  "concert",
  "exhibition",
  "market",
  "fair",
  "workshop",
  "popup",
  "pop-up",
];

const SPOT_KEYWORDS = [
  "餐廳",
  "咖啡",
  "景點",
  "美食",
  "小吃",
  "住宿",
  "飯店",
  "旅館",
  "海灘",
  "公園",
  "博物館",
  "夜市",
  "老街",
  "神社",
  "寺",
  "瀑布",
  "溫泉",
  "restaurant",
  "cafe",
  "coffee",
  "hotel",
  "beach",
  "park",
  "museum",
  "street food",
  "shrine",
  "temple",
  "onsen",
];

const ITEM_STOPWORDS = new Set([
  "instagram",
  "reel",
  "threads",
  "facebook",
  "youtube",
  "tiktok",
  "twitter",
  "x",
  "travel",
  "trip",
  "vlog",
  "推薦",
  "分享",
  "旅遊",
  "景點",
  "活動",
  "美食",
]);

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return PLATFORM_MAP[host] || "Website";
  } catch {
    return "Website";
  }
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    const remove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "igshid",
      "ref",
      "share",
    ];
    remove.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return raw;
  }
}

async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

async function getCachedAnalysis(env, analysisId) {
  if (!env.ANALYSIS_CACHE) return null;
  try {
    return await env.ANALYSIS_CACHE.get(analysisId, { type: "json" });
  } catch {
    return null;
  }
}

async function setCachedAnalysis(env, analysisId, data) {
  if (!env.ANALYSIS_CACHE) return;
  try {
    await env.ANALYSIS_CACHE.put(analysisId, JSON.stringify(data), {
      expirationTtl: 86400,
    });
  } catch {}
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    )
    .trim()
    .slice(0, 500);
}

async function scrapeUrl(url) {
  const result = {
    title: null,
    description: null,
    ogTitle: null,
    ogDescription: null,
  };

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TravelReelsBot/1.0)",
      },
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
    });

    if (!res.ok) return result;

    const html = await res.text();

    const get = (pattern) => {
      const match = html.match(pattern);
      if (!match) return null;
      return decodeHtmlEntities(match[1]);
    };

    result.ogTitle =
      get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

    result.ogDescription =
      get(
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
      ) ||
      get(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i
      );

    result.title = get(/<title[^>]*>([^<]+)<\/title>/i);

    result.description =
      get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  } catch {}

  return result;
}

function normalizeCitySlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function inferCitySlug(text, cityHint) {
  const normalizedHint = normalizeCitySlug(cityHint);
  if (normalizedHint) {
    return CITY_ALIAS_MAP[normalizedHint] || normalizedHint;
  }

  const normalizedText = String(text || "").toLowerCase();
  for (const [keyword, slug] of Object.entries(CITY_ALIAS_MAP)) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      return slug;
    }
  }

  const cityTokenMatch = normalizedText.match(
    /([\u4e00-\u9fff]{2,8})(?:市|縣|鄉|鎮|區)/
  );
  if (cityTokenMatch) {
    return normalizeCitySlug(cityTokenMatch[1]);
  }

  return null;
}

function inferContentKind({ eventScore, spotScore, typeHint }) {
  if (typeHint === "event") return "event";
  if (typeHint === "spot") return "spot";

  if (eventScore > 0 && spotScore > 0) {
    return "mixed";
  }
  if (eventScore >= 2 && eventScore > spotScore) return "event";
  if (spotScore >= 2 && spotScore > eventScore) return "spot";
  if (eventScore === 1 && spotScore === 0) return "event";
  if (spotScore === 1 && eventScore === 0) return "spot";
  return "source_only";
}

function inferHeuristicConfidence({ eventScore, spotScore, contentKind, typeHint }) {
  let confidence = 0.3;
  const maxScore = Math.max(eventScore, spotScore);

  if (contentKind === "mixed") {
    confidence = 0.62;
  } else if (maxScore >= 3) {
    confidence = 0.85;
  } else if (maxScore === 2) {
    confidence = 0.72;
  } else if (maxScore === 1) {
    confidence = 0.55;
  }

  if (typeHint) confidence = Math.max(confidence, 0.8);
  return confidence;
}

function buildHeuristicReviewReason({ confidence, contentKind, mergedText }) {
  if (!mergedText) return "no textual evidence available";
  if (contentKind === "mixed") return "mixed spot/event signals detected";
  if (contentKind === "source_only") return "insufficient evidence for structured item extraction";
  if (confidence < 0.7) return "heuristic confidence below threshold";
  return null;
}

function detectItemKindFromText(text, fallback) {
  const lower = String(text || "").toLowerCase();
  const hasEvent = EVENT_KEYWORDS.some((k) => lower.includes(k));
  const hasSpot = SPOT_KEYWORDS.some((k) => lower.includes(k));
  if (hasEvent && hasSpot) return "source_only";
  if (hasEvent) return "event";
  if (hasSpot) return "spot";
  return fallback === "mixed" ? "source_only" : fallback;
}

function inferSpotCategory(text) {
  const v = String(text || "").toLowerCase();
  if (/(咖啡|cafe|coffee)/i.test(v)) return "咖啡";
  if (/(甜點|蛋糕|dessert)/i.test(v)) return "甜點";
  if (/(夜市)/i.test(v)) return "夜市";
  if (/(餐廳|restaurant|食堂|火鍋|燒肉|壽司|牛排)/i.test(v)) return "餐廳";
  if (/(小吃|麵|肉圓|羊肉|滷肉飯|豆花|米糕|鹽酥雞|food)/i.test(v)) return "小吃";
  return "景點";
}

function inferAreaFromText(text) {
  const match = String(text || "").match(/([\u4e00-\u9fff]{2,8}(?:鄉|鎮|市|區))/);
  return match ? match[1] : null;
}

function inferThumbnailByCategory(category, itemKind) {
  const map = {
    餐廳: "🍽️",
    小吃: "🍢",
    咖啡: "☕",
    甜點: "🍰",
    夜市: "🏮",
    景點: "📍",
    活動: "🎫",
  };
  return map[category] || (itemKind === "event" ? "🎫" : "📍");
}

function normalizeCandidateName(value) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#＠@][\w\u4e00-\u9fff_-]+/g, " ")
    .replace(/[|｜]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function extractCandidatesFromText(mergedText) {
  const text = String(mergedText || "");
  if (!text) return [];

  const candidates = [];
  const lineLikeParts = text
    .split(/[\n\r]+|(?<=[。！？!?.])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  candidates.push(...lineLikeParts);

  const numberedRegex = /(?:^|[\n\r])\s*(?:\d{1,2}[.)、]|[•●▪\-])\s*([^\n\r]+)/g;
  let match;
  while ((match = numberedRegex.exec(text))) {
    candidates.push(match[1]);
  }

  const inlineNumberedRegex = /(?:^|\s)\d{1,2}[.)、]\s*([^0-9]{2,80}?)(?=(?:\s+\d{1,2}[.)、])|$)/g;
  while ((match = inlineNumberedRegex.exec(text))) {
    candidates.push(match[1]);
  }

  return candidates;
}

function buildHeuristicItems({ mergedText, contentKind, citySlug, area, confidence }) {
  const seen = new Set();
  const candidates = extractCandidatesFromText(mergedText);
  const items = [];

  for (const raw of candidates) {
    const name = normalizeCandidateName(raw);
    const lower = name.toLowerCase();
    if (!name || name.length < 2) continue;
    if (name.length > 60) continue;
    if (ITEM_STOPWORDS.has(lower)) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);

    const itemKind = detectItemKindFromText(name, contentKind);
    const inferredCity = inferCitySlug(lower, citySlug);
    const category = itemKind === "event" ? "活動" : inferSpotCategory(name);
    const areaFromText = inferAreaFromText(name);
    const tags = [category];
    if (areaFromText) tags.push(areaFromText);
    if (inferredCity) tags.push(inferredCity);
    const mapQuery = encodeURIComponent(
      [name, areaFromText || "", inferredCity || ""].filter(Boolean).join(" ")
    );

    items.push({
      id: `heuristic-item-${items.length + 1}`,
      name,
      itemKind,
      item_kind: itemKind,
      category,
      description: "",
      tags,
      citySlug: inferredCity || null,
      city_slug: inferredCity || null,
      area: areaFromText || area || null,
      best_time: null,
      stay_minutes: null,
      starts_on: null,
      ends_on: null,
      start_time: "",
      end_time: "",
      lat: null,
      lng: null,
      map_url: mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null,
      official_url: null,
      venue_name: null,
      price_note: null,
      ticket_type: null,
      thumbnail: inferThumbnailByCategory(category, itemKind),
      itemConfidence: Math.min(confidence, 0.58),
      item_confidence: Math.min(confidence, 0.58),
      sourceCredibility: "low",
      source_credibility: "low",
      needsReview: true,
      needs_review: true,
      reviewReason: "heuristic extraction from limited source text",
      review_reason: "heuristic extraction from limited source text",
      evidence: [{ type: "metadata", value: name }],
      reason: "Derived from source text segment only.",
    });

    if (items.length >= 8) break;
  }

  return items;
}

function cheapHeuristicAnalysis({
  sourceTitle,
  sourcePlatform,
  mergedText,
  cityHint,
  typeHint,
}) {
  const text = String(mergedText || "").toLowerCase();

  let eventScore = 0;
  let spotScore = 0;

  EVENT_KEYWORDS.forEach((k) => {
    if (text.includes(k)) eventScore += 1;
  });

  SPOT_KEYWORDS.forEach((k) => {
    if (text.includes(k)) spotScore += 1;
  });

  const contentKind = inferContentKind({ eventScore, spotScore, typeHint });
  const confidence = inferHeuristicConfidence({
    eventScore,
    spotScore,
    contentKind,
    typeHint,
  });
  const citySlug = inferCitySlug(text, cityHint || null);
  const reviewReason = buildHeuristicReviewReason({
    confidence,
    contentKind,
    mergedText,
  });
  const items = buildHeuristicItems({
    mergedText,
    contentKind,
    citySlug: citySlug || null,
    area: null,
    confidence,
  });

  return {
    schemaVersion: "2.0",
    sourceTitle,
    sourcePlatform,
    contentKind,
    citySlug: citySlug || null,
    area: null,
    confidence,
    needsReview: Boolean(reviewReason),
    summary: "",
    reviewReason,
    sourceCredibility: mergedText?.length > 120 ? "medium" : "low",
    source_credibility: mergedText?.length > 120 ? "medium" : "low",
    extractionMode: "metadata_plus_notes",
    extraction_mode: "metadata_plus_notes",
    sourceEvidence: mergedText
      ? [{ type: "metadata", value: mergedText.slice(0, 220) }]
      : [],
    source_evidence: mergedText
      ? [{ type: "metadata", value: mergedText.slice(0, 220) }]
      : [],
    items,
  };
}

function shouldUseOpenAI(heuristic, mergedText) {
  if (!mergedText || mergedText.length < 20) return false;
  if (heuristic.contentKind === "mixed") return true;
  if (heuristic.confidence >= 0.8 && !heuristic.needsReview) return false;
  return true;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeEvidenceArray(value, fallbackText = "") {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => {
        if (typeof entry === "string") {
          const text = entry.trim();
          return text ? { type: "note", value: text } : null;
        }
        if (!entry || typeof entry !== "object") return null;

        const type = String(entry.type || entry.kind || "note").trim();
        const text = String(entry.value || entry.text || "").trim();

        if (!text) return null;
        return { type, value: text.slice(0, 300) };
      })
      .filter(Boolean);

    if (normalized.length) return normalized;
  }

  if (fallbackText) {
    return [{ type: "metadata", value: String(fallbackText).slice(0, 220) }];
  }

  return [];
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeConfidence(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}

function inferItemKind(item, fallbackContentKind) {
  const explicit = String(item?.itemKind || item?.item_kind || "").trim();
  if (explicit === "spot" || explicit === "event" || explicit === "source_only") {
    return explicit;
  }

  if (
    item?.starts_on ||
    item?.ends_on ||
    item?.start_time ||
    item?.end_time ||
    item?.price_note ||
    item?.ticket_type ||
    item?.venue_name
  ) {
    return "event";
  }

  if (fallbackContentKind === "spot" || fallbackContentKind === "event") {
    return fallbackContentKind;
  }

  return "source_only";
}

function normalizeAIItem(item, index, fallbackContentKind, fallbackCitySlug, fallbackArea, fallbackText) {
  const itemKind = inferItemKind(item, fallbackContentKind);
  const citySlug = item?.citySlug || item?.city_slug || fallbackCitySlug || null;
  const sourceCredibility =
    item?.sourceCredibility ||
    item?.source_credibility ||
    "medium";
  const itemConfidence = normalizeConfidence(
    item?.itemConfidence ?? item?.item_confidence,
    0.55
  );
  const needsReview =
    item?.needsReview !== false && item?.needs_review !== false;
  const reviewReason =
    item?.reviewReason ||
    item?.review_reason ||
    (needsReview ? "item evidence requires review" : null);
  const stayMinutesRaw = item?.stay_minutes;
  const stayMinutes =
    stayMinutesRaw === null || stayMinutesRaw === undefined || stayMinutesRaw === ""
      ? null
      : Number.isFinite(stayMinutesRaw)
        ? stayMinutesRaw
        : Number.isFinite(Number(stayMinutesRaw))
          ? Number(stayMinutesRaw)
          : null;
  const normalizedName = String(item?.name || "").trim();

  return {
    id: item?.id || `analysis-item-${index + 1}`,
    name: normalizedName || null,
    itemKind,
    item_kind: itemKind,
    category: String(
      item?.category || (itemKind === "event" ? "活動" : itemKind === "spot" ? "景點" : "")
    ).trim(),
    description: String(item?.description || "").trim(),
    tags: normalizeStringArray(item?.tags),
    citySlug,
    city_slug: citySlug,
    area: String(item?.area || fallbackArea || "").trim() || null,
    best_time: item?.best_time || null,
    stay_minutes: stayMinutes,
    starts_on: item?.starts_on || null,
    ends_on: item?.ends_on || null,
    start_time: item?.start_time || "",
    end_time: item?.end_time || "",
    lat: normalizeNullableNumber(item?.lat),
    lng: normalizeNullableNumber(item?.lng),
    map_url: item?.map_url || null,
    official_url: item?.official_url || null,
    venue_name: item?.venue_name || null,
    price_note: item?.price_note || null,
    ticket_type: item?.ticket_type || null,
    thumbnail: item?.thumbnail || null,
    itemConfidence,
    item_confidence: itemConfidence,
    sourceCredibility,
    source_credibility: sourceCredibility,
    needsReview,
    needs_review: needsReview,
    reviewReason,
    review_reason: reviewReason,
    evidence: normalizeEvidenceArray(item?.evidence, fallbackText),
    reason: String(item?.reason || "").trim(),
  };
}

function normalizeAIResult(aiResult, heuristic, sourceTitle, sourcePlatform, mergedText) {
  const contentKindRaw =
    aiResult?.contentKind || aiResult?.content_kind || heuristic.contentKind;
  const contentKind =
    contentKindRaw === "spot" ||
    contentKindRaw === "event" ||
    contentKindRaw === "mixed" ||
    contentKindRaw === "source_only"
      ? contentKindRaw
      : heuristic.contentKind;

  const citySlug =
    aiResult?.citySlug || aiResult?.city_slug || heuristic.citySlug || null;
  const area = aiResult?.area || heuristic.area || null;
  const confidence = normalizeConfidence(
    aiResult?.confidence,
    heuristic.confidence
  );
  const needsReview =
    aiResult?.needsReview !== false && aiResult?.needs_review !== false;
  const reviewReason =
    aiResult?.reviewReason ||
    aiResult?.review_reason ||
    heuristic.reviewReason ||
    null;
  const sourceCredibility =
    aiResult?.sourceCredibility ||
    aiResult?.source_credibility ||
    heuristic.sourceCredibility ||
    "medium";
  const extractionMode =
    aiResult?.extractionMode ||
    aiResult?.extraction_mode ||
    heuristic.extractionMode ||
    "mixed";
  const sourceEvidence = normalizeEvidenceArray(
    aiResult?.sourceEvidence || aiResult?.source_evidence,
    mergedText
  );

  const itemsRaw = Array.isArray(aiResult?.items) ? aiResult.items : [];
  const items = itemsRaw.map((item, index) =>
    normalizeAIItem(item, index, contentKind, citySlug, area, mergedText)
  );

  return {
    schemaVersion: "2.0",
    sourceTitle,
    sourcePlatform,
    contentKind,
    citySlug,
    area,
    confidence,
    needsReview,
    summary: String(aiResult?.summary || "").trim(),
    reviewReason,
    sourceCredibility,
    source_credibility: sourceCredibility,
    extractionMode,
    extraction_mode: extractionMode,
    sourceEvidence,
    source_evidence: sourceEvidence,
    items,
  };
}

async function callOpenAI(apiKey, url, mergedText, contentKindHint, platformHint) {
  const prompt = `
你是旅遊資訊萃取助手。
請根據提供的 URL 與文字內容，輸出單一 JSON 物件，不要有任何其他文字。

規則：
1. 盡量列出內容中所有提到的景點、餐廳、活動、地點，即使只有簡短提及也要列出。
2. 每個 item 必須給 priority 欄位（1=最值得關注，數字越大越次要），由最可能讓旅客感興趣的排在最前面。
3. 不確定時請填 null、空陣列，或 needsReview=true。
4. 座標（lat/lng）：若你對該地點的位置有高度把握（知名景點、連鎖店、市場、車站），請直接填入十進位座標（精確至小數點後4位）；不確定時填 null，勿猜測。
5. 若同一來源提到多個獨立地點，請全部拆成獨立 item，每個 item 對應一個實體店家或景點；但若是同一店家的分店（相同店名、不同地址/區域），每個分店各為獨立 item，並在 area 填入各自所在區域；同一店家同一地點的子項目（如套餐多道菜、市場內的攤位），請合併為一個 item 並在 description 補充細節。名稱來自社群貼文 caption 或留言時，每行獨立意義的店名各為一個 item，不要將多行合併或截斷。
6. 若同時有景點與活動，contentKind 請填 "mixed"，且每個 item 都要有 itemKind。
7. 每個 item 都要附 evidence 陣列，指出資訊來源。
8. 若資料太弱，不要硬造 item，可回傳空 items，並將 contentKind 設為 "source_only"。
9. 語言：name/area/description 必須包含繁體中文。若有原始語言，可附加於中文後作補充（格式：「中文名 (原文)」），品牌英文名或固有名詞例外。
10. thumbnail：依景點實際內容選擇合適 emoji（如 🏪市場/夜市、🥩燒烤/牛肉、☕咖啡廳、🍜麵食、🍰甜點、🛍️購物、⛩️寺廟、🏖️海灘、🏛️博物館、🎭活動），禁止使用 📍（除非完全無法判斷類型）。
11. area：必須是繁體中文地區名稱（如「望遠洞」、「弘大周邊」、「新世界」）；禁止填寫行政代碼（如「Mapo-gu」）或英文地名；不確定時填城市名稱。

URL: ${url}
平台提示: ${platformHint}
初步判斷: ${contentKindHint}
內容:
${String(mergedText || "").slice(0, 2000)}

輸出格式：
{
  "contentKind": "spot" | "event" | "mixed" | "source_only",
  "citySlug": "tokyo" | "kyoto" | "osaka" | "nara" | "okinawa" | "hokkaido" | "fukuoka" | "taipei" | "taichung" | "tainan" | "kaohsiung" | "seoul" | "busan" | null,
  "area": "string | null",
  "confidence": 0.0,
  "needsReview": true,
  "summary": "一句話中文摘要，可為空字串",
  "reviewReason": "string | null",
  "sourceCredibility": "high" | "medium" | "low",
  "extractionMode": "metadata_only" | "metadata_plus_notes" | "mixed" | "audio_visual",
  "sourceEvidence": [
    { "type": "metadata | title | description | caption | audio | visual_text | notes", "value": "string" }
  ],
  "items": [
    {
      "name": "string",
      "itemKind": "spot" | "event" | "source_only",
      "category": "string",
      "description": "string",
      "tags": ["string"],
      "citySlug": "string | null",
      "area": "string | null",
      "best_time": "string | null",
      "stay_minutes": 0,
      "starts_on": null,
      "ends_on": null,
      "start_time": "",
      "end_time": "",
      "lat": 35.6762,
      "lng": 139.6503,
      "map_url": null,
      "official_url": null,
      "venue_name": null,
      "price_note": null,
      "ticket_type": null,
      "thumbnail": null,
      "priority": 1,
      "itemConfidence": 0.0,
      "sourceCredibility": "high" | "medium" | "low",
      "needsReview": true,
      "reviewReason": "string | null",
      "evidence": [
        { "type": "metadata | title | description | caption | audio | visual_text | notes", "value": "string" }
      ],
      "reason": "string"
    }
  ]
}
  `.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2400,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "OpenAI error");
  }

  const content = data?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed.items)) {
    parsed.items = parsed.items.filter((item) => {
      const name = String(item?.name || "").trim();
      if (name.length < 2) return false;
      if (/[\r\n]/.test(name)) return false;
      return true;
    });
  }
  return parsed;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const rawUrl = String(body?.url || "").trim();
  const hints = body?.hints || {};

  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    return new Response(
      JSON.stringify({ message: "url 不可空白，且必須是 http/https 網址。" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const normalizedUrl = normalizeUrl(rawUrl);
  const analysisId = await sha256(normalizedUrl);

  const cached = await getCachedAnalysis(env, analysisId);
  if (cached) {
    return new Response(
      JSON.stringify({
        ...cached,
        cached: true,
        analysis_id: analysisId,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  const scraped = await scrapeUrl(normalizedUrl);
  const sourcePlatform = detectPlatform(normalizedUrl);
  const sourceTitle =
    String(hints.title || "").trim() ||
    scraped.ogTitle ||
    scraped.title ||
    "未命名來源";

  const mergedText = [
    sourceTitle,
    scraped.ogTitle,
    scraped.ogDescription,
    scraped.title,
    scraped.description,
    hints.notes || "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const heuristic = cheapHeuristicAnalysis({
    sourceTitle,
    sourcePlatform,
    mergedText,
    cityHint: hints.citySlug || "",
    typeHint: hints.type || "",
  });

  let result = { ...heuristic };
  let usedAI = false;

  if (shouldUseOpenAI(heuristic, mergedText) && env.OPENAI_API_KEY) {
    try {
      const aiResult = await callOpenAI(
        env.OPENAI_API_KEY,
        normalizedUrl,
        mergedText,
        heuristic.contentKind,
        sourcePlatform
      );

      result = normalizeAIResult(
        aiResult,
        heuristic,
        sourceTitle,
        sourcePlatform,
        mergedText
      );
      usedAI = true;
    } catch {
      result = {
        ...heuristic,
        needsReview: true,
        reviewReason: heuristic.reviewReason || "ai parsing failed; fallback to heuristic result",
      };
    }
  } else if (shouldUseOpenAI(heuristic, mergedText) && !env.OPENAI_API_KEY) {
    result = {
      ...heuristic,
      needsReview: true,
      reviewReason:
        heuristic.reviewReason || "OPENAI_API_KEY not set; fallback to heuristic result",
    };
  }

  await setCachedAnalysis(env, analysisId, result);

  return new Response(
    JSON.stringify({
      ...result,
      cached: false,
      analysis_id: analysisId,
      _usedAI: usedAI,
    }),
    { status: 200, headers: corsHeaders }
  );
}
