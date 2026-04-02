import { CITY_COUNTRY_CODES, CITY_DATA_MAP, NOMINATIM_USER_AGENT } from "./constants.js";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geocodeWithNominatim(name, area, citySlug, cityLabel) {
  try {
    const countryCode = CITY_COUNTRY_CODES[citySlug] || null;
    const queryParts = [name, area, cityLabel].filter(Boolean);
    const params = new URLSearchParams({
      q: queryParts.join(", "),
      format: "json",
      limit: "3",
      "accept-language": "zh,ja,ko,en",
    });
    if (countryCode) params.set("countrycodes", countryCode);
    if (cityLabel) params.set("city", cityLabel);

    const cityData = CITY_DATA_MAP[citySlug];
    if (cityData?.lat && cityData?.lng) {
      const d = 0.5;
      params.set("viewbox", `${cityData.lng - d},${cityData.lat + d},${cityData.lng + d},${cityData.lat - d}`);
      params.set("bounded", "0");
    }

    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
    if (!resp.ok) return null;
    const results = await resp.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    let best = results[0];
    if (cityData?.lat && results.length > 1) {
      const inRange = results.find((r) => {
        const rlat = parseFloat(r.lat), rlng = parseFloat(r.lon);
        return Math.abs(rlat - cityData.lat) < 1 && Math.abs(rlng - cityData.lng) < 1;
      });
      if (inRange) best = inRange;
    }

    const parsedLat = parseFloat(best.lat);
    const parsedLng = parseFloat(best.lon);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
    return { lat: parsedLat, lng: parsedLng };
  } catch {
    return null;
  }
}
