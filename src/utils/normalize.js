const CITY_ALIAS_MAP = {
  京都: "kyoto", 大阪: "osaka", 東京: "tokyo", 福岡: "fukuoka", 沖繩: "okinawa",
  奈良: "nara", 北海道: "hokkaido",
  台北: "taipei", 台中: "taichung", 台南: "tainan", 高雄: "kaohsiung",
  首爾: "seoul", 釜山: "busan",
  全部: "all", all: "all",
};

export function normalizeCitySlugValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return CITY_ALIAS_MAP[raw] || raw.toLowerCase();
}

export function normalizeCity(city, index) {
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

export function normalizeSource(source, index) {
  return {
    id: source.id || `source-${index}`,
    title: source.title || "未命名來源",
    url: source.url || "",
    platform: source.platform || "手動新增",
    status: source.status || "待整理",
    note: source.note || "",
  };
}

export function filterByCitySlug(items, citySlug) {
  if (!citySlug || citySlug === "unselected") return [];
  if (citySlug === "all") return items;
  return items.filter((item) => item.citySlug === citySlug);
}

export function normalizeSpot(spot, index, cityIndex) {
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

export function normalizeEvent(event, index, cityIndex) {
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
    bestTime: event.bestTime || "下午",
    stayMinutes: Number.isFinite(event.stayMinutes) ? event.stayMinutes : Number(event.stayMinutes) || 60,
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

export function normalizeCityIndexPayload(payload) {
  const rawCities = Array.isArray(payload?.cities) ? payload.cities : [];
  return { cities: rawCities.map((city, index) => normalizeCity(city, index)) };
}

export function normalizeCityPayload(payload, fallbackSlug, cityIndex) {
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

export function normalizeAnalysisPayload(payload, fallback = {}) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const contentKind = payload?.contentKind || payload?.content_kind || fallback.contentKind || "source_only";
  return {
    sourceTitle: payload?.sourceTitle || payload?.source_title || fallback.sourceTitle || "未命名來源",
    sourcePlatform: payload?.sourcePlatform || payload?.source_platform || fallback.sourcePlatform || "未知來源",
    contentKind,
    citySlug: normalizeCitySlugValue(payload?.citySlug || payload?.city_slug || fallback.citySlug || ""),
    area: payload?.area || fallback.area || "",
    confidence: Number.isFinite(payload?.confidence) ? payload.confidence : Number(payload?.confidence) || 0,
    needsReview: payload?.needsReview !== false && payload?.needs_review !== false,
    summary: payload?.summary || fallback.summary || "",
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
