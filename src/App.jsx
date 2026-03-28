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
    // ignore and fall back below
  }
  return "/";
})();

const DATA_SOURCE_MODE = "Notion 主資料庫 → GitHub Actions 產出靜態 JSON → GitHub Pages 前端讀取";
const CONTENT_MODES = ["spots", "events"];

const CITY_INDEX_SEED = [
  {
    slug: "kyoto",
    label: "京都",
    emoji: "⛩️",
    region: "關西",
    description: "寺社、散步、甜點與選物密度高，適合慢節奏安排。",
    status: "active",
    spotlight: ["寺社", "甜點", "散步"],
    heroArea: "佛光寺周邊",
  },
  {
    slug: "osaka",
    label: "大阪",
    emoji: "🍢",
    region: "關西",
    description: "小吃、商圈與夜間行程豐富，適合美食導向安排。",
    status: "active",
    spotlight: ["小吃", "商圈", "夜生活"],
    heroArea: "新世界／通天閣",
  },
];

const SOURCES_SEED = [
  {
    id: "src-threads-demo",
    title: "可點旅遊行程表範例",
    url: "https://www.threads.com/@cecilypantw/post/DWOLr2pjflm/...",
    platform: "Threads",
    status: "已匯入",
    note: "已依範例做成可點地圖＋清單圖卡＋推薦路線的版型。",
  },
  {
    id: "src-osaka-gyutan",
    title: "大阪牛舌 Reel",
    url: "https://www.instagram.com/reel/DWOiXYxkf97/",
    platform: "Instagram Reel",
    status: "部分辨識",
    note: "已整理出吉次牛舌與心齋橋區域線索；分店點位先以推定方式放入。",
  },
  {
    id: "src-osaka-shinsekai-food",
    title: "大阪新世界街邊美食 Reel",
    url: "https://www.instagram.com/reel/DV_M4ayDcf-/",
    platform: "Instagram Reel",
    status: "已匯入",
    note: "已放入 Nonkiya、Matsuya、串炸八重勝等可辨識點位。",
  },
  {
    id: "src-kyoto-hidden-list",
    title: "京都私藏清單 Reel",
    url: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    platform: "Instagram Reel",
    status: "部分辨識",
    note: "已放入 D&DEPARTMENT KYOTO、平等寺（因幡堂）、麓壽庵；其餘點位待後續補齊。",
  },
  {
    id: "src-kyoto-spring-night",
    title: "京都夜櫻活動範例",
    url: "https://example.com/kyoto-night-event",
    platform: "手動新增",
    status: "待整理",
    note: "活動資料範例，用於前台 events 分流展示。",
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
    description: "依 Reel 內容先建為大阪心齋橋區的牛舌名店。適合安排在晚餐時段，主打職人炭烤牛舌。",
    sourceId: "src-osaka-gyutan",
    sourceTitle: "大阪牛舌 Reel",
    sourceUrl: "https://www.instagram.com/reel/DWOiXYxkf97/",
    bestTime: "晚上",
    stayMinutes: 75,
    tags: ["牛舌", "大阪美食", "晚餐", "心齋橋"],
    lat: 34.6706,
    lng: 135.5023,
    confidence: "推定",
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
    confidence: "已確認",
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
    confidence: "已確認",
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
    description: "Reel 可辨識出的新世界經典串炸名店，適合當作新世界區晚餐主站。",
    sourceId: "src-osaka-shinsekai-food",
    sourceTitle: "大阪新世界街邊美食 Reel",
    sourceUrl: "https://www.instagram.com/reel/DV_M4ayDcf-/",
    bestTime: "晚上",
    stayMinutes: 60,
    tags: ["串炸", "大阪經典", "排隊店", "新世界"],
    lat: 34.6525,
    lng: 135.5056,
    confidence: "已確認",
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
    confidence: "已確認",
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
    confidence: "推定",
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
    description: "Reel 提到是貓奴狗主必訪的守護聖地，適合排在市區散步路線中。",
    sourceId: "src-kyoto-hidden-list",
    sourceTitle: "京都私藏清單 Reel",
    sourceUrl: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    bestTime: "下午",
    stayMinutes: 30,
    tags: ["寵物御守", "祈福", "寺社", "散步"],
    lat: 35.0013,
    lng: 135.7582,
    confidence: "已確認",
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
    confidence: "已確認",
    thumbnail: "🍵",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=麓壽庵+kyoto",
    published: true,
  },
];

const EVENTS_SEED = [
  {
    id: "evt-kyoto-night-sakura",
    city: "京都",
    citySlug: "kyoto",
    area: "東山周邊",
    name: "京都夜櫻點燈示意活動",
    category: "活動",
    description: "示意用活動資料。正式版會由 Notion Events 資料庫同步，適合做期間限定活動展示。",
    sourceId: "src-kyoto-spring-night",
    sourceTitle: "京都夜櫻活動範例",
    sourceUrl: "https://example.com/kyoto-night-event",
    tags: ["夜櫻", "期間限定", "春季"],
    lat: 35.0037,
    lng: 135.7788,
    thumbnail: "🌸",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=%E6%9D%B1%E5%B1%B1+%E4%BA%AC%E9%83%BD",
    startsOn: "2026-03-25",
    endsOn: "2026-04-10",
    startTime: "18:00",
    endTime: "21:00",
    ticketType: "現場購票",
    priceNote: "示意資料",
    published: true,
    status: "待整理",
  },
  {
    id: "evt-osaka-food-fes",
    city: "大阪",
    citySlug: "osaka",
    area: "中之島",
    name: "大阪美食市集示意活動",
    category: "活動",
    description: "示意用活動資料，正式版可放快閃市集、祭典、展覽等日期型內容。",
    sourceId: "src-osaka-shinsekai-food",
    sourceTitle: "大阪新世界街邊美食 Reel",
    sourceUrl: "https://www.instagram.com/reel/DV_M4ayDcf-/",
    tags: ["市集", "美食", "週末"],
    lat: 34.6925,
    lng: 135.4904,
    thumbnail: "🎏",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=%E4%B8%AD%E4%B9%8B%E5%B3%B6+%E5%A4%A7%E9%98%AA",
    startsOn: "2026-04-12",
    endsOn: "2026-04-14",
    startTime: "11:00",
    endTime: "20:00",
    ticketType: "免費入場",
    priceNote: "餐飲另計",
    published: true,
    status: "待整理",
  },
];

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
  success: "#166534",
  info: "#1d4ed8",
  warningBg: "#fff7ed",
  warningText: "#c2410c",
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
  if (normalizedSlug === "all") {
    return [`${BASE_URL}data/all.json`];
  }

  return [
    `${BASE_URL}data/cities/${normalizedSlug}.json`,
    `${BASE_URL}data/${normalizedSlug}.json`,
    `${BASE_URL}data/${citySlug}.json`,
  ];
}

function cityDataPath(citySlug) {
  return cityDataPaths(citySlug)[0] || null;
}

function cityLabelToSlug(label) {
  const city = CITY_INDEX_SEED.find((item) => item.label === label);
  return city ? city.slug : normalizeCitySlugValue(label);
}

function citySlugToLabel(slug, cityIndex) {
  const city = cityIndex.find((item) => item.slug === slug);
  return city ? city.label : slug;
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
    status: city.status || "active",
    spotlight: Array.isArray(city.spotlight) ? city.spotlight : [],
    heroArea: city.heroArea || "",
  };
}

function normalizeSource(source, index) {
  return {
    id: source.id || `source-${index}`,
    title: source.title || "未命名來源",
    url: source.url || "",
    platform: source.platform || "手動新增",
    status: source.status || "已匯入",
    note: source.note || "",
  };
}

function normalizeSpot(spot, index, cityIndex) {
  const cityLabel = spot.city || citySlugToLabel(spot.citySlug, cityIndex) || "未分類";
  const citySlug = spot.citySlug || cityLabelToSlug(cityLabel);
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
    confidence: spot.confidence || "推定",
    thumbnail: spot.thumbnail || "📍",
    mapUrl: spot.mapUrl || "",
    published: spot.published !== false,
  };
}

function normalizeEvent(event, index, cityIndex) {
  const cityLabel = event.city || citySlugToLabel(event.citySlug, cityIndex) || "未分類";
  const citySlug = event.citySlug || cityLabelToSlug(cityLabel);
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
    status: event.status || "待整理",
    published: event.published !== false,
  };
}

function normalizeCityIndexPayload(payload) {
  const rawCities = Array.isArray(payload?.cities) ? payload.cities : [];
  const cities = rawCities.map((city, index) => normalizeCity(city, index));
  const meta = payload?.meta || {};
  return {
    cities,
    meta: {
      generatedBy: meta.generatedBy || "unknown",
      lastSyncedAt: meta.lastSyncedAt || null,
      count: Number.isFinite(meta.count) ? meta.count : cities.length,
    },
  };
}

function normalizeCityPayload(payload, fallbackSlug, cityIndex) {
  const rawSpots = Array.isArray(payload?.spots) ? payload.spots : [];
  const rawEvents = Array.isArray(payload?.events) ? payload.events : [];
  const rawSources = Array.isArray(payload?.sources) ? payload.sources : [];
  const city = payload?.city || {};
  const meta = payload?.meta || {};

  const spots = rawSpots.map((spot, index) => normalizeSpot(spot, index, cityIndex));
  const events = rawEvents.map((event, index) => normalizeEvent(event, index, cityIndex));
  const sources = rawSources.map((source, index) => normalizeSource(source, index));
  const allItems = [...spots, ...events];

  return {
    city: normalizeCity(
      {
        slug: city.slug || fallbackSlug,
        label: city.label || citySlugToLabel(fallbackSlug, cityIndex),
        emoji: city.emoji || "📍",
        region: city.region || "未分類",
        description: city.description || "",
        status: city.status || "active",
        spotlight: city.spotlight || [],
        heroArea: city.heroArea || "",
      },
      0
    ),
    spots,
    events,
    sources: sources.length ? sources : filterSourcesByLinkedIds(allItems, SOURCES_SEED),
    meta: {
      lastSyncedAt: meta.lastSyncedAt || null,
      notionDataSourceId: meta.notionDataSourceId || null,
      generatedBy: meta.generatedBy || "unknown",
      sourceMode: meta.sourceMode || DATA_SOURCE_MODE,
      count: Number.isFinite(meta.count) ? meta.count : spots.length + events.length,
    },
  };
}

async function fetchCityIndex() {
  const response = await fetch(cityIndexPath(), { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`無法載入 ${cityIndexPath()}，HTTP ${response.status}`);
  }
  const payload = await response.json();
  return normalizeCityIndexPayload(payload);
}

async function fetchCityDataset(citySlug, cityIndex) {
  const paths = cityDataPaths(citySlug);
  if (!paths.length) {
    return {
      city: normalizeCity({ slug: "unselected", label: "未選擇" }, 0),
      spots: [],
      events: [],
      sources: [],
      meta: {
        lastSyncedAt: null,
        notionDataSourceId: null,
        generatedBy: "not-loaded",
        sourceMode: DATA_SOURCE_MODE,
        count: 0,
      },
    };
  }

  let lastError = null;
  for (const path of paths) {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (response.ok) {
      const payload = await response.json();
      return normalizeCityPayload(payload, normalizeCitySlugValue(citySlug), cityIndex);
    }
    lastError = new Error(`無法載入 ${path}，HTTP ${response.status}`);
  }

  throw lastError || new Error(`無法載入城市資料：${citySlug}`);
}

function toCoordinateTuples(items) {
  return items.reduce((acc, item) => {
    if (Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
      acc.push([item.lat, item.lng]);
    }
    return acc;
  }, []);
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
  if (currentTime === "晚上" && (spot.category === "餐廳" || spot.category === "小吃")) score += 2;
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

function runDataSanityChecks() {
  const tuples = toCoordinateTuples(SPOTS_SEED);
  const normalized = normalizeItemsForMap(SPOTS_SEED);
  const recommendations = buildRecommendation(filterByCitySlug(SPOTS_SEED, "kyoto"), "佛光寺周邊", "下午");
  const kyotoOnly = filterByCitySlug(SPOTS_SEED, "kyoto");
  const osakaOnly = filterByCitySlug(SPOTS_SEED, "osaka");
  const eventsKyoto = filterByCitySlug(EVENTS_SEED, "kyoto");
  const fakeCityIndex = normalizeCityIndexPayload({
    cities: [{ slug: "tokyo", label: "東京", emoji: "🗼" }],
    meta: { count: 1, generatedBy: "github-actions" },
  });
  const fakeCityPayload = normalizeCityPayload(
    {
      city: { slug: "kyoto", label: "京都" },
      spots: [{ id: "t1", citySlug: "kyoto", name: "測試點", lat: 35, lng: 135.7 }],
      events: [{ id: "e1", citySlug: "kyoto", name: "測試活動", lat: 35, lng: 135.71 }],
      sources: [{ id: "s1", title: "測試來源", url: "https://example.com" }],
      meta: { count: 2, generatedBy: "github-actions" },
    },
    "kyoto",
    CITY_INDEX_SEED
  );
  const indexPath = cityIndexPath();
  const kyotoPath = cityDataPath("kyoto");
  const legacyKyotoPaths = cityDataPaths("京都");

  const testCases = [
    { name: "BASE_URL 應至少有 fallback 字串", pass: typeof BASE_URL === "string" && BASE_URL.length > 0 },
    { name: "城市索引路徑應存在", pass: typeof indexPath === "string" && indexPath.includes("data/") },
    { name: "城市資料路徑應存在", pass: typeof kyotoPath === "string" && kyotoPath.includes("cities/kyoto.json") },
    { name: "中文城市名稱應可轉成 kyoto 路徑", pass: Array.isArray(legacyKyotoPaths) && legacyKyotoPaths[0]?.includes("cities/kyoto.json") },
    { name: "城市索引應至少有 2 城", pass: CITY_INDEX_SEED.length >= 2 },
    { name: "每個 city 都應有 slug", pass: CITY_INDEX_SEED.every((city) => typeof city.slug === "string" && city.slug.length > 0) },
    { name: "每個 spot 都應有有效座標", pass: tuples.length === SPOTS_SEED.length },
    { name: "tuple 應為 [lat, lng]", pass: tuples.every((tuple) => Array.isArray(tuple) && tuple.length === 2 && tuple.every((value) => typeof value === "number")) },
    { name: "地圖點位數量應與 spots 一致", pass: normalized.length === SPOTS_SEED.length },
    { name: "所有地圖點位 left 應落在 0 到 100", pass: normalized.every((point) => point.left >= 0 && point.left <= 100) },
    { name: "所有地圖點位 top 應落在 0 到 100", pass: normalized.every((point) => point.top >= 0 && point.top <= 100) },
    { name: "推薦結果最多 4 筆", pass: recommendations.length <= 4 },
    { name: "京都篩選結果都應為 kyoto", pass: kyotoOnly.length > 0 && kyotoOnly.every((spot) => spot.citySlug === "kyoto") },
    { name: "大阪篩選結果都應為 osaka", pass: osakaOnly.length > 0 && osakaOnly.every((spot) => spot.citySlug === "osaka") },
    { name: "京都 events 篩選應有效", pass: eventsKyoto.length > 0 && eventsKyoto.every((event) => event.citySlug === "kyoto") },
    { name: "城市索引 normalize 後應保留 count", pass: fakeCityIndex.meta.count === 1 },
    { name: "城市 payload normalize 後應有 events", pass: fakeCityPayload.events.length === 1 },
    { name: "每個 source 都應有網址", pass: SOURCES_SEED.every((source) => typeof source.url === "string" && source.url.startsWith("http")) },
    { name: "每個 spot 都應有 Google Maps 連結", pass: SPOTS_SEED.every((spot) => typeof spot.mapUrl === "string" && spot.mapUrl.includes("google.com/maps")) },
  ];

  const failed = testCases.filter((test) => !test.pass);
  if (failed.length > 0) {
    console.warn("TravelReelsTripPlanner sanity checks failed:", failed.map((item) => item.name));
  }
}

runDataSanityChecks();

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

function PrimaryButton({ children, href, onClick, secondary = false, block = false }) {
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
    background: secondary ? "#ffffff" : COLORS.primary,
    color: secondary ? COLORS.text : "#ffffff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" style={style}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} style={style}>
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
        <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>城市分布圖</div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: COLORS.subtext }}>
          這個前台改成城市索引 + 城市資料架構。每個城市 JSON 裡可同時帶 spots、events、sources 與 meta。
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
                transform: active ? "scale(1.08)" : "scale(1)",
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
  const [cityIndexMeta, setCityIndexMeta] = useState({ generatedBy: "seed", lastSyncedAt: null, count: CITY_INDEX_SEED.length });
  const [selectedCitySlug, setSelectedCitySlug] = useState("unselected");
  const [selectedContentMode, setSelectedContentMode] = useState("spots");
  const [sources, setSources] = useState(SOURCES_SEED);
  const [fallbackSpots] = useState(SPOTS_SEED);
  const [fallbackEvents] = useState(EVENTS_SEED);
  const [loadedSpots, setLoadedSpots] = useState([]);
  const [loadedEvents, setLoadedEvents] = useState([]);
  const [search, setSearch] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("下午");
  const [baseArea, setBaseArea] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [activeItemId, setActiveItemId] = useState(null);
  const [loadState, setLoadState] = useState("idle");
  const [loadError, setLoadError] = useState("");
  const [syncMeta, setSyncMeta] = useState({
    lastSyncedAt: null,
    notionDataSourceId: null,
    generatedBy: "not-loaded",
    sourceMode: DATA_SOURCE_MODE,
    count: 0,
  });
  const isMobile = useResponsiveColumns();

  const hasCitySelected = selectedCitySlug !== "unselected";

  useEffect(() => {
    let cancelled = false;

    async function loadIndex() {
      try {
        const payload = await fetchCityIndex();
        if (cancelled) return;
        if (payload.cities.length) {
          setCityIndex(payload.cities);
          setCityIndexMeta(payload.meta);
        }
      } catch (_error) {
        if (cancelled) return;
        setCityIndex(CITY_INDEX_SEED);
        setCityIndexMeta({ generatedBy: "seed", lastSyncedAt: null, count: CITY_INDEX_SEED.length });
      }
    }

    loadIndex();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCityData() {
      if (!hasCitySelected) {
        setLoadedSpots([]);
        setLoadedEvents([]);
        setSources(SOURCES_SEED);
        setLoadState("idle");
        setLoadError("");
        setSyncMeta({
          lastSyncedAt: null,
          notionDataSourceId: null,
          generatedBy: "not-loaded",
          sourceMode: DATA_SOURCE_MODE,
          count: 0,
        });
        setActiveItemId(null);
        setBaseArea("");
        setSelectedCategories([]);
        setFavorites([]);
        return;
      }

      setLoadState("loading");
      setLoadError("");

      try {
        const payload = await fetchCityDataset(selectedCitySlug, cityIndex);
        if (cancelled) return;

        const fallbackSpotsByCity = filterByCitySlug(fallbackSpots, selectedCitySlug);
        const fallbackEventsByCity = filterByCitySlug(fallbackEvents, selectedCitySlug);
        const safeSpots = payload.spots.length ? payload.spots : fallbackSpotsByCity;
        const safeEvents = payload.events.length ? payload.events : fallbackEventsByCity;
        const safeSources = payload.sources.length ? payload.sources : filterSourcesByLinkedIds([...safeSpots, ...safeEvents], SOURCES_SEED);
        const firstArea = safeSpots[0]?.area || safeEvents[0]?.area || payload.city.heroArea || "";
        const defaultActiveId = selectedContentMode === "events"
          ? safeEvents[0]?.id || safeSpots[0]?.id || null
          : safeSpots[0]?.id || safeEvents[0]?.id || null;

        setLoadedSpots(safeSpots);
        setLoadedEvents(safeEvents);
        setSources(safeSources);
        setSyncMeta({
          lastSyncedAt: payload.meta.lastSyncedAt,
          notionDataSourceId: payload.meta.notionDataSourceId,
          generatedBy: payload.meta.generatedBy,
          sourceMode: payload.meta.sourceMode,
          count: payload.meta.count,
        });
        setBaseArea(firstArea);
        setActiveItemId(defaultActiveId);
        setSelectedCategories([]);
        setFavorites([]);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;

        const fallbackSpotsByCity = filterByCitySlug(fallbackSpots, selectedCitySlug);
        const fallbackEventsByCity = filterByCitySlug(fallbackEvents, selectedCitySlug);
        const fallbackSources = filterSourcesByLinkedIds([...fallbackSpotsByCity, ...fallbackEventsByCity], SOURCES_SEED);
        const defaultActiveId = selectedContentMode === "events"
          ? fallbackEventsByCity[0]?.id || fallbackSpotsByCity[0]?.id || null
          : fallbackSpotsByCity[0]?.id || fallbackEventsByCity[0]?.id || null;

        setLoadedSpots(fallbackSpotsByCity);
        setLoadedEvents(fallbackEventsByCity);
        setSources(fallbackSources);
        setActiveItemId(defaultActiveId);
        setBaseArea(fallbackSpotsByCity[0]?.area || fallbackEventsByCity[0]?.area || "");
        setSyncMeta({
          lastSyncedAt: null,
          notionDataSourceId: null,
          generatedBy: "fallback-seed",
          sourceMode: DATA_SOURCE_MODE,
          count: fallbackSpotsByCity.length + fallbackEventsByCity.length,
        });
        setLoadError(error instanceof Error ? error.message : "載入失敗");
        setLoadState("fallback");
      }
    }

    loadCityData();
    return () => {
      cancelled = true;
    };
  }, [selectedCitySlug, hasCitySelected, cityIndex, fallbackSpots, fallbackEvents, selectedContentMode]);

  const selectedCity = useMemo(
    () => cityIndex.find((city) => city.slug === selectedCitySlug) || null,
    [cityIndex, selectedCitySlug]
  );

  const allAreas = useMemo(() => {
    const base = selectedContentMode === "events" ? loadedEvents : loadedSpots;
    return [...new Set(base.map((item) => item.area).filter(Boolean))];
  }, [loadedSpots, loadedEvents, selectedContentMode]);

  const allCategories = useMemo(() => {
    const base = selectedContentMode === "events" ? loadedEvents : loadedSpots;
    return [...new Set(base.map((item) => item.category).filter(Boolean))];
  }, [loadedSpots, loadedEvents, selectedContentMode]);

  const filteredSpots = useMemo(() => {
    return loadedSpots.filter((spot) => {
      const categoryMatches = selectedCategories.length === 0 || selectedCategories.includes(spot.category);
      const searchMatches =
        search.trim().length === 0
          ? true
          : `${spot.name} ${spot.description} ${spot.tags.join(" ")} ${spot.area}`.toLowerCase().includes(search.toLowerCase());
      return categoryMatches && searchMatches;
    });
  }, [loadedSpots, selectedCategories, search]);

  const filteredEvents = useMemo(() => {
    return loadedEvents.filter((event) => {
      const categoryMatches = selectedCategories.length === 0 || selectedCategories.includes(event.category);
      const searchMatches =
        search.trim().length === 0
          ? true
          : `${event.name} ${event.description} ${event.tags.join(" ")} ${event.area}`.toLowerCase().includes(search.toLowerCase());
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
    spots: fallbackSpots.length,
    events: fallbackEvents.length,
    sources: SOURCES_SEED.length,
  }), [cityIndex, fallbackSpots, fallbackEvents]);

  const totalStay = recommendations.reduce((sum, spot) => sum + spot.stayMinutes, 0);

  function toggleCategory(category) {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]));
  }

  function toggleFavorite(id) {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function addPendingUrl(url) {
    const clean = url.trim();
    if (!clean) return;
    setSources((prev) => [
      {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: "待整理的新來源",
        url: clean,
        platform: "手動新增",
        status: "待整理",
        note: "這筆網址已先加入來源清單，後續可再解析內容並寫回 Notion Sources。",
      },
      ...prev,
    ]);
  }

  function bulkAddUrls() {
    const urls = bulkText
      .split(/\n|\s+/)
      .map((value) => value.trim())
      .filter((value) => value.startsWith("http"));
    urls.forEach((url) => addPendingUrl(url));
    setBulkText("");
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.pageBg, color: COLORS.text, fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? 16 : 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 16, alignItems: "stretch" }}>
          <SectionCard>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...chipStyle("景點"), background: COLORS.primary, color: "#ffffff", borderColor: COLORS.primary }}>旅遊 Reels 行程頁 v2</span>
              <span style={{ ...chipStyle("寺社"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>Cities / Spots / Events / Sources</span>
              <span style={{ ...chipStyle("逛街"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>城市索引載入</span>
              <span style={{ ...chipStyle("活動"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>Notion 主資料庫模式</span>
            </div>

            <div style={{ marginTop: 18 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 30 : 52, lineHeight: 1.08, fontWeight: 900 }}>
                旅遊頁資料架構
                <br />
                升級成城市索引＋景點／活動分流
              </h1>
              <p style={{ marginTop: 14, maxWidth: 820, color: COLORS.subtext, fontSize: 16, lineHeight: 1.8 }}>
                這版把前台從固定城市常數升級成動態城市索引。未來新增東京、福岡、沖繩，只要在 Notion Cities / Spots / Events / Sources 補資料，GitHub Actions 產出新的 JSON，前台就能直接出現新城市與新內容。
              </p>
            </div>

            <div style={{ marginTop: 18, borderRadius: 20, border: `1px solid ${COLORS.border}`, background: "#ffffff", padding: 16 }}>
              <div style={{ fontSize: 13, color: COLORS.subtext }}>資料來源模式</div>
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800 }}>{DATA_SOURCE_MODE}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: COLORS.subtext, lineHeight: 1.8 }}>
                前端先讀取 data/cities/index.json，再依選擇的 city slug 載入 data/cities/&lt;slug&gt;.json。城市資料檔內同時包含 spots、events、sources 與 meta。
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
              <MetricCard label="城市數" value={String(cityStats.cities)} sub="Cities Index" />
              <MetricCard label="景點數" value={String(cityStats.spots)} sub="Spots Seed" />
              <MetricCard label="活動數" value={String(cityStats.events)} sub="Events Seed" />
              <MetricCard label="來源數" value={String(cityStats.sources)} sub="Sources Seed" />
            </div>
          </SectionCard>

          <div style={{ background: COLORS.primary, color: "#ffffff", borderRadius: 28, padding: 24, boxShadow: "0 10px 35px rgba(0,0,0,0.14)" }}>
            <div style={{ fontSize: 13, color: "#d6d3d1" }}>Notion 主資料庫規劃</div>
            <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900 }}>同步與整理入口</div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ fontWeight: 800 }}>1. Cities</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>管理城市索引、slug、emoji、region、heroArea、狀態與排序。</div>
              </div>
              <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ fontWeight: 800 }}>2. Spots</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>管理固定地點，例如景點、餐廳、小吃、寺社、逛街、甜點。</div>
              </div>
              <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ fontWeight: 800 }}>3. Events</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>管理有日期的活動，例如祭典、市集、展覽、快閃活動。</div>
              </div>
              <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ fontWeight: 800 }}>4. Sources</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>管理 Reels、Threads、文章、地圖連結與整理狀態。</div>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="貼上新的 Reel / 文章 / Google Map 網址"
                style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <PrimaryButton onClick={() => { addPendingUrl(newUrl); setNewUrl(""); }}>先加入待整理</PrimaryButton>
                <PrimaryButton secondary>後續整理後寫回 Notion Sources</PrimaryButton>
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, color: "#d6d3d1" }}>也可以一次貼多筆網址</div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`https://www.instagram.com/reel/...\nhttps://www.instagram.com/reel/...\nhttps://maps.app.goo.gl/...`}
                style={{ width: "100%", minHeight: 130, marginTop: 8, borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: 16, outline: "none", resize: "vertical" }}
              />
              <div style={{ marginTop: 12 }}>
                <PrimaryButton secondary onClick={bulkAddUrls}>批次加入來源清單</PrimaryButton>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <SectionCard title="城市入口索引" right={<span style={{ fontSize: 12, color: COLORS.subtext }}>來源：{cityIndexMeta.generatedBy} / {cityIndexMeta.count} cities</span>}>
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
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 34 }}>{city.emoji}</div>
                        <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>{city.label}</div>
                        <div style={{ marginTop: 4, fontSize: 13, color: COLORS.subtext }}>{city.region}</div>
                      </div>
                      <span style={{ borderRadius: 999, padding: "6px 10px", fontSize: 12, background: active ? COLORS.primary : COLORS.primarySoft, color: active ? "#fff" : COLORS.text }}>
                        {city.status}
                      </span>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.8, color: COLORS.subtext }}>{city.description}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {city.spotlight.map((item) => (
                        <span key={item} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{item}</span>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: COLORS.subtext }}>slug: {city.slug} / heroArea: {city.heroArea || "未設定"}</div>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div style={{ marginTop: 20 }}>
          <SectionCard title="已匯入來源">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              {sources.map((source) => (
                <div key={source.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 22, background: COLORS.card, padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <span style={{ border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>{source.platform}</span>
                        <span style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12, background: COLORS.primary, color: "#ffffff" }}>{source.status}</span>
                      </div>
                      <div style={{ marginTop: 10, fontWeight: 800, fontSize: 16 }}>{source.title}</div>
                      <div style={{ marginTop: 8, color: COLORS.subtext, fontSize: 14, lineHeight: 1.7 }}>{source.note}</div>
                    </div>
                    <a href={source.url} target="_blank" rel="noreferrer" style={{ color: COLORS.text, textUnderlineOffset: 4, fontSize: 14, fontWeight: 700 }}>
                      原始連結
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1.2fr 0.9fr", gap: 16, marginTop: 20 }}>
          <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
            <SectionCard
              title={selectedCity ? `${selectedCity.label} 城市資料` : "城市資料"}
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
                        style={{
                          borderRadius: 999,
                          padding: "10px 14px",
                          border: `1px solid ${active ? COLORS.primary : COLORS.border}`,
                          background: active ? COLORS.primary : "#ffffff",
                          color: active ? "#ffffff" : COLORS.text,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {mode === "spots" ? `景點 Spots (${loadedSpots.length})` : `活動 Events (${loadedEvents.length})`}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {allCategories.map((category) => {
                    const active = selectedCategories.includes(category);
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        style={{
                          ...chipStyle(category),
                          cursor: "pointer",
                          background: active ? (CATEGORY_THEME[category]?.bg || COLORS.primarySoft) : "#ffffff",
                          color: active ? (CATEGORY_THEME[category]?.color || COLORS.text) : COLORS.subtext,
                          border: `1px solid ${active ? (CATEGORY_THEME[category]?.bg || COLORS.primarySoft) : COLORS.border}`,
                          opacity: hasCitySelected ? 1 : 0.5,
                        }}
                        disabled={!hasCitySelected}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ borderRadius: 999, padding: "6px 12px", background: COLORS.primarySoft, fontSize: 12, color: COLORS.subtext }}>載入狀態：{loadState}</span>
                  <span style={{ borderRadius: 999, padding: "6px 12px", background: "#eff6ff", fontSize: 12, color: COLORS.info }}>來源：{syncMeta.generatedBy}</span>
                  <span style={{ borderRadius: 999, padding: "6px 12px", background: "#f0fdf4", fontSize: 12, color: COLORS.success }}>筆數：{syncMeta.count}</span>
                  {syncMeta.lastSyncedAt ? (
                    <span style={{ borderRadius: 999, padding: "6px 12px", background: "#fff7ed", fontSize: 12, color: COLORS.accent }}>上次同步：{syncMeta.lastSyncedAt}</span>
                  ) : null}
                </div>

                {selectedCity ? (
                  <div style={{ borderRadius: 18, background: COLORS.primarySoft, padding: 14, fontSize: 13, color: COLORS.subtext, lineHeight: 1.8 }}>
                    {selectedCity.emoji} {selectedCity.label}：{selectedCity.description}
                    {selectedCity.heroArea ? ` 目前主推薦區域會優先採用 ${selectedCity.heroArea}。` : ""}
                  </div>
                ) : null}

                {loadError ? (
                  <div style={{ borderRadius: 18, background: "#fef2f2", color: "#991b1b", padding: 12, fontSize: 13, lineHeight: 1.7 }}>
                    目前尚未找到對應城市的 JSON，已自動改用前端 seed 作 fallback。錯誤：{loadError}
                  </div>
                ) : null}
              </div>

              {hasCitySelected ? (
                <VisualMap items={activeCollection} activeItemId={activeItem?.id || null} onSelect={setActiveItemId} />
              ) : (
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 28, textAlign: "center", color: COLORS.subtext }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: COLORS.text }}>請先選擇城市</div>
                  <div style={{ marginTop: 10, lineHeight: 1.8 }}>
                    前台會先讀取城市索引，再依城市 slug 載入該城市的 JSON。未來新增城市時，不需要再改前端常數。
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr", gap: 16, marginTop: 16 }}>
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.card, padding: 20 }}>
                  {activeItem ? (
                    <>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 42 }}>{activeItem.thumbnail}</div>
                        <div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={chipStyle(activeItem.category)}>{activeItem.category}</span>
                            {selectedContentMode === "spots" ? (
                              <span style={{ border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "6px 12px", fontSize: 12 }}>{activeItem.confidence}</span>
                            ) : (
                              <span style={{ border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "6px 12px", fontSize: 12 }}>{activeItem.status}</span>
                            )}
                          </div>
                          <div style={{ marginTop: 10, fontSize: 22, fontWeight: 900 }}>{activeItem.name}</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: COLORS.subtext }}>{activeItem.city}・{activeItem.area}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 14, fontSize: 14, color: COLORS.subtext, lineHeight: 1.8 }}>{activeItem.description}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                        {activeItem.tags.map((tag) => (
                          <span key={tag} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>#{tag}</span>
                        ))}
                      </div>
                      {selectedContentMode === "events" ? (
                        <div style={{ marginTop: 14, borderRadius: 18, background: COLORS.warningBg, color: COLORS.warningText, padding: 14, fontSize: 13, lineHeight: 1.8 }}>
                          活動期間：{formatEventWindow(activeItem)}
                          <br />
                          票務：{activeItem.ticketType || "未設定"} {activeItem.priceNote ? `／ ${activeItem.priceNote}` : ""}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ color: COLORS.subtext }}>目前沒有可顯示的內容。</div>
                  )}
                </div>

                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 20 }}>
                  <div style={{ fontSize: 13, color: COLORS.subtext }}>操作</div>
                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {activeItem ? (
                      <>
                        <PrimaryButton href={activeItem.mapUrl} block>開啟 Google Maps</PrimaryButton>
                        <PrimaryButton href={activeItem.sourceUrl} block secondary>查看原始來源</PrimaryButton>
                      </>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 12, color: COLORS.subtext, lineHeight: 1.7 }}>
                    這一區保留互動地圖體驗，但不依賴外部地圖套件，因此更適合放在 GitHub Pages。Notion 的真正讀寫同步，會由 GitHub Actions 使用 Secrets 與 Integration Token 在背景完成。
                  </div>
                  {syncMeta.notionDataSourceId ? (
                    <div style={{ marginTop: 12, fontSize: 12, color: COLORS.subtext, wordBreak: "break-all" }}>Data Source ID: {syncMeta.notionDataSourceId}</div>
                  ) : null}
                  {selectedCity ? (
                    <div style={{ marginTop: 12, fontSize: 12, color: COLORS.subtext }}>City slug: {selectedCity.slug} / region: {selectedCity.region}</div>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="現在怎麼排最順">
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: COLORS.subtext, marginBottom: 8 }}>目前時間</div>
                <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} style={{ width: "100%", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "12px 12px", outline: "none" }} disabled={!hasCitySelected}>
                  <option value="早上">早上</option>
                  <option value="中午">中午</option>
                  <option value="下午">下午</option>
                  <option value="晚上">晚上</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 13, color: COLORS.subtext, marginBottom: 8 }}>你人在哪一區附近</div>
                <select value={baseArea} onChange={(e) => setBaseArea(e.target.value)} style={{ width: "100%", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "12px 12px", outline: "none" }} disabled={!hasCitySelected || !allAreas.length || selectedContentMode === "events"}>
                  {allAreas.length ? allAreas.map((area) => (
                    <option key={area} value={area}>{area}</option>
                  )) : <option value="">請先選城市</option>}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16, borderRadius: 20, background: COLORS.primarySoft, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, color: COLORS.subtext }}>
                <span>推薦停留總時數</span>
                <span>{Math.round((totalStay / 60) * 10) / 10} 小時</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: COLORS.subtext }}>
                推薦邏輯目前以 Spots 為主，Events 主要負責期間型內容展示。未來可再進一步做活動與景點混排行程。
              </div>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              {recommendations.map((item) => (
                <div key={item.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 22, background: COLORS.card, padding: 16 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 999, background: COLORS.primary, color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800 }}>{item.order}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 800 }}>{item.name}</div>
                        <span style={{ border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>{item.bestTime}</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 14, color: COLORS.subtext }}>{item.reason}</div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 12, color: COLORS.subtext }}>
                        <span>{item.stayMinutes} 分</span>
                        <span>{item.city}・{item.area}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!recommendations.length && hasCitySelected ? (
                <div style={{ borderRadius: 18, background: COLORS.cardMuted, padding: 16, color: COLORS.subtext }}>目前這個城市還沒有可推薦的景點資料。</div>
              ) : null}
            </div>

            <div style={{ marginTop: 16 }}>
              <PrimaryButton secondary block>後續可再擴充成完整日程表</PrimaryButton>
            </div>
          </SectionCard>
        </div>

        <div style={{ marginTop: 20 }}>
          <SectionCard title={selectedContentMode === "spots" ? "景點圖卡" : "活動圖卡"}>
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
              {hasCitySelected ? activeCollection.map((item) => {
                const favored = favorites.includes(item.id);
                return (
                  <div key={item.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 28, overflow: "hidden", background: COLORS.card, boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: 20, background: "linear-gradient(135deg,#f5f5f4 0%,#ffffff 100%)", borderBottom: `1px solid ${COLORS.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 36 }}>{item.thumbnail}</span>
                            <span style={chipStyle(item.category)}>{item.category}</span>
                            <span style={{ border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "6px 10px", fontSize: 12 }}>{selectedContentMode === "spots" ? item.confidence : item.status}</span>
                          </div>
                          <div style={{ marginTop: 12, fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{item.name}</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: COLORS.subtext }}>{item.city}・{item.area}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(item.id)}
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 999,
                            border: `1px solid ${COLORS.border}`,
                            background: favored ? "#fee2e2" : "#ffffff",
                            cursor: "pointer",
                            fontSize: 18,
                          }}
                        >
                          {favored ? "❤️" : "🤍"}
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: 20 }}>
                      <div style={{ fontSize: 14, color: COLORS.subtext, lineHeight: 1.8 }}>{item.description}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                        {item.tags.map((tag) => (
                          <span key={tag} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>#{tag}</span>
                        ))}
                      </div>

                      {selectedContentMode === "spots" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                          <div style={{ borderRadius: 18, background: COLORS.primarySoft, padding: 14 }}>
                            <div style={{ fontSize: 12, color: COLORS.subtext }}>建議時段</div>
                            <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800 }}>{item.bestTime}</div>
                          </div>
                          <div style={{ borderRadius: 18, background: COLORS.primarySoft, padding: 14 }}>
                            <div style={{ fontSize: 12, color: COLORS.subtext }}>停留時間</div>
                            <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800 }}>{item.stayMinutes} 分</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 16, borderRadius: 18, background: COLORS.warningBg, color: COLORS.warningText, padding: 14, fontSize: 13, lineHeight: 1.8 }}>
                          活動期間：{formatEventWindow(item)}
                          <br />
                          票務：{item.ticketType || "未設定"} {item.priceNote ? `／ ${item.priceNote}` : ""}
                        </div>
                      )}

                      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                        <PrimaryButton href={item.mapUrl} block secondary>Google Maps</PrimaryButton>
                        <PrimaryButton href={item.sourceUrl} block>原始來源</PrimaryButton>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 24, color: COLORS.subtext }}>請先選擇城市，才會載入該城市的景點／活動圖卡。</div>
              )}
            </div>
          </SectionCard>
        </div>

        <div style={{ marginTop: 20, background: COLORS.primary, color: "#ffffff", borderRadius: 28, padding: isMobile ? 20 : 28, boxShadow: "0 10px 35px rgba(0,0,0,0.14)" }}>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>下一步可以怎麼擴充</div>
              <div style={{ marginTop: 10, lineHeight: 1.8, color: "#d6d3d1" }}>
                目前已經是可以展示、篩選、看點位、看推薦路線的旅遊原型。後續只要在 Notion 補上新城市、新景點、新活動與新來源，GitHub Actions 就能把它同步成新的前台 JSON。
              </div>
            </div>
            <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.10)", padding: 20 }}>
              <div style={{ fontWeight: 800 }}>已具備</div>
              <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.9, color: "#e7e5e4" }}>
                <li>城市索引載入</li>
                <li>景點 / 活動分流</li>
                <li>來源獨立管理</li>
                <li>依時間／區域推薦路線</li>
              </ul>
            </div>
            <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.10)", padding: 20 }}>
              <div style={{ fontWeight: 800 }}>可再接</div>
              <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.9, color: "#e7e5e4" }}>
                <li>GitHub Pages 部署</li>
                <li>manifest 與桌面圖示</li>
                <li>Notion → JSON 同步 workflow</li>
                <li>Cities / Spots / Events / Sources 四庫同步</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
