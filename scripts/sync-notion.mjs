import fs from "node:fs/promises";
import path from "node:path";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_CITIES_DATA_SOURCE_ID = process.env.NOTION_CITIES_DATA_SOURCE_ID;
const NOTION_SPOTS_DATA_SOURCE_ID = process.env.NOTION_SPOTS_DATA_SOURCE_ID;
const NOTION_EVENTS_DATA_SOURCE_ID = process.env.NOTION_EVENTS_DATA_SOURCE_ID;
const NOTION_SOURCES_DATA_SOURCE_ID = process.env.NOTION_SOURCES_DATA_SOURCE_ID;

const REQUIRED_ENVS = [
  "NOTION_API_KEY",
  "NOTION_CITIES_DATA_SOURCE_ID",
  "NOTION_SPOTS_DATA_SOURCE_ID",
  "NOTION_EVENTS_DATA_SOURCE_ID",
  "NOTION_SOURCES_DATA_SOURCE_ID",
];

for (const name of REQUIRED_ENVS) {
  if (!process.env[name]) {
    throw new Error(`Missing required env: ${name}`);
  }
}

const NOTION_VERSION = "2025-09-03";
const NOTION_BASE_URL = "https://api.notion.com/v1";

async function notionFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function queryAllRows(dataSourceId) {
  let results = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const body = {
      page_size: 100,
      sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
      ...(startCursor ? { start_cursor: startCursor } : {}),
    };

    const data = await notionFetch(
      `${NOTION_BASE_URL}/data_sources/${dataSourceId}/query`,
      { method: "POST", body: JSON.stringify(body) }
    );

    results = results.concat(data.results || []);
    hasMore = Boolean(data.has_more);
    startCursor = data.next_cursor || undefined;
  }

  return results;
}

function getPlainText(value) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => item.plain_text || "").join("").trim();
}

function getPropertyValue(prop) {
  if (!prop || !prop.type) return null;
  switch (prop.type) {
    case "title":        return getPlainText(prop.title);
    case "rich_text":    return getPlainText(prop.rich_text);
    case "number":       return prop.number;
    case "url":          return prop.url || "";
    case "checkbox":     return Boolean(prop.checkbox);
    case "select":       return prop.select?.name || "";
    case "status":       return prop.status?.name || "";
    case "multi_select": return (prop.multi_select || []).map((item) => item.name);
    case "date":         return prop.date ? { start: prop.date.start || null, end: prop.date.end || null } : null;
    case "relation":     return (prop.relation || []).map((item) => item.id);
    case "email":        return prop.email || "";
    case "phone_number": return prop.phone_number || "";
    case "formula":      return getFormulaValue(prop.formula);
    default:             return null;
  }
}

function getFormulaValue(formula) {
  if (!formula || !formula.type) return null;
  switch (formula.type) {
    case "string":  return formula.string || "";
    case "number":  return formula.number;
    case "boolean": return Boolean(formula.boolean);
    case "date":    return formula.date ? { start: formula.date.start || null, end: formula.date.end || null } : null;
    default:        return null;
  }
}

function getProp(page, name, fallback = null) {
  return getPropertyValue(page.properties?.[name]) ?? fallback;
}

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function richTextToArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function normalizeCity(page) {
  const name = getProp(page, "Name", "");
  const slug = getProp(page, "Slug", "") || slugify(name);
  return {
    id: page.id,
    slug,
    label: name,
    emoji: getProp(page, "Emoji", "📍") || "📍",
    region: getProp(page, "Region", "未分類") || "未分類",
    description: getProp(page, "Description", "") || "",
    status: getProp(page, "Status", "active") || "active",
    spotlight: richTextToArray(getProp(page, "SpotlightTags", "")),
    heroArea: getProp(page, "HeroArea", "") || "",
    sortOrder: getProp(page, "SortOrder", 9999) ?? 9999,
    published: Boolean(getProp(page, "Published", false)),
    coverImageUrl: getProp(page, "CoverImageUrl", "") || "",
    timezone: getProp(page, "Timezone", "Asia/Tokyo") || "Asia/Tokyo",
    defaultMapLat: getProp(page, "DefaultMapLat", null),
    defaultMapLng: getProp(page, "DefaultMapLng", null),
    lastReviewedAt: getProp(page, "LastReviewedAt", null)?.start || null,
  };
}

function normalizeSource(page) {
  const name = getProp(page, "Name", "");
  const relatedSpotsRaw = getProp(page, "RelatedSpots", "") || "";
  const relatedEventsRaw = getProp(page, "RelatedEvents", "") || "";
  const relatedCitiesRaw = getProp(page, "RelatedCities", "") || "";

  return {
    id: page.id,
    title: name,
    url: getProp(page, "SourceUrl", "") || "",
    platform: getProp(page, "Platform", "Manual") || "Manual",
    sourceType: getProp(page, "SourceType", "手動整理") || "手動整理",
    status: getProp(page, "Status", "待整理") || "待整理",
    note: getProp(page, "Note", "") || "",
    capturedAt: getProp(page, "CapturedAt", null)?.start || null,
    authorOrAccount: getProp(page, "AuthorOrAccount", "") || "",
    cityHints: ensureArray(getProp(page, "CityHints", [])),
    relatedCityIds: relatedCitiesRaw ? [relatedCitiesRaw] : [],
    relatedSpotIds: relatedSpotsRaw ? relatedSpotsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [],
    relatedEventIds: relatedEventsRaw ? relatedEventsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [],
    published: Boolean(getProp(page, "Published", false)),
    lastReviewedAt: getProp(page, "LastReviewedAt", null)?.start || null,
  };
}

function normalizeSpot(page, sourcesById) {
  const cityLabel = getProp(page, "City", "") || "";
  const citySlug = getProp(page, "CitySlug", "") || slugify(cityLabel);
  const sourceId = getProp(page, "SourceLinks", "") || "";
  const source = sourceId ? sourcesById.get(sourceId.trim()) : null;
  const tagsRaw = getProp(page, "Tags", "") || "";
  const tags = richTextToArray(tagsRaw);

  return {
    id: page.id,
    city: cityLabel,
    citySlug,
    area: getProp(page, "Area", "") || "",
    name: getProp(page, "Name", "") || "",
    category: getProp(page, "Category", "景點") || "景點",
    description: getProp(page, "Description", "") || "",
    sourceId: sourceId.trim(),
    sourceTitle: source?.title || getProp(page, "SourceTitleCache", "") || "",
    sourceUrl: source?.url || "",
    bestTime: getProp(page, "BestTime", "下午") || "下午",
    stayMinutes: getProp(page, "StayMinutes", 30) ?? 30,
    tags,
    lat: getProp(page, "Lat", 0) ?? 0,
    lng: getProp(page, "Lng", 0) ?? 0,
    confidence: getProp(page, "Confidence", "推定") || "推定",
    thumbnail: getProp(page, "Thumbnail", "📍") || "📍",
    mapUrl: getProp(page, "MapUrl", "") || "",
    published: Boolean(getProp(page, "Published", false)),
    priorityScore: getProp(page, "PriorityScore", 0) ?? 0,
    lastReviewedAt: getProp(page, "LastReviewedAt", null)?.start || null,
    notes: getProp(page, "Notes", "") || "",
  };
}

function normalizeEvent(page, sourcesById) {
  const citySlug = getProp(page, "CitySlug", "") || "";
  const cityLabel = getProp(page, "City", "") || "";
  const sourceId = getProp(page, "SourceLinks", "") || "";
  const source = sourceId ? sourcesById.get(sourceId.trim()) : null;
  const tagsRaw = getProp(page, "Tags", "") || "";
  const tags = richTextToArray(tagsRaw);

  return {
    id: page.id,
    city: cityLabel,
    citySlug,
    area: getProp(page, "Area", "") || "",
    name: getProp(page, "Name", "") || "",
    category: getProp(page, "Category", "活動") || "活動",
    description: getProp(page, "Description", "") || "",
    sourceId: sourceId.trim(),
    sourceTitle: source?.title || "",
    sourceUrl: source?.url || getProp(page, "OfficialUrl", "") || "",
    tags,
    lat: getProp(page, "Lat", 0) ?? 0,
    lng: getProp(page, "Lng", 0) ?? 0,
    thumbnail: getProp(page, "Thumbnail", "🎫") || "🎫",
    mapUrl: getProp(page, "MapUrl", "") || "",
    startsOn: getProp(page, "StartsOn", null)?.start || null,
    endsOn: getProp(page, "EndsOn", null)?.start || null,
    startTime: getProp(page, "StartTimeText", "") || "",
    endTime: getProp(page, "EndTimeText", "") || "",
    ticketType: getProp(page, "TicketType", "") || "",
    priceNote: getProp(page, "PriceNote", "") || "",
    officialUrl: getProp(page, "OfficialUrl", "") || "",
    status: getProp(page, "Status", "待整理") || "待整理",
    recurringType: getProp(page, "RecurringType", "一次性") || "一次性",
    published: Boolean(getProp(page, "Published", false)),
    lastReviewedAt: getProp(page, "LastReviewedAt", null)?.start || null,
  };
}

function buildMeta(dataSourceId, count) {
  return {
    lastSyncedAt: new Date().toISOString(),
    notionDataSourceId: dataSourceId,
    generatedBy: "github-actions",
    sourceMode: "Notion 主資料庫 → GitHub Actions 產出靜態 JSON → GitHub Pages 前端讀取",
    count,
  };
}

async function writeJsonFile(filepath, data) {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, JSON.stringify(data, null, 2), "utf8");
}

async function main() {
  const [citiesPages, sourcesPages, spotsPages, eventsPages] = await Promise.all([
    queryAllRows(NOTION_CITIES_DATA_SOURCE_ID),
    queryAllRows(NOTION_SOURCES_DATA_SOURCE_ID),
    queryAllRows(NOTION_SPOTS_DATA_SOURCE_ID),
    queryAllRows(NOTION_EVENTS_DATA_SOURCE_ID),
  ]);

  const cities = citiesPages.map(normalizeCity).filter((city) => city.published);
  cities.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "zh-Hant"));

  const sources = sourcesPages.map(normalizeSource).filter((source) => source.published);
  const sourcesById = new Map(sources.map((source) => [source.id, source]));

  const spots = spotsPages
    .map((page) => normalizeSpot(page, sourcesById))
    .filter((spot) => spot.published && spot.citySlug);

  const events = eventsPages
    .map((page) => normalizeEvent(page, sourcesById))
    .filter((event) => event.published && event.citySlug);

  const publicDataDir = path.join(process.cwd(), "public", "data");
  const citiesDir = path.join(publicDataDir, "cities");

  const cityIndexPayload = {
    cities: cities.map(({ id, sortOrder, published, ...rest }) => rest),
    meta: buildMeta(NOTION_CITIES_DATA_SOURCE_ID, cities.length),
  };

  await writeJsonFile(path.join(citiesDir, "index.json"), cityIndexPayload);

  for (const city of cities) {
    const citySpots = spots
      .filter((spot) => spot.citySlug === city.slug)
      .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0) || a.name.localeCompare(b.name, "zh-Hant"));

    const cityEvents = events
      .filter((event) => event.citySlug === city.slug)
      .sort((a, b) => (a.startsOn || "").localeCompare(b.startsOn || "") || a.name.localeCompare(b.name, "zh-Hant"));

    const linkedSourceIds = new Set(
      [...citySpots, ...cityEvents].map((item) => item.sourceId).filter(Boolean)
    );

    const citySources = sources.filter((source) => linkedSourceIds.has(source.id));

    const payload = {
      city: {
        slug: city.slug,
        label: city.label,
        emoji: city.emoji,
        region: city.region,
        description: city.description,
        status: city.status,
        spotlight: city.spotlight,
        heroArea: city.heroArea,
      },
      spots: citySpots,
      events: cityEvents,
      sources: citySources,
      meta: buildMeta(NOTION_SPOTS_DATA_SOURCE_ID, citySpots.length + cityEvents.length),
    };

    await writeJsonFile(path.join(citiesDir, `${city.slug}.json`), payload);
  }

  const allPayload = {
    city: {
      slug: "all", label: "全部城市", emoji: "🗺️", region: "全部",
      description: "彙整所有已發布城市的景點、活動與來源。",
      status: "active", spotlight: [], heroArea: "",
    },
    spots: spots.sort((a, b) => a.citySlug.localeCompare(b.citySlug) || a.name.localeCompare(b.name, "zh-Hant")),
    events: events.sort((a, b) => (a.startsOn || "").localeCompare(b.startsOn || "") || a.name.localeCompare(b.name, "zh-Hant")),
    sources,
    meta: buildMeta("all", spots.length + events.length),
  };

  await writeJsonFile(path.join(publicDataDir, "all.json"), allPayload);

  console.log(`Synced ${cities.length} cities, ${spots.length} spots, ${events.length} events, ${sources.length} sources`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
