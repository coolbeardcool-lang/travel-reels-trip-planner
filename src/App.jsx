import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = (() => {
  try {
    if (
      typeof import.meta !== "undefined" &&
      import.meta &&
      import.meta.env &&
      typeof import.meta.env.BASE_URL === "string" &&
      import.meta.env.BASE_URL.length > 0
    ) {
      return import.meta.env.BASE_URL;
    }
  } catch (_error) {
    // ignore
  }
  return "/";
})();

const SUBMIT_API_PATH = `${BASE_URL}api/submit-reel`;
const ANALYZE_API_PATH = `${BASE_URL}api/analyze-url`;
const CONFIRM_ANALYSIS_API_PATH = `${BASE_URL}api/confirm-analysis`;
const CONTENT_MODES = ["spots", "events"];
const ANALYZE_TYPE_OPTIONS = ["auto", "spot", "event"];

const CITY_INDEX_SEED = [
  {
    slug: "kyoto",
    label: "京都",
    emoji: "⛩️",
    region: "關西",
    description: "寺社、散步、甜點與選物密度高，適合慢節奏安排。",
    heroArea: "佛光寺周邊",
    spotlight: ["寺社", "甜點", "散步"],
  },
  {
    slug: "osaka",
    label: "大阪",
    emoji: "🍢",
    region: "關西",
    description: "小吃、商圈與夜間行程豐富，適合美食導向安排。",
    heroArea: "新世界／通天閣",
    spotlight: ["小吃", "商圈", "夜生活"],
  },
];

const SOURCES_SEED = [
  {
    id: "src-osaka-gyutan",
    title: "大阪牛舌 Reel",
    url: "https://www.instagram.com/reel/DWOiXYxkf97/",
    platform: "Instagram Reel",
    status: "已匯入",
    note: "已整理成大阪牛舌相關景點。",
  },
  {
    id: "src-osaka-shinsekai-food",
    title: "大阪新世界街邊美食 Reel",
    url: "https://www.instagram.com/reel/DV_M4ayDcf-/",
    platform: "Instagram Reel",
    status: "已匯入",
    note: "已整理成大阪新世界美食點位。",
  },
  {
    id: "src-kyoto-hidden-list",
    title: "京都私藏清單 Reel",
    url: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    platform: "Instagram Reel",
    status: "已匯入",
    note: "已整理成京都選店與寺社點位。",
  },
];

const SPOTS_SEED = [
  {
    id: "osaka-yoshiji",
    city: "大阪",
    citySlug: "osaka",
    area: "心齋橋",
    name: "吉次牛舌（分店待確認）",
    category: "餐廳",
    description: "依 Reel 內容先建為大阪心齋橋區的牛舌名店。適合安排在晚餐時段。",
    sourceId: "src-osaka-gyutan",
    sourceTitle: "大阪牛舌 Reel",
    sourceUrl: "https://www.instagram.com/reel/DWOiXYxkf97/",
    bestTime: "晚上",
    stayMinutes: 75,
    tags: ["牛舌", "大阪美食", "晚餐", "心齋橋"],
    lat: 34.6706,
    lng: 135.5023,
    thumbnail: "🥩",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=心齋橋+吉次牛舌",
    published: true,
  },
  {
    id: "osaka-nonkiya",
    city: "大阪",
    citySlug: "osaka",
    area: "新世界／通天閣",
    name: "Nonkiya のんきや",
    category: "小吃",
    description: "新世界人氣立食關東煮與土手燒，適合安排為中午或傍晚的小吃站。",
    sourceId: "src-osaka-shinsekai-food",
    sourceTitle: "大阪新世界街邊美食 Reel",
    sourceUrl: "https://www.instagram.com/reel/DV_M4ayDcf-/",
    bestTime: "下午",
    stayMinutes: 35,
    tags: ["關東煮", "土手燒", "立食", "通天閣"],
    lat: 34.6529,
    lng: 135.5057,
    thumbnail: "🍢",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Nonkiya+大阪",
    published: true,
  },
  {
    id: "osaka-matsuya",
    city: "大阪",
    citySlug: "osaka",
    area: "新世界／通天閣",
    name: "立ち食いうどんそば 松屋",
    category: "小吃",
    description: "通天閣附近的立食烏龍麵／蕎麥麵老店，很適合快閃早餐或補給點。",
    sourceId: "src-osaka-shinsekai-food",
    sourceTitle: "大阪新世界街邊美食 Reel",
    sourceUrl: "https://www.instagram.com/reel/DV_M4ayDcf-/",
    bestTime: "早上",
    stayMinutes: 25,
    tags: ["烏龍麵", "立食", "平價", "新世界"],
    lat: 34.6531,
    lng: 135.5059,
    thumbnail: "🍜",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=立ち食いうどんそば+松屋+大阪",
    published: true,
  },
  {
    id: "osaka-yaekatsu",
    city: "大阪",
    citySlug: "osaka",
    area: "新世界／通天閣",
    name: "串炸八重勝",
    category: "餐廳",
    description: "新世界經典串炸名店，適合當作新世界區晚餐主站。",
    sourceId: "src-osaka-shinsekai-food",
    sourceTitle: "大阪新世界街邊美食 Reel",
    sourceUrl: "https://www.instagram.com/reel/DV_M4ayDcf-/",
    bestTime: "晚上",
    stayMinutes: 60,
    tags: ["串炸", "大阪經典", "排隊店", "新世界"],
    lat: 34.6525,
    lng: 135.5056,
    thumbnail: "🍢",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=串かつ八重勝+新世界",
    published: true,
  },
  {
    id: "kyoto-bukkouji-dd",
    city: "京都",
    citySlug: "kyoto",
    area: "佛光寺周邊",
    name: "D&DEPARTMENT KYOTO",
    category: "逛街",
    description: "位在佛光寺境內的京都選物店，旁邊可順排 d 食堂，很適合下午慢逛。",
    sourceId: "src-kyoto-hidden-list",
    sourceTitle: "京都私藏清單 Reel",
    sourceUrl: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    bestTime: "下午",
    stayMinutes: 50,
    tags: ["選物店", "佛光寺", "京都設計", "散步"],
    lat: 35.0018,
    lng: 135.7596,
    thumbnail: "🛍️",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=D%26DEPARTMENT+KYOTO",
    published: true,
  },
  {
    id: "kyoto-bukkouji",
    city: "京都",
    citySlug: "kyoto",
    area: "佛光寺周邊",
    name: "本山佛光寺",
    category: "寺社",
    description: "若安排 D&DEPARTMENT KYOTO，可一起納入佛光寺庭院散步點。",
    sourceId: "src-kyoto-hidden-list",
    sourceTitle: "京都私藏清單 Reel",
    sourceUrl: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    bestTime: "下午",
    stayMinutes: 25,
    tags: ["寺院", "庭院", "散步", "市區"],
    lat: 35.0017,
    lng: 135.7592,
    thumbnail: "⛩️",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=佛光寺+京都",
    published: true,
  },
  {
    id: "kyoto-byodoji",
    city: "京都",
    citySlug: "kyoto",
    area: "四條烏丸周邊",
    name: "平等寺（因幡堂）",
    category: "寺社",
    description: "貓奴狗主必訪的守護聖地，適合排在市區散步路線中。",
    sourceId: "src-kyoto-hidden-list",
    sourceTitle: "京都私藏清單 Reel",
    sourceUrl: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    bestTime: "下午",
    stayMinutes: 30,
    tags: ["寵物御守", "祈福", "寺社", "散步"],
    lat: 35.0013,
    lng: 135.7582,
    thumbnail: "🐾",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=平等寺+因幡堂+京都",
    published: true,
  },
  {
    id: "kyoto-rokujuan",
    city: "京都",
    citySlug: "kyoto",
    area: "烏丸御池周邊",
    name: "麓壽庵 Rokujuan",
    category: "甜點",
    description: "百年有形文化財中的和菓子名店，可排透明花瓣蕨餅＋抹茶甜點時段。",
    sourceId: "src-kyoto-hidden-list",
    sourceTitle: "京都私藏清單 Reel",
    sourceUrl: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    bestTime: "下午",
    stayMinutes: 60,
    tags: ["和菓子", "蕨餅", "預約", "百年建築"],
    lat: 35.0107,
    lng: 135.7575,
    thumbnail: "🍵",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=麓壽庵+kyoto",
    published: true,
  },
];

const EVENTS_SEED = [];

const COLORS = {
  pageBg: "linear-gradient(135deg, #fafaf9 0%, #ffffff 48%, #fff7ed 100%)",
  card: "#ffffff",
  cardMuted: "#fafaf9",
  text: "#292524",
  subtext: "#57534e",
  border: "#e7e5e4",
  primary: "#1c1917",
  primarySoft: "#f5f5f4",
  accent: "#f97316",
  warningBg: "#fff7ed",
  warningText: "#c2410c",
  successBg: "#ecfdf5",
  successText: "#166534",
  errorBg: "#fef2f2",
  errorText: "#991b1b",
  infoBg: "#eff6ff",
  infoText: "#1d4ed8",
};

const CATEGORY_THEME = {
  景點: { bg: "#e0f2fe", color: "#0369a1" },
  餐廳: { bg: "#ffe4e6", color: "#be123c" },
  小吃: { bg: "#fef3c7", color: "#b45309" },
  逛街: { bg: "#ede9fe", color: "#6d28d9" },
  甜點: { bg: "#fce7f3", color: "#be185d" },
  寺社: { bg: "#d1fae5", color: "#047857" },
  活動: { bg: "#ffedd5", color: "#c2410c" },
};

function cityIndexPath() {
  return `${BASE_URL}data/cities/index.json`;
}

function normalizeCitySlugValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const aliasMap = {
    京都: "kyoto",
    大阪: "osaka",
    東京: "tokyo",
    福岡: "fukuoka",
    沖繩: "okinawa",
    札幌: "sapporo",
    名古屋: "nagoya",
    神戶: "kobe",
    奈良: "nara",
    橫濱: "yokohama",
    全部: "all",
    all: "all",
  };
  if (aliasMap[raw]) return aliasMap[raw];
  return raw.toLowerCase();
}

function cityDataPaths(citySlug) {
  const normalizedSlug = normalizeCitySlugValue(citySlug);
  if (!normalizedSlug || normalizedSlug === "unselected") return [];
  if (normalizedSlug === "all") return [`${BASE_URL}data/all.json`];
  return [
    `${BASE_URL}data/cities/${normalizedSlug}.json`,
    `${BASE_URL}data/${normalizedSlug}.json`,
    `${BASE_URL}data/${citySlug}.json`,
  ];
}

function filterByCitySlug(items, citySlug) {
  if (!citySlug || citySlug === "unselected") return [];
  if (citySlug === "all") return items;
  return items.filter((item) => item.citySlug === citySlug);
}

function filterSourcesByLinkedIds(items, sources) {
  const sourceIds = new Set(items.map((item) => item.sourceId).filter(Boolean));
  return sources.filter((source) => sourceIds.has(source.id));
}

function normalizeCity(city, index) {
  const slug = normalizeCitySlugValue(city.slug || city.name || city.label || `city-${index}`) || `city-${index}`;
  return {
    slug,
    label: city.label || city.name || slug,
    emoji: city.emoji || "📍",
    region: city.region || "未分類",
    description: city.description || "",
    heroArea: city.heroArea || "",
    spotlight: Array.isArray(city.spotlight) ? city.spotlight : [],
  };
}

function normalizeSource(source, index) {
  return {
    id: source.id || `source-${index}`,
    title: source.title || "未命名來源",
    url: source.url || "",
    platform: source.platform || "手動新增",
    status: source.status || "待整理",
    note: source.note || "",
  };
}

function normalizeSpot(spot, index, cityIndex) {
  const cityLabel = spot.city || cityIndex.find((item) => item.slug === spot.citySlug)?.label || "未分類";
  const citySlug = normalizeCitySlugValue(spot.citySlug || cityLabel);
  return {
    id: spot.id || `spot-${index}`,
    city: cityLabel,
    citySlug,
    area: spot.area || "未分類區域",
    name: spot.name || "未命名景點",
    category: spot.category || "景點",
    description: spot.description || "",
    sourceId: spot.sourceId || "",
    sourceTitle: spot.sourceTitle || "",
    sourceUrl: spot.sourceUrl || "",
    bestTime: spot.bestTime || "下午",
    stayMinutes: Number.isFinite(spot.stayMinutes) ? spot.stayMinutes : Number(spot.stayMinutes) || 30,
    tags: Array.isArray(spot.tags) ? spot.tags : [],
    lat: Number.isFinite(spot.lat) ? spot.lat : Number(spot.lat) || 0,
    lng: Number.isFinite(spot.lng) ? spot.lng : Number(spot.lng) || 0,
    thumbnail: spot.thumbnail || "📍",
    mapUrl: spot.mapUrl || "",
    published: spot.published !== false,
  };
}

function normalizeEvent(event, index, cityIndex) {
  const cityLabel = event.city || cityIndex.find((item) => item.slug === event.citySlug)?.label || "未分類";
  const citySlug = normalizeCitySlugValue(event.citySlug || cityLabel);
  return {
    id: event.id || `event-${index}`,
    city: cityLabel,
    citySlug,
    area: event.area || "未分類區域",
    name: event.name || "未命名活動",
    category: event.category || "活動",
    description: event.description || "",
    sourceId: event.sourceId || "",
    sourceTitle: event.sourceTitle || "",
    sourceUrl: event.sourceUrl || "",
    tags: Array.isArray(event.tags) ? event.tags : [],
    lat: Number.isFinite(event.lat) ? event.lat : Number(event.lat) || 0,
    lng: Number.isFinite(event.lng) ? event.lng : Number(event.lng) || 0,
    thumbnail: event.thumbnail || "🎫",
    mapUrl: event.mapUrl || "",
    startsOn: event.startsOn || null,
    endsOn: event.endsOn || null,
    startTime: event.startTime || "",
    endTime: event.endTime || "",
    ticketType: event.ticketType || "",
    priceNote: event.priceNote || "",
    published: event.published !== false,
  };
}

function normalizeCityIndexPayload(payload) {
  const rawCities = Array.isArray(payload?.cities) ? payload.cities : [];
  return {
    cities: rawCities.map((city, index) => normalizeCity(city, index)),
  };
}

function normalizeCityPayload(payload, fallbackSlug, cityIndex) {
  const rawSpots = Array.isArray(payload?.spots) ? payload.spots : [];
  const rawEvents = Array.isArray(payload?.events) ? payload.events : [];
  const rawSources = Array.isArray(payload?.sources) ? payload.sources : [];
  const spots = rawSpots.map((spot, index) => normalizeSpot(spot, index, cityIndex)).filter((spot) => spot.published);
  const events = rawEvents.map((event, index) => normalizeEvent(event, index, cityIndex)).filter((event) => event.published);
  const sources = rawSources.map((source, index) => normalizeSource(source, index));
  return {
    city: normalizeCity(payload?.city || { slug: fallbackSlug }, 0),
    spots,
    events,
    sources: sources.length ? sources : filterSourcesByLinkedIds([...spots, ...events], SOURCES_SEED),
  };
}

async function fetchCityIndex() {
  const response = await fetch(cityIndexPath(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`無法載入 ${cityIndexPath()}，HTTP ${response.status}`);
  return normalizeCityIndexPayload(await response.json());
}

async function fetchCityDataset(citySlug, cityIndex) {
  const paths = cityDataPaths(citySlug);
  if (!paths.length) {
    return { city: normalizeCity({ slug: "unselected", label: "未選擇" }, 0), spots: [], events: [], sources: [] };
  }
  for (const path of paths) {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (response.ok) {
      return normalizeCityPayload(await response.json(), normalizeCitySlugValue(citySlug), cityIndex);
    }
  }
  throw new Error(`無法載入城市資料：${citySlug}`);
}

function normalizeItemsForMap(items) {
  if (!items.length) return [];
  const lats = items.map((item) => item.lat);
  const lngs = items.map((item) => item.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.001);
  const lngRange = Math.max(maxLng - minLng, 0.001);
  return items.map((item) => ({
    id: item.id,
    left: 10 + ((item.lng - minLng) / lngRange) * 80,
    top: 10 + (1 - (item.lat - minLat) / latRange) * 80,
  }));
}

function distanceScore(spot, baseArea, currentTime) {
  let score = 0;
  if (spot.area === baseArea) score += 3;
  if (spot.bestTime === currentTime) score += 3;
  if (currentTime === "晚上" && ["餐廳", "小吃"].includes(spot.category)) score += 2;
  if (currentTime === "下午" && ["逛街", "甜點", "寺社"].includes(spot.category)) score += 2;
  if (currentTime === "早上" && ["小吃", "寺社"].includes(spot.category)) score += 2;
  return score;
}

function buildRecommendation(spots, baseArea, currentTime) {
  return [...spots]
    .sort((a, b) => distanceScore(b, baseArea, currentTime) - distanceScore(a, baseArea, currentTime))
    .slice(0, 4)
    .map((spot, index) => ({
      ...spot,
      order: index + 1,
      reason:
        spot.area === baseArea
          ? "離你目前設定區域最近，順路最好排。"
          : spot.bestTime === currentTime
            ? `這個點更適合現在的「${currentTime}」時段。`
            : `可作為 ${currentTime} 的延伸行程。`,
    }));
}

function formatEventWindow(event) {
  const startDate = event.startsOn || "未定";
  const endDate = event.endsOn || "未定";
  const startTime = event.startTime || "";
  const endTime = event.endTime || "";
  const timePart = startTime || endTime ? `｜${startTime || "--:--"} - ${endTime || "--:--"}` : "";
  return `${startDate} ～ ${endDate}${timePart}`;
}

function prettyAnalysisKind(kind) {
  if (kind === "event") return "活動";
  if (kind === "spot") return "景點 / 美食";
  return "來源待整理";
}

function normalizeAnalysisPayload(payload, fallback = {}) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    sourceTitle: payload?.source_title || fallback.sourceTitle || "未命名來源",
    sourcePlatform: payload?.source_platform || fallback.sourcePlatform || "未知來源",
    contentKind: payload?.content_kind || fallback.contentKind || "source_only",
    citySlug: normalizeCitySlugValue(payload?.city_slug || fallback.citySlug || ""),
    area: payload?.area || fallback.area || "",
    confidence: Number.isFinite(payload?.confidence) ? payload.confidence : Number(payload?.confidence) || 0,
    needsReview: payload?.needs_review !== false,
    summary: payload?.summary || payload?.reasoning || fallback.summary || "",
    items: items.map((item, index) => ({
      id: item.id || `analysis-item-${index}`,
      name: item.name || `候選項目 ${index + 1}`,
      category: item.category || (payload?.content_kind === "event" ? "活動" : "景點"),
      description: item.description || "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      area: item.area || payload?.area || fallback.area || "",
      best_time: item.best_time || "",
      stay_minutes: Number.isFinite(item.stay_minutes) ? item.stay_minutes : Number(item.stay_minutes) || 0,
      starts_on: item.starts_on || null,
      ends_on: item.ends_on || null,
      start_time: item.start_time || "",
      end_time: item.end_time || "",
      ticket_type: item.ticket_type || "",
      price_note: item.price_note || "",
      map_url: item.map_url || "",
      reason: item.reason || "",
    })),
  };
}

function chipStyle(category) {
  const theme = CATEGORY_THEME[category] || { bg: COLORS.primarySoft, color: COLORS.text };
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: theme.bg,
    color: theme.color,
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    border: `1px solid ${theme.bg}`,
  };
}

function MetricCard({ label, value, sub }) {
  return (
    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 16 }}>
      <div style={{ fontSize: 13, color: COLORS.subtext }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800, color: COLORS.text }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: COLORS.subtext }}>{sub}</div>
    </div>
  );
}

function SectionCard({ children, title, right }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 28, boxShadow: "0 8px 30px rgba(0,0,0,0.05)" }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "24px 24px 8px" }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLORS.text }}>{title}</h2>
          {right}
        </div>
      )}
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

function PrimaryButton({ children, href, secondary = false, block = false, onClick, type = "button", disabled = false }) {
  const style = {
    display: block ? "flex" : "inline-flex",
    width: block ? "100%" : undefined,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    padding: "12px 16px",
    textDecoration: "none",
    border: secondary ? `1px solid ${COLORS.border}` : `1px solid ${COLORS.primary}`,
    background: disabled ? COLORS.primarySoft : secondary ? "#ffffff" : COLORS.primary,
    color: disabled ? COLORS.subtext : secondary ? COLORS.text : "#ffffff",
    fontWeight: 700,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
  };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={style}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

function VisualMap({ items, activeItemId, onSelect }) {
  const points = useMemo(() => normalizeItemsForMap(items), [items]);
  const byId = useMemo(() => new Map(points.map((point) => [point.id, point])), [points]);
  return (
    <div style={{ position: "relative", minHeight: 520, overflow: "hidden", borderRadius: 28, border: `1px solid ${COLORS.border}`, background: "linear-gradient(135deg,#fff7ed 0%,#ffffff 48%,#f5f5f4 100%)" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          backgroundImage: "linear-gradient(to right, rgba(120,113,108,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,113,108,0.12) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />
      <div style={{ position: "absolute", left: 20, top: 20, zIndex: 1, background: "rgba(255,255,255,0.88)", border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 16, maxWidth: 360, backdropFilter: "blur(8px)" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>旅遊大地圖</div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: COLORS.subtext }}>
          點選地圖上的位置，即可查看景點或活動資訊。
        </div>
      </div>
      {items.map((item) => {
        const point = byId.get(item.id);
        if (!point) return null;
        const active = activeItemId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            style={{
              position: "absolute",
              left: `${point.left}%`,
              top: `${point.top}%`,
              transform: "translate(-50%, -50%)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 999,
                background: "#ffffff",
                border: active ? `2px solid ${COLORS.primary}` : "2px solid #ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                fontSize: 22,
              }}
            >
              {item.thumbnail}
            </div>
            <div
              style={{
                marginTop: 8,
                whiteSpace: "nowrap",
                borderRadius: 999,
                padding: "6px 12px",
                background: active ? COLORS.primary : "rgba(255,255,255,0.92)",
                color: active ? "#ffffff" : COLORS.text,
                fontSize: 12,
                fontWeight: 700,
                boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
              }}
            >
              {item.name}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function useResponsiveColumns() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 980);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return isMobile;
}

export default function TravelReelsTripPlanner() {
  const [cityIndex, setCityIndex] = useState(CITY_INDEX_SEED);
  const [selectedCitySlug, setSelectedCitySlug] = useState("unselected");
  const [selectedContentMode, setSelectedContentMode] = useState("spots");
  const [sources, setSources] = useState(SOURCES_SEED);
  const [loadedSpots, setLoadedSpots] = useState([]);
  const [loadedEvents, setLoadedEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("下午");
  const [baseArea, setBaseArea] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitType, setSubmitType] = useState("auto");
  const [submitCitySlug, setSubmitCitySlug] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [analysisPreview, setAnalysisPreview] = useState(null);
  const [submitStatus, setSubmitStatus] = useState({ kind: "idle", message: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const isMobile = useResponsiveColumns();

  const hasCitySelected = selectedCitySlug !== "unselected";

  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const payload = await fetchCityIndex();
        if (!cancelled && payload.cities.length) setCityIndex(payload.cities);
      } catch (_error) {
        if (!cancelled) setCityIndex(CITY_INDEX_SEED);
      }
    }
    loadIndex();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadCityData() {
      if (!hasCitySelected) {
        setLoadedSpots([]);
        setLoadedEvents([]);
        setSources(SOURCES_SEED);
        setActiveItemId(null);
        setBaseArea("");
        setSelectedCategories([]);
        setFavorites([]);
        return;
      }
      try {
        const payload = await fetchCityDataset(selectedCitySlug, cityIndex);
        if (cancelled) return;
        const fallbackSpotsByCity = filterByCitySlug(SPOTS_SEED, selectedCitySlug);
        const fallbackEventsByCity = filterByCitySlug(EVENTS_SEED, selectedCitySlug);
        const safeSpots = payload.spots.length ? payload.spots : fallbackSpotsByCity;
        const safeEvents = payload.events.length ? payload.events : fallbackEventsByCity;
        const safeSources = payload.sources.length ? payload.sources : filterSourcesByLinkedIds([...safeSpots, ...safeEvents], SOURCES_SEED);
        setLoadedSpots(safeSpots);
        setLoadedEvents(safeEvents);
        setSources(safeSources);
        setBaseArea(safeSpots[0]?.area || safeEvents[0]?.area || payload.city.heroArea || "");
        setActiveItemId((selectedContentMode === "events" ? safeEvents[0]?.id : safeSpots[0]?.id) || safeSpots[0]?.id || safeEvents[0]?.id || null);
      } catch (_error) {
        if (cancelled) return;
        const fallbackSpotsByCity = filterByCitySlug(SPOTS_SEED, selectedCitySlug);
        const fallbackEventsByCity = filterByCitySlug(EVENTS_SEED, selectedCitySlug);
        setLoadedSpots(fallbackSpotsByCity);
        setLoadedEvents(fallbackEventsByCity);
        setSources(filterSourcesByLinkedIds([...fallbackSpotsByCity, ...fallbackEventsByCity], SOURCES_SEED));
        setBaseArea(fallbackSpotsByCity[0]?.area || "");
        setActiveItemId((selectedContentMode === "events" ? fallbackEventsByCity[0]?.id : fallbackSpotsByCity[0]?.id) || fallbackSpotsByCity[0]?.id || fallbackEventsByCity[0]?.id || null);
      }
      setSelectedCategories([]);
      setFavorites([]);
    }
    loadCityData();
    return () => {
      cancelled = true;
    };
  }, [selectedCitySlug, selectedContentMode, hasCitySelected, cityIndex, reloadKey]);

  const selectedCity = useMemo(() => cityIndex.find((city) => city.slug === selectedCitySlug) || null, [cityIndex, selectedCitySlug]);

  const allAreas = useMemo(() => {
    const base = selectedContentMode === "events" ? loadedEvents : loadedSpots;
    return [...new Set(base.map((item) => item.area).filter(Boolean))];
  }, [loadedEvents, loadedSpots, selectedContentMode]);

  const allCategories = useMemo(() => {
    const base = selectedContentMode === "events" ? loadedEvents : loadedSpots;
    return [...new Set(base.map((item) => item.category).filter(Boolean))];
  }, [loadedEvents, loadedSpots, selectedContentMode]);

  const filteredSpots = useMemo(() => {
    return loadedSpots.filter((spot) => {
      const categoryMatches = selectedCategories.length === 0 || selectedCategories.includes(spot.category);
      const searchMatches = !search.trim() || `${spot.name} ${spot.description} ${spot.tags.join(" ")} ${spot.area}`.toLowerCase().includes(search.toLowerCase());
      return categoryMatches && searchMatches;
    });
  }, [loadedSpots, selectedCategories, search]);

  const filteredEvents = useMemo(() => {
    return loadedEvents.filter((event) => {
      const categoryMatches = selectedCategories.length === 0 || selectedCategories.includes(event.category);
      const searchMatches = !search.trim() || `${event.name} ${event.description} ${event.tags.join(" ")} ${event.area}`.toLowerCase().includes(search.toLowerCase());
      return categoryMatches && searchMatches;
    });
  }, [loadedEvents, selectedCategories, search]);

  const activeCollection = selectedContentMode === "events"
    ? (filteredEvents.length ? filteredEvents : loadedEvents)
    : (filteredSpots.length ? filteredSpots : loadedSpots);

  const activeItem = useMemo(() => {
    const fallback = activeCollection[0] || null;
    if (!activeItemId) return fallback;
    return activeCollection.find((item) => item.id === activeItemId) || fallback;
  }, [activeCollection, activeItemId]);

  const pickedSpots = useMemo(() => {
    const favoriteSpots = filteredSpots.filter((spot) => favorites.includes(spot.id));
    return favoriteSpots.length ? favoriteSpots : filteredSpots;
  }, [filteredSpots, favorites]);

  const recommendations = useMemo(() => buildRecommendation(pickedSpots, baseArea, timeOfDay), [pickedSpots, baseArea, timeOfDay]);

  const cityStats = useMemo(() => ({
    cities: cityIndex.length,
    spots: SPOTS_SEED.length,
    events: loadedEvents.length,
    picks: recommendations.length,
  }), [cityIndex, loadedEvents.length, recommendations.length]);

  function toggleCategory(category) {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]));
  }

  function toggleFavorite(id) {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  async function handleAnalyzeUrl(event) {
    event.preventDefault();
    const cleanUrl = submitUrl.trim();
    if (!cleanUrl) {
      setSubmitStatus({ kind: "error", message: "請先貼上 Reel 或網址。" });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisPreview(null);
    setSubmitStatus({ kind: "loading", message: "正在分析網址內容，完成後會先顯示給你確認。" });

    try {
      const response = await fetch(ANALYZE_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanUrl,
          hints: {
            title: submitTitle.trim(),
            type: submitType === "auto" ? "" : submitType,
            citySlug: normalizeCitySlugValue(submitCitySlug),
            notes: submitNotes.trim(),
          },
        }),
      });

      let payload = {};
      const text = await response.text();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (_error) {
          payload = { raw: text };
        }
      }

      if (!response.ok) {
        const message = payload?.message || `分析失敗，HTTP ${response.status}`;
        throw new Error(message);
      }

      const preview = normalizeAnalysisPayload(payload, {
        sourceTitle: submitTitle.trim(),
        contentKind: submitType === "auto" ? "source_only" : submitType,
        citySlug: submitCitySlug,
      });

      setAnalysisPreview(preview);
      setSubmitStatus({
        kind: "success",
        message: "分析完成。請先檢查下方結果，確認無誤後再寫入資料庫。",
      });
    } catch (error) {
      setSubmitStatus({
        kind: "error",
        message: error instanceof Error
          ? `${error.message}。目前需要後端提供 /api/analyze-url，前端才會先顯示分析結果。`
          : "分析失敗。",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleConfirmAnalysis() {
    if (!analysisPreview) {
      setSubmitStatus({ kind: "error", message: "目前沒有可確認寫入的分析結果。" });
      return;
    }

    setIsConfirming(true);
    setSubmitStatus({ kind: "loading", message: "正在確認並寫入資料庫，完成後會自動重新整理。" });

    try {
      const response = await fetch(CONFIRM_ANALYSIS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: submitUrl.trim(),
          sourceTitle: submitTitle.trim(),
          notes: submitNotes.trim(),
          analysis: analysisPreview,
        }),
      });

      let payload = {};
      const text = await response.text();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (_error) {
          payload = { raw: text };
        }
      }

      if (!response.ok) {
        const message = payload?.message || `寫入失敗，HTTP ${response.status}`;
        throw new Error(message);
      }

      setSubmitStatus({
        kind: "success",
        message: payload?.message || "已確認寫入。若後端已接 Notion / GitHub workflow，網站會在整理完成後自動更新。",
      });
      setSubmitUrl("");
      setSubmitTitle("");
      setSubmitType("auto");
      setSubmitCitySlug("");
      setSubmitNotes("");
      setAnalysisPreview(null);
      if (analysisPreview.citySlug) {
        setSelectedCitySlug(analysisPreview.citySlug);
      }
      setReloadKey((value) => value + 1);
    } catch (error) {
      setSubmitStatus({
        kind: "error",
        message: error instanceof Error
          ? `${error.message}。目前需要後端提供 /api/confirm-analysis，確認後才會真的寫入 Notion 並重建網站。`
          : "寫入失敗。",
      });
    } finally {
      setIsConfirming(false);
    }
  }

  const submitStatusStyle = submitStatus.kind === "success"
    ? { background: COLORS.successBg, color: COLORS.successText }
    : submitStatus.kind === "error"
      ? { background: COLORS.errorBg, color: COLORS.errorText }
      : { background: COLORS.infoBg, color: COLORS.infoText };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.pageBg, color: COLORS.text, fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? 16 : 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 16, alignItems: "stretch" }}>
          <SectionCard>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...chipStyle("景點"), background: COLORS.primary, color: "#ffffff", borderColor: COLORS.primary }}>旅遊行程地圖</span>
              <span style={{ ...chipStyle("寺社"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>城市精選</span>
              <span style={{ ...chipStyle("逛街"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>景點與活動</span>
              <span style={{ ...chipStyle("活動"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>Reel 投稿入口</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 30 : 52, lineHeight: 1.08, fontWeight: 900 }}>
                把旅遊靈感整理成
                <br />
                可直接使用的城市地圖與行程頁
              </h1>
              <p style={{ marginTop: 14, maxWidth: 820, color: COLORS.subtext, fontSize: 16, lineHeight: 1.8 }}>
                依城市查看景點、活動、地圖位置與推薦安排，並可直接在頁面上貼上 Reel，送進後續整理流程。
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
              <MetricCard label="城市數" value={String(cityStats.cities)} sub="持續擴充中" />
              <MetricCard label="景點數" value={String(cityStats.spots)} sub="目前可瀏覽" />
              <MetricCard label="活動數" value={String(cityStats.events)} sub="已發布內容" />
              <MetricCard label="推薦安排" value={String(cityStats.picks)} sub="依時間與區域計算" />
            </div>
          </SectionCard>

          <div style={{ background: COLORS.primary, color: "#ffffff", borderRadius: 28, padding: 24, boxShadow: "0 10px 35px rgba(0,0,0,0.14)" }}>
            <div style={{ fontSize: 13, color: "#d6d3d1" }}>網址分析入口</div>
            <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900 }}>貼網址 → 分析 → 確認寫入</div>
            <form onSubmit={handleAnalyzeUrl} style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <input
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                placeholder="只貼 Instagram Reel / Threads / 網址 就可以"
                style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}
              />
              <input
                value={submitTitle}
                onChange={(e) => setSubmitTitle(e.target.value)}
                placeholder="可選：人工補充標題提示"
                style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}
              />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                <select value={submitCitySlug} onChange={(e) => setSubmitCitySlug(e.target.value)} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}>
                  <option value="" style={{ color: COLORS.text }}>自動判斷城市</option>
                  {cityIndex.map((city) => (
                    <option key={city.slug} value={city.slug} style={{ color: COLORS.text }}>
                      {city.label}
                    </option>
                  ))}
                </select>
                <select value={submitType} onChange={(e) => setSubmitType(e.target.value)} style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}>
                  {ANALYZE_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type} style={{ color: COLORS.text }}>
                      {type === "auto" ? "自動判斷類型" : type === "spot" ? "偏向景點 / 美食" : "偏向活動 / 展覽"}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                placeholder="可選：補充提示，例如『這支影片應該是京都咖啡店』或『這是期間限定活動』"
                style={{ width: "100%", minHeight: 96, borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: 16, outline: "none", resize: "vertical" }}
              />
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                <PrimaryButton type="submit" onClick={handleAnalyzeUrl} disabled={isAnalyzing || isConfirming}>
                  {isAnalyzing ? "分析中…" : "先分析網址"}
                </PrimaryButton>
                <PrimaryButton secondary onClick={handleConfirmAnalysis} disabled={!analysisPreview || isAnalyzing || isConfirming}>
                  {isConfirming ? "寫入中…" : "確認後寫入"}
                </PrimaryButton>
              </div>
            </form>
            <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.8, color: "#e7e5e4" }}>
              前端現在會先呼叫 <code style={{ color: "#fff" }}>{ANALYZE_API_PATH}</code> 做分析，顯示結果給你檢查；你按確認後，才會呼叫 <code style={{ color: "#fff" }}>{CONFIRM_ANALYSIS_API_PATH}</code> 真正寫入資料庫。
            </div>
            {submitStatus.kind !== "idle" ? (
              <div style={{ marginTop: 14, borderRadius: 18, padding: 14, fontSize: 13, lineHeight: 1.8, ...submitStatusStyle }}>
                {submitStatus.message}
              </div>
            ) : null}
            {analysisPreview ? (
              <div style={{ marginTop: 16, borderRadius: 22, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#d6d3d1" }}>分析預覽</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{analysisPreview.sourceTitle}</div>
                    <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>
                      類型：{prettyAnalysisKind(analysisPreview.contentKind)} ｜ 平台：{analysisPreview.sourcePlatform} ｜ 城市：{analysisPreview.citySlug || "待判定"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ borderRadius: 999, padding: "6px 10px", fontSize: 12, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                      信心 {Math.round((analysisPreview.confidence || 0) * 100)}%
                    </span>
                    <span style={{ borderRadius: 999, padding: "6px 10px", fontSize: 12, background: analysisPreview.needsReview ? COLORS.warningBg : COLORS.successBg, color: analysisPreview.needsReview ? COLORS.warningText : COLORS.successText }}>
                      {analysisPreview.needsReview ? "建議人工確認" : "可直接寫入"}
                    </span>
                  </div>
                </div>
                {analysisPreview.summary ? (
                  <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8, color: "#f5f5f4" }}>{analysisPreview.summary}</div>
                ) : null}
                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  {analysisPreview.items.length ? analysisPreview.items.map((item) => (
                    <div key={item.id} style={{ borderRadius: 18, background: "rgba(255,255,255,0.08)", padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 800 }}>{item.name}</div>
                        <span style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12, background: "rgba(255,255,255,0.12)", color: "#fff" }}>{item.category}</span>
                      </div>
                      {item.area ? <div style={{ marginTop: 6, fontSize: 12, color: "#d6d3d1" }}>區域：{item.area}</div> : null}
                      {item.description ? <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>{item.description}</div> : null}
                      {item.tags?.length ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          {item.tags.map((tag) => (
                            <span key={tag} style={{ borderRadius: 999, background: "rgba(255,255,255,0.10)", padding: "4px 8px", fontSize: 12, color: "#fff" }}>#{tag}</span>
                          ))}
                        </div>
                      ) : null}
                      {analysisPreview.contentKind === "event" ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#d6d3d1" }}>
                          活動期間：{item.starts_on || "未定"} ～ {item.ends_on || "未定"}
                        </div>
                      ) : null}
                      {analysisPreview.contentKind === "spot" && item.best_time ? (
                        <div style={{ marginTop: 8, fontSize: 12, color: "#d6d3d1" }}>
                          建議時段：{item.best_time}{item.stay_minutes ? ` ／ 停留 ${item.stay_minutes} 分` : ""}
                        </div>
                      ) : null}
                      {item.reason ? <div style={{ marginTop: 8, fontSize: 12, color: "#d6d3d1" }}>判斷依據：{item.reason}</div> : null}
                    </div>
                  )) : (
                    <div style={{ borderRadius: 18, background: "rgba(255,255,255,0.08)", padding: 14, fontSize: 13, color: "#f5f5f4", lineHeight: 1.8 }}>
                      目前沒有拆出明確的景點或活動項目，確認後會先以來源資料寫入待整理清單。
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <SectionCard title="來源清單">
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
              {sources.map((source) => (
                <div key={source.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.card, padding: 18 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{source.platform || "來源"}</span>
                    <span style={{ borderRadius: 999, background: "#ffffff", border: `1px solid ${COLORS.border}`, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{source.status || "待整理"}</span>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800 }}>{source.title}</div>
                  <div style={{ marginTop: 8, fontSize: 13, color: COLORS.subtext, lineHeight: 1.7 }}>{source.note || ""}</div>
                  <div style={{ marginTop: 14 }}>
                    <PrimaryButton href={source.url} block secondary>開啟原始來源</PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div style={{ marginTop: 20 }}>
          <SectionCard title="城市入口">
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
              {cityIndex.map((city) => {
                const active = selectedCitySlug === city.slug;
                return (
                  <button
                    key={city.slug}
                    type="button"
                    onClick={() => setSelectedCitySlug(normalizeCitySlugValue(city.slug))}
                    style={{
                      textAlign: "left",
                      border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                      borderRadius: 28,
                      background: active ? "#fff" : COLORS.card,
                      boxShadow: active ? "0 10px 26px rgba(0,0,0,0.08)" : "0 6px 18px rgba(0,0,0,0.04)",
                      padding: 20,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 34 }}>{city.emoji}</div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>{city.label}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: COLORS.subtext }}>{city.region}</div>
                    <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.8, color: COLORS.subtext }}>{city.description}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {city.spotlight.map((item) => (
                        <span key={item} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{item}</span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1.2fr 0.9fr", gap: 16, marginTop: 20 }}>
          <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
            <SectionCard
              title={selectedCity ? `${selectedCity.label} 旅遊地圖` : "城市地圖"}
              right={
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜尋景點、活動、地區、標籤"
                    style={{ minWidth: 220, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }}
                    disabled={!hasCitySelected}
                  />
                  <select value={selectedCitySlug} onChange={(e) => setSelectedCitySlug(e.target.value)} style={{ borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }}>
                    <option value="unselected">請先選擇城市</option>
                    {cityIndex.map((city) => (
                      <option key={city.slug} value={normalizeCitySlugValue(city.slug)}>{city.label}</option>
                    ))}
                    <option value="all">全部城市</option>
                  </select>
                </div>
              }
            >
              <div style={{ marginBottom: 16, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {CONTENT_MODES.map((mode) => {
                    const active = selectedContentMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSelectedContentMode(mode)}
 
