import { CITY_DATA_MAP, NOTION_VERSION } from "./constants.js";
import { notionCreatePage } from "./notion.js";

export async function createSourcePage({
  env, sourceTitle, url, platform, notes,
  summary, contentKind, citySlug, confidence, items,
}) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const kindLabel = contentKind === "event" ? "活動" : contentKind === "spot" ? "景點" : "來源";
  const shortName = summary
    ? `${cityLabel ? cityLabel + "・" : ""}${summary}`.slice(0, 80)
    : `${platform} ${kindLabel}${cityLabel ? "・" + cityLabel : ""}`.slice(0, 80);

  return await notionCreatePage(env, {
    parent: { data_source_id: env.NOTION_SOURCES_DATA_SOURCE_ID },
    properties: {
      Name:       { title: [{ text: { content: shortName } }] },
      SourceUrl:  { url },
      Platform:   { rich_text: [{ text: { content: platform } }] },
      SourceType: { rich_text: [{ text: { content: contentKind === "event" ? "活動資訊" : contentKind === "spot" ? "景點美食" : "手動整理" } }] },
      Status:     { select: { name: "已匯入" } },
      Note:       { rich_text: [{ text: { content: (notes || summary || "").slice(0, 2000) } }] },
      CityHints:  { multi_select: citySlug ? [{ name: citySlug }] : [] },
      Published:  { checkbox: true },
    },
  });
}

export async function updateSourceRelations(env, sourcePageId, spotIds, eventIds, citySlug) {
  try {
    const properties = {};
    if (spotIds.length > 0) {
      properties.RelatedSpots = { rich_text: [{ text: { content: spotIds.join(", ") } }] };
    }
    if (eventIds.length > 0) {
      properties.RelatedEvents = { rich_text: [{ text: { content: eventIds.join(", ") } }] };
    }
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
