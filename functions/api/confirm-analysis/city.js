import { CITY_DATA_MAP, NOTION_VERSION, normalizeCitySlug } from "./constants.js";
import { notionCreatePage, notionQueryDataSource } from "./notion.js";

export async function ensureCityExists(env, citySlug) {
  citySlug = normalizeCitySlug(citySlug) || citySlug;
  try {
    const data = await notionQueryDataSource(env, env.NOTION_CITIES_WRITE_ID, { page_size: 100 });
    const pages = data.results || [];
    const existingSlugs = pages.map((page) => {
      const slugProp = page.properties?.Slug;
      if (slugProp?.type === "rich_text") {
        return (slugProp.rich_text || []).map((r) => r.plain_text || "").join("").trim().toLowerCase();
      }
      return "";
    }).filter(Boolean);
    if (existingSlugs.includes(citySlug.toLowerCase())) return;

    const city = CITY_DATA_MAP[citySlug] || {
      label: citySlug, emoji: "📍", region: "其他",
      timezone: "Asia/Tokyo", lat: 0, lng: 0, sort: 9999,
      heroArea: "", spotlight: "", description: "",
    };

    await notionCreatePage(env, {
      parent: { data_source_id: env.NOTION_CITIES_WRITE_ID },
      properties: {
        Name:          { title: [{ text: { content: city.label } }] },
        Slug:          { rich_text: [{ text: { content: citySlug } }] },
        Emoji:         { rich_text: [{ text: { content: city.emoji } }] },
        Region:        { select: { name: city.region } },
        Status:        { select: { name: "active" } },
        Timezone:      { select: { name: city.timezone } },
        Description:   { rich_text: [{ text: { content: city.description } }] },
        HeroArea:      { rich_text: [{ text: { content: city.heroArea } }] },
        CoverImageUrl: { rich_text: [{ text: { content: "" } }] },
        SpotlightTags: { rich_text: [{ text: { content: city.spotlight } }] },
        SortOrder:     { number: city.sort },
        DefaultMapLat: { number: city.lat },
        DefaultMapLng: { number: city.lng },
        Published:     { checkbox: true },
      },
    });
  } catch (e) {
    throw new Error(e?.message || String(e));
  }
}
