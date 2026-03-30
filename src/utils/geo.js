export function distanceScore(spot, baseArea, currentTime) {
  let score = 0;
  if (spot.area === baseArea) score += 3;
  if (spot.bestTime === currentTime) score += 2;
  if (spot.stayMinutes <= 45) score += 1;
  return score;
}

export function haversineKm(a, b) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function estimateTransport(from, to) {
  if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) return null;
  const km = haversineKm(from, to);
  if (km < 0.8) return { icon: "🚶", label: "步行", minutes: Math.round(km * 14), km };
  if (km < 3) return { icon: "🚌", label: "公車/地鐵", minutes: Math.round(km * 4 + 5), km };
  return { icon: "🚇", label: "電車/地鐵", minutes: Math.round(km * 2.5 + 8), km };
}

/**
 * Filter and sort items by distance from a reference point.
 * @param {Array} items - spots/events with lat/lng
 * @param {{ lat: number, lng: number }} location - reference point (user GPS)
 * @param {number} radiusKm - max distance in km (default 2)
 * @returns {Array} items within radius, sorted by distance, with `distanceKm` field
 */
export function nearbyItems(items, location, radiusKm = 2) {
  if (!location?.lat || !location?.lng) return [];
  return items
    .filter((item) => item.lat && item.lng)
    .map((item) => ({ ...item, distanceKm: haversineKm(location, item) }))
    .filter((item) => item.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function buildRecommendation(spots, baseArea, currentTime) {
  return [...spots]
    .map((s) => {
      let reason = "";
      if (s.area === baseArea && s.bestTime === currentTime) reason = `${currentTime}在${baseArea}附近，最推薦`;
      else if (s.area === baseArea) reason = `離${baseArea}很近`;
      else if (s.bestTime === currentTime) reason = `適合${currentTime}造訪`;
      return { ...s, reason, score: distanceScore(s, baseArea, currentTime) };
    })
    .sort((a, b) => b.score - a.score);
}
