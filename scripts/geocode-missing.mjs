/**
 * scripts/geocode-missing.mjs
 *
 * 對 Notion 中所有 lat=null / lat=0 的景點與活動，
 * 呼叫 Nominatim 補齊座標後回寫 Notion。
 *
 * 使用方式：
 *   NOTION_API_KEY=xxx \
 *   NOTION_SPOTS_DATA_SOURCE_ID=xxx \
 *   NOTION_EVENTS_DATA_SOURCE_ID=xxx \
 *   node scripts/geocode-missing.mjs
 *
 * 可選：只跑景點或只跑活動
 *   node scripts/geocode-missing.mjs --spots-only
 *   node scripts/geocode-missing.mjs --events-only
 *
 * Nominatim 使用限制：1 req/sec，本腳本每次查詢間隔 1.1 秒。
 */

const NOTION_API_KEY              = process.env.NOTION_API_KEY;
const NOTION_SPOTS_DATA_SOURCE_ID = process.env.NOTION_SPOTS_DATA_SOURCE_ID;
const NOTION_EVENTS_DATA_SOURCE_ID= process.env.NOTION_EVENTS_DATA_SOURCE_ID;
const NOTION_VERSION              = "2025-09-03";
const NOMINATIM_UA                = "TravelReelsTripPlanner/1.0 (https://travel-reels-trip-planner.pages.dev)";

const args = process.argv.slice(2);
const spotsOnly  = args.includes("--spots-only");
const eventsOnly = args.includes("--events-only");

// ── city slug → ISO 國碼 ───────────────────────────────────
const COUNTRY_CODES = {
  kyoto: "jp", osaka: "jp", tokyo: "jp", nara: "jp",
  fukuoka: "jp", hokkaido: "jp", okinawa: "jp",
  taipei: "tw", taichung: "tw", tainan: "tw", kaohsiung: "tw",
  seoul: "kr", busan: "kr",
};

// ── city slug → 中文名稱 & 中心座標（給 Nominatim viewbox 用）
const CITY_DATA = {
  kyoto:     { label: "京都",   lat: 35.0116, lng: 135.7681 },
  osaka:     { label: "大阪",   lat: 34.6937, lng: 135.5023 },
  tokyo:     { label: "東京",   lat: 35.6762, lng: 139.6503 },
  nara:      { label: "奈良",   lat: 34.6851, lng: 135.8048 },
  fukuoka:   { label: "福岡",   lat: 33.5904, lng: 130.4017 },
  hokkaido:  { label: "北海道", lat: 43.0642, lng: 141.3469 },
  okinawa:   { label: "沖繩",   lat: 26.2124, lng: 127.6809 },
  taipei:    { label: "台北",   lat: 25.0330, lng: 121.5654 },
  taichung:  { label: "台中",   lat: 24.1477, lng: 120.6736 },
  tainan:    { label: "台南",   lat: 22.9999, lng: 120.2269 },
  kaohsiung: { label: "高雄",   lat: 22.6273, lng: 120.3014 },
  seoul:     { label: "首爾",   lat: 37.5665, lng: 126.9780 },
  busan:     { label: "釜山",   lat: 35.1796, lng: 129.0756 },
};

// ── 工具函式 ───────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getPlainText(arr) {
  if (!Array.isArray(arr)) return "";
  return arr.map((b) => b.plain_text || "").join("").trim();
}

function getProp(page, key) {
  const prop = page.properties?.[key];
  if (!prop) return null;
  switch (prop.type) {
    case "title":     return getPlainText(prop.title);
    case "rich_text": return getPlainText(prop.rich_text);
    case "number":    return prop.number;
    case "select":    return prop.select?.name || "";
    default:          return null;
  }
}

function missingCoords(page) {
  const lat = getProp(page, "Lat");
  const lng = getProp(page, "Lng");
  return !lat || lat === 0 || !lng || lng === 0;
}

// ── Notion API ─────────────────────────────────────────────
async function notionFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Notion ${res.status}: ${t}`);
  }
  return res.json();
}

async function queryAll(dataSourceId) {
  let results = [], hasMore = true, cursor;
  while (hasMore) {
    const body = { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) };
    const data = await notionFetch(
      `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
      { method: "POST", body: JSON.stringify(body) }
    );
    results = results.concat(data.results || []);
    hasMore = Boolean(data.has_more);
    cursor = data.next_cursor;
  }
  return results;
}

async function patchLatLng(pageId, lat, lng) {
  await notionFetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: {
        Lat: { number: lat },
        Lng: { number: lng },
      },
    }),
  });
}

// ── Nominatim ──────────────────────────────────────────────
async function geocode(name, area, citySlug) {
  const cityData = CITY_DATA[citySlug] || null;
  const cityLabel = cityData?.label || citySlug;
  const countryCode = COUNTRY_CODES[citySlug] || null;

  const queryParts = [name, area, cityLabel].filter(Boolean);
  const params = new URLSearchParams({
    q: queryParts.join(", "),
    format: "json",
    limit: "1",
    "accept-language": "zh,en",
  });
  if (countryCode) params.set("countrycodes", countryCode);
  if (cityData) {
    const d = 0.5;
    params.set("viewbox", `${cityData.lng - d},${cityData.lat + d},${cityData.lng + d},${cityData.lat - d}`);
    params.set("bounded", "0");
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "User-Agent": NOMINATIM_UA } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.length) return null;
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

// ── 主流程 ─────────────────────────────────────────────────
async function processCollection(label, dataSourceId) {
  if (!dataSourceId) {
    console.log(`⏭  跳過 ${label}（未設定 data source ID）`);
    return { total: 0, updated: 0, failed: 0 };
  }

  console.log(`\n📋 查詢 ${label}…`);
  const pages = await queryAll(dataSourceId);
  const missing = pages.filter(missingCoords);
  console.log(`   總筆數：${pages.length}，缺少座標：${missing.length}`);

  let updated = 0, failed = 0;

  for (let i = 0; i < missing.length; i++) {
    const page = missing[i];
    const name     = getProp(page, "Name") || "";
    const area     = getProp(page, "Area") || "";
    const citySlug = (getProp(page, "CitySlug") || "").toLowerCase();

    process.stdout.write(`   [${i + 1}/${missing.length}] ${name} (${citySlug})… `);

    if (i > 0) await sleep(1100); // Nominatim 1 req/sec 限制

    const geo = await geocode(name, area, citySlug);
    if (geo) {
      try {
        await patchLatLng(page.id, geo.lat, geo.lng);
        console.log(`✅ (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})`);
        updated++;
      } catch (e) {
        console.log(`❌ Notion 寫入失敗：${e.message}`);
        failed++;
      }
    } else {
      console.log(`⚠️  Nominatim 找不到`);
      failed++;
    }
  }

  return { total: pages.length, updated, failed };
}

async function main() {
  if (!NOTION_API_KEY) {
    console.error("❌ 請設定 NOTION_API_KEY 環境變數");
    process.exit(1);
  }

  console.log("🌍 Travel Reels — 補齊 Nominatim 座標");
  console.log("─".repeat(50));

  const results = {};

  if (!eventsOnly) {
    results.spots = await processCollection("景點 (Spots)", NOTION_SPOTS_DATA_SOURCE_ID);
  }
  if (!spotsOnly) {
    results.events = await processCollection("活動 (Events)", NOTION_EVENTS_DATA_SOURCE_ID);
  }

  console.log("\n" + "─".repeat(50));
  console.log("📊 結果摘要");
  for (const [key, r] of Object.entries(results)) {
    console.log(`   ${key}: 總計 ${r.total} 筆，補齊 ${r.updated} 筆，失敗 ${r.failed} 筆`);
  }
  console.log("\n✅ 完成。請執行 npm run sync:notion 更新 JSON 檔案。");
}

main().catch((e) => { console.error(e); process.exit(1); });
