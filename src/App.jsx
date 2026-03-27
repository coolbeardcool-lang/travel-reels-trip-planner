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

const CITY_OPTIONS = ["未選擇", "京都", "大阪", "全部"];
const DATA_SOURCE_MODE = "Notion 主資料庫 → GitHub Actions 產出靜態 JSON → GitHub Pages 前端讀取";

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
];

const SPOTS_SEED = [
  {
    id: "osaka-yoshiji",
    city: "大阪",
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
  },
  {
    id: "osaka-nonkiya",
    city: "大阪",
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
  },
  {
    id: "osaka-matsuya",
    city: "大阪",
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
  },
  {
    id: "osaka-yaekatsu",
    city: "大阪",
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
  },
  {
    id: "kyoto-bukkouji-dd",
    city: "京都",
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
  },
  {
    id: "kyoto-bukkouji",
    city: "京都",
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
  },
  {
    id: "kyoto-byodoji",
    city: "京都",
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
  },
  {
    id: "kyoto-rokujuan",
    city: "京都",
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
};

const CATEGORY_THEME = {
  景點: { bg: "#e0f2fe", color: "#0369a1" },
  餐廳: { bg: "#ffe4e6", color: "#be123c" },
  小吃: { bg: "#fef3c7", color: "#b45309" },
  逛街: { bg: "#ede9fe", color: "#6d28d9" },
  甜點: { bg: "#fce7f3", color: "#be185d" },
  寺社: { bg: "#d1fae5", color: "#047857" },
};

function cityDataPath(city) {
  if (!city || city === "未選擇") return null;
  const file = city === "全部" ? "all" : city.toLowerCase();
  return `${BASE_URL}data/${file}.json`;
}

function filterSpotsByCity(spots, city) {
  if (!city || city === "未選擇") return [];
  if (city === "全部") return spots;
  return spots.filter((spot) => spot.city === city);
}

function filterSourcesBySpotLinks(spots, sources) {
  const sourceIds = new Set(spots.map((spot) => spot.sourceId).filter(Boolean));
  return sources.filter((source) => sourceIds.has(source.id));
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

function normalizeSpot(spot, index) {
  return {
    id: spot.id || `spot-${index}`,
    city: spot.city || "未分類",
    area: spot.area || "未分類區域",
    name: spot.name || "未命名景點",
    category: spot.category || "景點",
    description: spot.description || "",
    sourceId: spot.sourceId || "",
    sourceTitle: spot.sourceTitle || "",
    sourceUrl: spot.sourceUrl || "",
    bestTime: spot.bestTime || "下午",
    stayMinutes: Number.isFinite(spot.stayMinutes) ? spot.stayMinutes : 30,
    tags: Array.isArray(spot.tags) ? spot.tags : [],
    lat: Number.isFinite(spot.lat) ? spot.lat : 0,
    lng: Number.isFinite(spot.lng) ? spot.lng : 0,
    confidence: spot.confidence || "推定",
    thumbnail: spot.thumbnail || "📍",
    mapUrl: spot.mapUrl || "",
  };
}

function normalizePayload(payload, fallbackCity) {
  const rawSpots = Array.isArray(payload?.spots) ? payload.spots : [];
  const rawSources = Array.isArray(payload?.sources) ? payload.sources : [];

  const spots = rawSpots.map((spot, index) => normalizeSpot(spot, index));
  const sources = rawSources.map((source, index) => normalizeSource(source, index));
  const syncMeta = payload?.meta || {};

  return {
    city: payload?.city || fallbackCity,
    spots,
    sources: sources.length ? sources : filterSourcesBySpotLinks(spots, SOURCES_SEED),
    meta: {
      lastSyncedAt: syncMeta.lastSyncedAt || null,
      notionDataSourceId: syncMeta.notionDataSourceId || null,
      generatedBy: syncMeta.generatedBy || "unknown",
      sourceMode: syncMeta.sourceMode || DATA_SOURCE_MODE,
      count: Number.isFinite(syncMeta.count) ? syncMeta.count : spots.length,
    },
  };
}

async function fetchCityDataset(city) {
  const path = cityDataPath(city);
  if (!path) {
    return {
      city,
      spots: [],
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

  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`無法載入 ${path}，HTTP ${response.status}`);
  }

  const payload = await response.json();
  return normalizePayload(payload, city);
}

function toCoordinateTuples(spots) {
  return spots.reduce((acc, spot) => {
    if (Number.isFinite(spot.lat) && Number.isFinite(spot.lng)) {
      acc.push([spot.lat, spot.lng]);
    }
    return acc;
  }, []);
}

function normalizeSpotsForMap(spots) {
  if (!spots.length) return [];

  const lats = spots.map((spot) => spot.lat);
  const lngs = spots.map((spot) => spot.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.001);
  const lngRange = Math.max(maxLng - minLng, 0.001);

  return spots.map((spot) => ({
    id: spot.id,
    left: 10 + ((spot.lng - minLng) / lngRange) * 80,
    top: 10 + (1 - (spot.lat - minLat) / latRange) * 80,
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

function runDataSanityChecks() {
  const tuples = toCoordinateTuples(SPOTS_SEED);
  const normalized = normalizeSpotsForMap(SPOTS_SEED);
  const recommendations = buildRecommendation(SPOTS_SEED, "佛光寺周邊", "下午");
  const kyotoOnly = filterSpotsByCity(SPOTS_SEED, "京都");
  const osakaOnly = filterSpotsByCity(SPOTS_SEED, "大阪");
  const fakePayload = normalizePayload(
    {
      city: "京都",
      spots: [{ id: "t1", city: "京都", name: "測試點", lat: 35, lng: 135.7 }],
      sources: [{ id: "s1", title: "測試來源", url: "https://example.com" }],
      meta: { count: 1, generatedBy: "github-actions" },
    },
    "京都"
  );
  const baseUrlTestPath = cityDataPath("京都");

  const testCases = [
    {
      name: "BASE_URL 應至少有 fallback 字串",
      pass: typeof BASE_URL === "string" && BASE_URL.length > 0,
    },
    {
      name: "cityDataPath 應能在無 env 時產出路徑",
      pass: typeof baseUrlTestPath === "string" && baseUrlTestPath.includes("data/") && baseUrlTestPath.endsWith(".json"),
    },
    {
      name: "每個 spot 都應有有效座標",
      pass: tuples.length === SPOTS_SEED.length,
    },
    {
      name: "tuple 應為 [lat, lng]",
      pass: tuples.every((tuple) => Array.isArray(tuple) && tuple.length === 2 && tuple.every((value) => typeof value === "number")),
    },
    {
      name: "地圖點位數量應與 spots 一致",
      pass: normalized.length === SPOTS_SEED.length,
    },
    {
      name: "所有地圖點位 left 應落在 0 到 100",
      pass: normalized.every((point) => point.left >= 0 && point.left <= 100),
    },
    {
      name: "所有地圖點位 top 應落在 0 到 100",
      pass: normalized.every((point) => point.top >= 0 && point.top <= 100),
    },
    {
      name: "推薦結果最多 4 筆",
      pass: recommendations.length <= 4,
    },
    {
      name: "佛光寺周邊推薦應至少包含同區域點位",
      pass: recommendations.some((spot) => spot.area === "佛光寺周邊"),
    },
    {
      name: "京都篩選結果都應為京都",
      pass: kyotoOnly.length > 0 && kyotoOnly.every((spot) => spot.city === "京都"),
    },
    {
      name: "大阪篩選結果都應為大阪",
      pass: osakaOnly.length > 0 && osakaOnly.every((spot) => spot.city === "大阪"),
    },
    {
      name: "未選擇城市時不應載入景點",
      pass: filterSpotsByCity(SPOTS_SEED, "未選擇").length === 0,
    },
    {
      name: "payload normalize 後應保留 meta.count",
      pass: fakePayload.meta.count === 1,
    },
    {
      name: "payload normalize 後應產生 sourceMode",
      pass: typeof fakePayload.meta.sourceMode === "string" && fakePayload.meta.sourceMode.length > 0,
    },
    {
      name: "所有來源都應有網址",
      pass: SOURCES_SEED.every((source) => typeof source.url === "string" && source.url.startsWith("http")),
    },
    {
      name: "每個 spot 都應有 Google Maps 連結",
      pass: SPOTS_SEED.every((spot) => typeof spot.mapUrl === "string" && spot.mapUrl.includes("google.com/maps")),
    },
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

function VisualMap({ spots, activeSpotId, onSelect }) {
  const points = useMemo(() => normalizeSpotsForMap(spots), [spots]);
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
        <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>景點分布圖</div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: COLORS.subtext }}>
          這個前台現在預設從 GitHub Pages 的靜態 JSON 讀資料；那些 JSON 會由 GitHub Actions 從 Notion 主資料庫同步產生。
        </div>
      </div>
      {spots.map((spot) => {
        const point = byId.get(spot.id);
        if (!point) return null;
        const active = activeSpotId === spot.id;
        return (
          <button
            key={spot.id}
            type="button"
            onClick={() => onSelect(spot.id)}
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
                width: 40,
                height: 40,
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
              {spot.thumbnail}
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
              {spot.name}
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
  const [sources, setSources] = useState(SOURCES_SEED);
  const [fallbackSpots] = useState(SPOTS_SEED);
  const [loadedSpots, setLoadedSpots] = useState([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("未選擇");
  const [timeOfDay, setTimeOfDay] = useState("下午");
  const [baseArea, setBaseArea] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [activeSpotId, setActiveSpotId] = useState(null);
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

  const hasCitySelected = city !== "未選擇";

  useEffect(() => {
    let cancelled = false;

    async function loadCityData() {
      if (!hasCitySelected) {
        setLoadedSpots([]);
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
        setActiveSpotId(null);
        setBaseArea("");
        return;
      }

      setLoadState("loading");
      setLoadError("");

      try {
        const payload = await fetchCityDataset(city);
        if (cancelled) return;

        const spots = payload.spots;
        const filteredFallback = filterSpotsByCity(fallbackSpots, city);
        const safeSpots = spots.length ? spots : filteredFallback;
        const safeSources = payload.sources.length ? payload.sources : filterSourcesBySpotLinks(safeSpots, SOURCES_SEED);

        setLoadedSpots(safeSpots);
        setSources(safeSources);
        setSyncMeta({
          lastSyncedAt: payload.meta.lastSyncedAt,
          notionDataSourceId: payload.meta.notionDataSourceId,
          generatedBy: payload.meta.generatedBy,
          sourceMode: payload.meta.sourceMode,
          count: payload.meta.count,
        });
        setActiveSpotId(safeSpots[0]?.id || null);
        setBaseArea(safeSpots[0]?.area || "");
        setSelectedCategories([]);
        setFavorites([]);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;

        const fallback = filterSpotsByCity(fallbackSpots, city);
        setLoadedSpots(fallback);
        setSources(filterSourcesBySpotLinks(fallback, SOURCES_SEED));
        setActiveSpotId(fallback[0]?.id || null);
        setBaseArea(fallback[0]?.area || "");
        setSyncMeta({
          lastSyncedAt: null,
          notionDataSourceId: null,
          generatedBy: "fallback-seed",
          sourceMode: DATA_SOURCE_MODE,
          count: fallback.length,
        });
        setLoadError(error instanceof Error ? error.message : "載入失敗");
        setLoadState("fallback");
      }
    }

    loadCityData();
    return () => {
      cancelled = true;
    };
  }, [city, hasCitySelected, fallbackSpots]);

  const allAreas = useMemo(() => [...new Set(loadedSpots.map((spot) => spot.area))], [loadedSpots]);
  const allCategories = useMemo(() => [...new Set(loadedSpots.map((spot) => spot.category))], [loadedSpots]);

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

  const mapSpots = filteredSpots.length ? filteredSpots : loadedSpots;

  const activeSpot = useMemo(() => {
    const fallback = mapSpots[0] || null;
    if (!activeSpotId) return fallback;
    return mapSpots.find((spot) => spot.id === activeSpotId) || fallback;
  }, [mapSpots, activeSpotId]);

  const pickedSpots = useMemo(() => {
    const favoriteSpots = filteredSpots.filter((spot) => favorites.includes(spot.id));
    return favoriteSpots.length ? favoriteSpots : filteredSpots;
  }, [filteredSpots, favorites]);

  const recommendations = useMemo(() => buildRecommendation(pickedSpots, baseArea, timeOfDay), [pickedSpots, baseArea, timeOfDay]);

  const cityStats = useMemo(
    () => ({
      京都: fallbackSpots.filter((spot) => spot.city === "京都").length,
      大阪: fallbackSpots.filter((spot) => spot.city === "大阪").length,
      已確認: fallbackSpots.filter((spot) => spot.confidence === "已確認").length,
      推定: fallbackSpots.filter((spot) => spot.confidence === "推定").length,
    }),
    [fallbackSpots]
  );

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
        note: "這筆網址已先加入來源清單，後續可再解析內容並補入景點。",
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
              <span style={{ ...chipStyle("景點"), background: COLORS.primary, color: "#ffffff", borderColor: COLORS.primary }}>旅遊 Reels 行程頁</span>
              <span style={{ ...chipStyle("寺社"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>可持續追加網址</span>
              <span style={{ ...chipStyle("逛街"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>手機桌面捷徑友善</span>
              <span style={{ ...chipStyle("甜點"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>Notion 主資料庫模式</span>
            </div>

            <div style={{ marginTop: 18 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 32 : 54, lineHeight: 1.06, fontWeight: 900 }}>
                把 Reels 變成
                <br />
                可以點、可以排、可以放桌面的旅遊頁
              </h1>
              <p style={{ marginTop: 14, maxWidth: 780, color: COLORS.subtext, fontSize: 16, lineHeight: 1.8 }}>
                這版已改成更適合放到 GitHub 的單檔 React 版，減少對特殊 UI 模板的依賴。
                後續你只要部署到 GitHub Pages 正式網址，就可以在 iPhone 用 Safari「加入主畫面」，一點就打開。
                現在的資料流也已經預設成 Notion 主資料庫架構：前台依城市載入由 GitHub Actions 從 Notion 產出的靜態 JSON。
              </p>
            </div>

            <div style={{ marginTop: 18, borderRadius: 20, border: `1px solid ${COLORS.border}`, background: "#ffffff", padding: 16 }}>
              <div style={{ fontSize: 13, color: COLORS.subtext }}>資料來源模式</div>
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 800 }}>{DATA_SOURCE_MODE}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: COLORS.subtext, lineHeight: 1.8 }}>
                前端不直接連 Notion API，也不暴露 Notion Token。正式同步由 GitHub Actions 在背景讀取 Notion，再產生 data/kyoto.json、data/osaka.json、data/all.json 給前台載入。
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
              <MetricCard label="已匯入來源" value={String(sources.length)} sub="目前畫面載入來源數" />
              <MetricCard label="京都點位" value={String(cityStats.京都)} sub="種子資料庫基準" />
              <MetricCard label="大阪點位" value={String(cityStats.大阪)} sub="種子資料庫基準" />
              <MetricCard label="資料狀態" value={loadState === "ready" ? "JSON" : loadState === "fallback" ? "Fallback" : "Idle"} sub="Notion 載入狀態" />
            </div>
          </SectionCard>

          <div style={{ background: COLORS.primary, color: "#ffffff", borderRadius: 28, padding: 24, boxShadow: "0 10px 35px rgba(0,0,0,0.14)" }}>
            <div style={{ fontSize: 13, color: "#d6d3d1" }}>接下來怎麼加資料</div>
            <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900 }}>來源收納區</div>

            <div style={{ marginTop: 18 }}>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="貼上新的 Reel / 文章 / Google Map 網址"
                style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <PrimaryButton
                  onClick={() => {
                    addPendingUrl(newUrl);
                    setNewUrl("");
                  }}
                >
                  先加入待整理
                </PrimaryButton>
                <PrimaryButton secondary>後續整理後寫回 Notion</PrimaryButton>
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

            <div style={{ marginTop: 18, borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 16, fontSize: 14, lineHeight: 1.7, color: "#f5f5f4" }}>
              GitHub 友善版重點：前台現在只讀靜態 JSON，不直接碰 Notion Token。這樣才能安全放在公開的 GitHub Pages；真正的 Notion 讀寫會交給 GitHub Actions 使用 Secrets 處理。
            </div>
          </div>
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
              title="旅遊大地圖"
              right={
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="搜尋景點、地區、標籤"
                    style={{ minWidth: 220, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }}
                    disabled={!hasCitySelected}
                  />
                  <select value={city} onChange={(e) => setCity(e.target.value)} style={{ borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }}>
                    {CITY_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {item === "未選擇" ? "請先選擇城市" : item}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <div style={{ marginBottom: 16, display: "grid", gap: 10 }}>
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
                          background: active ? CATEGORY_THEME[category].bg : "#ffffff",
                          color: active ? CATEGORY_THEME[category].color : COLORS.subtext,
                          border: `1px solid ${active ? CATEGORY_THEME[category].bg : COLORS.border}`,
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

                {loadError ? (
                  <div style={{ borderRadius: 18, background: "#fef2f2", color: "#991b1b", padding: 12, fontSize: 13, lineHeight: 1.7 }}>
                    目前尚未找到對應城市的 JSON，已自動改用前端種子資料作 fallback。錯誤：{loadError}
                  </div>
                ) : null}
              </div>

              {hasCitySelected ? (
                <VisualMap spots={mapSpots} activeSpotId={activeSpot?.id || null} onSelect={setActiveSpotId} />
              ) : (
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 28, textAlign: "center", color: COLORS.subtext }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: COLORS.text }}>請先選擇城市</div>
                  <div style={{ marginTop: 10, lineHeight: 1.8 }}>
                    你先選京都、大阪或全部，前台才會去讀該城市對應的 JSON。這些 JSON 會由 GitHub Actions 從 Notion 主資料庫自動產生。
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr", gap: 16, marginTop: 16 }}>
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.card, padding: 20 }}>
                  {activeSpot ? (
                    <>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 42 }}>{activeSpot.thumbnail}</div>
                        <div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={chipStyle(activeSpot.category)}>{activeSpot.category}</span>
                            <span style={{ border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "6px 12px", fontSize: 12 }}>{activeSpot.confidence}</span>
                          </div>
                          <div style={{ marginTop: 10, fontSize: 22, fontWeight: 900 }}>{activeSpot.name}</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: COLORS.subtext }}>{activeSpot.city}・{activeSpot.area}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 14, fontSize: 14, color: COLORS.subtext, lineHeight: 1.8 }}>{activeSpot.description}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                        {activeSpot.tags.map((tag) => (
                          <span key={tag} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>#{tag}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: COLORS.subtext }}>目前沒有可顯示的景點。</div>
                  )}
                </div>

                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 20 }}>
                  <div style={{ fontSize: 13, color: COLORS.subtext }}>操作</div>
                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {activeSpot ? (
                      <>
                        <PrimaryButton href={activeSpot.mapUrl} block>開啟 Google Maps</PrimaryButton>
                        <PrimaryButton href={activeSpot.sourceUrl} block secondary>查看原始來源</PrimaryButton>
                      </>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 12, color: COLORS.subtext, lineHeight: 1.7 }}>
                    這一區保留互動地圖體驗，但不依賴外部地圖套件，因此更適合放在 GitHub Pages。Notion 真正的讀寫同步，會由 GitHub Actions 使用 Secrets 與 Notion Integration Token 在背景完成。
                  </div>
                  {syncMeta.notionDataSourceId ? (
                    <div style={{ marginTop: 12, fontSize: 12, color: COLORS.subtext, wordBreak: "break-all" }}>Data Source ID: {syncMeta.notionDataSourceId}</div>
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
                <select value={baseArea} onChange={(e) => setBaseArea(e.target.value)} style={{ width: "100%", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "12px 12px", outline: "none" }} disabled={!hasCitySelected || !allAreas.length}>
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
                若你有先勾喜歡的圖卡，推薦會優先使用那些點位。資料來源以 Notion 同步結果為主，若 JSON 尚未生成則回退到前端種子資料。
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
          <SectionCard title="景點列表圖卡">
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
              {hasCitySelected ? filteredSpots.map((spot) => {
                const favored = favorites.includes(spot.id);
                return (
                  <div key={spot.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 28, overflow: "hidden", background: COLORS.card, boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
                    <div style={{ padding: 20, background: "linear-gradient(135deg,#f5f5f4 0%,#ffffff 100%)", borderBottom: `1px solid ${COLORS.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <span style={{ fontSize: 36 }}>{spot.thumbnail}</span>
                            <span style={chipStyle(spot.category)}>{spot.category}</span>
                            <span style={{ border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "6px 10px", fontSize: 12 }}>{spot.confidence}</span>
                          </div>
                          <div style={{ marginTop: 12, fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{spot.name}</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: COLORS.subtext }}>{spot.city}・{spot.area}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(spot.id)}
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
                      <div style={{ fontSize: 14, color: COLORS.subtext, lineHeight: 1.8 }}>{spot.description}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                        {spot.tags.map((tag) => (
                          <span key={tag} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>#{tag}</span>
                        ))}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                        <div style={{ borderRadius: 18, background: COLORS.primarySoft, padding: 14 }}>
                          <div style={{ fontSize: 12, color: COLORS.subtext }}>建議時段</div>
                          <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800 }}>{spot.bestTime}</div>
                        </div>
                        <div style={{ borderRadius: 18, background: COLORS.primarySoft, padding: 14 }}>
                          <div style={{ fontSize: 12, color: COLORS.subtext }}>停留時間</div>
                          <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800 }}>{spot.stayMinutes} 分</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                        <PrimaryButton href={spot.mapUrl} block secondary>Google Maps</PrimaryButton>
                        <PrimaryButton href={spot.sourceUrl} block>原始來源</PrimaryButton>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 24, color: COLORS.subtext }}>請先選擇城市，才會載入該城市的景點圖卡。</div>
              )}
            </div>
          </SectionCard>
        </div>

        <div style={{ marginTop: 20, background: COLORS.primary, color: "#ffffff", borderRadius: 28, padding: isMobile ? 20 : 28, boxShadow: "0 10px 35px rgba(0,0,0,0.14)" }}>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>下一步可以怎麼擴充</div>
              <div style={{ marginTop: 10, lineHeight: 1.8, color: "#d6d3d1" }}>
                目前已經是可以展示、篩選、看點位、看推薦路線的旅遊原型。之後你再丟 Reels、文章、地圖、餐廳網址，我就可以繼續把景點補進 Notion，並由 GitHub Actions 自動重新產生前台 JSON。
              </div>
            </div>
            <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.10)", padding: 20 }}>
              <div style={{ fontWeight: 800 }}>已具備</div>
              <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.9, color: "#e7e5e4" }}>
                <li>依城市載入資料</li>
                <li>互動點位展示</li>
                <li>圖卡模式與篩選</li>
                <li>依時間／區域推薦路線</li>
              </ul>
            </div>
            <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.10)", padding: 20 }}>
              <div style={{ fontWeight: 800 }}>可再接</div>
              <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.9, color: "#e7e5e4" }}>
                <li>GitHub Pages 部署</li>
                <li>manifest 與桌面圖示</li>
                <li>Notion → JSON 同步 workflow</li>
                <li>寫回 Notion 的整理工作流</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
