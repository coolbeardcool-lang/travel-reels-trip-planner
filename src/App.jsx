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

const CONTENT_MODES = ["spots", "events"];

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
  },
  {
    id: "src-osaka-shinsekai-food",
    title: "大阪新世界街邊美食 Reel",
    url: "https://www.instagram.com/reel/DV_M4ayDcf-/",
  },
  {
    id: "src-kyoto-hidden-list",
    title: "京都私藏清單 Reel",
    url: "https://www.instagram.com/reel/DWWQYkuAfHD/",
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

function PrimaryButton({ children, href, secondary = false, block = false }) {
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
  return (
    <a href={href} target="_blank" rel="noreferrer" style={style}>
      {children}
    </a>
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
  }, []);

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
  }, [selectedCitySlug, selectedContentMode, hasCitySelected, cityIndex]);

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

  return (
    <div style={{ minHeight: "100vh", background: COLORS.pageBg, color: COLORS.text, fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? 16 : 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 16, alignItems: "stretch" }}>
          <SectionCard>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...chipStyle("景點"), background: COLORS.primary, color: "#ffffff", borderColor: COLORS.primary }}>旅遊行程地圖</span>
              <span style={{ ...chipStyle("寺社"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>城市精選</span>
              <span style={{ ...chipStyle("逛街"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>景點與活動</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 30 : 52, lineHeight: 1.08, fontWeight: 900 }}>
                把旅遊靈感整理成
                <br />
                可直接使用的城市地圖與行程頁
              </h1>
              <p style={{ marginTop: 14, maxWidth: 820, color: COLORS.subtext, fontSize: 16, lineHeight: 1.8 }}>
                依城市查看景點、活動、地圖位置與推薦安排，快速整理出更直覺的旅遊路線。
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
            <div style={{ fontSize: 13, color: "#d6d3d1" }}>使用方式</div>
            <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900 }}>快速規劃旅程</div>
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ fontWeight: 800 }}>1. 先選城市</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>先切換想查看的城市，再依喜好瀏覽景點與活動。</div>
              </div>
              <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ fontWeight: 800 }}>2. 看地圖與圖卡</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>直接用地圖定位位置，也可以切成圖卡方式比對內容。</div>
              </div>
              <div style={{ borderRadius: 20, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ fontWeight: 800 }}>3. 安排行程順序</div>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>依目前時間與所在區域，快速挑出比較順路的安排方式。</div>
              </div>
            </div>
          </div>
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
                        {mode === "spots" ? `景點 (${loadedSpots.length})` : `活動 (${loadedEvents.length})`}
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
                {selectedCity ? (
                  <div style={{ borderRadius: 18, background: COLORS.primarySoft, padding: 14, fontSize: 13, color: COLORS.subtext, lineHeight: 1.8 }}>
                    {selectedCity.emoji} {selectedCity.label}：{selectedCity.description}
                  </div>
                ) : null}
              </div>

              {hasCitySelected ? (
                <VisualMap items={activeCollection} activeItemId={activeItem?.id || null} onSelect={setActiveItemId} />
              ) : (
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 28, textAlign: "center", color: COLORS.subtext }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: COLORS.text }}>請先選擇城市</div>
                  <div style={{ marginTop: 10, lineHeight: 1.8 }}>
                    先選擇想看的城市，即可切換對應的景點、活動與推薦安排。
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
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ color: COLORS.subtext }}>目前沒有可顯示的內容。</div>
                  )}
                </div>

                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 20 }}>
                  <div style={{ fontSize: 13, color: COLORS.subtext }}>快速操作</div>
                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {activeItem ? (
                      <>
                        <PrimaryButton href={activeItem.mapUrl} block>開啟 Google Maps</PrimaryButton>
                        <PrimaryButton href={activeItem.sourceUrl} block secondary>查看原始來源</PrimaryButton>
                      </>
                    ) : null}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 12, color: COLORS.subtext, lineHeight: 1.7 }}>
                    可直接開啟 Google Maps 或查看對應來源，方便安排實際路線與收藏靈感。
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="推薦安排">
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
                <span>{Math.round((recommendations.reduce((sum, spot) => sum + spot.stayMinutes, 0) / 60) * 10) / 10} 小時</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: COLORS.subtext }}>
                依你目前的時間與所在區域，快速挑出較順路的安排方式。
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
                          </div>
                          <div style={{ marginTop: 12, fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{item.name}</div>
                          <div style={{ marginTop: 6, fontSize: 14, color: COLORS.subtext }}>{item.city}・{item.area}</div>
                        </div>
                        {selectedContentMode === "spots" ? (
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
                        ) : null}
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
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 24, color: COLORS.subtext }}>請先選擇城市，才會載入該城市的景點或活動圖卡。</div>
              )}
            </div>
          </SectionCard>
        </div>

        <div style={{ marginTop: 20, background: COLORS.primary, color: "#ffffff", borderRadius: 28, padding: isMobile ? 20 : 28, boxShadow: "0 10px 35px rgba(0,0,0,0.14)" }}>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>更多旅遊靈感</div>
              <div style={{ marginTop: 10, lineHeight: 1.8, color: "#d6d3d1" }}>
                之後可持續加入更多城市、景點與活動內容，讓整體旅遊地圖越來越完整。
              </div>
            </div>
            <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.10)", padding: 20 }}>
              <div style={{ fontWeight: 800 }}>目前可以使用</div>
              <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.9, color: "#e7e5e4" }}>
                <li>城市切換</li>
                <li>景點與活動瀏覽</li>
                <li>地圖定位查看</li>
                <li>推薦順路安排</li>
              </ul>
            </div>
            <div style={{ borderRadius: 24, background: "rgba(255,255,255,0.10)", padding: 20 }}>
              <div style={{ fontWeight: 800 }}>旅程操作</div>
              <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 1.9, color: "#e7e5e4" }}>
                <li>查看 Google Maps</li>
                <li>打開原始來源</li>
                <li>收藏喜歡的點位</li>
                <li>依時段規劃路線</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
