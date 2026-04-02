import { CITY_DATA_MAP, normalizeCitySlug } from "./confirm-analysis/constants.js";
import { sleep, geocodeWithNominatim } from "./confirm-analysis/geo.js";
import { ensureCityExists } from "./confirm-analysis/city.js";
import { createSourcePage, updateSourceRelations } from "./confirm-analysis/source.js";
import { upsertSpotPage } from "./confirm-analysis/spot.js";
import { upsertEventPage } from "./confirm-analysis/event.js";

export async function onRequestPost(context) {
  try {
    const env = context.env;
    const body = await context.request.json();

    const url = String(body?.url || "").trim();
    const sourceTitle = String(body?.sourceTitle || "").trim() || "未命名來源";
    const notes = String(body?.notes || "").trim();
    const analysis = body?.analysis || {};

    if (!url || !/^https?:\/\//i.test(url)) {
      return json({ message: "url 不可空白，且必須是 http/https 網址。" }, 400);
    }
    if (!analysis || typeof analysis !== "object") {
      return json({ message: "缺少 analysis，請先完成分析。" }, 400);
    }
    if (!analysis.contentKind || !analysis.sourcePlatform) {
      return json({ message: "analysis 格式不完整，請重新分析。" }, 400);
    }
    if (!env.NOTION_TOKEN || !env.NOTION_SOURCES_DATA_SOURCE_ID) {
      return json({ message: "Notion 環境變數尚未設定。" }, 500);
    }

    const platform = String(analysis.sourcePlatform || "Website");
    const contentKind = String(analysis.contentKind || "source_only");
    const citySlug = normalizeCitySlug(String(analysis.citySlug || "")) || "";
    const summary = String(analysis.summary || "");
    const confidence = Number(analysis.confidence || 0);
    const items = Array.isArray(analysis.items) ? analysis.items : [];

    let cityEnsureError = null;
    if (citySlug && env.NOTION_CITIES_WRITE_ID) {
      try {
        await ensureCityExists(env, citySlug);
      } catch (e) {
        cityEnsureError = e?.message || String(e);
      }
    }

    const sourcePage = await createSourcePage({
      env, sourceTitle, url, platform, notes,
      summary, contentKind, citySlug, confidence, items,
    });
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
        nominatimCallCount += 1;
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
        const kind = String(item?.itemKind || item?.item_kind || (contentKind === "event" ? "event" : "spot"));
        const itemCitySlug = normalizeCitySlug(String(item?.citySlug || item?.city_slug || citySlug || "")) || "";
        if (kind !== "event" && env.NOTION_SPOTS_DATA_SOURCE_ID) {
          const cityData = CITY_DATA_MAP[itemCitySlug];
          const lat = Number.isFinite(item?.lat) && item.lat !== 0 ? item.lat : (cityData?.lat || 0);
          const lng = Number.isFinite(item?.lng) && item.lng !== 0 ? item.lng : (cityData?.lng || 0);
          const confidenceLabel = item._confidence || "推定";
          const geoResult = {
            lat,
            lng,
            confidence: confidenceLabel,
            mapUrl: confidenceLabel === "已確認" && lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null,
          };
          const spotPage = await upsertSpotPage({ env, item, citySlug: itemCitySlug, sourceUrl: url, sourcePageId, sourceTitle, geoResult, cache: existingCache });
          const spotId = spotPage?.id || null;
          if (spotId) spotPageIds.push(spotId);
          created.spots.push({ id: spotId, name: item.name || "未命名景點", action: spotPage?.action || "created" });
        }
        if (kind === "event" && env.NOTION_EVENTS_DATA_SOURCE_ID) {
          const eventPage = await upsertEventPage({ env, item, citySlug: itemCitySlug, sourceUrl: url, sourcePageId, sourceTitle, cache: existingCache });
          const eventId = eventPage?.id || null;
          if (eventId) eventPageIds.push(eventId);
          created.events.push({ id: eventId, name: item.name || "未命名活動", action: eventPage?.action || "created" });
        }
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
