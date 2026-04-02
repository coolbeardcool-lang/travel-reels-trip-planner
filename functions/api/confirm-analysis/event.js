import { CITY_DATA_MAP } from "./constants.js";
import { buildMergedPatch, findExistingRecord } from "./dedup.js";
import { notionCreatePage, notionPatchPage } from "./notion.js";
import { cleanText, joinClean, normalizeTags } from "./text.js";

export async function upsertEventPage({ env, item, citySlug, sourceUrl, sourcePageId, sourceTitle, cache }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const normalizedTags = normalizeTags(item.tags);
  const tags = normalizedTags.length
    ? normalizedTags.join(", ")
    : [cleanText(item.category) || "活動", cleanText(item.area), cleanText(citySlug)].filter(Boolean).join(", ");

  const mapQuery = encodeURIComponent(joinClean([item.venue_name || item.name, item.area, cityLabel], " "));
  const mapUrl = cleanText(item.map_url) || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null);
  const lat = Number.isFinite(item?.lat) && Math.abs(item.lat) <= 90 && item.lat !== 0 ? item.lat : null;
  const lng = Number.isFinite(item?.lng) && Math.abs(item.lng) <= 180 && item.lng !== 0 ? item.lng : null;

  const properties = {
    Name:          { title: [{ text: { content: cleanText(item.name || "未命名活動").slice(0, 200) } }] },
    Area:          { rich_text: [{ text: { content: cleanText(item.area || cityLabel) } }] },
    Category:      { select: { name: cleanText(item.category || "活動") } },
    City:          { rich_text: [{ text: { content: cleanText(cityLabel) } }] },
    CitySlug:      { rich_text: [{ text: { content: cleanText(citySlug) } }] },
    Description:   { rich_text: [{ text: { content: cleanText(item.description).slice(0, 2000) } }] },
    EndTimeText:   { rich_text: [{ text: { content: cleanText(item.end_time) } }] },
    EndsOn:        item.ends_on ? { date: { start: String(item.ends_on) } } : { date: null },
    MapUrl:        { url: mapUrl || null },
    OfficialUrl:   { url: cleanText(item.official_url || sourceUrl) || null },
    PriceNote:     { rich_text: [{ text: { content: cleanText(item.price_note) } }] },
    Published:     { checkbox: true },
    RecurringType: { select: { name: "一次性" } },
    StartTimeText: { rich_text: [{ text: { content: cleanText(item.start_time) } }] },
    StartsOn:      item.starts_on ? { date: { start: String(item.starts_on) } } : { date: null },
    Status:        { select: { name: "待整理" } },
    Tags:          { rich_text: [{ text: { content: tags } }] },
    TicketType:    { rich_text: [{ text: { content: cleanText(item.ticket_type) } }] },
    VenueName:     { rich_text: [{ text: { content: cleanText(item.venue_name || item.name) } }] },
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

  const created = await notionCreatePage(env, {
    parent: { data_source_id: env.NOTION_EVENTS_DATA_SOURCE_ID },
    properties,
  });
  return { ...created, action: "created" };
}
