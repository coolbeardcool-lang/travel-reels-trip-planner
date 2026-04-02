import { CITY_COUNTRY_CODES, CITY_DATA_MAP, NOMINATIM_USER_AGENT, normalizeCitySlug } from "./confirm-analysis/constants.js";
import { cleanText, normalizeName } from "./confirm-analysis/text.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

function buildCacheRequest(key) {
  return new Request(`https://travel-reels-location-cache.local/${encodeURIComponent(key)}`);
}

async function getCachedResolution(key) {
  try {
    const res = await caches.default.match(buildCacheRequest(key));
    if (!res) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function setCachedResolution(key, value) {
  try {
    await caches.default.put(
      buildCacheRequest(key),
      new Response(JSON.stringify(value), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=604800",
        },
      })
    );
  } catch {}
}

function parseMapQueryFromUrl(mapUrl) {
  try {
    const url = new URL(mapUrl);
    const q = url.searchParams.get("query") || url.searchParams.get("q");
    return q ? decodeURIComponent(q) : "";
  } catch {
    return "";
  }
}

function uniqQueries(values) {
  const seen = new Set();
  return values.map((v) => cleanText(v)).filter(Boolean).filter((v) => {
    const key = v.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildQueries(item, citySlug) {
  const cityData = CITY_DATA_MAP[citySlug] || {};
  const cityLabel = cityData.label || citySlug;
  const name = cleanText(item.name);
  const area = cleanText(item.area);
  const originalName = cleanText(item.originalName || item.original_name);
  const aliases = Array.isArray(item.aliases) ? item.aliases.map((a) => cleanText(a)) : [];
  const mapQuery = cleanText(item.mapQuery || item.map_query || parseMapQueryFromUrl(item.mapUrl || item.map_url));

  const precise = aliases.flatMap((alias) => [
    [alias, area, cityLabel].filter(Boolean).join(" "),
    [alias, cityLabel].filter(Boolean).join(" "),
  ]);

  return uniqQueries([
    ...precise,
    [originalName, area, cityLabel].filter(Boolean).join(" "),
    [name, area, cityLabel].filter(Boolean).join(" "),
    mapQuery,
    [name, cityLabel].filter(Boolean).join(" "),
  ]);
}

async function geocodeQuery(query, citySlug) {
  const cityData = CITY_DATA_MAP[citySlug] || {};
  const countryCode = CITY_COUNTRY_CODES[citySlug] || null;
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "5",
    "accept-language": "ko,zh-TW,zh,ja,en",
  });
  if (countryCode) params.set("countrycodes", countryCode);
  if (cityData.label) params.set("city", cityData.label);
  if (cityData.lat && cityData.lng) {
    const d = 0.6;
    params.set("viewbox", `${cityData.lng - d},${cityData.lat + d},${cityData.lng + d},${cityData.lat - d}`);
    params.set("bounded", "0");
  }

  const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
  });
  if (!resp.ok) return null;
  const results = await resp.json();
  if (!Array.isArray(results) || !results.length) return null;

  let best = results[0];
  if (cityData.lat && cityData.lng) {
    const inRange = results.find((r) => {
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat - cityData.lat) < 1.2 && Math.abs(lng - cityData.lng) < 1.2;
    });
    if (inRange) best = inRange;
  }

  const lat = parseFloat(best.lat);
  const lng = parseFloat(best.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function resolveOne(item) {
  const citySlug = normalizeCitySlug(item.citySlug || item.city_slug || "") || "";
  const key = `${citySlug}:${normalizeName(item.name)}:${normalizeName(item.area)}`;
  const cached = await getCachedResolution(key);
  if (cached) return { ...cached, id: item.id, cached: true };

  const queries = buildQueries(item, citySlug);
  for (const query of queries) {
    const geo = await geocodeQuery(query, citySlug);
    if (geo) {
      const value = {
        lat: geo.lat,
        lng: geo.lng,
        confidence: "derived",
        resolvedBy: "geocode-cache",
        queryUsed: query,
        updatedAt: new Date().toISOString(),
      };
      await setCachedResolution(key, value);
      return { id: item.id, ...value, cached: false };
    }
  }

  const cityData = CITY_DATA_MAP[citySlug];
  if (cityData?.lat && cityData?.lng) {
    const value = {
      lat: cityData.lat,
      lng: cityData.lng,
      confidence: "fallback",
      resolvedBy: "city-fallback",
      queryUsed: cityData.label || citySlug,
      updatedAt: new Date().toISOString(),
    };
    await setCachedResolution(key, value);
    return { id: item.id, ...value, cached: false };
  }

  return {
    id: item.id,
    lat: null,
    lng: null,
    confidence: "unresolved",
    resolvedBy: "unresolved",
    queryUsed: queries[0] || "",
    updatedAt: new Date().toISOString(),
    cached: false,
  };
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON" }, 400);
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return json({ ok: true, items: [] });

  const results = [];
  for (const item of items.slice(0, 50)) {
    results.push(await resolveOne(item));
  }
  return json({ ok: true, items: results });
}
