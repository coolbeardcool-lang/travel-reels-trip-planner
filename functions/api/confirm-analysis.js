import { NOTION_VERSION, CITY_DATA_MAP, normalizeCitySlug } from "./confirm-analysis/constants.js";
import { sleep, geocodeWithNominatim } from "./confirm-analysis/geo.js";
import { findExistingRecord, buildMergedPatch } from "./confirm-analysis/dedup.js";
import { cleanText, joinClean, normalizeTags, guessThumbnail } from "./confirm-analysis/text.js";

async function notionPatchPage(env, pageId, properties) {
  const resp = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ properties }),
  });
  const jsonBody = await resp.json();
  if (!resp.ok) throw new Error(jsonBody?.message || "合併更新 Notion 失敗。");
  return jsonBody;
}

async function notionCreatePage(env, payload) {
  const resp = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify(payload),
  });
  const jsonBody = await resp.json();
  if (!resp.ok) throw new Error(jsonBody?.message || "寫入 Notion 失敗。");
  return jsonBody;
}

function buildItemNotes(item) {
  const parts = [];
  const reason = cleanText(item?.reason);
  const reviewReason = cleanText(item?.reviewReason || item?.review_reason);
  if (reason) parts.push(`reason: ${reason}`);
  if (reviewReason) parts.push(`review: ${reviewReason}`);
  if (Array.isArray(item?.evidence) && item.evidence.length) {
    const evidenceText = item.evidence
      .map((e) => cleanText(typeof e === "string" ? e : e?.value || e?.text))
      .filter(Boolean)
      .slice(0, 6)
      .join(" | ");
    if (evidenceText) parts.push(`evidence: ${evidenceText}`);
  }
  return parts.join(" || ").slice(0, 2000);
}

export async function onRequestPost(context) {
  try {
    const env = context.env;
    const body = await context.request.json();
    const url = String(body?.url || "").trim();
    const sourceTitle = String(body?.sourceTitle || "").trim() || "未命名來源";
    const notes = String(body?.notes || "").trim();
    const analysis = body?.analysis || {};

    if (!url || !/^https?:\/\//i.test(url)) return json({ message: "url 不可空白，且必須是 http/https 網址。" }, 400);
    if (!analysis || typeof analysis !== "object") return json({ message: "缺少 analysis，請先完成分析。" }, 400);
    if (!analysis.contentKind || !analysis.sourcePlatform) return json({ message: "analysis 格式不完整，請重新分析。" }, 400);
    if (!env.NOTION_TOKEN || !env.NOTION_SOURCES_DATA_SOURCE_ID) return json({ message: "Notion 環境變數尚未設定。" }, 500);

    const platform = String(analysis.sourcePlatform || "Website");
    const contentKind = String(analysis.contentKind || "source_only");
    const citySlug = normalizeCitySlug(String(analysis.citySlug || "")) || "";
    const summary = String(analysis.summary || "");
    const confidence = Number(analysis.confidence || 0);
    const items = Array.isArray(analysis.items) ? analysis.items : [];

    let cityEnsureError = null;
    if (citySlug && env.NOTION_CITIES_WRITE_ID) {
      try { await ensureCityExists(env, citySlug); } catch (e) { cityEnsureError = e?.message || String(e); }
    }

    const sourcePage = await createSourcePage({ env, sourceTitle, url, platform, notes, summary, contentKind, citySlug, confidence, items });
    const sourcePageId = sourcePage?.id || null;
    const created = { sourcePageId, spots: [], events: [] };
    const spotPageIds = [];
    const eventPageIds = [];
    const existingCache = new Map();

    let nominatimCallCount = 0;
    for (const item of items) {
      const aiHasCoords = Number.isFinite(item?.lat) && item.lat !== 0 && Number.isFinite(item?.lng) && item.lng !== 0;
      if (aiHasCoords) {
        item._confidence = "已確認";
      } else if (item?.name) {
        const itemCitySlug = normalizeCitySlug(String(item?.citySlug || item?.city_slug || citySlug || "")) || "";
        const cityLabel = CITY_DATA_MAP[itemCitySlug]?.label || itemCitySlug;
        if (nominatimCallCount > 0) await sleep(1100);
        nominatimCallCount++;
        const geo = await geocodeWithNominatim(item.name, item.area, itemCitySlug, cityLabel);
        if (geo) {
          item.lat = geo.lat;
          item.lng = geo.lng;
          item._confidence = "已確認";
        } else {
          item._confidence = "推定";
        }
      } else {
        item._confidence = "推定";
      }
    }

    if (items.length && (env.NOTION_SPOTS_DATA_SOURCE_ID || env.NOTION_EVENTS_DATA_SOURCE_ID)) {
      for (const item of items) {
        const itemCitySlug = normalizeCitySlug(String(item?.citySlug || item?.city_slug || citySlug || "")) || "";
        const cityData = CITY_DATA_MAP[itemCitySlug];
        const lat = Number.isFinite(item?.lat) && item.lat !== 0 ? item.lat : (cityData?.lat || 0);
        const lng = Number.isFinite(item?.lng) && item.lng !== 0 ? item.lng : (cityData?.lng || 0);
        const confidenceLabel = item._confidence || "推定";
        const geoResult = { lat, lng, confidence: confidenceLabel, mapUrl: confidenceLabel === "已確認" && lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null };
        const spotPage = await upsertSpotPage({ env, item, citySlug: itemCitySlug, sourceUrl: url, sourcePageId, sourceTitle, geoResult, cache: existingCache });
        const spotId = spotPage?.id || null;
        if (spotId) spotPageIds.push(spotId);
        created.spots.push({ id: spotId, name: item.name || "未命名景點", action: spotPage?.action || "created" });
      }
    }

    if (contentKind === "event" && env.NOTION_EVENTS_DATA_SOURCE_ID) {
      for (const item of items) {
        const itemCitySlug = normalizeCitySlug(String(item?.citySlug || item?.city_slug || citySlug || "")) || "";
        const eventPage = await upsertEventPage({ env, item, citySlug: itemCitySlug, sourceUrl: url, sourcePageId, sourceTitle, cache: existingCache });
        const eventId = eventPage?.id || null;
        if (eventId) eventPageIds.push(eventId);
        created.events.push({ id: eventId, name: item.name || "未命名活動", action: eventPage?.action || "created" });
      }
    }

    if (sourcePageId && (spotPageIds.length > 0 || eventPageIds.length > 0 || citySlug)) {
      await updateSourceRelations(env, sourcePageId, spotPageIds, eventPageIds, citySlug);
    }

    let dispatched = false;
    let dispatchError = null;
    if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO) {
      try {
        const resp = await fetch(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "TravelReelsBot/1.0",
          },
          body: JSON.stringify({ event_type: "sync_notion_after_reel_submit" }),
        });
        const respText = await resp.text();
        dispatched = resp.ok;
        if (!resp.ok) dispatchError = `${resp.status}: ${respText}`;
      } catch (e) {
        dispatchError = e?.message || String(e);
      }
    }

    return json({ message: "已確認寫入。", created, dispatched, cityEnsureError, dispatchError });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "確認寫入失敗。" }, 500);
  }
}

async function updateSourceRelations(env, sourcePageId, spotIds, eventIds, citySlug) {
  try {
    const properties = {};
    if (spotIds.length > 0) properties.RelatedSpots = { rich_text: [{ text: { content: spotIds.join(", ") } }] };
    if (eventIds.length > 0) properties.RelatedEvents = { rich_text: [{ text: { content: eventIds.join(", ") } }] };
    if (citySlug) {
      properties.CityHints = { multi_select: [{ name: citySlug }] };
      properties.RelatedCities = { multi_select: [{ name: citySlug }] };
    }
    if (Object.keys(properties).length === 0) return;
    await fetch(`https://api.notion.com/v1/pages/${sourcePageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({ properties }),
    });
  } catch {}
}

async function ensureCityExists(env, citySlug) {
  citySlug = normalizeCitySlug(citySlug) || citySlug;
  try {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${env.NOTION_CITIES_WRITE_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({ page_size: 100 }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cities 查詢失敗 ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const pages = data.results || [];
    const existingSlugs = pages.map((page) => {
      const slugProp = page.properties?.Slug;
      if (slugProp?.type === "rich_text") return (slugProp.rich_text || []).map((r) => r.plain_text || "").join("").trim().toLowerCase();
      return "";
    }).filter(Boolean);
    if (existingSlugs.includes(citySlug.toLowerCase())) return;

    const city = CITY_DATA_MAP[citySlug] || { label: citySlug, emoji: "📍", region: "Other", timezone: "Asia/Tokyo", lat: 0, lng: 0, sort: 9999, heroArea: "", spotlight: "", description: "" };
    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        parent: { data_source_id: env.NOTION_CITIES_WRITE_ID },
        properties: {
          Name: { title: [{ text: { content: city.label } }] },
          Slug: { rich_text: [{ text: { content: citySlug } }] },
          Emoji: { rich_text: [{ text: { content: city.emoji } }] },
          Region: { select: { name: city.region } },
          Status: { select: { name: "active" } },
          Timezone: { select: { name: city.timezone } },
          Description: { rich_text: [{ text: { content: city.description } }] },
          HeroArea: { rich_text: [{ text: { content: city.heroArea } }] },
          CoverImageUrl: { rich_text: [{ text: { content: "" } }] },
          SpotlightTags: { rich_text: [{ text: { content: city.spotlight } }] },
          SortOrder: { number: city.sort },
          DefaultMapLat: { number: city.lat },
          DefaultMapLng: { number: city.lng },
          Published: { checkbox: true },
        },
      }),
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Cities 新增失敗 ${createRes.status}: ${errText}`);
    }
  } catch (e) {
    throw new Error(e?.message || String(e));
  }
}

async function createSourcePage({ env, sourceTitle, url, platform, notes, summary, contentKind, citySlug }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const kindLabel = contentKind === "event" ? "活動" : contentKind === "spot" ? "景點" : "來源";
  const shortName = summary ? `${cityLabel ? cityLabel + "・" : ""}${summary}`.slice(0, 80) : `${platform} ${kindLabel}${cityLabel ? "・" + cityLabel : ""}`.slice(0, 80);
  const payload = {
    parent: { data_source_id: env.NOTION_SOURCES_DATA_SOURCE_ID },
    properties: {
      Name: { title: [{ text: { content: shortName } }] },
      SourceUrl: { url },
      Platform: { rich_text: [{ text: { content: platform } }] },
      SourceType: { rich_text: [{ text: { content: contentKind === "event" ? "活動資訊" : contentKind === "spot" ? "景點美食" : "手動整理" } }] },
      Status: { select: { name: "已匯入" } },
      Note: { rich_text: [{ text: { content: (notes || summary || "").slice(0, 2000) } }] },
      CityHints: { multi_select: citySlug ? [{ name: citySlug }] : [] },
      Published: { checkbox: true },
    },
  };
  return await notionCreatePage(env, payload);
}

async function upsertSpotPage({ env, item, citySlug, sourceUrl, sourcePageId, sourceTitle, geoResult, cache }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const normalizedTagList = Array.isArray(item.tags) ? item.tags.map((t) => String(t || "").trim()).filter(Boolean) : [];
  const tags = normalizedTagList.length ? normalizedTagList.join(", ") : [item.category || "景點", item.area || "", citySlug || ""].filter(Boolean).join(", ");
  const geo = geoResult || {};
  const lat = geo.lat && geo.lat !== 0 ? geo.lat : (Number.isFinite(item?.lat) && item.lat !== 0 ? item.lat : null);
  const lng = geo.lng && geo.lng !== 0 ? geo.lng : (Number.isFinite(item?.lng) && item.lng !== 0 ? item.lng : null);
  const confidenceLabel = geo.confidence || "推定";
  const mapQuery = encodeURIComponent(`${item.name} ${cityLabel}`);
  const mapUrl = geo.mapUrl || item.map_url || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const priorityScore = Number.isFinite(item?.itemConfidence) ? Math.round(item.itemConfidence * 100) : Number.isFinite(item?.item_confidence) ? Math.round(item.item_confidence * 100) : 0;
  const qualityWarnings = [];
  if (item.name && !/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(item.name)) qualityWarnings.push("quality-warn: name has no CJK characters");
  if (item.area && !/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(item.area)) qualityWarnings.push("quality-warn: area has no CJK characters");
  const baseNotes = buildItemNotes(item);
  const notesWithWarnings = qualityWarnings.length ? [baseNotes, ...qualityWarnings].filter(Boolean).join(" || ") : baseNotes;

  const properties = {
    Name: { title: [{ text: { content: cleanText(item.name || "未命名項目").slice(0, 200) } }] },
    Area: { rich_text: [{ text: { content: cleanText(item.area || cityLabel) } }] },
    BestTime: { rich_text: [{ text: { content: cleanText(item.best_time) } }] },
    Category: { rich_text: [{ text: { content: cleanText(item.category || "待分類") } }] },
    City: { select: { name: cityLabel || "未分類" } },
    CitySlug: { select: { name: String(citySlug || "未分類") } },
    Confidence: { select: { name: "推定" } },
    Description: { rich_text: [{ text: { content: cleanText(item.description).slice(0, 2000) } }] },
    MapUrl: { url: mapUrl || null },
    Notes: { rich_text: [{ text: { content: notesWithWarnings.slice(0, 2000) } }] },
    PriorityScore: { number: priorityScore },
    Published: { checkbox: true },
    SourceTitleCache: { rich_text: [{ text: { content: cleanText(sourceTitle).slice(0, 200) } }] },
    Tags: { rich_text: [{ text: { content: tags } }] },
    Thumbnail: { rich_text: [{ text: { content: cleanText(item.thumbnail || guessThumbnail(item.category)) } }] },
  };
  if (lat !== null) properties.Lat = { number: lat };
  if (lng !== null) properties.Lng = { number: lng };
  if (sourcePageId) properties.SourceLinks = { rich_text: [{ text: { content: String(sourcePageId) } }] };

  const existing = await findExistingRecord(env, env.NOTION_SPOTS_DATA_SOURCE_ID, item.name, citySlug, "select", cache);
  if (existing) {
    const patch = buildMergedPatch(properties, existing);
    const existConf = existing.properties?.Confidence?.select?.name;
    if (confidenceLabel === "已確認" && existConf !== "已確認") {
      patch.Confidence = { select: { name: "已確認" } };
      patch.MapUrl = { url: mapUrl };
      if (lat !== null) patch.Lat = { number: lat };
      if (lng !== null) patch.Lng = { number: lng };
    }
    if (Object.keys(patch).length > 0) await notionPatchPage(env, existing.id, patch);
    return { id: existing.id, action: "merged" };
  }
  const created = await notionCreatePage(env, { parent: { data_source_id: env.NOTION_SPOTS_DATA_SOURCE_ID }, properties });
  return { ...created, action: "created" };
}

async function upsertEventPage({ env, item, citySlug, sourceUrl, sourcePageId, cache }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const normalizedTagList = normalizeTags(item.tags);
  const tags = normalizedTagList.length ? normalizedTagList.join(", ") : [cleanText(item.category) || "活動", cleanText(item.area), cleanText(citySlug)].filter(Boolean).join(", ");
  const mapQuery = encodeURIComponent(joinClean([item.venue_name || item.name, item.area, cityLabel], " "));
  const mapUrl = cleanText(item.map_url) || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null);
  const lat = Number.isFinite(item?.lat) && Math.abs(item.lat) <= 90 && item.lat !== 0 ? item.lat : null;
  const lng = Number.isFinite(item?.lng) && Math.abs(item.lng) <= 180 && item.lng !== 0 ? item.lng : null;

  const properties = {
    Name: { title: [{ text: { content: cleanText(item.name || "未命名活動").slice(0, 200) } }] },
    Area: { rich_text: [{ text: { content: cleanText(item.area || cityLabel) } }] },
    Category: { select: { name: cleanText(item.category || "活動") } },
    City: { rich_text: [{ text: { content: cleanText(cityLabel) } }] },
    CitySlug: { rich_text: [{ text: { content: cleanText(citySlug) } }] },
    Description: { rich_text: [{ text: { content: cleanText(item.description).slice(0, 2000) } }] },
    EndTimeText: { rich_text: [{ text: { content: cleanText(item.end_time) } }] },
    EndsOn: item.ends_on ? { date: { start: String(item.ends_on) } } : { date: null },
    MapUrl: { url: mapUrl || null },
    OfficialUrl: { url: cleanText(item.official_url || sourceUrl) || null },
    PriceNote: { rich_text: [{ text: { content: cleanText(item.price_note) } }] },
    Published: { checkbox: true },
    RecurringType: { select: { name: "一次性" } },
    StartTimeText: { rich_text: [{ text: { content: cleanText(item.start_time) } }] },
    StartsOn: item.starts_on ? { date: { start: String(item.starts_on) } } : { date: null },
    Status: { select: { name: "待整理" } },
    Tags: { rich_text: [{ text: { content: tags } }] },
    TicketType: { rich_text: [{ text: { content: cleanText(item.ticket_type) } }] },
    VenueName: { rich_text: [{ text: { content: cleanText(item.venue_name || item.name) } }] },
  };
  if (lat !== null) properties.Lat = { number: lat };
  if (lng !== null) properties.Lng = { number: lng };
  if (sourcePageId) properties.SourceLinks = { rich_text: [{ text: { content: String(sourcePageId) } }] };

  const existing = await findExistingRecord(env, env.NOTION_EVENTS_DATA_SOURCE_ID, item.name, citySlug, "rich_text", cache);
  if (existing) {
    const patch = buildMergedPatch(properties, existing, "event");
    if (Object.keys(patch).length > 0) await notionPatchPage(env, existing.id, patch);
    return { id: existing.id, action: "merged" };
  }
  const created = await notionCreatePage(env, { parent: { data_source_id: env.NOTION_EVENTS_DATA_SOURCE_ID }, properties });
  return { ...created, action: "created" };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
