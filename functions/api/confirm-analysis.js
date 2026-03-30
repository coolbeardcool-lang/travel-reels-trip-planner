// functions/api/confirm-analysis.js
import { CITY_SLUG_MAP } from "../../src/utils/citySlugMap.js";

const NOTION_VERSION = "2025-09-03";

// Nominatim 使用政策：需帶 User-Agent，最多 1 req/sec
const NOMINATIM_USER_AGENT = "TravelReelsTripPlanner/1.0 (https://travel-reels-trip-planner.pages.dev)";

// citySlug → ISO 3166-1 alpha-2，讓 Nominatim 優先搜同國結果
const CITY_COUNTRY_CODES = {
  kyoto: "jp", osaka: "jp", tokyo: "jp", nara: "jp",
  fukuoka: "jp", hokkaido: "jp", okinawa: "jp",
  taipei: "tw", taichung: "tw", tainan: "tw", kaohsiung: "tw",
  seoul: "kr", busan: "kr",
};

// 1 秒延遲，遵守 Nominatim 使用限制
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 用景點名稱 + 城市向 Nominatim 查詢座標
 * 回傳 { lat, lng } 或 null（失敗時不中斷主流程）
 */
async function geocodeWithNominatim(name, area, citySlug, cityLabel) {
  try {
    const countryCode = CITY_COUNTRY_CODES[citySlug] || null;
    // 組合查詢字串：景點名 + 區域 + 城市，越精確越好
    const queryParts = [name, area, cityLabel].filter(Boolean);
    const q = encodeURIComponent(queryParts.join(", "));

    const params = new URLSearchParams({
      q: queryParts.join(", "),
      format: "json",
      limit: "1",
      "accept-language": "zh,en",
    });
    if (countryCode) params.set("countrycodes", countryCode);

    // 用城市中心座標設定 viewbox（±0.5 度範圍），提升結果準確度
    const cityData = CITY_DATA_MAP[citySlug];
    if (cityData?.lat && cityData?.lng) {
      const d = 0.5;
      params.set("viewbox", `${cityData.lng - d},${cityData.lat + d},${cityData.lng + d},${cityData.lat - d}`);
      params.set("bounded", "0"); // 0 = viewbox 只是偏好，不強制限制
    }

    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { "User-Agent": NOMINATIM_USER_AGENT } }
    );

    if (!resp.ok) return null;
    const results = await resp.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    const { lat, lon } = results[0];
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lon);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
    return { lat: parsedLat, lng: parsedLng };
  } catch {
    return null; // geocoding 失敗不中斷寫入流程
  }
}

const CITY_DATA_MAP = {
  tokyo:     { label: "東京",   emoji: "🗼",  region: "日本", timezone: "Asia/Tokyo",  lat: 35.6762, lng: 139.6503, sort: 10,  heroArea: "新宿／澀谷",    spotlight: "購物,美食,文化",   description: "融合傳統與現代的大都市，購物、美食與文化密度極高。" },
  kyoto:     { label: "京都",   emoji: "⛩️",  region: "關西", timezone: "Asia/Tokyo",  lat: 35.0116, lng: 135.7681, sort: 20,  heroArea: "佛光寺周邊",    spotlight: "寺社,甜點,散步",   description: "寺社、散步、甜點與選物密度高，適合慢節奏安排。" },
  osaka:     { label: "大阪",   emoji: "🍢",  region: "關西", timezone: "Asia/Tokyo",  lat: 34.6937, lng: 135.5023, sort: 30,  heroArea: "新世界／通天閣",  spotlight: "小吃,商圈,夜生活", description: "小吃、商圈與夜間行程豐富，適合美食導向安排。" },
  nara:      { label: "奈良",   emoji: "🦌",  region: "關西", timezone: "Asia/Tokyo",  lat: 34.6851, lng: 135.8048, sort: 40,  heroArea: "奈良公園",      spotlight: "景點,自然,歷史",   description: "鹿群漫步的古都，世界遺產與自然景觀並存。" },
  fukuoka:   { label: "福岡",   emoji: "🍜",  region: "日本", timezone: "Asia/Tokyo",  lat: 33.5904, lng: 130.4017, sort: 50,  heroArea: "天神／博多",    spotlight: "拉麵,美食,購物",   description: "九州最大城市，拉麵與海鮮聞名，生活感十足。" },
  hokkaido:  { label: "北海道", emoji: "🐻",  region: "日本", timezone: "Asia/Tokyo",  lat: 43.0642, lng: 141.3469, sort: 60,  heroArea: "札幌市區",      spotlight: "自然,美食,滑雪",   description: "四季分明的北國，自然景觀與乳製品美食著稱。" },
  okinawa:   { label: "沖繩",   emoji: "🌺",  region: "日本", timezone: "Asia/Tokyo",  lat: 26.2124, lng: 127.6809, sort: 70,  heroArea: "國際通",        spotlight: "海灘,文化,美食",   description: "熱帶海島風情，珊瑚礁海灘與獨特琉球文化。" },
  taipei:    { label: "台北",   emoji: "🏙️",  region: "台灣", timezone: "Asia/Taipei", lat: 25.0330, lng: 121.5654, sort: 80,  heroArea: "大安／信義",    spotlight: "美食,夜市,文化",   description: "美食、夜市與文創密度極高，交通便利易遊。" },
  taichung:  { label: "台中",   emoji: "🌳",  region: "台灣", timezone: "Asia/Taipei", lat: 24.1477, lng: 120.6736, sort: 90,  heroArea: "審計新村",      spotlight: "文創,咖啡,美食",   description: "文創咖啡廳密集，氣候宜人適合悠閒散步。" },
  tainan:    { label: "台南",   emoji: "🏯",  region: "台灣", timezone: "Asia/Taipei", lat: 22.9999, lng: 120.2269, sort: 100, heroArea: "安平古堡周邊",  spotlight: "古蹟,小吃,歷史",   description: "台灣最古老城市，古蹟與傳統小吃文化深厚。" },
  kaohsiung: { label: "高雄",   emoji: "🌊",  region: "台灣", timezone: "Asia/Taipei", lat: 22.6273, lng: 120.3014, sort: 110, heroArea: "駁二藝術特區",  spotlight: "港口,文創,美食",   description: "港都風情濃厚，文創聚落與海港夜景值得一遊。" },
  seoul:     { label: "首爾",   emoji: "🇰🇷", region: "韓國", timezone: "Asia/Seoul",  lat: 37.5665, lng: 126.9780, sort: 120, heroArea: "望遠洞／弘大",    spotlight: "美食,市場,燒肉",   description: "市場小吃、韓牛燒烤與弘大街頭文化密集，適合美食導向安排。" },
  busan:     { label: "釜山",   emoji: "🌊",  region: "韓國", timezone: "Asia/Seoul",  lat: 35.1796, lng: 129.0756, sort: 130, heroArea: "海雲台",        spotlight: "海灘,美食,文化",   description: "韓國第二大城市，海灘、海鮮與山城景觀著稱。" },
};

// ── CitySlug 正規化 ────────────────────────────────────────
function normalizeCitySlug(raw) {
  const v = String(raw || "").trim();
  return CITY_SLUG_MAP[v] || v.toLowerCase().replace(/\s+/g, "-") || null;
}

// 名稱正規化（用於重複比對）
function normalizeName(name) {
  return String(name || "").toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\w]/g, "");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Nominatim 免費 Geocoding ───────────────────────────────
async function geocodeSpot(name, area, cityLabel, cityDefaults) {
  const query = [name, area, cityLabel].filter(Boolean).join(", ");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "User-Agent": "TravelReelsTripPlanner/1.0", "Accept-Language": "zh,ja,ko,en" }, signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng, confidence: "已確認", mapUrl: `https://www.google.com/maps?q=${lat},${lng}` };
        }
      }
    }
  } catch { clearTimeout(timer); /* timeout 或網路錯誤不中斷主流程 */ }
  return {
    lat: cityDefaults?.lat || 0,
    lng: cityDefaults?.lng || 0,
    confidence: "推定",
    mapUrl: null,
  };
}

// ── 重複記錄查詢（含 per-request 快取，減少 Notion API 呼叫）──
async function queryExistingByCity(env, dbId, citySlug, filterType, cache) {
  const key = `${dbId}:${citySlug}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const filter = filterType === "select"
      ? { property: "CitySlug", select: { equals: citySlug } }
      : { property: "CitySlug", rich_text: { equals: citySlug } };
    const res = await fetch(
      `https://api.notion.com/v1/data_sources/${dbId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION,
        },
        body: JSON.stringify({ page_size: 100, filter }),
      }
    );
    const results = res.ok ? ((await res.json()).results || []) : [];
    cache.set(key, results);
    return results;
  } catch {
    return [];
  }
}

async function findExistingRecord(env, dbId, name, citySlug, filterType, cache) {
  if (!dbId || !name) return null;
  const pages = await queryExistingByCity(env, dbId, citySlug, filterType, cache);
  const target = normalizeName(name);
  return pages.find((page) => {
    if (page.archived) return false;
    const pageName = (page.properties?.Name?.title || []).map((t) => t.plain_text || "").join("").trim();
    return normalizeName(pageName) === target;
  }) || null;
}

// ── 智慧合併：回傳需更新的欄位 ────────────────────────────
function buildMergedPatch(newProps, existingPage, kind = "spot") {
  const ep = existingPage.properties || {};
  const patch = {};

  // Description：取較長的
  const existDesc = (ep.Description?.rich_text || []).map((t) => t.plain_text || "").join("");
  const newDesc = (newProps.Description?.rich_text || []).map((t) => t.plain_text || "").join("");
  if (newDesc.length > existDesc.length) patch.Description = newProps.Description;

  // Tags：union
  const existTagStr = (ep.Tags?.rich_text || []).map((t) => t.plain_text || "").join("");
  const existTags = existTagStr.split(",").map((t) => t.trim()).filter(Boolean);
  const newTagStr = (newProps.Tags?.rich_text || []).map((t) => t.plain_text || "").join("");
  const newTags = newTagStr.split(",").map((t) => t.trim()).filter(Boolean);
  const mergedTags = [...new Set([...existTags, ...newTags])].join(", ");
  if (mergedTags !== existTagStr) patch.Tags = { rich_text: [{ text: { content: mergedTags.slice(0, 2000) } }] };

  if (kind === "spot") {
    // Thumbnail：非 📍 優先（Spot 專屬）
    const existThumb = (ep.Thumbnail?.rich_text || []).map((t) => t.plain_text || "").join("");
    const newThumb = (newProps.Thumbnail?.rich_text || []).map((t) => t.plain_text || "").join("");
    if (newThumb && newThumb !== "📍" && (!existThumb || existThumb === "📍")) patch.Thumbnail = newProps.Thumbnail;

    // PriorityScore：取最大（Spot 專屬）
    const existScore = ep.PriorityScore?.number || 0;
    const newScore = newProps.PriorityScore?.number || 0;
    if (newScore > existScore) patch.PriorityScore = newProps.PriorityScore;
  }

  // Notes：append（不重複）
  const existNotes = (ep.Notes?.rich_text || []).map((t) => t.plain_text || "").join("");
  const newNotes = (newProps.Notes?.rich_text || []).map((t) => t.plain_text || "").join("");
  if (newNotes && !existNotes.includes(newNotes)) {
    const combined = existNotes ? `${existNotes}\n---\n${newNotes}` : newNotes;
    patch.Notes = { rich_text: [{ text: { content: combined.slice(0, 2000) } }] };
  }

  // SourceLinks：append（不重複）
  const existLinks = (ep.SourceLinks?.rich_text || []).map((t) => t.plain_text || "").join("");
  const newLinks = (newProps.SourceLinks?.rich_text || []).map((t) => t.plain_text || "").join("");
  if (newLinks && !existLinks.includes(newLinks)) {
    const combined = existLinks ? `${existLinks}, ${newLinks}` : newLinks;
    patch.SourceLinks = { rich_text: [{ text: { content: combined.slice(0, 2000) } }] };
  }

  return patch;
}

export async function onRequestPost(context) {
  try {
    const env = context.env;
    const body = await context.request.json();

    const url = String(body?.url || "").trim();
    const sourceTitle = String(body?.sourceTitle || "").trim() || "未命名來源";
    const notes = String(body?.notes || "").trim();
    const analysis = body?.analysis || {};

    if (!url || !/^https?:\/\//i.test(url)) {
      return json({ message: "url 不可空白，且必須是 http/https 網址。" }, 400);
    }
    if (!analysis || typeof analysis !== "object") {
      return json({ message: "缺少 analysis，請先完成分析。" }, 400);
    }
    if (!analysis.contentKind || !analysis.sourcePlatform) {
      return json({ message: "analysis 格式不完整，請重新分析。" }, 400);
    }
    if (!env.NOTION_TOKEN || !env.NOTION_SOURCES_DATA_SOURCE_ID) {
      return json({ message: "Notion 環境變數尚未設定。" }, 500);
    }

    const platform = String(analysis.sourcePlatform || "Website");
    const contentKind = String(analysis.contentKind || "source_only");
    const citySlug = normalizeCitySlug(String(analysis.citySlug || "")) || "";
    const summary = String(analysis.summary || "");
    const confidence = Number(analysis.confidence || 0);
    const items = Array.isArray(analysis.items) ? analysis.items : [];

    // 確保城市存在（需要 READ_ID 查詢 + WRITE_ID 寫入）
    let cityEnsureError = null;
    if (citySlug && env.NOTION_CITIES_WRITE_ID) {
      try {
        await ensureCityExists(env, citySlug);
      } catch (e) {
        cityEnsureError = e?.message || String(e);
      }
    }

    const sourcePage = await createSourcePage({
      env, sourceTitle, url, platform, notes,
      summary, contentKind, citySlug, confidence, items,
    });
    const sourcePageId = sourcePage?.id || null;

    const created = { sourcePageId, spots: [], events: [] };
    const spotPageIds = [];
    const eventPageIds = [];
    // Per-request dedup cache: avoids repeated Notion queries for same citySlug
    const existingCache = new Map();

    // ── Nominatim Geocoding ────────────────────────────────
    // 對沒有座標的 item 補查 lat/lng，每次請求間隔 1.1 秒
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const hasCoords = Number.isFinite(item?.lat) && item.lat !== 0
                     && Number.isFinite(item?.lng) && item.lng !== 0;
      if (!hasCoords && item?.name) {
        const itemCitySlug = String(item?.citySlug || item?.city_slug || citySlug || "");
        const cityLabel = CITY_DATA_MAP[itemCitySlug]?.label || itemCitySlug;
        if (i > 0) await sleep(1100); // 遵守 Nominatim 1 req/sec 限制
        const geo = await geocodeWithNominatim(item.name, item.area, itemCitySlug, cityLabel);
        if (geo) {
          item.lat = geo.lat;
          item.lng = geo.lng;
        }
      }
    }

    if (items.length && (env.NOTION_SPOTS_DATA_SOURCE_ID || env.NOTION_EVENTS_DATA_SOURCE_ID)) {
      let geoCallCount = 0;
      for (const item of items) {
        const itemCitySlug = normalizeCitySlug(String(item?.citySlug || item?.city_slug || citySlug || "")) || "";
        // Nominatim 1 req/sec 限制
        if (geoCallCount > 0) await delay(1100);
        const geoResult = await geocodeSpot(
          item.name, item.area,
          CITY_DATA_MAP[itemCitySlug]?.label,
          CITY_DATA_MAP[itemCitySlug]
        );
        geoCallCount++;
        const spotPage = await upsertSpotPage({
          env, item, citySlug: itemCitySlug, sourceUrl: url, sourcePageId, sourceTitle, geoResult, cache: existingCache,
        });
        const spotId = spotPage?.id || null;
        if (spotId) spotPageIds.push(spotId);
        created.spots.push({ id: spotId, name: item.name || "未命名景點", action: spotPage?.action || "created" });
      }
    }

    if (contentKind === "event" && env.NOTION_EVENTS_DATA_SOURCE_ID) {
      for (const item of items) {
        const itemCitySlug = normalizeCitySlug(String(item?.citySlug || item?.city_slug || citySlug || "")) || "";
        const eventPage = await upsertEventPage({
          env, item, citySlug: itemCitySlug, sourceUrl: url, sourcePageId, sourceTitle, cache: existingCache,
        });
        const eventId = eventPage?.id || null;
        if (eventId) eventPageIds.push(eventId);
        created.events.push({ id: eventId, name: item.name || "未命名活動", action: eventPage?.action || "created" });
      }
    }

    if (sourcePageId && (spotPageIds.length > 0 || eventPageIds.length > 0 || citySlug)) {
      await updateSourceRelations(env, sourcePageId, spotPageIds, eventPageIds, citySlug);
    }

    let dispatched = false;
    let dispatchError = null;
    if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO) {
      try {
        const resp = await fetch(
          `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.GITHUB_TOKEN}`,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
              "User-Agent": "TravelReelsBot/1.0",
            },
            body: JSON.stringify({ event_type: "sync_notion_after_reel_submit" }),
          }
        );
        const respText = await resp.text();
        dispatched = resp.ok;
        if (!resp.ok) dispatchError = `${resp.status}: ${respText}`;
      } catch (e) {
        dispatchError = e?.message || String(e);
      }
    }

    return json({ message: "已確認寫入。", created, dispatched, cityEnsureError, dispatchError });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "確認寫入失敗。" }, 500);
  }
}

// ── 回寫 Source 的關聯欄位 ────────────────────────────────
async function updateSourceRelations(env, sourcePageId, spotIds, eventIds, citySlug) {
  try {
    const properties = {};
    if (spotIds.length > 0) {
      properties.RelatedSpots = { rich_text: [{ text: { content: spotIds.join(", ") } }] };
    }
    if (eventIds.length > 0) {
      properties.RelatedEvents = { rich_text: [{ text: { content: eventIds.join(", ") } }] };
    }
    if (citySlug) {
      properties.CityHints = { multi_select: [{ name: citySlug }] };
      properties.RelatedCities = { multi_select: [{ name: citySlug }] };
    }
    if (Object.keys(properties).length === 0) return;

    await fetch(`https://api.notion.com/v1/pages/${sourcePageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({ properties }),
    });
  } catch {
    // 回寫失敗不中斷主流程
  }
}

// ── 自動確保城市存在 ───────────────────────────────────────
async function ensureCityExists(env, citySlug) {
  try {
    // 查詢用 database ID（NOTION_CITIES_READ_ID）
    const res = await fetch(
      `https://api.notion.com/v1/data_sources/${env.NOTION_CITIES_WRITE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION,
        },
        body: JSON.stringify({ page_size: 100 }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cities 查詢失敗 ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const pages = data.results || [];

    const existingSlugs = pages.map((page) => {
      const slugProp = page.properties?.Slug;
      if (slugProp?.type === "rich_text") {
        return (slugProp.rich_text || []).map((r) => r.plain_text || "").join("").trim().toLowerCase();
      }
      return "";
    }).filter(Boolean);

    if (existingSlugs.includes(citySlug.toLowerCase())) return;

    const city = CITY_DATA_MAP[citySlug] || {
      label: citySlug, emoji: "📍", region: "其他",
      timezone: "Asia/Tokyo", lat: 0, lng: 0, sort: 9999,
      heroArea: "", spotlight: "", description: "",
    };

    // 寫入用 data source ID（NOTION_CITIES_WRITE_ID）
    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        parent: { data_source_id: env.NOTION_CITIES_WRITE_ID },
        properties: {
          Name:          { title: [{ text: { content: city.label } }] },
          Slug:          { rich_text: [{ text: { content: citySlug } }] },
          Emoji:         { rich_text: [{ text: { content: city.emoji } }] },
          Region:        { select: { name: city.region } },
          Status:        { select: { name: "active" } },
          Timezone:      { select: { name: city.timezone } },
          Description:   { rich_text: [{ text: { content: city.description } }] },
          HeroArea:      { rich_text: [{ text: { content: city.heroArea } }] },
          CoverImageUrl: { rich_text: [{ text: { content: "" } }] },
          SpotlightTags: { rich_text: [{ text: { content: city.spotlight } }] },
          SortOrder:     { number: city.sort },
          DefaultMapLat: { number: city.lat },
          DefaultMapLng: { number: city.lng },
          Published:     { checkbox: true },
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Cities 新增失敗 ${createRes.status}: ${errText}`);
    }
  } catch (e) {
    throw new Error(e?.message || String(e));
  }
}

// ── Sources ────────────────────────────────────────────────
async function createSourcePage({
  env, sourceTitle, url, platform, notes,
  summary, contentKind, citySlug, confidence, items,
}) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const kindLabel = contentKind === "event" ? "活動" : contentKind === "spot" ? "景點" : "來源";
  const shortName = summary
    ? `${cityLabel ? cityLabel + "・" : ""}${summary}`.slice(0, 80)
    : `${platform} ${kindLabel}${cityLabel ? "・" + cityLabel : ""}`.slice(0, 80);

  const payload = {
    parent: { data_source_id: env.NOTION_SOURCES_DATA_SOURCE_ID },
    properties: {
      Name:       { title: [{ text: { content: shortName } }] },
      SourceUrl:  { url },
      Platform:   { rich_text: [{ text: { content: platform } }] },
      SourceType: { rich_text: [{ text: { content: contentKind === "event" ? "活動資訊" : contentKind === "spot" ? "景點美食" : "手動整理" } }] },
      Status:     { select: { name: "已匯入" } },
      Note:       { rich_text: [{ text: { content: (notes || summary || "").slice(0, 2000) } }] },
      CityHints:  { multi_select: citySlug ? [{ name: citySlug }] : [] },
      Published:  { checkbox: true },
    },
  };

  return await notionCreatePage(env, payload);
}

// ── Spots（upsert = find existing → merge or create）─────────
async function upsertSpotPage({ env, item, citySlug, sourceUrl, sourcePageId, sourceTitle, geoResult, cache }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const normalizedTags = Array.isArray(item.tags)
    ? item.tags.map((t) => String(t || "").trim()).filter(Boolean)
    : [];
  const tags = normalizedTags.length
    ? normalizedTags.join(", ")
    : [item.category || "景點", item.area || "", citySlug || ""].filter(Boolean).join(", ");

  // 套用 geocoding 結果
  const geo = geoResult || {};
  const lat = geo.lat && geo.lat !== 0 ? geo.lat : (Number.isFinite(item?.lat) && item.lat !== 0 ? item.lat : null);
  const lng = geo.lng && geo.lng !== 0 ? geo.lng : (Number.isFinite(item?.lng) && item.lng !== 0 ? item.lng : null);
  const confidence = geo.confidence || "推定";
  const mapQuery = encodeURIComponent(`${item.name} ${cityLabel}`);
  const mapUrl = geo.mapUrl || item.map_url || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const priorityScore = Number.isFinite(item?.itemConfidence)
    ? Math.round(item.itemConfidence * 100)
    : Number.isFinite(item?.item_confidence)
      ? Math.round(item.item_confidence * 100)
      : 0;

  // BE-san: soft-log 品質警示（欄位無中文）
  const qualityWarnings = [];
  if (item.name && !/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(item.name)) {
    qualityWarnings.push("quality-warn: name has no CJK characters");
  }
  if (item.area && !/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(item.area)) {
    qualityWarnings.push("quality-warn: area has no CJK characters");
  }

  const baseNotes = buildItemNotes(item);
  const notesWithWarnings = qualityWarnings.length
    ? [baseNotes, ...qualityWarnings].filter(Boolean).join(" || ")
    : baseNotes;

  const properties = {
    Name:             { title: [{ text: { content: cleanText(item.name || "未命名項目").slice(0, 200) } }] },
    Area:             { rich_text: [{ text: { content: cleanText(item.area || cityLabel) } }] },
    BestTime:         { rich_text: [{ text: { content: cleanText(item.best_time) } }] },
    Category:         { rich_text: [{ text: { content: cleanText(item.category || "待分類") } }] },
    City:             { select: { name: cityLabel || "未分類" } },
    CitySlug:         { select: { name: String(citySlug || "未分類") } },
    Confidence:       { rich_text: [{ text: { content: confidence } }] },
    Description:      { rich_text: [{ text: { content: cleanText(item.description).slice(0, 2000) } }] },
    MapUrl:           { url: mapUrl || null },
    Notes:            { rich_text: [{ text: { content: notesWithWarnings.slice(0, 2000) } }] },
    PriorityScore:    { number: priorityScore },
    Published:        { checkbox: true },
    SourceTitleCache: { rich_text: [{ text: { content: cleanText(sourceTitle).slice(0, 200) } }] },
    Tags:             { rich_text: [{ text: { content: tags } }] },
    Thumbnail:        { rich_text: [{ text: { content: cleanText(item.thumbnail || guessThumbnail(item.category)) } }] },
  };
  if (lat !== null) properties.Lat = { number: lat };
  if (lng !== null) properties.Lng = { number: lng };
  if (sourcePageId) {
    properties.SourceLinks = { rich_text: [{ text: { content: String(sourcePageId) } }] };
  }

  // BE-2: 重複偵測 → 合併
  const existing = await findExistingRecord(env, env.NOTION_SPOTS_DATA_SOURCE_ID, item.name, citySlug, "select", cache);
  if (existing) {
    const patch = buildMergedPatch(properties, existing);
    // 若 geocoding 取得真實座標，且現有記錄仍是推定，則更新座標
    const existConf = existing.properties?.Confidence?.select?.name;
    if (confidence === "已確認" && existConf !== "已確認") {
      patch.Confidence = { rich_text: [{ text: { content: "已確認" } }] };
      patch.MapUrl = { url: mapUrl };
      if (lat !== null) patch.Lat = { number: lat };
      if (lng !== null) patch.Lng = { number: lng };
    }
    if (Object.keys(patch).length > 0) {
      await notionPatchPage(env, existing.id, patch);
    }
    return { id: existing.id, action: "merged" };
  }

  const created = await notionCreatePage(env, {
    parent: { data_source_id: env.NOTION_SPOTS_DATA_SOURCE_ID },
    properties,
  });
  return { ...created, action: "created" };
}

// ── Events（upsert = find existing → merge or create）────────
async function upsertEventPage({ env, item, citySlug, sourceUrl, sourcePageId, sourceTitle, cache }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const normalizedTags = normalizeTags(item.tags);
  const tags = normalizedTags.length
    ? normalizedTags.join(", ")
    : [cleanText(item.category) || "活動", cleanText(item.area), cleanText(citySlug)].filter(Boolean).join(", ");

  const mapQuery = encodeURIComponent(joinClean([item.venue_name || item.name, item.area, cityLabel], " "));
  const mapUrl = cleanText(item.map_url) || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null);

  const lat = Number.isFinite(item?.lat) && Math.abs(item.lat) <= 90 && item.lat !== 0 ? item.lat : null;
  const lng = Number.isFinite(item?.lng) && Math.abs(item.lng) <= 180 && item.lng !== 0 ? item.lng : null;

  const properties = {
    Name:          { title: [{ text: { content: cleanText(item.name || "未命名活動").slice(0, 200) } }] },
    Area:          { rich_text: [{ text: { content: cleanText(item.area || cityLabel) } }] },
    Category:      { select: { name: cleanText(item.category || "活動") } },
    City:          { rich_text: [{ text: { content: cleanText(cityLabel) } }] },
    CitySlug:      { rich_text: [{ text: { content: cleanText(citySlug) } }] },
    Description:   { rich_text: [{ text: { content: cleanText(item.description).slice(0, 2000) } }] },
    EndTimeText:   { rich_text: [{ text: { content: cleanText(item.end_time) } }] },
    EndsOn:        item.ends_on ? { date: { start: String(item.ends_on) } } : { date: null },
    MapUrl:        { url: mapUrl || null },
    OfficialUrl:   { url: cleanText(item.official_url || sourceUrl) || null },
    PriceNote:     { rich_text: [{ text: { content: cleanText(item.price_note) } }] },
    Published:     { checkbox: true },
    RecurringType: { select: { name: "一次性" } },
    StartTimeText: { rich_text: [{ text: { content: cleanText(item.start_time) } }] },
    StartsOn:      item.starts_on ? { date: { start: String(item.starts_on) } } : { date: null },
    Status:        { select: { name: "待整理" } },
    Tags:          { rich_text: [{ text: { content: tags } }] },
    TicketType:    { rich_text: [{ text: { content: cleanText(item.ticket_type) } }] },
    VenueName:     { rich_text: [{ text: { content: cleanText(item.venue_name || item.name) } }] },
  };
  if (lat !== null) properties.Lat = { number: lat };
  if (lng !== null) properties.Lng = { number: lng };
  if (sourcePageId) {
    properties.SourceLinks = { rich_text: [{ text: { content: String(sourcePageId) } }] };
  }

  // 重複偵測：同 Name + CitySlug
  const existing = await findExistingRecord(env, env.NOTION_EVENTS_DATA_SOURCE_ID, item.name, citySlug, "rich_text", cache);
  if (existing) {
    const patch = buildMergedPatch(properties, existing, "event");
    if (Object.keys(patch).length > 0) {
      await notionPatchPage(env, existing.id, patch);
    }
    return { id: existing.id, action: "merged" };
  }

  const created = await notionCreatePage(env, {
    parent: { data_source_id: env.NOTION_EVENTS_DATA_SOURCE_ID },
    properties,
  });
  return { ...created, action: "created" };
}

function guessThumbnail(category) {
  const map = {
    餐廳: "🍽️", 小吃: "🍢", 咖啡: "☕", 甜點: "🍰",
    景點: "📍", 逛街: "🛍️", 寺社: "⛩️", 住宿: "🏨",
    博物館: "🏛️", 夜市: "🏮", 活動: "🎫",
  };
  return map[category] || "📍";
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function joinClean(values, sep = " ") {
  return values.map((v) => cleanText(v)).filter(Boolean).join(sep).trim();
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => cleanText(t)).filter(Boolean).slice(0, 20);
}

function normalizeItemKind(item, fallback) {
  const value = cleanText(item?.itemKind || item?.item_kind || fallback);
  if (value === "event" || value === "spot" || value === "source_only") return value;
  if (value === "mixed") return "source_only";
  return fallback === "event" ? "event" : "spot";
}

function buildItemNotes(item) {
  const parts = [];
  const reason = cleanText(item?.reason);
  const reviewReason = cleanText(item?.reviewReason || item?.review_reason);
  if (reason) parts.push(`reason: ${reason}`);
  if (reviewReason) parts.push(`review: ${reviewReason}`);
  if (Array.isArray(item?.evidence) && item.evidence.length) {
    const evidenceText = item.evidence
      .map((e) => cleanText(typeof e === "string" ? e : e?.value || e?.text))
      .filter(Boolean)
      .slice(0, 6)
      .join(" | ");
    if (evidenceText) parts.push(`evidence: ${evidenceText}`);
  }
  return parts.join(" || ").slice(0, 2000);
}

// ── Notion API ─────────────────────────────────────────────
async function notionPatchPage(env, pageId, properties) {
  const resp = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ properties }),
  });
  const jsonBody = await resp.json();
  if (!resp.ok) throw new Error(jsonBody?.message || "合併更新 Notion 失敗。");
  return jsonBody;
}

async function notionCreatePage(env, payload) {
  const resp = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify(payload),
  });

  const jsonBody = await resp.json();
  if (!resp.ok) throw new Error(jsonBody?.message || "寫入 Notion 失敗。");
  return jsonBody;
}

// ── 工具 ───────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
