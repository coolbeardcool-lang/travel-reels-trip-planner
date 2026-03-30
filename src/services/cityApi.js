import { BASE_URL } from "../config/theme.js";
import { normalizeCitySlugValue, normalizeCity, normalizeCityIndexPayload, normalizeCityPayload } from "../utils/normalize.js";

function cityIndexPath() { return `${BASE_URL}data/cities/index.json`; }

export function cityDataPaths(citySlug) {
  const normalized = normalizeCitySlugValue(citySlug);
  if (!normalized || normalized === "unselected") return [];
  if (normalized === "all") return [`${BASE_URL}data/all.json`];
  return [`${BASE_URL}data/cities/${normalized}.json`, `${BASE_URL}data/${normalized}.json`];
}

export async function fetchCityIndex() {
  const response = await fetch(cityIndexPath(), { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`無法載入城市索引`);
  return normalizeCityIndexPayload(await response.json());
}

export async function fetchCityIndexMeta() {
  const response = await fetch(cityIndexPath(), { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.meta?.lastSyncedAt || null;
}

export async function fetchCityDataset(citySlug, cityIndex) {
  const paths = cityDataPaths(citySlug);
  if (!paths.length) return { city: normalizeCity({ slug: "unselected" }, 0), spots: [], events: [], sources: [] };
  for (const path of paths) {
    const response = await fetch(path, { headers: { Accept: "application/json" } });
    if (response.ok) return normalizeCityPayload(await response.json(), normalizeCitySlugValue(citySlug), cityIndex);
  }
  throw new Error(`無法載入城市資料：${citySlug}`);
}

export { cityIndexPath };
