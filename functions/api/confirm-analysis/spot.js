import { CITY_DATA_MAP } from "./constants.js";
import { buildMergedPatch, findExistingRecord } from "./dedup.js";
import { notionCreatePage, notionPatchPage } from "./notion.js";
import { buildItemNotes, cleanText, guessThumbnail } from "./text.js";

export async function upsertSpotPage({ env, item, citySlug, sourceUrl, sourcePageId, sourceTitle, geoResult, cache }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const normalizedTags = Array.isArray(item.tags)
    ? item.tags.map((t) => String(t || "").trim()).filter(Boolean)
    : [];
  const tags = normalizedTags.length
    ? normalizedTags.join(", ")
    : [item.category || "景點", item.area || "", citySlug || ""].filter(Boolean).join(", ");

  const geo = geoResult || {};
  const lat = geo.lat && geo.lat !== 0 ? geo.lat : (Number.isFinite(item?.lat) && item.lat !== 0 ? item.lat : null);
  const lng = geo.lng && geo.lng !== 0 ? geo.lng : (Number.isFinite(item?.lng) && item.lng !== 0 ? item.lng : null);
  const confidence = geo.confidence || "推定";
  const mapQuery = encodeURIComponent(`${item.name} ${cityLabel}`);
  const mapUrl = geo.mapUrl || item.map_url || `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const priorityScore = Number.isFinite(item?.itemConfidence)
    ? Math.round(item.itemConfidence * 100)
    : Number.isFinite(item?.item_confidence)
      ? Math.round(item.item_confidence * 100)
      : 0;

  const qualityWarnings = [];
  if (item.name && !/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(item.name)) qualityWarnings.push("quality-warn: name has no CJK characters");
  if (item.area && !/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(item.area)) qualityWarnings.push("quality-warn: area has no CJK characters");

  const baseNotes = buildItemNotes(item);
  const notesWithWarnings = qualityWarnings.length ? [baseNotes, ...qualityWarnings].filter(Boolean).join(" || ") : baseNotes;

  const properties = {
    Name:             { title: [{ text: { content: cleanText(item.name || "未命名項目").slice(0, 200) } }] },
    Area:             { rich_text: [{ text: { content: cleanText(item.area || cityLabel) } }] },
    BestTime:         { rich_text: [{ text: { content: cleanText(item.best_time) } }] },
    Category:         { rich_text: [{ text: { content: cleanText(item.category || "待分類") } }] },
    City:             { select: { name: cityLabel || "未分類" } },
    CitySlug:         { select: { name: String(citySlug || "未分類") } },
    Confidence:       { select: { name: "推定" } },
    Description:      { rich_text: [{ text: { content: cleanText(item.description).slice(0, 2000) } }] },
    MapUrl:           { url: mapUrl || null },
    Notes:            { rich_text: [{ text: { content: notesWithWarnings.slice(0, 2000) } }] },
    PriorityScore:    { number: priorityScore },
    Published:        { checkbox: true },
    SourceTitleCache: { rich_text: [{ text: { content: cleanText(sourceTitle).slice(0, 200) } }] },
    Tags:             { rich_text: [{ text: { content: tags } }] },
    Thumbnail:        { rich_text: [{ text: { content: cleanText(item.thumbnail || guessThumbnail(item.category)) } }] },
  };
  if (lat !== null) properties.Lat = { number: lat };
  if (lng !== null) properties.Lng = { number: lng };
  if (sourcePageId) properties.SourceLinks = { rich_text: [{ text: { content: String(sourcePageId) } }] };

  const existing = await findExistingRecord(env, env.NOTION_SPOTS_DATA_SOURCE_ID, item.name, citySlug, "select", cache);
  if (existing) {
    const patch = buildMergedPatch(properties, existing);
    const existConf = existing.properties?.Confidence?.select?.name;
    if (confidence === "已確認" && existConf !== "已確認") {
      patch.Confidence = { select: { name: "已確認" } };
      patch.MapUrl = { url: mapUrl };
      if (lat !== null) patch.Lat = { number: lat };
      if (lng !== null) patch.Lng = { number: lng };
    }
    if (Object.keys(patch).length > 0) await notionPatchPage(env, existing.id, patch);
    return { id: existing.id, action: "merged" };
  }

  const created = await notionCreatePage(env, {
    parent: { data_source_id: env.NOTION_SPOTS_DATA_SOURCE_ID },
    properties,
  });
  return { ...created, action: "created" };
}
