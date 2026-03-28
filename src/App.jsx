import React, { useEffect, useMemo, useState } from "react";

const BASE_URL = import.meta.env.BASE_URL;

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

// ── 資料處理 ───────────────────────────────────────────────
function normalizeCitySlugValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const aliasMap = {
    京都: "kyoto", 大阪: "osaka", 東京: "tokyo", 福岡: "fukuoka", 沖繩: "okinawa",
    奈良: "nara", 北海道: "hokkaido",
    台北: "taipei", 台中: "taichung", 台南: "tainan", 高雄: "kaohsiung",
    首爾: "seoul", 釜山: "busan",
    全部: "all", all: "all",
  };
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
    sources,
  };
}

async function fetchCityIndex() {
  const response = await fetch(cityIndexPath(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`無法載入城市索引`);
  return normalizeCityIndexPayload(await response.json());
}

async function fetchCityIndexMeta() {
  const response = await fetch(cityIndexPath(), { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.meta?.lastSyncedAt || null;
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

function normalizeEvidenceList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") {
        const text = entry.trim();
        return text ? { type: "note", value: text } : null;
      }
      if (!entry || typeof entry !== "object") return null;

      const type = String(entry.type || entry.kind || "note").trim();
      const text = String(entry.value || entry.text || "").trim();
      if (!text) return null;

      return { type, value: text };
    })
    .filter(Boolean);
}

function inferAnalysisItemKind(item, contentKind) {
  const explicit = item.itemKind || item.item_kind;
  if (explicit === "spot" || explicit === "event" || explicit === "source_only") {
    return explicit;
  }

  if (
    item.starts_on ||
    item.ends_on ||
    item.start_time ||
    item.end_time ||
    item.price_note ||
    item.ticket_type ||
    item.venue_name
  ) {
    return "event";
  }

  if (contentKind === "spot" || contentKind === "event") {
    return contentKind;
  }

  return "source_only";
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeAnalysisPayload(payload, fallback = {}) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const contentKind =
    payload?.contentKind ||
    payload?.content_kind ||
    fallback.contentKind ||
    "source_only";

  return {
    schemaVersion:
      payload?.schemaVersion ||
      payload?.schema_version ||
      "1.0",
    sourceTitle:
      payload?.sourceTitle ||
      payload?.source_title ||
      fallback.sourceTitle ||
      "未命名來源",
    sourcePlatform:
      payload?.sourcePlatform ||
      payload?.source_platform ||
      fallback.sourcePlatform ||
      "未知來源",
    contentKind,
    citySlug: normalizeCitySlugValue(
      payload?.citySlug ||
        payload?.city_slug ||
        fallback.citySlug ||
        ""
    ),
    area: payload?.area || fallback.area || "",
    confidence: Number.isFinite(payload?.confidence)
      ? payload.confidence
      : Number(payload?.confidence) || 0,
    needsReview:
      payload?.needsReview !== false && payload?.needs_review !== false,
    summary: payload?.summary || fallback.summary || "",
    reviewReason:
      payload?.reviewReason ||
      payload?.review_reason ||
      "",
    sourceCredibility:
      payload?.sourceCredibility ||
      payload?.source_credibility ||
      "medium",
    extractionMode:
      payload?.extractionMode ||
      payload?.extraction_mode ||
      "metadata_only",
    sourceEvidence: normalizeEvidenceList(
      payload?.sourceEvidence || payload?.source_evidence
    ),
    analysis_id: payload?.analysis_id || payload?.analysisId || "",
    cached: Boolean(payload?.cached),
    items: items.map((item, index) => {
      const itemKind = inferAnalysisItemKind(item, contentKind);
      const stayMinutes = normalizeNullableNumber(item.stay_minutes);
      const lat = normalizeNullableNumber(item.lat);
      const lng = normalizeNullableNumber(item.lng);
      return {
        id: item.id || `analysis-item-${index}`,
        name: item.name || "",
        itemKind,
        category:
          item.category ||
          (itemKind === "event" ? "活動" : itemKind === "spot" ? "景點" : ""),
        description: item.description || "",
        tags: Array.isArray(item.tags) ? item.tags : [],
        citySlug: normalizeCitySlugValue(
          item.citySlug ||
            item.city_slug ||
            payload?.citySlug ||
            payload?.city_slug ||
            fallback.citySlug ||
            ""
        ),
        area:
          item.area ||
          payload?.area ||
          fallback.area ||
          "",
        best_time: item.best_time || "",
        stay_minutes: stayMinutes,
        starts_on: item.starts_on || null,
        ends_on: item.ends_on || null,
        start_time: item.start_time || "",
        end_time: item.end_time || "",
        lat,
        lng,
        map_url: item.map_url || "",
        official_url: item.official_url || "",
        venue_name: item.venue_name || "",
        price_note: item.price_note || "",
        ticket_type: item.ticket_type || "",
        thumbnail: item.thumbnail || "",
        itemConfidence: Number.isFinite(item.itemConfidence)
          ? item.itemConfidence
          : Number(item.item_confidence) || 0,
        sourceCredibility:
          item.sourceCredibility ||
          item.source_credibility ||
          payload?.sourceCredibility ||
          payload?.source_credibility ||
          "medium",
        needsReview:
          item.needsReview !== false && item.needs_review !== false,
        reviewReason:
          item.reviewReason ||
          item.review_reason ||
          "",
        evidence: normalizeEvidenceList(item.evidence),
        reason: item.reason || "",
      };
    }),
  };
}

function normalizeItemsForMap(items) {
  const validItems = items.filter(
    (item) =>
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng) &&
      Math.abs(item.lat) <= 90 &&
      Math.abs(item.lng) <= 180 &&
      !(item.lat === 0 && item.lng === 0)
  );

  if (!validItems.length) return [];

  const lats = validItems.map((i) => i.lat);
  const lngs = validItems.map((i) => i.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = Math.max(maxLat - minLat, 0.001);
  const lngRange = Math.max(maxLng - minLng, 0.001);

  return validItems.map((item) => ({
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

function haversineKm(a, b) {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return 0;
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function estimateTransport(from, to) {
  const km = haversineKm(from, to);
  if (km === 0) return null;
  if (km < 0.5) return { icon: "🚶", label: "步行", minutes: Math.round(km / 0.083), km };
  if (km < 3)   return { icon: "🚌", label: "電車／公車", minutes: Math.round(km / 0.35 + 5), km };
  return         { icon: "🚇", label: "地鐵／計程車", minutes: Math.round(km / 0.5 + 8), km };
}

function buildRecommendation(spots, baseArea, currentTime) {  return [...spots]
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
  if (kind === "mixed") return "混合（景點＋活動）";
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

// ── SuccessView ────────────────────────────────────────────
function SuccessView({ result, onReset }) {
  const [countdown, setCountdown] = useState(90);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!result.dispatched) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSynced(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [result.dispatched]);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", marginTop: 40, padding: "0 16px" }}>
      <div style={{ background: COLORS.successBg, border: `1px solid #bbf7d0`, borderRadius: 24, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <div style={{ marginTop: 12, fontSize: 20, fontWeight: 800, color: COLORS.successText }}>已寫入 Notion！</div>

        {result.dispatched ? (
          <div style={{ marginTop: 16 }}>
            {!synced ? (
              <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 13, color: COLORS.successText, fontWeight: 600 }}>⚙️ GitHub Actions 同步中...</div>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: "#15803d" }}>{countdown}s</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#4ade80" }}>約 {countdown} 秒後頁面資料將更新</div>
                <div style={{ marginTop: 10, background: "#dcfce7", borderRadius: 999, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#16a34a", width: `${((90 - countdown) / 90) * 100}%`, transition: "width 1s linear" }} />
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 13, color: COLORS.successText, fontWeight: 600 }}>✨ 同步完成！點下方按鈕查看最新資料</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 13, color: COLORS.subtext }}>資料已寫入，請稍後手動重新整理頁面查看。</div>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {synced && (
            <button
              onClick={() => window.location.reload()}
              style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              🔄 重新載入查看新資料
            </button>
          )}
          <button
            onClick={onReset}
            style={{ background: "#fff", color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            再貼一個網址
          </button>
        </div>

        {result.created?.sourcePageId && (
          <div style={{ marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
            Source ID: <code>{result.created.sourcePageId}</code>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────
export default function App() {
  const isMobile = useResponsiveColumns();
  const [cityIndex, setCityIndex] = useState([]);
  const [selectedCitySlug, setSelectedCitySlug] = useState("unselected");
  const [selectedContentMode, setSelectedContentMode] = useState("spots");
  const [sources, setSources] = useState([]);
  const [loadedSpots, setLoadedSpots] = useState([]);
  const [loadedEvents, setLoadedEvents] = useState([]);
  const [globalStats, setGlobalStats] = useState({ spots: 0, events: 0 });
  const [submittedUrls, setSubmittedUrls] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("trt:submittedUrls") || "[]")); }
    catch { return new Set(); }
  });
  const [search, setSearch] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("下午");
  const [baseArea, setBaseArea] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 資料版本狀態
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncing, setSyncing] = useState(false);

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
  const [confirmResult, setConfirmResult] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(false);
  const [showCitySources, setShowCitySources] = useState(false);

  const hasCitySelected = selectedCitySlug !== "unselected";

  // iPhone Web Share Target：讀取 URL 帶入的分享網址
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("url") || params.get("text");
    if (shared && /^https?:\/\//i.test(shared)) {
      setSubmitUrl(shared);
      setInputExpanded(true);
    }
  }, []);

  // 載入城市索引
  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const payload = await fetchCityIndex();
        if (!cancelled && payload.cities.length) setCityIndex(payload.cities);
        const meta = await fetchCityIndexMeta();
        if (!cancelled) setLastSyncedAt(meta);
      } catch {
        // 載入失敗時保持空陣列，不用 seed 資料
      }
    }
    loadIndex();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // 載入全域統計
  useEffect(() => {
    fetch(`${BASE_URL}data/all.json`, { headers: { Accept: "application/json" } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setGlobalStats({
          spots: Array.isArray(data.spots) ? data.spots.length : 0,
          events: Array.isArray(data.events) ? data.events.length : 0,
        });
      })
      .catch(() => {});
  }, []);

  // 載入城市資料
  useEffect(() => {
    let cancelled = false;
    async function loadCityData() {
      if (!hasCitySelected) {
        setLoadedSpots([]); setLoadedEvents([]); setSources([]);
        setActiveItemId(null); setBaseArea(""); setSelectedCategories([]);
        return;
      }
      try {
        const payload = await fetchCityDataset(selectedCitySlug, cityIndex);
        if (cancelled) return;
        setLoadedSpots(payload.spots); setLoadedEvents(payload.events); setSources(payload.sources);
        setBaseArea(payload.spots[0]?.area || payload.events[0]?.area || payload.city.heroArea || "");
        setActiveItemId((selectedContentMode === "events" ? payload.events[0]?.id : payload.spots[0]?.id) || null);
      } catch {
        if (cancelled) return;
        setLoadedSpots([]); setLoadedEvents([]); setSources([]);
        setBaseArea(""); setActiveItemId(null);
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

  const recommendations = useMemo(() => buildRecommendation(
    filteredSpots.length ? filteredSpots : loadedSpots, baseArea, timeOfDay
  ), [filteredSpots, loadedSpots, baseArea, timeOfDay]);

  function toggleCategory(cat) {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  // 手動更新資料
  async function handleManualSync() {
    setSyncing(true);
    try {
      const r = await fetch(cityIndexPath(), { cache: "no-store" });
      const data = await r.json();
      const newTime = data?.meta?.lastSyncedAt || null;
      if (newTime && newTime !== lastSyncedAt) {
        setLastSyncedAt(newTime);
        setReloadKey((v) => v + 1);
      }
    } catch {}
    setSyncing(false);
  }

  // 分析流程
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
      setConfirmResult(payload);
      setShowSuccess(true);
      const confirmedUrl = submitUrl.trim();
      if (confirmedUrl) {
        setSubmittedUrls((prev) => {
          const next = new Set(prev);
          next.add(confirmedUrl);
          try { localStorage.setItem("trt:submittedUrls", JSON.stringify([...next])); } catch {}
          return next;
        });
      }
      setSubmitUrl(""); setSubmitTitle(""); setSubmitType("auto"); setSubmitCitySlug(""); setSubmitNotes("");
      setAnalysisPreview(null);
      setSubmitStatus({ kind: "idle", message: "" });
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

  const isDuplicateUrl = Boolean(submitUrl.trim() && submittedUrls.has(submitUrl.trim()));
  const shouldShowInput = inputExpanded || Boolean(submitUrl || analysisPreview);

  const cityStats = {
    cities: cityIndex.length,
    spots: hasCitySelected ? loadedSpots.length : globalStats.spots,
    events: hasCitySelected ? loadedEvents.length : globalStats.events,
    picks: recommendations.length,
  };

  if (showSuccess && confirmResult) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.pageBg, paddingTop: 60 }}>
        <SuccessView
          result={confirmResult}
          onReset={() => { setShowSuccess(false); setConfirmResult(null); setReloadKey((v) => v + 1); }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: COLORS.pageBg, color: COLORS.text, fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* 右上角資料版本列 */}
      <div style={{
        position: "fixed", top: 0, right: 0, zIndex: 999,
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${COLORS.border}`,
        borderRadius: "0 0 0 16px",
        padding: "8px 16px",
        fontSize: 12, color: COLORS.subtext,
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      }}>
        {lastSyncedAt ? (
          <span>
            資料版本：{new Date(lastSyncedAt).toLocaleString("zh-TW", {
              month: "2-digit", day: "2-digit",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        ) : (
          <span>載入中...</span>
        )}
        <button
          onClick={handleManualSync}
          disabled={syncing}
          style={{
            background: syncing ? COLORS.primarySoft : COLORS.primary,
            color: syncing ? COLORS.subtext : "#fff",
            border: "none", borderRadius: 10,
            padding: "5px 12px", fontSize: 12, fontWeight: 700,
            cursor: syncing ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? "檢查中..." : "🔄 更新"}
        </button>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? 16 : 28, paddingTop: isMobile ? 56 : 56 }}>

        {/* Hero */}
        <SectionCard>
          <h1 style={{ margin: 0, fontSize: isMobile ? 28 : 48, lineHeight: 1.1, fontWeight: 900 }}>把旅遊靈感整理成<br />可直接使用的城市地圖與行程頁</h1>
          <p style={{ marginTop: 12, maxWidth: 820, color: COLORS.subtext, fontSize: 15, lineHeight: 1.8 }}>依城市查看景點、活動、地圖位置與推薦安排。</p>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
            <MetricCard label="城市數" value={String(cityStats.cities)} sub="持續擴充中" />
            <MetricCard label="景點數" value={String(cityStats.spots)} sub="目前可瀏覽" />
            <MetricCard label="活動數" value={String(cityStats.events)} sub="目前可瀏覽" />
            <MetricCard label="推薦安排" value={String(cityStats.picks)} sub="依時間與區域計算" />
          </div>
        </SectionCard>

        {/* 浮動貼網址入口 */}
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, maxWidth: isMobile ? "calc(100vw - 48px)" : 420 }}>
          {shouldShowInput ? (
            <div style={{ background: COLORS.primary, color: "#fff", borderRadius: 24, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.35)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>貼網址 → 分析 → 確認寫入</div>
                <button type="button" onClick={() => { setInputExpanded(false); setAnalysisPreview(null); setSubmitStatus({ kind: "idle", message: "" }); }}
                  style={{ background: "transparent", border: "none", color: "#a8a29e", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
              </div>
            <form onSubmit={handleAnalyzeUrl} style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <input value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} placeholder="只貼 Instagram Reel / Threads / 網址 就可以"
                style={{ width: "100%", borderRadius: 18, border: `1px solid ${isDuplicateUrl ? "#fb923c" : "rgba(255,255,255,0.15)"}`, background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none", boxSizing: "border-box" }} />
              {isDuplicateUrl && (
                <div style={{ borderRadius: 14, padding: "8px 14px", background: COLORS.warningBg, color: COLORS.warningText, fontSize: 12, fontWeight: 600 }}>
                  ⚠️ 此網址已提交過，如有需要仍可繼續送出。
                </div>
              )}
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
                placeholder="可選：補充提示"
                style={{ width: "100%", minHeight: 80, borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: 16, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
                <PrimaryButton type="submit" disabled={isAnalyzing || isConfirming}>
                  {isAnalyzing ? "分析中…" : "先分析網址"}
                </PrimaryButton>
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

            {analysisPreview && (
              <div style={{ marginTop: 16, borderRadius: 22, background: "rgba(255,255,255,0.10)", padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#d6d3d1" }}>分析預覽 {analysisPreview.cached && "⚡ 快取"}</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{analysisPreview.sourceTitle}</div>
                    <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>
                      類型：{prettyAnalysisKind(analysisPreview.contentKind)} ｜ 平台：{analysisPreview.sourcePlatform} ｜ 城市：{analysisPreview.citySlug || "待判定"}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#d6d3d1" }}>城市（可修正）</span>
                      <input
                        value={analysisPreview.citySlug || ""}
                        onChange={(e) => setAnalysisPreview((prev) => ({ ...prev, citySlug: e.target.value.toLowerCase().trim() }))}
                        placeholder="如 seoul / tokyo"
                        style={{ flex: 1, minWidth: 120, borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", padding: "6px 10px", fontSize: 12, outline: "none" }}
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
          ) : (
            <button type="button"
              onMouseEnter={() => setInputExpanded(true)}
              onClick={() => setInputExpanded(true)}
              style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 20, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 28px rgba(0,0,0,0.22)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 18 }}>＋</span> 貼網址分析
            </button>
          )}
        </div>

        {/* 城市入口 */}
        <div style={{ marginTop: 20 }}>
          <SectionCard title="城市入口">
            {hasCitySelected ? (
              <div style={{ display: "grid", gap: 14 }}>
                {cityIndex.filter((c) => c.slug === selectedCitySlug).map((city) => (
                  <div key={city.slug} style={{ border: `2px solid ${COLORS.primary}`, borderRadius: 28, background: "#fff", boxShadow: "0 10px 26px rgba(0,0,0,0.08)", padding: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ fontSize: 40 }}>{city.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 26, fontWeight: 900 }}>{city.label}</div>
                        <div style={{ fontSize: 13, color: COLORS.subtext }}>{city.region}</div>
                      </div>
                      <button type="button" onClick={() => { setSelectedCitySlug("unselected"); setShowCitySources(false); }}
                        style={{ fontSize: 12, color: COLORS.subtext, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "6px 12px", background: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
                        取消選擇
                      </button>
                    </div>
                    <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.8, color: COLORS.subtext }}>{city.description}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
                      {[
                        { label: "景點數", value: loadedSpots.length, key: "spots", clickable: false },
                        { label: "活動數", value: loadedEvents.length, key: "events", clickable: false },
                        { label: "來源數", value: sources.length, key: "sources", clickable: true },
                      ].map(({ label, value, key, clickable }) => {
                        const active = showCitySources && key === "sources";
                        return (
                          <div key={key} onClick={clickable ? () => setShowCitySources((s) => !s) : undefined}
                            style={{ background: active ? COLORS.primary : COLORS.cardMuted, borderRadius: 16, padding: "12px 14px", border: `1px solid ${active ? COLORS.primary : COLORS.border}`, cursor: clickable ? "pointer" : "default", transition: "background 0.15s" }}>
                            <div style={{ fontSize: 11, color: active ? "#d6d3d1" : COLORS.subtext }}>{label} {clickable && <span style={{ fontSize: 10 }}>{showCitySources ? "▲" : "▼"}</span>}</div>
                            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: active ? "#fff" : COLORS.text }}>{value}</div>
                          </div>
                        );
                      })}
                    </div>
                    {showCitySources && sources.length > 0 && (
                      <div style={{ marginTop: 14, display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)" }}>
                        {sources.map((source) => (
                          <div key={source.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 18, background: COLORS.cardMuted, padding: 14 }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "4px 8px", fontSize: 11, color: COLORS.subtext }}>{source.platform}</span>
                              <span style={{ borderRadius: 999, background: "#fff", border: `1px solid ${COLORS.border}`, padding: "4px 8px", fontSize: 11, color: COLORS.subtext }}>{source.status}</span>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>{source.title}</div>
                            {source.note && <div style={{ marginTop: 4, fontSize: 12, color: COLORS.subtext, lineHeight: 1.6 }}>{source.note}</div>}
                            <a href={source.url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: COLORS.primary, fontWeight: 700, textDecoration: "none" }}>→ 查看來源</a>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                      {city.spotlight.map((item) => <span key={item} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{item}</span>)}
                    </div>
                  </div>
                ))}
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(140px, 1fr))" }}>
                  {cityIndex.filter((c) => c.slug !== selectedCitySlug).map((city) => (
                    <button key={city.slug} type="button" onClick={() => setSelectedCitySlug(city.slug)}
                      style={{ textAlign: "left", border: `1px solid ${COLORS.border}`, borderRadius: 18, background: COLORS.cardMuted, padding: "14px 16px", cursor: "pointer" }}>
                      <div style={{ fontSize: 26 }}>{city.emoji}</div>
                      <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800 }}>{city.label}</div>
                      <div style={{ marginTop: 2, fontSize: 12, color: COLORS.subtext }}>{city.region}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
                {cityIndex.map((city) => (
                  <button key={city.slug} type="button" onClick={() => setSelectedCitySlug(city.slug)}
                    style={{ textAlign: "left", border: `1px solid ${COLORS.border}`, borderRadius: 28, background: COLORS.card, boxShadow: "0 6px 18px rgba(0,0,0,0.04)", padding: 20, cursor: "pointer" }}>
                    <div style={{ fontSize: 34 }}>{city.emoji}</div>
                    <div style={{ marginTop: 8, fontSize: 24, fontWeight: 900 }}>{city.label}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: COLORS.subtext }}>{city.region}</div>
                    <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.8, color: COLORS.subtext }}>{city.description}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                      {city.spotlight.map((item) => <span key={item} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{item}</span>)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* 地圖 + 推薦 */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1.2fr 0.9fr", gap: 16, marginTop: 20 }}>
          <div style={{ gridColumn: isMobile ? "auto" : "span 2" }}>
            <SectionCard title={selectedCity ? `${selectedCity.label} 旅遊地圖` : "城市地圖"}
              right={
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋景點、活動、地區"
                    style={{ minWidth: 180, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }} disabled={!hasCitySelected} />
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
                        {mode === "spots" ? `景點 (${loadedSpots.length})` : `活動 (${loadedEvents.length})`}
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
              {hasCitySelected ? (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "200px 1fr", borderRadius: 20, overflow: "hidden", border: `1px solid ${COLORS.border}`, minHeight: 440 }}>
                  <div style={{ overflowY: "auto", maxHeight: 440, borderRight: isMobile ? "none" : `1px solid ${COLORS.border}`, borderBottom: isMobile ? `1px solid ${COLORS.border}` : "none" }}>
                    {activeCollection.length ? activeCollection.map((item) => {
                      const active = activeItemId === item.id;
                      return (
                        <button key={item.id} type="button" onClick={() => setActiveItemId(item.id)}
                          style={{ width: "100%", padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}`, background: active ? COLORS.primarySoft : "#fff", display: "flex", gap: 10, alignItems: "center", textAlign: "left", border: "none", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{item.thumbnail}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: active ? 800 : 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: active ? COLORS.primary : COLORS.text }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: COLORS.subtext, marginTop: 2 }}>{item.area}</div>
                          </div>
                        </button>
                      );
                    }) : <div style={{ padding: 16, fontSize: 13, color: COLORS.subtext }}>目前無資料</div>}
                  </div>
                  {activeItem?.lat && activeItem?.lng ? (
                    <iframe
                      key={`${activeItem.lat}-${activeItem.lng}`}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeItem.lng - 0.008},${activeItem.lat - 0.006},${activeItem.lng + 0.008},${activeItem.lat + 0.006}&layer=mapnik&marker=${activeItem.lat},${activeItem.lng}`}
                      style={{ border: "none", width: "100%", height: 440 }}
                      title={activeItem.name}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.cardMuted, color: COLORS.subtext, fontSize: 14 }}>請從左側選擇景點查看地圖</div>
                  )}
                </div>
              ) : (
                <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 28, textAlign: "center", color: COLORS.subtext }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: COLORS.text }}>請先選擇城市</div>
                  <div style={{ marginTop: 10, lineHeight: 1.8 }}>選好城市後，頁面才會載入對應的景點與活動資料。</div>
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
            <div style={{ display: "grid", gap: 0, marginTop: 16 }}>
              {recommendations.map((item, i) => {
                const transport = i > 0 ? estimateTransport(recommendations[i - 1], item) : null;
                return (
                  <React.Fragment key={item.id}>
                    {transport && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0 6px 20px" }}>
                        <div style={{ width: 2, height: 24, background: COLORS.border, flexShrink: 0 }} />
                        <span style={{ fontSize: 18 }}>{transport.icon}</span>
                        <span style={{ fontSize: 12, color: COLORS.subtext }}>{transport.label}・約 {transport.minutes} 分・{transport.km.toFixed(1)} km</span>
                      </div>
                    )}
                    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 22, background: COLORS.card, padding: 16, marginBottom: 0 }}>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 999, background: COLORS.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{item.order}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={chipStyle(item.category)}>{item.category}</span>
                            <span style={{ border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>{item.bestTime}</span>
                          </div>
                          <div style={{ marginTop: 8, fontWeight: 800, fontSize: 15 }}>{item.name}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: COLORS.subtext }}>{item.city}・{item.area}</div>
                          <div style={{ marginTop: 6, fontSize: 13, color: COLORS.subtext, lineHeight: 1.6 }}>{item.reason}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                            <span style={{ fontSize: 12, color: COLORS.subtext, background: COLORS.cardMuted, borderRadius: 8, padding: "4px 8px" }}>⏱ {item.stayMinutes} 分</span>
                            {item.mapUrl && <a href={item.mapUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: COLORS.primary, fontWeight: 700, textDecoration: "none" }}>地圖 →</a>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
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
