import { normalizeName } from "./text.js";
import { notionQueryDataSource } from "./notion.js";

export async function queryExistingByCity(env, dbId, citySlug, filterType, cache) {
  const key = `${dbId}:${citySlug}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const filter = filterType === "select"
      ? { property: "CitySlug", select: { equals: citySlug } }
      : { property: "CitySlug", rich_text: { equals: citySlug } };
    const data = await notionQueryDataSource(env, dbId, { page_size: 100, filter });
    const results = data.results || [];
    cache.set(key, results);
    return results;
  } catch {
    return [];
  }
}

export async function findExistingRecord(env, dbId, name, citySlug, filterType, cache) {
  if (!dbId || !name) return null;
  const pages = await queryExistingByCity(env, dbId, citySlug, filterType, cache);
  const target = normalizeName(name);
  return pages.find((page) => {
    if (page.archived) return false;
    const pageName = (page.properties?.Name?.title || []).map((t) => t.plain_text || "").join("").trim();
    return normalizeName(pageName) === target;
  }) || null;
}

export function buildMergedPatch(newProps, existingPage, kind = "spot") {
  const ep = existingPage.properties || {};
  const patch = {};

  const existDesc = (ep.Description?.rich_text || []).map((t) => t.plain_text || "").join("");
  const newDesc = (newProps.Description?.rich_text || []).map((t) => t.plain_text || "").join("");
  if (newDesc.length > existDesc.length) patch.Description = newProps.Description;

  const existTagStr = (ep.Tags?.rich_text || []).map((t) => t.plain_text || "").join("");
  const existTags = existTagStr.split(",").map((t) => t.trim()).filter(Boolean);
  const newTagStr = (newProps.Tags?.rich_text || []).map((t) => t.plain_text || "").join("");
  const newTags = newTagStr.split(",").map((t) => t.trim()).filter(Boolean);
  const mergedTags = [...new Set([...existTags, ...newTags])].join(", ");
  if (mergedTags !== existTagStr) patch.Tags = { rich_text: [{ text: { content: mergedTags.slice(0, 2000) } }] };

  if (kind === "spot") {
    const existThumb = (ep.Thumbnail?.rich_text || []).map((t) => t.plain_text || "").join("");
    const newThumb = (newProps.Thumbnail?.rich_text || []).map((t) => t.plain_text || "").join("");
    if (newThumb && newThumb !== "📍" && (!existThumb || existThumb === "📍")) patch.Thumbnail = newProps.Thumbnail;
    const existScore = ep.PriorityScore?.number || 0;
    const newScore = newProps.PriorityScore?.number || 0;
    if (newScore > existScore) patch.PriorityScore = newProps.PriorityScore;
  }

  const existNotes = (ep.Notes?.rich_text || []).map((t) => t.plain_text || "").join("");
  const newNotes = (newProps.Notes?.rich_text || []).map((t) => t.plain_text || "").join("");
  if (newNotes && !existNotes.includes(newNotes)) {
    const combined = existNotes ? `${existNotes}\n---\n${newNotes}` : newNotes;
    patch.Notes = { rich_text: [{ text: { content: combined.slice(0, 2000) } }] };
  }

  const existLinks = (ep.SourceLinks?.rich_text || []).map((t) => t.plain_text || "").join("");
  const newLinks = (newProps.SourceLinks?.rich_text || []).map((t) => t.plain_text || "").join("");
  if (newLinks && !existLinks.includes(newLinks)) {
    const combined = existLinks ? `${existLinks}, ${newLinks}` : newLinks;
    patch.SourceLinks = { rich_text: [{ text: { content: combined.slice(0, 2000) } }] };
  }

  return patch;
}
