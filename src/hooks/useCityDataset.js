import { useEffect, useMemo, useState } from "react";
import { BASE_URL } from "../config/theme.js";
import { fetchCityIndex, fetchCityIndexMeta, fetchCityDataset, cityIndexPath } from "../services/cityApi.js";

export function useCityDataset({ selectedCitySlug, selectedContentMode, reloadKey, setReloadKey, pendingRouteIds, setPendingRouteIds }) {
  const [cityIndex, setCityIndex] = useState([]);
  const [sources, setSources] = useState([]);
  const [loadedSpots, setLoadedSpots] = useState([]);
  const [loadedEvents, setLoadedEvents] = useState([]);
  const [globalStats, setGlobalStats] = useState({ spots: 0, events: 0 });
  const [baseArea, setBaseArea] = useState("");
  const [activeItemId, setActiveItemId] = useState(null);
  const [visibleItemIds, setVisibleItemIds] = useState(null);
  const [routeOrder, setRouteOrder] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const hasCitySelected = selectedCitySlug !== "unselected";
  const selectedCity = useMemo(() => cityIndex.find((c) => c.slug === selectedCitySlug) || null, [cityIndex, selectedCitySlug]);

  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const payload = await fetchCityIndex();
        if (!cancelled && payload.cities.length) setCityIndex(payload.cities);
        const meta = await fetchCityIndexMeta();
        if (!cancelled) setLastSyncedAt(meta);
      } catch {}
    }
    loadIndex();
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    fetch(`${BASE_URL}data/all.json`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setGlobalStats({
            spots: Array.isArray(data.spots) ? data.spots.length : 0,
            events: Array.isArray(data.events) ? data.events.length : 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCityData() {
      if (!hasCitySelected) {
        setLoadedSpots([]); setLoadedEvents([]); setSources([]);
        setActiveItemId(null); setBaseArea(""); setVisibleItemIds(null); setRouteOrder([]);
        return;
      }
      try {
        const payload = await fetchCityDataset(selectedCitySlug, cityIndex);
        if (cancelled) return;
        setLoadedSpots(payload.spots); setLoadedEvents(payload.events); setSources(payload.sources);
        setBaseArea(payload.spots[0]?.area || payload.events[0]?.area || payload.city.heroArea || "");
        setActiveItemId((selectedContentMode === "events" ? payload.events[0]?.id : payload.spots[0]?.id) || null);
        setVisibleItemIds(null); setRouteOrder([]);
      } catch {
        if (cancelled) return;
        setLoadedSpots([]); setLoadedEvents([]); setSources([]);
        setBaseArea(""); setActiveItemId(null); setVisibleItemIds(null); setRouteOrder([]);
      }
    }
    loadCityData();
    return () => { cancelled = true; };
  }, [selectedCitySlug, selectedContentMode, hasCitySelected, cityIndex, reloadKey]);

  useEffect(() => {
    if (!pendingRouteIds || !loadedSpots.length) return;
    const allIds = new Set([...loadedSpots, ...loadedEvents].map((i) => i.id));
    const validIds = pendingRouteIds.ids.filter((id) => allIds.has(id));
    setVisibleItemIds(validIds.length ? new Set(validIds) : null);
    if (pendingRouteIds.order) setRouteOrder(pendingRouteIds.order.filter((id) => allIds.has(id)));
    setPendingRouteIds(null);
  }, [pendingRouteIds, loadedSpots, loadedEvents, setPendingRouteIds]);

  async function handleManualSync() {
    setSyncing(true);
    try {
      const r = await fetch(cityIndexPath(), { cache: "no-store" });
      const data = await r.json();
      const newTime = data?.meta?.lastSyncedAt || null;
      if (newTime && newTime !== lastSyncedAt) {
        setLastSyncedAt(newTime);
        setReloadKey((v) => v + 1);
      }
    } catch {}
    setSyncing(false);
  }

  return {
    cityIndex,
    selectedCity,
    sources,
    loadedSpots,
    setLoadedSpots,
    loadedEvents,
    setLoadedEvents,
    globalStats,
    baseArea,
    setBaseArea,
    activeItemId,
    setActiveItemId,
    visibleItemIds,
    setVisibleItemIds,
    routeOrder,
    setRouteOrder,
    lastSyncedAt,
    syncing,
    handleManualSync,
  };
}
