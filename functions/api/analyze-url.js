// functions/api/analyze-url.js

// ── 平台偵測 ──────────────────────────────────────────────
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

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return PLATFORM_MAP[host] || "Website";
  } catch {
    return "Website";
  }
}

// ── URL 正規化（移除 tracking params）────────────────────
function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    const remove = [
      "utm_source", "utm_medium", "utm_campaign",
      "utm_content", "utm_term", "fbclid", "igshid",
      "ref", "share",
    ];
    remove.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return raw;
  }
}

// ── SHA-256 hash（用於 analysis_id 與快取 key）───────────
async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24); // 只取前 24 碼，夠用且短
}

// ── 快取讀寫（ANALYSIS_CACHE = Cloudflare KV binding）────
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
    // TTL 24 小時
    await env.ANALYSIS_CACHE.put(analysisId, JSON.stringify(data), {
      expirationTtl: 86400,
    });
  } catch {
    // 快取失敗不中斷主流程
  }
}

// ── 抓 metadata（og:title / og:description / title）──────
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
        "User-Agent":
          "Mozilla/5.0 (compatible; TravelReelsBot/1.0; +https://github.com)",
      },
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
    });

    if (!res.ok) return result;

    const html = await res.text();

    const get = (pattern) => {
      const m = html.match(pattern);
      if (!m) return null;
      return m[1]
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim()
        .slice(0, 500);
    };

    result.ogTitle =
      get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

    result.ogDescription =
      get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);

    result.title = get(/<title[^>]*>([^<]+)<\/title>/i);

    result.description =
      get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  } catch {
    // scrape 失敗回空值即可，不中斷
  }

  return result;
}

// ── Heuristic 分類（不花 token）──────────────────────────
const CITY_MAP = {
  東京: "tokyo", 京都: "kyoto", 大阪: "osaka", 奈良: "nara",
  沖繩: "okinawa", 北海道: "hokkaido", 福岡: "fukuoka",
  台北: "taipei", 台中: "taichung", 台南: "tainan", 高雄: "kaohsiung",
  首爾: "seoul", 釜山: "busan",
  tokyo: "tokyo", kyoto: "kyoto", osaka: "osaka", nara: "nara",
  okinawa: "okinawa", hokkaido: "hokkaido", fukuoka: "fukuoka",
  taipei: "taipei", taichung: "taichung", tainan: "tainan",
  kaohsiung: "kaohsiung", seoul: "seoul", busan: "busan",
};

const EVENT_KEYWORDS = [
  "活動", "展覽", "演唱會", "音樂節", "市集", "節慶", "開幕",
  "講座", "祭", "花火", "煙火", "限定", "快閃",
  "event", "festival", "concert", "exhibition", "market",
  "fair", "workshop", "popup", "pop-up",
];

const SPOT_KEYWORDS = [
  "餐廳", "咖啡", "景點", "美食", "小吃", "住宿", "飯店",
  "旅館", "海灘", "公園", "博物館", "夜市", "老街", "神社",
  "寺", "瀑布", "溫泉", "onsen",
  "restaurant", "cafe", "coffee", "hotel", "beach",
  "park", "museum", "street food", "shrine", "temple",
];

function cheapHeuristicAnalysis({ sourceTitle, sourcePlatform, mergedText, cityHint, typeHint }) {
  const text = mergedText.toLowerCase();

  // 強制 hint
  let contentKind = null;
  if (typeHint === "event") contentKind = "event";
  if (typeHint === "spot") contentKind = "spot";

  // Keyword 計分
  let eventScore = 0;
  let spotScore = 0;
  EVENT_KEYWORDS.forEach((k) => { if (text.includes(k)) eventScore++; });
  SPOT_KEYWORDS.forEach((k) => { if (text.includes(k)) spotScore++; });

  if (!contentKind) {
    if (eventScore >= 2 && eventScore > spotScore) contentKind = "event";
    else if (spotScore >= 2 && spotScore > eventScore) contentKind = "spot";
    else if (eventScore === 1 && spotScore === 0) contentKind = "event";
    else if (spotScore === 1 && eventScore === 0) contentKind = "spot";
    else contentKind = "source_only";
  }

  // 信心度
  const maxScore = Math.max(eventScore, spotScore);
  let confidence = 0.3;
  if (maxScore >= 3) confidence = 0.85;
  else if (maxScore === 2) confidence = 0.72;
  else if (maxScore === 1) confidence = 0.55;
  if (typeHint) confidence = Math.max(confidence, 0.8);

  // 城市偵測
  let citySlug = cityHint || null;
  if (!citySlug) {
    for (const [keyword, slug] of Object.entries(CITY_MAP)) {
      if (text.includes(keyword.toLowerCase())) {
        citySlug = slug;
        break;
      }
    }
  }

  return {
    sourceTitle,
    sourcePlatform,
    contentKind,
    citySlug: citySlug || null,
    area: null,
    confidence,
    needsReview: confidence < 0.7,
    summary: "",
    items: [],
  };
}

// ── 判斷是否需要打 OpenAI ─────────────────────────────────
function shouldUseOpenAI(heuristic, mergedText) {
  // 信心度夠高，直接用 heuristic
  if (heuristic.confidence >= 0.75) return false;
  // 沒有任何文字可分析，打了也沒用
  if (!mergedText || mergedText.length < 20) return false;
  // 其餘情況才打 OpenAI
  return true;
}

// ── 呼叫 OpenAI（只有必要時）─────────────────────────────
async function callOpenAI(apiKey, url, mergedText) {
  const prompt = `你是旅遊資訊萃取助手。請分析以下內容，回傳 JSON（不要有任何其他文字）。

URL: ${url}
內容: ${mergedText.slice(0, 800)}

回傳格式：
{
  "contentKind": "spot" | "event" | "source_only",
  "citySlug": "tokyo" | "osaka" | "kyoto" | "taipei" | "seoul" 等小寫英文，不確定填 null,
  "area": "區域名或 null",
  "confidence": 0.0~1.0,
  "needsReview": true | false,
  "summary": "一句話中文摘要",
  "items": [
    {
      "name": "景點或活動名稱",
      "area": "區域或 null",
      "category": "類別",
      "description": "簡短說明"
    }
  ]
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 600,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "OpenAI error");

  const raw = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(raw);
}

// ── 主 handler ────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };

  // 1. 解析 body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ message: "Invalid JSON" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const rawUrl = String(body?.url || "").trim();
  const hints = body?.hints || {};

  // 2. 驗證 URL
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    return new Response(
      JSON.stringify({ message: "url 不可空白，且必須是 http/https 網址。" }),
      { status: 400, headers: corsHeaders }
    );
  }

  // 3. 驗證 OpenAI key（先確認有設定，即使不一定用到）
  if (!env.OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ message: "OPENAI_API_KEY 尚未設定。" }),
      { status: 500, headers: corsHeaders }
    );
  }

  // 4. URL 正規化 + analysis_id
  const normalizedUrl = normalizeUrl(rawUrl);
  const analysisId = await sha256(normalizedUrl);

  // 5. 查快取
  const cached = await getCachedAnalysis(env, analysisId);
  if (cached) {
    return new Response(
      JSON.stringify({ ...cached, cached: true, analysis_id: analysisId }),
      { status: 200, headers: corsHeaders }
    );
  }

  // 6. 抓 metadata
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

  // 7. Heuristic 判斷
  const heuristic = cheapHeuristicAnalysis({
    sourceTitle,
    sourcePlatform,
    mergedText,
    cityHint: hints.citySlug || "",
    typeHint: hints.type || "",
  });

  // 8. 決定是否打 OpenAI
  let result = { ...heuristic };
  let usedAI = false;

  if (shouldUseOpenAI(heuristic, mergedText)) {
    try {
      const aiResult = await callOpenAI(env.OPENAI_API_KEY, normalizedUrl, mergedText);
      // 合併：AI 結果優先，但 sourceTitle / sourcePlatform 保留 scrape 的
      result = {
        sourceTitle,
        sourcePlatform,
        contentKind: aiResult.contentKind || heuristic.contentKind,
        citySlug: aiResult.citySlug || heuristic.citySlug || null,
        area: aiResult.area || null,
        confidence: aiResult.confidence ?? heuristic.confidence,
        needsReview: aiResult.needsReview ?? true,
        summary: aiResult.summary || "",
        items: Array.isArray(aiResult.items) ? aiResult.items : [],
      };
      usedAI = true;
    } catch (e) {
      // OpenAI 失敗 → fallback 到 heuristic，不中斷
      result.needsReview = true;
    }
  }

  // 9. 寫快取
  await setCachedAnalysis(env, analysisId, result);

  // 10. 回傳
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
