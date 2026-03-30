import React, { useEffect, useMemo, useState } from "react";
import { BASE_URL, COLORS, CATEGORY_THEME, ANALYZE_API_PATH, CONFIRM_ANALYSIS_API_PATH, CONTENT_MODES, ANALYZE_TYPE_OPTIONS } from "./config/theme.js";
import { normalizeCitySlugValue, normalizeAnalysisPayload } from "./utils/normalize.js";
import { distanceScore, estimateTransport, buildRecommendation } from "./utils/geo.js";
import { formatEventWindow, prettyAnalysisKind } from "./utils/format.js";
import { fetchCityIndex, fetchCityIndexMeta, fetchCityDataset, cityIndexPath } from "./services/cityApi.js";
import { useResponsiveColumns } from "./hooks/useResponsiveColumns.js";
import { WriteOverlay } from "./components/WriteOverlay.jsx";
import { SyncStatusBar } from "./components/SyncStatusBar.jsx";
import { UrlAnalyzerPanel } from "./components/UrlAnalyzerPanel.jsx";
import { CitySection } from "./components/CitySection.jsx";
import { MapSection } from "./components/MapSection.jsx";
import { RoutePlannerSection } from "./components/RoutePlannerSection.jsx";

export default function App() {
  const isMobile = useResponsiveColumns();
  const [cityIndex, setCityIndex] = useState([]);
  const [selectedCitySlug, setSelectedCitySlug] = useState("unselected");
  const [selectedContentMode, setSelectedContentMode] = useState("spots");
  const [sources, setSources] = useState([]);
  const [loadedSpots, setLoadedSpots] = useState([]);
  const [loadedEvents, setLoadedEvents] = useState([]);
  const [globalStats, setGlobalStats] = useState({ spots: 0, events: 0 });
  const [submittedUrls, setSubmittedUrls] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("trt:submittedUrls") || "[]")); }
    catch { return new Set(); }
  });
  const [search, setSearch] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("下午");
  const [baseArea, setBaseArea] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 資料版本狀態
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // 分析流程狀態
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitTitle, setSubmitTitle] = useState("");
  const [submitType, setSubmitType] = useState("auto");
  const [submitCitySlug, setSubmitCitySlug] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [analysisPreview, setAnalysisPreview] = useState(null);
  const [submitStatus, setSubmitStatus] = useState({ kind: "idle", message: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [writeOverlay, setWriteOverlay] = useState({ status: "idle", dispatched: false, submittedItems: [], result: null });
  const [selectedAnalysisItemIds, setSelectedAnalysisItemIds] = useState(new Set());
  const [inputExpanded, setInputExpanded] = useState(false);
  const [showCitySources, setShowCitySources] = useState(false);
  const [visibleItemIds, setVisibleItemIds] = useState(null); // null = all visible
  const [routeOrder, setRouteOrder] = useState([]);
  const [dragSourceId, setDragSourceId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [savedRoutes, setSavedRoutes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("trt:routes") || "[]"); } catch { return []; }
  });
  const [newRouteName, setNewRouteName] = useState("");
  const [showSavedRoutes, setShowSavedRoutes] = useState(false);
  const [pendingRouteIds, setPendingRouteIds] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [mapViewTab, setMapViewTab] = useState("list");

  const hasCitySelected = selectedCitySlug !== "unselected";

  // iPhone Web Share Target + 行程分享還原
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("url") || params.get("text");
    if (shared && /^https?:\/\//i.test(shared)) {
      setSubmitUrl(shared);
      setInputExpanded(true);
    }
    const cityParam = params.get("city");
    const spotsParam = params.get("spots");
    const orderParam = params.get("order");
    if (cityParam) {
      setSelectedCitySlug(cityParam);
      if (spotsParam) setPendingRouteIds({ ids: spotsParam.split(","), order: orderParam ? orderParam.split(",") : null });
    }
  }, []);

  // 載入城市索引
  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const payload = await fetchCityIndex();
        if (!cancelled && payload.cities.length) setCityIndex(payload.cities);
        const meta = await fetchCityIndexMeta();
        if (!cancelled) setLastSyncedAt(meta);
      } catch {
        // 載入失敗時保持空陣列，不用 seed 資料
      }
    }
    loadIndex();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // 載入全域統計
  useEffect(() => {
    fetch(`${BASE_URL}data/all.json`, { headers: { Accept: "application/json" } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setGlobalStats({
          spots: Array.isArray(data.spots) ? data.spots.length : 0,
          events: Array.isArray(data.events) ? data.events.length : 0,
        });
      })
      .catch(() => {});
  }, []);

  // 載入城市資料
  useEffect(() => {
    let cancelled = false;
    async function loadCityData() {
      if (!hasCitySelected) {
        setLoadedSpots([]); setLoadedEvents([]); setSources([]);
        setActiveItemId(null); setBaseArea(""); setSelectedCategories([]);
        setVisibleItemIds(null); setRouteOrder([]);
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
        setBaseArea(""); setActiveItemId(null);
        setVisibleItemIds(null); setRouteOrder([]);
      }
    }
    loadCityData();
    return () => { cancelled = true; };
  }, [selectedCitySlug, selectedContentMode, hasCitySelected, cityIndex, reloadKey]);

  // 分析預覽變更時初始化全選
  useEffect(() => {
    if (analysisPreview?.items?.length) {
      setSelectedAnalysisItemIds(new Set(analysisPreview.items.map((i) => i.id)));
    } else {
      setSelectedAnalysisItemIds(new Set());
    }
  }, [analysisPreview]);

  // 套用分享行程的待處理 IDs
  useEffect(() => {
    if (!pendingRouteIds || !loadedSpots.length) return;
    const allIds = new Set([...loadedSpots, ...loadedEvents].map((i) => i.id));
    const validIds = pendingRouteIds.ids.filter((id) => allIds.has(id));
    setVisibleItemIds(validIds.length ? new Set(validIds) : null);
    if (pendingRouteIds.order) setRouteOrder(pendingRouteIds.order.filter((id) => allIds.has(id)));
    setPendingRouteIds(null);
  }, [pendingRouteIds, loadedSpots, loadedEvents]);

  const selectedCity = useMemo(() => cityIndex.find((c) => c.slug === selectedCitySlug) || null, [cityIndex, selectedCitySlug]);
  const allAreas = useMemo(() => [...new Set((selectedContentMode === "events" ? loadedEvents : loadedSpots).map((i) => i.area).filter(Boolean))], [loadedEvents, loadedSpots, selectedContentMode]);
  const allCategories = useMemo(() => [...new Set((selectedContentMode === "events" ? loadedEvents : loadedSpots).map((i) => i.category).filter(Boolean))], [loadedEvents, loadedSpots, selectedContentMode]);

  const filteredSpots = useMemo(() => loadedSpots.filter((s) => {
    const cat = selectedCategories.length === 0 || selectedCategories.includes(s.category);
    const srch = !search.trim() || `${s.name} ${s.description} ${s.tags.join(" ")} ${s.area}`.toLowerCase().includes(search.toLowerCase());
    return cat && srch;
  }), [loadedSpots, selectedCategories, search]);

  const filteredEvents = useMemo(() => loadedEvents.filter((e) => {
    const cat = selectedCategories.length === 0 || selectedCategories.includes(e.category);
    const srch = !search.trim() || `${e.name} ${e.description} ${e.tags.join(" ")} ${e.area}`.toLowerCase().includes(search.toLowerCase());
    return cat && srch;
  }), [loadedEvents, selectedCategories, search]);

  const activeCollection = selectedContentMode === "all"
    ? [
        ...(filteredSpots.length ? filteredSpots : loadedSpots),
        ...(filteredEvents.length ? filteredEvents : loadedEvents),
      ]
    : selectedContentMode === "events"
      ? (filteredEvents.length ? filteredEvents : loadedEvents)
      : (filteredSpots.length ? filteredSpots : loadedSpots);


  const effectiveVisibleIds = useMemo(() => {
    if (visibleItemIds === null) return new Set(activeCollection.map((i) => i.id));
    return visibleItemIds;
  }, [visibleItemIds, activeCollection]);

  const visibleItems = useMemo(() =>
    activeCollection.filter((i) => effectiveVisibleIds.has(i.id)),
    [activeCollection, effectiveVisibleIds]
  );

  const routeItems = useMemo(() => {
    const base = selectedContentMode === "events"
      ? visibleItems
      : [...visibleItems].sort((a, b) => distanceScore(b, baseArea, timeOfDay) - distanceScore(a, baseArea, timeOfDay));
    let ordered;
    if (!routeOrder.length) {
      ordered = base;
    } else {
      const itemMap = new Map(visibleItems.map((i) => [i.id, i]));
      const inOrder = routeOrder.filter((id) => itemMap.has(id)).map((id) => itemMap.get(id));
      const remaining = base.filter((i) => !new Set(routeOrder).has(i.id));
      ordered = [...inOrder, ...remaining];
    }
    const reasonMap = new Map();
    if (selectedContentMode === "spots") {
      buildRecommendation(visibleItems, baseArea, timeOfDay).forEach((item) => {
        reasonMap.set(item.id, item.reason);
      });
    }
    return ordered.map((item, i) => ({ ...item, order: i + 1, reason: reasonMap.get(item.id) || "" }));
  }, [routeOrder, visibleItems, selectedContentMode, baseArea, timeOfDay]);

  function toggleCategory(cat) {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  function toggleItemVisible(id) {
    setVisibleItemIds((prev) => {
      const base = prev ?? new Set(activeCollection.map((i) => i.id));
      const next = new Set(base);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function setAllVisible(on) {
    if (on) setVisibleItemIds(null);
    else setVisibleItemIds(new Set());
  }

  function handleDragStart(e, id) {
    setDragSourceId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, id) {
    e.preventDefault();
    setDragOverId(id);
  }

  function handleDrop(e, targetId) {
    e.preventDefault();
    if (!dragSourceId || dragSourceId === targetId) { setDragSourceId(null); setDragOverId(null); return; }
    const base = routeOrder.length ? routeOrder : routeItems.map((i) => i.id);
    const arr = [...base];
    const from = arr.indexOf(dragSourceId);
    const to = arr.indexOf(targetId);
    if (from === -1 && to !== -1) { arr.splice(to, 0, dragSourceId); }
    else if (from !== -1 && to !== -1) { arr.splice(from, 1); arr.splice(arr.indexOf(targetId), 0, dragSourceId); }
    setRouteOrder(arr);
    setDragSourceId(null); setDragOverId(null);
  }

  function handleSaveRoute() {
    if (!newRouteName.trim() || !hasCitySelected || !routeItems.length) return;
    const route = {
      id: Date.now().toString(),
      name: newRouteName.trim(),
      citySlug: selectedCitySlug,
      mode: selectedContentMode,
      itemIds: routeItems.map((i) => i.id),
      order: routeItems.map((i) => i.id),
      createdAt: new Date().toISOString(),
    };
    const updated = [route, ...savedRoutes].slice(0, 20);
    localStorage.setItem("trt:routes", JSON.stringify(updated));
    setSavedRoutes(updated); setNewRouteName("");
  }

  function handleLoadRoute(route) {
    setSelectedCitySlug(route.citySlug);
    setSelectedContentMode(route.mode || "spots");
    setPendingRouteIds({ ids: route.itemIds, order: route.order });
    setShowSavedRoutes(false);
  }

  async function handleCopyShare() {
    const url = new URL(window.location.href);
    url.searchParams.set("city", selectedCitySlug);
    url.searchParams.set("spots", routeItems.map((i) => i.id).join(","));
    const order = routeOrder.join(",");
    if (order) url.searchParams.set("order", order);
    const shareUrl = url.toString();
    try { await navigator.clipboard.writeText(shareUrl); alert("🔗 連結已複製到剪貼簿！"); }
    catch { window.prompt("複製以下連結：", shareUrl); }
  }

  function handleGetLocation() {
    if (!navigator.geolocation) { alert("您的瀏覽器不支援定位功能。"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { alert("無法取得定位，請確認已允許位置權限。"); setLocating(false); }
    );
  }

  // 手動更新資料
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

  // 分析流程
  async function handleAnalyzeUrl(e) {
    e.preventDefault();
    const cleanUrl = submitUrl.trim();
    if (!cleanUrl) { setSubmitStatus({ kind: "error", message: "請先貼上 Reel 或網址。" }); return; }
    setIsAnalyzing(true);
    setAnalysisPreview(null);
    setSubmitStatus({ kind: "loading", message: "正在分析網址內容，完成後會先顯示給你確認。" });
    try {
      const response = await fetch(ANALYZE_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanUrl,
          hints: {
            title: submitTitle.trim(),
            type: submitType === "auto" ? "" : submitType,
            citySlug: normalizeCitySlugValue(submitCitySlug),
            notes: submitNotes.trim(),
          },
        }),
      });
      const text = await response.text();
      let payload = {};
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
      if (!response.ok) throw new Error(payload?.message || `分析失敗，HTTP ${response.status}`);
      const preview = normalizeAnalysisPayload(payload, {
        sourceTitle: submitTitle.trim(),
        contentKind: submitType === "auto" ? "source_only" : submitType,
        citySlug: submitCitySlug,
      });
      setAnalysisPreview(preview);
      setSubmitStatus({ kind: "success", message: "分析完成。請先檢查下方結果，確認無誤後再寫入資料庫。" });
    } catch (error) {
      setSubmitStatus({ kind: "error", message: error instanceof Error ? error.message : "分析失敗。" });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleConfirmAnalysis() {
    if (!analysisPreview) { setSubmitStatus({ kind: "error", message: "目前沒有可確認寫入的分析結果。" }); return; }
    if (!analysisPreview.citySlug) { setSubmitStatus({ kind: "error", message: "請先確認城市（citySlug 不可為空），再寫入資料庫。" }); return; }
    const selectedItems = analysisPreview.items.filter((i) => selectedAnalysisItemIds.has(i.id));
    if (selectedItems.length === 0 && analysisPreview.contentKind !== "source_only") {
      setSubmitStatus({ kind: "error", message: "請至少選取一個項目後再寫入。" }); return;
    }
    const previewToSubmit = { ...analysisPreview, items: selectedItems.map((i) => ({ ...i, citySlug: analysisPreview.citySlug })) };
    setIsConfirming(true);
    setWriteOverlay({ status: "writing", dispatched: false, submittedItems: selectedItems, result: null });
    setSubmitStatus({ kind: "loading", message: "正在確認並寫入資料庫…" });
    try {
      const response = await fetch(CONFIRM_ANALYSIS_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: submitUrl.trim(),
          sourceTitle: submitTitle.trim() || analysisPreview.sourceTitle,
          notes: submitNotes.trim(),
          analysis: previewToSubmit,
        }),
      });
      const text = await response.text();
      let payload = {};
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
      if (!response.ok) {
        setWriteOverlay({ status: "idle", dispatched: false, submittedItems: [], result: null });
        throw new Error(payload?.message || `寫入失敗，HTTP ${response.status}`);
      }
      const confirmedUrl = submitUrl.trim();
      if (confirmedUrl) {
        setSubmittedUrls((prev) => {
          const next = new Set(prev);
          next.add(confirmedUrl);
          try { localStorage.setItem("trt:submittedUrls", JSON.stringify([...next])); } catch {}
          return next;
        });
      }
      setWriteOverlay({ status: "syncing", dispatched: Boolean(payload.dispatched), submittedItems: selectedItems, result: payload });
      setInputExpanded(false);
      setSubmitUrl(""); setSubmitTitle(""); setSubmitType("auto"); setSubmitCitySlug(""); setSubmitNotes("");
      setAnalysisPreview(null);
      setSubmitStatus({ kind: "idle", message: "" });
    } catch (error) {
      setSubmitStatus({ kind: "error", message: error instanceof Error ? error.message : "寫入失敗。" });
    } finally {
      setIsConfirming(false);
    }
  }

  const submitStatusStyle = submitStatus.kind === "success"
    ? { background: COLORS.successBg, color: COLORS.successText }
    : submitStatus.kind === "error"
      ? { background: COLORS.errorBg, color: COLORS.errorText }
      : { background: COLORS.infoBg, color: COLORS.infoText };

  const isDuplicateUrl = Boolean(submitUrl.trim() && submittedUrls.has(submitUrl.trim()));
  const shouldShowInput = inputExpanded || Boolean(submitUrl || analysisPreview);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.pageBg, color: COLORS.text, fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      <WriteOverlay
        status={writeOverlay.status}
        dispatched={writeOverlay.dispatched}
        submittedItems={writeOverlay.submittedItems}
        result={writeOverlay.result}
        onClose={() => { setWriteOverlay({ status: "idle", dispatched: false, submittedItems: [], result: null }); setReloadKey((v) => v + 1); }}
        onReload={() => window.location.reload()}
      />

      <SyncStatusBar
        lastSyncedAt={lastSyncedAt}
        syncing={syncing}
        onSync={handleManualSync}
      />

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? 16 : 28, paddingTop: 64 }}>

        {/* 頁面標題列 */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 900, letterSpacing: "-0.5px" }}>
              Travel Reels
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: COLORS.subtext }}>
              從 Reels 收集靈感，規劃你的旅行行程
            </p>
          </div>
          {(globalStats.spots > 0 || globalStats.events > 0) && (
            <div style={{ display: "flex", gap: 12, fontSize: 13, color: COLORS.subtext }}>
              <span>🗺 {globalStats.spots} 個景點</span>
              <span>🎫 {globalStats.events} 個活動</span>
            </div>
          )}
        </div>

        {/* 浮動貼網址入口 */}
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 1000, maxWidth: isMobile ? "calc(100vw - 48px)" : 420 }}>
          <UrlAnalyzerPanel
            isMobile={isMobile}
            cityIndex={cityIndex}
            submitUrl={submitUrl} setSubmitUrl={setSubmitUrl}
            submitTitle={submitTitle} setSubmitTitle={setSubmitTitle}
            submitType={submitType} setSubmitType={setSubmitType}
            submitCitySlug={submitCitySlug} setSubmitCitySlug={setSubmitCitySlug}
            submitNotes={submitNotes} setSubmitNotes={setSubmitNotes}
            analysisPreview={analysisPreview} setAnalysisPreview={setAnalysisPreview}
            submitStatus={submitStatus} setSubmitStatus={setSubmitStatus}
            isAnalyzing={isAnalyzing} isConfirming={isConfirming}
            isDuplicateUrl={isDuplicateUrl}
            shouldShowInput={shouldShowInput}
            submitStatusStyle={submitStatusStyle}
            onAnalyze={handleAnalyzeUrl}
            onConfirm={handleConfirmAnalysis}
            onClose={{ open: () => setInputExpanded(true), close: () => { setInputExpanded(false); setAnalysisPreview(null); setSubmitStatus({ kind: "idle", message: "" }); } }}
            selectedItems={[...selectedAnalysisItemIds]} setSelectedItems={(updater) => setSelectedAnalysisItemIds((prev) => new Set(typeof updater === "function" ? updater([...prev]) : updater))}
          />
        </div>

        {/* 主內容 */}
        <div style={{ display: "grid", gap: 20 }}>
          <CitySection
            isMobile={isMobile}
            cityIndex={cityIndex}
            selectedCitySlug={selectedCitySlug}
            hasCitySelected={hasCitySelected}
            loadedSpots={loadedSpots}
            loadedEvents={loadedEvents}
            sources={sources}
            showCitySources={showCitySources}
            setSelectedCitySlug={setSelectedCitySlug}
            setShowCitySources={setShowCitySources}
          />

          <MapSection
            isMobile={isMobile}
            selectedCity={selectedCity}
            hasCitySelected={hasCitySelected}
            cityIndex={cityIndex}
            selectedCitySlug={selectedCitySlug}
            setSelectedCitySlug={setSelectedCitySlug}
            search={search} setSearch={setSearch}
            selectedContentMode={selectedContentMode}
            setSelectedContentMode={setSelectedContentMode}
            allCategories={allCategories}
            selectedCategories={selectedCategories}
            toggleCategory={toggleCategory}
            mapViewTab={mapViewTab} setMapViewTab={setMapViewTab}
            activeCollection={activeCollection}
            activeItemId={activeItemId} setActiveItemId={setActiveItemId}
            effectiveVisibleIds={effectiveVisibleIds}
            visibleItems={visibleItems}
            toggleItemVisible={toggleItemVisible}
            setAllVisible={setAllVisible}
            loadedSpots={loadedSpots}
            loadedEvents={loadedEvents}
          />

          <RoutePlannerSection
            isMobile={isMobile}
            hasCitySelected={hasCitySelected}
            routeItems={routeItems}
            allAreas={allAreas}
            timeOfDay={timeOfDay} setTimeOfDay={setTimeOfDay}
            baseArea={baseArea} setBaseArea={setBaseArea}
            dragSourceId={dragSourceId} dragOverId={dragOverId}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            setDragSourceId={setDragSourceId}
            setDragOverId={setDragOverId}
            userLocation={userLocation}
            setUserLocation={setUserLocation}
            locating={locating}
            handleGetLocation={handleGetLocation}
            newRouteName={newRouteName} setNewRouteName={setNewRouteName}
            savedRoutes={savedRoutes}
            showSavedRoutes={showSavedRoutes} setShowSavedRoutes={setShowSavedRoutes}
            handleSaveRoute={handleSaveRoute}
            handleCopyShare={handleCopyShare}
            handleLoadRoute={handleLoadRoute}
          />
        </div>
      </div>
    </div>
  );
}
