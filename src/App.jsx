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
  } catch (_error) {}
  return "/";
})();

const ANALYZE_API_PATH = `${BASE_URL}api/analyze-url`;
const CONFIRM_ANALYSIS_API_PATH = `${BASE_URL}api/confirm-analysis`;
const CONTENT_MODES = ["spots", "events"];
const ANALYZE_TYPE_OPTIONS = ["auto", "spot", "event"];

const COLORS = {
  pageBg: "linear-gradient(135deg, #fafaf9 0%, #ffffff 48%, #fff7ed 100%)",
  card: "#ffffff",
  cardMuted: "#fafaf9",
  text: "#292524",
  subtext: "#57534e",
  border: "#e7e5e4",
  primary: "#1c1917",
  primarySoft: "#f5f5f4",
  successBg: "#ecfdf5",
  successText: "#166534",
  errorBg: "#fef2f2",
  errorText: "#991b1b",
  infoBg: "#eff6ff",
  infoText: "#1d4ed8",
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
    city: "大阪", citySlug: "osaka", area: "心齋橋",
    name: "吉次牛舌（分店待確認）", category: "餐廳",
    description: "依 Reel 內容先建為大阪心齋橋區的牛舌名店，適合安排在晚餐時段。",
    sourceId: "src-osaka-gyutan", sourceUrl: "https://www.instagram.com/reel/DWOiXYxkf97/",
    bestTime: "晚上", stayMinutes: 75,
    tags: ["牛舌", "大阪美食", "晚餐", "心齋橋"],
    lat: 34.6706, lng: 135.5023, thumbnail: "🥩",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=心齋橋+吉次牛舌",
  },
  {
    id: "osaka-nonkiya",
    city: "大阪", citySlug: "osaka", area: "新世界／通天閣",
    name: "Nonkiya のんきや", category: "小吃",
    description: "新世界人氣立食關東煮與土手燒，適合安排為中午或傍晚的小吃站。",
    sourceId: "src-osaka-shinsekai-food", sourceUrl: "https://www.instagram.com/reel/DV_M4ayDcf-/",
    bestTime: "下午", stayMinutes: 35,
    tags: ["關東煮", "土手燒", "立食", "通天閣"],
    lat: 34.6529, lng: 135.5057, thumbnail: "🍢",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Nonkiya+大阪",
  },
  {
    id: "kyoto-bukkouji-dd",
    city: "京都", citySlug: "kyoto", area: "佛光寺周邊",
    name: "D&DEPARTMENT KYOTO", category: "逛街",
    description: "位在佛光寺境內的京都選物店，很適合下午慢逛。",
    sourceId: "src-kyoto-hidden-list", sourceUrl: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    bestTime: "下午", stayMinutes: 50,
    tags: ["選物店", "佛光寺", "京都設計", "散步"],
    lat: 35.0018, lng: 135.7596, thumbnail: "🛍️",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=D%26DEPARTMENT+KYOTO",
  },
];

const EVENTS_SEED = [
  {
    id: "evt-kyoto-sakura-night",
    city: "京都", citySlug: "kyoto", area: "東山周邊",
    name: "京都夜櫻點燈示意活動", category: "活動",
    description: "示意活動資料。",
    sourceId: "src-kyoto-hidden-list", sourceUrl: "https://www.instagram.com/reel/DWWQYkuAfHD/",
    tags: ["夜櫻", "期間限定", "春季"],
    lat: 35.0037, lng: 135.7788, thumbnail: "🌸",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=東山+京都",
    startsOn: "2026-03-25", endsOn: "2026-04-10",
    startTime: "18:00", endTime: "21:00",
    ticketType: "現場購票", priceNote: "示意資料",
  },
];

// ── 資料處理 ───────────────────────────────────────────────

function normalizeCitySlugValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const aliasMap = { 京都: "kyoto", 大阪: "osaka", 東京: "tokyo", 福岡: "fukuoka", 沖繩: "okinawa", 全部: "all", all: "all" };
  return aliasMap[raw] || raw.toLowerCase();
}

function cityIndexPath() { return `${BASE_URL}data/cities/index.json`; }

function cityDataPaths(citySlug) {
  const normalized = normalizeCitySlugValue(citySlug);
  if (!normalized || normalized === "unselected") return [];
  if (normalized === "all") return [`${BASE_URL}data/all.json`];
  return [`${BASE_URL}data/cities/${normalized}.json`, `${BASE_URL}data/${normalized}.json`];
}

function normalizeCity(city, index) {
  return {
    slug: normalizeCitySlugValue(city.slug || city.label || `city-${index}`) || `city-${index}`,
    label: city.label || city.name || `城市 ${index + 1}`,
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

function filterByCitySlug(items, citySlug) {
  if (!citySlug || citySlug === "unselected") return [];
  if (citySlug === "all") return items;
  return items.filter((item) => item.citySlug === citySlug);
}

function filterSourcesByLinkedIds(items, sources) {
  const sourceIds = new Set(items.map((item) => item.sourceId).filter(Boolean));
  return sources.filter((source) => sourceIds.has(source.id));
}

function normalizeSpot(spot, index, cityIndex) {
  const cityLabel = spot.city || cityIndex.find((c) => c.slug === spot.citySlug)?.label || "未分類";
  return {
    id: spot.id || `spot-${index}`,
    city: cityLabel,
    citySlug: normalizeCitySlugValue(spot.citySlug || cityLabel),
    area: spot.area || "未分類區域",
    name: spot.name || "未命名景點",
    category: spot.category || "景點",
    description: spot.description || "",
    sourceId: spot.sourceId || "",
    sourceUrl: spot.sourceUrl || "",
    bestTime: spot.bestTime || "下午",
    stayMinutes: Number.isFinite(spot.stayMinutes) ? spot.stayMinutes : Number(spot.stayMinutes) || 30,
    tags: Array.isArray(spot.tags) ? spot.tags : [],
    lat: Number.isFinite(spot.lat) ? spot.lat : Number(spot.lat) || 0,
    lng: Number.isFinite(spot.lng) ? spot.lng : Number(spot.lng) || 0,
    thumbnail: spot.thumbnail || "📍",
    mapUrl: spot.mapUrl || "",
  };
}

function normalizeEvent(event, index, cityIndex) {
  const cityLabel = event.city || cityIndex.find((c) => c.slug === event.citySlug)?.label || "未分類";
  return {
    id: event.id || `event-${index}`,
    city: cityLabel,
    citySlug: normalizeCitySlugValue(event.citySlug || cityLabel),
    area: event.area || "未分類區域",
    name: event.name || "未命名活動",
    category: event.category || "活動",
    description: event.description || "",
    sourceId: event.sourceId || "",
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
  };
}

function normalizeCityIndexPayload(payload) {
  const rawCities = Array.isArray(payload?.cities) ? payload.cities : [];
  return { cities: rawCities.map((city, index) => normalizeCity(city, index)) };
}

function normalizeCityPayload(payload, fallbackSlug, cityIndex) {
  const rawSpots = Array.isArray(payload?.spots) ? payload.spots : [];
  const rawEvents = Array.isArray(payload?.events) ? payload.events : [];
  const rawSources = Array.isArray(payload?.sources) ? payload.sources : [];
  const spots = rawSpots.map((spot, index) => normalizeSpot(spot, index, cityIndex));
  const events = rawEvents.map((event, index) => normalizeEvent(event, index, cityIndex));
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
  if (!response.ok) throw new Error(`無法載入城市索引`);
  return normalizeCityIndexPayload(await response.json());
}

async function fetchCityDataset(citySlug, cityIndex) {
  const paths = cityDataPaths(citySlug);
  if (!paths.length) return { city: normalizeCity({ slug: "unselected" }, 0), spots: [], events: [], sources: [] };
  for (const path of paths) {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (response.ok) return normalizeCityPayload(await response.json(), normalizeCitySlugValue(citySlug), cityIndex);
  }
  throw new Error(`無法載入城市資料：${citySlug}`);
}

// ── 分析結果正規化（支援 camelCase，後端回傳格式）─────────
function normalizeAnalysisPayload(payload, fallback = {}) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  // 後端回傳 camelCase：contentKind, sourceTitle, sourcePlatform, citySlug
  const contentKind = payload?.contentKind || payload?.content_kind || fallback.contentKind || "source_only";
  return {
    sourceTitle: payload?.sourceTitle || payload?.source_title || fallback.sourceTitle || "未命名來源",
    sourcePlatform: payload?.sourcePlatform || payload?.source_platform || fallback.sourcePlatform || "未知來源",
    contentKind,
    citySlug: normalizeCitySlugValue(payload?.citySlug || payload?.city_slug || fallback.citySlug || ""),
    area: payload?.area || fallback.area || "",
    confidence: Number.isFinite(payload?.confidence) ? payload.confidence : Number(payload?.confidence) || 0,
    needsReview: payload?.needsReview !== false && payload?.needs_review !== false,
    summary: payload?.summary || payload?.reasoning || fallback.summary || "",
    analysis_id: payload?.analysis_id || payload?.analysisId || "",
    cached: Boolean(payload?.cached),
    items: items.map((item, index) => ({
      id: item.id || `analysis-item-${index}`,
      name: item.name || `候選項目 ${index + 1}`,
      category: item.category || (contentKind === "event" ? "活動" : "景點"),
      description: item.description || "",
      tags: Array.isArray(item.tags) ? item.tags : [],
      area: item.area || payload?.area || fallback.area || "",
      best_time: item.best_time || "",
      stay_minutes: Number.isFinite(item.stay_minutes) ? item.stay_minutes : Number(item.stay_minutes) || 0,
      starts_on: item.starts_on || null,
      ends_on: item.ends_on || null,
      reason: item.reason || "",
    })),
  };
}

// ── 地圖 / 推薦 ────────────────────────────────────────────

function normalizeItemsForMap(items) {
  if (!items.length) return [];
  const lats = items.map((i) => i.lat);
  const lngs = items.map((i) => i.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
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
      reason: spot.area === baseArea
        ? "離你目前設定區域最近，順路最好排。"
        : spot.bestTime === currentTime
          ? `這個點更適合現在的「${currentTime}」時段。`
          : `可作為 ${currentTime} 的延伸行程。`,
    }));
}

function formatEventWindow(event) {
  const timePart = event.startTime || event.endTime ? `｜${event.startTime || "--:--"} - ${event.endTime || "--:--"}` : "";
  return `${event.startsOn || "未定"} ～ ${event.endsOn || "未定"}${timePart}`;
}

function prettyAnalysisKind(kind) {
  if (kind === "event") return "活動";
  if (kind === "spot") return "景點 / 美食";
  return "來源待整理";
}

// ── UI 元件 ────────────────────────────────────────────────

function chipStyle(category) {
  const theme = CATEGORY_THEME[category] || { bg: COLORS.primarySoft, color: COLORS.text };
  return { display: "inline-flex", alignItems: "center", gap: 6, background: theme.bg, color: theme.color, borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, border: `1px solid ${theme.bg}` };
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
    justifyContent: "center", alignItems: "center", gap: 8,
    borderRadius: 18, padding: "12px 16px", textDecoration: "none",
    border: secondary ? `1px solid ${COLORS.border}` : `1px solid ${COLORS.primary}`,
    background: disabled ? COLORS.primarySoft : secondary ? "#ffffff" : COLORS.primary,
    color: disabled ? COLORS.subtext : secondary ? COLORS.text : "#ffffff",
    fontWeight: 700, fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    boxSizing: "border-box",
  };
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={style}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

function VisualMap({ items, activeItemId, onSelect }) {
  const points = useMemo(() => normalizeItemsForMap(items), [items]);
  const pointMap = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);
  return (
    <div style={{ position: "relative", minHeight: 520, overflow: "hidden", borderRadius: 28, border: `1px solid ${COLORS.border}`, background: "linear-gradient(135deg,#fff7ed 0%,#ffffff 48%,#f5f5f4 100%)" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.5, backgroundImage: "linear-gradient(to right, rgba(120,113,108,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,113,108,0.12) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
      <div style={{ position: "absolute", left: 20, top: 20, zIndex: 1, background: "rgba(255,255,255,0.88)", border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 16, maxWidth: 340 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: COLORS.text }}>旅遊大地圖</div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: COLORS.subtext }}>點選地圖上的位置，即可查看景點或活動資訊。</div>
      </div>
      {items.map((item) => {
        const point = pointMap.get(item.id);
        if (!point) return null;
        const active = activeItemId === item.id;
        return (
          <button key={item.id} type="button" onClick={() => onSelect(item.id)} style={{ position: "absolute", left: `${point.left}%`, top: `${point.top}%`, transform: "translate(-50%, -50%)", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 42, height: 42, borderRadius: 999, background: "#ffffff", border: active ? `2px solid ${COLORS.primary}` : "2px solid #ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(0,0,0,0.15)", fontSize: 22 }}>{item.thumbnail}</div>
            <div style={{ marginTop: 8, whiteSpace: "nowrap", borderRadius: 999, padding: "6px 12px", background: active ? COLORS.primary : "rgba(255,255,255,0.92)", color: active ? "#ffffff" : COLORS.text, fontSize: 12, fontWeight: 700, boxShadow: "0 6px 18px rgba(0,0,0,0.10)" }}>{item.name}</div>
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

// ── 主元件 ────────────────────────────────────────────────
export default function App() {
  const isMobile = useResponsiveColumns();
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

  // 分析流程狀態
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitType, setSubmitType] = useState("auto");
  const [submitCitySlug, setSubmitCitySlug] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [analysisPreview, setAnalysisPreview] = useState(null);
  const [submitStatus, setSubmitStatus] = useState({ kind: "idle", message: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const hasCitySelected = selectedCitySlug !== "unselected";

  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const payload = await fetchCityIndex();
        if (!cancelled && payload.cities.length) setCityIndex(payload.cities);
      } catch {
        if (!cancelled) setCityIndex(CITY_INDEX_SEED);
      }
    }
    loadIndex();
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadCityData() {
      if (!hasCitySelected) {
        setLoadedSpots([]); setLoadedEvents([]); setSources(SOURCES_SEED);
        setActiveItemId(null); setBaseArea(""); setSelectedCategories([]); setFavorites([]);
        return;
      }
      try {
        const payload = await fetchCityDataset(selectedCitySlug, cityIndex);
        if (cancelled) return;
        const fallbackSpots = filterByCitySlug(SPOTS_SEED, selectedCitySlug);
        const fallbackEvents = filterByCitySlug(EVENTS_SEED, selectedCitySlug);
        const safeSpots = payload.spots.length ? payload.spots : fallbackSpots;
        const safeEvents = payload.events.length ? payload.events : fallbackEvents;
        const safeSources = payload.sources.length ? payload.sources : filterSourcesByLinkedIds([...safeSpots, ...safeEvents], SOURCES_SEED);
        setLoadedSpots(safeSpots); setLoadedEvents(safeEvents); setSources(safeSources);
        setBaseArea(safeSpots[0]?.area || safeEvents[0]?.area || payload.city.heroArea || "");
        setActiveItemId((selectedContentMode === "events" ? safeEvents[0]?.id : safeSpots[0]?.id) || null);
      } catch {
        if (cancelled) return;
        const fallbackSpots = filterByCitySlug(SPOTS_SEED, selectedCitySlug);
        const fallbackEvents = filterByCitySlug(EVENTS_SEED, selectedCitySlug);
        setLoadedSpots(fallbackSpots); setLoadedEvents(fallbackEvents);
        setSources(filterSourcesByLinkedIds([...fallbackSpots, ...fallbackEvents], SOURCES_SEED));
        setBaseArea(fallbackSpots[0]?.area || fallbackEvents[0]?.area || "");
        setActiveItemId((selectedContentMode === "events" ? fallbackEvents[0]?.id : fallbackSpots[0]?.id) || null);
      }
    }
    loadCityData();
    return () => { cancelled = true; };
  }, [selectedCitySlug, selectedContentMode, hasCitySelected, cityIndex, reloadKey]);

  const selectedCity = useMemo(() => cityIndex.find((c) => c.slug === selectedCitySlug) || null, [cityIndex, selectedCitySlug]);
  const allAreas = useMemo(() => [...new Set((selectedContentMode === "events" ? loadedEvents : loadedSpots).map((i) => i.area).filter(Boolean))], [loadedEvents, loadedSpots, selectedContentMode]);
  const allCategories = useMemo(() => [...new Set((selectedContentMode === "events" ? loadedEvents : loadedSpots).map((i) => i.category).filter(Boolean))], [loadedEvents, loadedSpots, selectedContentMode]);

  const filteredSpots = useMemo(() => loadedSpots.filter((s) => {
    const cat = selectedCategories.length === 0 || selectedCategories.includes(s.category);
    const srch = !search.trim() || `${s.name} ${s.description} ${s.tags.join(" ")} ${s.area}`.toLowerCase().includes(search.toLowerCase());
    return cat && srch;
  }), [loadedSpots, selectedCategories, search]);

  const filteredEvents = useMemo(() => loadedEvents.filter((e) => {
    const cat = selectedCategories.length === 0 || selectedCategories.includes(e.category);
    const srch = !search.trim() || `${e.name} ${e.description} ${e.tags.join(" ")} ${e.area}`.toLowerCase().includes(search.toLowerCase());
    return cat && srch;
  }), [loadedEvents, selectedCategories, search]);

  const activeCollection = selectedContentMode === "events"
    ? (filteredEvents.length ? filteredEvents : loadedEvents)
    : (filteredSpots.length ? filteredSpots : loadedSpots);

  const activeItem = useMemo(() => {
    if (!activeItemId) return activeCollection[0] || null;
    return activeCollection.find((i) => i.id === activeItemId) || activeCollection[0] || null;
  }, [activeCollection, activeItemId]);

  const pickedSpots = useMemo(() => {
    const favs = filteredSpots.filter((s) => favorites.includes(s.id));
    return favs.length ? favs : filteredSpots;
  }, [filteredSpots, favorites]);

  const recommendations = useMemo(() => buildRecommendation(pickedSpots, baseArea, timeOfDay), [pickedSpots, baseArea, timeOfDay]);

  function toggleCategory(cat) {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  // ── 分析流程（修正：form submit 不重複觸發）─────────────
  async function handleAnalyzeUrl(e) {
    e.preventDefault();
    const cleanUrl = submitUrl.trim();
    if (!cleanUrl) { setSubmitStatus({ kind: "error", message: "請先貼上 Reel 或網址。" }); return; }

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

      const text = await response.text();
      let payload = {};
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

      if (!response.ok) throw new Error(payload?.message || `分析失敗，HTTP ${response.status}`);

      const preview = normalizeAnalysisPayload(payload, {
        sourceTitle: submitTitle.trim(),
        contentKind: submitType === "auto" ? "source_only" : submitType,
        citySlug: submitCitySlug,
      });
      setAnalysisPreview(preview);
      setSubmitStatus({ kind: "success", message: "分析完成。請先檢查下方結果，確認無誤後再寫入資料庫。" });
    } catch (error) {
      setSubmitStatus({ kind: "error", message: error instanceof Error ? error.message : "分析失敗。" });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleConfirmAnalysis() {
    if (!analysisPreview) { setSubmitStatus({ kind: "error", message: "目前沒有可確認寫入的分析結果。" }); return; }

    setIsConfirming(true);
    setSubmitStatus({ kind: "loading", message: "正在確認並寫入資料庫…" });

    try {
      const response = await fetch(CONFIRM_ANALYSIS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: submitUrl.trim(),
          sourceTitle: submitTitle.trim() || analysisPreview.sourceTitle,
          notes: submitNotes.trim(),
          analysis: analysisPreview,
        }),
      });

      const text = await response.text();
      let payload = {};
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

      if (!response.ok) throw new Error(payload?.message || `寫入失敗，HTTP ${response.status}`);

      setSubmitStatus({ kind: "success", message: payload?.message || "已確認寫入。網站會在同步完成後自動更新。" });
      setSubmitUrl(""); setSubmitTitle(""); setSubmitType("auto"); setSubmitCitySlug(""); setSubmitNotes("");
      if (analysisPreview.citySlug) setSelectedCitySlug(analysisPreview.citySlug);
      setAnalysisPreview(null);
      setReloadKey((v) => v + 1);
    } catch (error) {
      setSubmitStatus({ kind: "error", message: error instanceof Error ? error.message : "寫入失敗。" });
    } finally {
      setIsConfirming(false);
    }
  }

  const submitStatusStyle = submitStatus.kind === "success"
    ? { background: COLORS.successBg, color: COLORS.successText }
    : submitStatus.kind === "error"
      ? { background: COLORS.errorBg, color: COLORS.errorText }
      : { background: COLORS.infoBg, color: COLORS.infoText };

  const cityStats = {
    cities: cityIndex.length,
    spots: loadedSpots.length || SPOTS_SEED.length,
    events: loadedEvents.length || EVENTS_SEED.length,
    picks: recommendations.length,
  };

  // ── render ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: COLORS.pageBg, color: COLORS.text, fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? 16 : 28 }}>

        {/* Hero + 分析入口 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 16, alignItems: "stretch" }}>
          <SectionCard>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...chipStyle("景點"), background: COLORS.primary, color: "#ffffff", borderColor: COLORS.primary }}>旅遊行程地圖</span>
              <span style={{ ...chipStyle("活動"), background: "#ffffff", color: COLORS.subtext, border: `1px solid ${COLORS.border}` }}>網址分析入口</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 30 : 52, lineHeight: 1.08, fontWeight: 900 }}>把旅遊靈感整理成<br />可直接使用的城市地圖與行程頁</h1>
              <p style={{ marginTop: 14, maxWidth: 820, color: COLORS.subtext, fontSize: 16, lineHeight: 1.8 }}>依城市查看景點、活動、地圖位置與推薦安排，並可直接在頁面上貼上網址，先分析，再確認寫入。</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
              <MetricCard label="城市數" value={String(cityStats.cities)} sub="持續擴充中" />
              <MetricCard label="景點數" value={String(cityStats.spots)} sub="目前可瀏覽" />
              <MetricCard label="活動數" value={String(cityStats.events)} sub="目前可瀏覽" />
              <MetricCard label="推薦安排" value={String(cityStats.picks)} sub="依時間與區域計算" />
            </div>
          </SectionCard>

          {/* 分析入口卡片 */}
          <div style={{ background: COLORS.primary, color: "#ffffff", borderRadius: 28, padding: 24, boxShadow: "0 10px 35px rgba(0,0,0,0.14)" }}>
            <div style={{ fontSize: 13, color: "#d6d3d1" }}>網址分析入口</div>
            <div style={{ marginTop: 8, fontSize: 30, fontWeight: 900 }}>貼網址 → 分析 → 確認寫入</div>

            {/* ↓ form 只綁 onSubmit，按鈕用 type="submit"，不加 onClick */}
            <form onSubmit={handleAnalyzeUrl} style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <input value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} placeholder="只貼 Instagram Reel / Threads / 網址 就可以"
                style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none", boxSizing: "border-box" }} />
              <input value={submitTitle} onChange={(e) => setSubmitTitle(e.target.value)} placeholder="可選：人工補充標題提示"
                style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none", boxSizing: "border-box" }} />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                <select value={submitCitySlug} onChange={(e) => setSubmitCitySlug(e.target.value)}
                  style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}>
                  <option value="" style={{ color: COLORS.text }}>自動判斷城市</option>
                  {cityIndex.map((city) => <option key={city.slug} value={city.slug} style={{ color: COLORS.text }}>{city.label}</option>)}
                </select>
                <select value={submitType} onChange={(e) => setSubmitType(e.target.value)}
                  style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}>
                  {ANALYZE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t} style={{ color: COLORS.text }}>
                      {t === "auto" ? "自動判斷類型" : t === "spot" ? "偏向景點 / 美食" : "偏向活動 / 展覽"}
                    </option>
                  ))}
                </select>
              </div>
              <textarea value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)}
                placeholder="可選：補充提示，例如『這應該是京都咖啡店』"
                style={{ width: "100%", minHeight: 80, borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: 16, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                {/* type="submit" 觸發 form onSubmit，不重複綁 onClick */}
                <PrimaryButton type="submit" disabled={isAnalyzing || isConfirming}>
                  {isAnalyzing ? "分析中…" : "先分析網址"}
                </PrimaryButton>
                {/* 確認寫入是 type="button"，不觸發 form submit */}
                <PrimaryButton type="button" secondary onClick={handleConfirmAnalysis} disabled={!analysisPreview || isAnalyzing || isConfirming}>
                  {isConfirming ? "寫入中…" : "確認後寫入"}
                </PrimaryButton>
              </div>
            </form>

            {submitStatus.kind !== "idle" && (
              <div style={{ marginTop: 14, borderRadius: 18, padding: 14, fontSize: 13, lineHeight: 1.8, ...submitStatusStyle }}>
                {submitStatus.message}
              </div>
            )}

            {/* 分析預覽區塊 */}
            {analysisPreview && (
              <div style={{ marginTop: 16, borderRadius: 22, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#d6d3d1" }}>
                      分析預覽 {analysisPreview.cached && "⚡ 快取"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{analysisPreview.sourceTitle}</div>
<div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>
  類型：{prettyAnalysisKind(analysisPreview.contentKind)} ｜ 平台：{analysisPreview.sourcePlatform}
</div>
<div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
  <span style={{ fontSize: 12, color: "#d6d3d1" }}>城市（可修正）</span>
  <input
    value={analysisPreview.citySlug || ""}
    onChange={(e) =>
      setAnalysisPreview((prev) => ({ ...prev, citySlug: e.target.value.toLowerCase().trim() }))
    }
    placeholder="例如 seoul、tokyo、taipei"
    style={{
      flex: 1,
      minWidth: 160,
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.25)",
      background: "rgba(255,255,255,0.12)",
      color: "#ffffff",
      padding: "8px 12px",
      fontSize: 13,
      outline: "none",
    }}
  />
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
                {analysisPreview.summary && <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8, color: "#f5f5f4" }}>{analysisPreview.summary}</div>}
                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  {analysisPreview.items.length ? analysisPreview.items.map((item) => (
                    <div key={item.id} style={{ borderRadius: 18, background: "rgba(255,255,255,0.08)", padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 800 }}>{item.name}</div>
                        <span style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12, background: "rgba(255,255,255,0.12)", color: "#fff" }}>{item.category}</span>
                      </div>
                      {item.area && <div style={{ marginTop: 6, fontSize: 12, color: "#d6d3d1" }}>區域：{item.area}</div>}
                      {item.description && <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>{item.description}</div>}
                    </div>
                  )) : (
                    <div style={{ borderRadius: 18, background: "rgba(255,255,255,0.08)", padding: 14, fontSize: 13, color: "#f5f5f4", lineHeight: 1.8 }}>
                      目前沒有拆出明確的景點或活動項目，確認後會先以來源資料寫入待整理清單。
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 來源清單 */}
        <div style={{ marginTop: 20 }}>
          <SectionCard title="來源清單">
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
              {sources.map((source) => (
                <div key={source.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.card, padding: 18 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{source.platform}</span>
                    <span style={{ borderRadius: 999, background: "#ffffff", border: `1px solid ${COLORS.border}`, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{source.status}</span>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800 }}>{source.title}</div>
                  <div style={{ marginTop: 8, fontSize: 13, color: COLORS.subtext, lineHeight: 1.7 }}>{source.note}</div>
                  <div style={{ marginTop: 14 }}>
                    <PrimaryButton href={source.url} block secondary>開啟原始來源</PrimaryButton>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* 城市入口 */}
        <div style={{ marginTop: 20 }}>
          <SectionCard title="城市入口">
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
              {cityIndex.map((city) => {
                const active = selectedCitySlug === city.slug;
                return (
                  <button key={city.slug} type="button" onClick={() => setSelectedCitySlug(city.slug)}
                    style={{ textAlign: "left", border: `1px solid ${active ? COLORS.primary : COLORS.border}`, borderRadius: 28, background: active ? "#fff" : COLORS.card, boxShadow: active ? "0 10px 26px rgba(0,0,0,0.08)" : "0 6px 18px rgba(0,0,0,0.04)", padding: 20, cursor: "pointer" }}>
                    <div style={{ fontSize: 34 }}>{city.emoji}</div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>{city.label}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: COLORS.subtext }}>{city.region}</div>
                    <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.8, color: COLORS.subtext }}>{city.description}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {city.spotlight.map((item) => <span key={item} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{item}</span>)}
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* 地圖 + 推薦 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1.2fr 0.9fr", gap: 16, marginTop: 20 }}>
          <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
            <SectionCard title={selectedCity ? `${selectedCity.label} 旅遊地圖` : "城市地圖"}
              right={
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋景點、活動、地區、標籤"
                    style={{ minWidth: 220, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }} disabled={!hasCitySelected} />
                  <select value={selectedCitySlug} onChange={(e) => setSelectedCitySlug(e.target.value)}
                    style={{ borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }}>
                    <option value="unselected">請先選擇城市</option>
                    {cityIndex.map((city) => <option key={city.slug} value={city.slug}>{city.label}</option>)}
                    <option value="all">全部城市</option>
                  </select>
                </div>
              }>
              <div style={{ marginBottom: 16, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {CONTENT_MODES.map((mode) => {
                    const active = selectedContentMode === mode;
                    return (
                      <button key={mode} type="button" onClick={() => setSelectedContentMode(mode)}
                        style={{ borderRadius: 999, padding: "10px 14px", border: `1px solid ${active ? COLORS.primary : COLORS.border}`, background: active ? COLORS.primary : "#ffffff", color: active ? "#ffffff" : COLORS.text, cursor: "pointer", fontWeight: 700 }}>
                        {mode === "spots" ? `景點 Spots (${loadedSpots.length})` : `活動 Events (${loadedEvents.length})`}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {allCategories.map((cat) => {
                    const active = selectedCategories.includes(cat);
                    const theme = CATEGORY_THEME[cat] || { bg: COLORS.primarySoft, color: COLORS.text };
                    return (
                      <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                        style={{ ...chipStyle(cat), background: active ? theme.bg : "#ffffff", color: active ? theme.color : COLORS.subtext, border: `1px solid ${active ? theme.bg : COLORS.border}`, cursor: "pointer" }}>
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
              {hasCitySelected
                ? <VisualMap items={activeCollection} activeItemId={activeItem?.id || null} onSelect={setActiveItemId} />
                : <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 28, textAlign: "center", color: COLORS.subtext }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: COLORS.text }}>請先選擇城市</div>
                    <div style={{ marginTop: 10, lineHeight: 1.8 }}>選好城市後，頁面才會載入對應的景點與活動資料。</div>
                  </div>
              }
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
                      {selectedContentMode === "events" && (
                        <div style={{ marginTop: 14, borderRadius: 18, background: COLORS.warningBg, color: COLORS.warningText, padding: 14, fontSize: 13, lineHeight: 1.8 }}>
                          活動期間：{formatEventWindow(activeItem)}<br />
                          票務：{activeItem.ticketType || "未設定"}{activeItem.priceNote ? ` ／ ${activeItem.priceNote}` : ""}
                        </div>
                      )}
                    </>
                  ) : <div style={{ color: COLORS.subtext }}>目前沒有可顯示的內容。</div>}
                </div>
                <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 20 }}>
                  <div style={{ fontSize: 13, color: COLORS.subtext }}>操作</div>
                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {activeItem && <>
                      <PrimaryButton href={activeItem.mapUrl} block>開啟 Google Maps</PrimaryButton>
                      {activeItem.sourceUrl && <PrimaryButton href={activeItem.sourceUrl} block secondary>查看原始來源</PrimaryButton>}
                    </>}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 12, color: COLORS.subtext, lineHeight: 1.7 }}>這一區保留互動地圖體驗，但不依賴外部地圖套件，因此更適合直接部署成靜態網站。</div>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="現在怎麼排最順">
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: COLORS.subtext, marginBottom: 8 }}>目前時間</div>
                <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}
                  style={{ width: "100%", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "12px 12px", outline: "none" }} disabled={!hasCitySelected}>
                  {["早上", "中午", "下午", "晚上"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 13, color: COLORS.subtext, marginBottom: 8 }}>你人在哪一區附近</div>
                <select value={baseArea} onChange={(e) => setBaseArea(e.target.value)}
                  style={{ width: "100%", borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "12px 12px", outline: "none" }} disabled={!hasCitySelected || !allAreas.length || selectedContentMode === "events"}>
                  {allAreas.length ? allAreas.map((area) => <option key={area} value={area}>{area}</option>) : <option value="">請先選城市</option>}
                </select>
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
              {!recommendations.length && hasCitySelected && (
                <div style={{ borderRadius: 18, background: COLORS.cardMuted, padding: 16, color: COLORS.subtext }}>目前這個城市還沒有可推薦的景點資料。</div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
