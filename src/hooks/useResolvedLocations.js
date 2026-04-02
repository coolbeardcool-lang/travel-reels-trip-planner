import { useEffect, useMemo, useRef, useState } from "react";

const RESOLVE_LOCATION_API_PATH = `${import.meta.env.BASE_URL}api/resolve-location`;

function hasCoords(item) {
  return Number.isFinite(item?.lat) && Number.isFinite(item?.lng) && item.lat !== 0 && item.lng !== 0;
}

function getCacheKey(item) {
  return String(item?.id || "");
}

export function useResolvedLocations({ items, visibleIds }) {
  const [resolvedMap, setResolvedMap] = useState({});
  const [isResolving, setIsResolving] = useState(false);
  const pendingRef = useRef(new Set());

  const resolvedItems = useMemo(() => {
    return items.map((item) => {
      if (hasCoords(item)) {
        return { ...item, _locationResolvedBy: "stored", _locationConfidence: item.confidence === "已確認" ? "stored" : "derived" };
      }
      const resolved = resolvedMap[getCacheKey(item)];
      if (!resolved || !Number.isFinite(resolved.lat) || !Number.isFinite(resolved.lng)) return item;
      return {
        ...item,
        lat: resolved.lat,
        lng: resolved.lng,
        _locationResolvedBy: resolved.resolvedBy,
        _locationConfidence: resolved.confidence,
        _locationQueryUsed: resolved.queryUsed || "",
      };
    });
  }, [items, resolvedMap]);

  useEffect(() => {
    const unresolved = items.filter((item) => {
      if (!visibleIds?.has(item.id)) return false;
      if (item._optimistic) return false;
      if (hasCoords(item)) return false;
      const key = getCacheKey(item);
      if (resolvedMap[key]) return false;
      if (pendingRef.current.has(key)) return false;
      return Boolean(item?.name && (item?.citySlug || item?.city_slug));
    });

    if (!unresolved.length) return;

    unresolved.forEach((item) => pendingRef.current.add(getCacheKey(item)));
    setIsResolving(true);

    const controller = new AbortController();
    fetch(RESOLVE_LOCATION_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: unresolved.map((item) => ({
          id: item.id,
          name: item.name,
          area: item.area,
          citySlug: item.citySlug || item.city_slug,
          mapQuery: item.mapQuery || item.map_query,
          mapUrl: item.mapUrl || item.map_url,
          aliases: item.aliases || [],
          originalName: item.originalName || item.original_name,
        })),
      }),
      signal: controller.signal,
    })
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`resolve failed: ${res.status}`)))
      .then((payload) => {
        const next = {};
        for (const entry of Array.isArray(payload?.items) ? payload.items : []) {
          if (!entry?.id) continue;
          next[entry.id] = entry;
          pendingRef.current.delete(entry.id);
        }
        setResolvedMap((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {
        unresolved.forEach((item) => pendingRef.current.delete(getCacheKey(item)));
      })
      .finally(() => setIsResolving(false));

    return () => controller.abort();
  }, [items, visibleIds, resolvedMap]);

  return { resolvedItems, isResolving };
}
