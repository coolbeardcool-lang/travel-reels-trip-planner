#!/usr/bin/env node
/**
 * backfill-geocoding.mjs
 *
 * 補全 Notion Spots 資料庫中 lat=0 / lng=0 的景點座標。
 * 使用 Nominatim (OpenStreetMap) 免費 geocoding，1 req/sec 限制。
 *
 * 使用方式：
 *   NOTION_TOKEN=xxx NOTION_SPOTS_DATA_SOURCE_ID=xxx node scripts/backfill-geocoding.mjs
 *
 * 選用參數：
 *   DRY_RUN=1  — 只列印，不實際寫入 Notion
 */

import { setTimeout as sleep } from "timers/promises";

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const SPOTS_DB_ID = process.env.NOTION_SPOTS_DATA_SOURCE_ID;
const DRY_RUN = process.env.DRY_RUN === "1";
const NOTION_VERSION = "2025-09-03";

if (!NOTION_TOKEN || !SPOTS_DB_ID) {
  console.error("❌ 需要設定 NOTION_TOKEN 和 NOTION_SPOTS_DATA_SOURCE_ID");
  process.exit(1);
}

// ── Notion 查詢（支援分頁）─────────────────────────────────
async function queryAllSpots() {
  const spots = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await fetch(
      `https://api.notion.com/v1/data_sources/${SPOTS_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION,
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion query failed ${res.status}: ${text}`);
    }
    const data = await res.json();
    spots.push(...(data.results || []));
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return spots;
}

// ── 取得屬性值 ─────────────────────────────────────────────
function getPropValue(page, name) {
  const prop = page.properties?.[name];
  if (!prop) return null;
  switch (prop.type) {
    case "title":     return (prop.title || []).map((t) => t.plain_text || "").join("").trim();
    case "rich_text": return (prop.rich_text || []).map((t) => t.plain_text || "").join("").trim();
    case "number":    return prop.number;
    case "select":    return prop.select?.name || "";
    default:          return null;
  }
}

// ── Nominatim geocoding（3s timeout）──────────────────────
async function geocode(name, area, cityLabel) {
  const query = [name, area, cityLabel].filter(Boolean).join(", ");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "TravelReelsTripPlanner-Backfill/1.0", "Accept-Language": "zh,ja,ko,en" },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  } catch { clearTimeout(timer); }
  return null;
}

// ── Notion PATCH ───────────────────────────────────────────
async function patchSpot(pageId, lat, lng) {
  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      properties: {
        Lat:        { number: lat },
        Lng:        { number: lng },
        MapUrl:     { url: mapUrl },
        Confidence: { rich_text: [{ text: { content: "已確認" } }] },
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion patch failed ${res.status}: ${text}`);
  }
}

// ── 城市標籤對應（用於 geocoding query）───────────────────
const CITY_LABEL_MAP = {
  tokyo: "東京", kyoto: "京都", osaka: "大阪", nara: "奈良",
  okinawa: "沖繩", hokkaido: "北海道", fukuoka: "福岡",
  taipei: "台北", taichung: "台中", tainan: "台南", kaohsiung: "高雄",
  seoul: "首爾", busan: "釜山",
};

// ── 主程式 ────────────────────────────────────────────────
async function main() {
  console.log(`🔍 讀取 Spots 資料庫…${DRY_RUN ? " (DRY RUN)" : ""}`);
  const all = await queryAllSpots();

  const targets = all.filter((page) => {
    if (page.archived) return false;
    const lat = getPropValue(page, "Lat");
    const lng = getPropValue(page, "Lng");
    return (!lat || lat === 0) && (!lng || lng === 0);
  });

  console.log(`📍 找到 ${targets.length} 筆需要補全座標（共 ${all.length} 筆）\n`);
  if (targets.length === 0) { console.log("✅ 全部已有座標，無需補全。"); return; }

  let ok = 0, fail = 0, skip = 0;

  for (let i = 0; i < targets.length; i++) {
    const page = targets[i];
    const name = getPropValue(page, "Name") || "";
    const area = getPropValue(page, "Area") || "";
    const citySlug = getPropValue(page, "CitySlug") || "";
    const cityLabel = CITY_LABEL_MAP[citySlug] || citySlug;

    if (i > 0) await sleep(1100); // Nominatim 1 req/sec

    process.stdout.write(`[${i + 1}/${targets.length}] ${name} (${citySlug}) … `);
    const coords = await geocode(name, area, cityLabel);

    if (!coords) {
      console.log("❌ 找不到（保持推定）");
      skip++;
      continue;
    }

    console.log(`✅ ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
    if (!DRY_RUN) {
      try {
        await patchSpot(page.id, coords.lat, coords.lng);
        ok++;
      } catch (e) {
        console.error(`   ⚠️ 寫入失敗：${e.message}`);
        fail++;
      }
    } else {
      ok++;
    }
  }

  console.log(`\n📊 結果：已更新 ${ok} 筆，Nominatim 未找到 ${skip} 筆，寫入失敗 ${fail} 筆`);
  if (DRY_RUN) console.log("（DRY RUN：未實際寫入）");
}

main().catch((e) => { console.error("❌ 執行失敗：", e.message); process.exit(1); });
