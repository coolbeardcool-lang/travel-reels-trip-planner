import React, { useEffect, useMemo, useState } from "react";
import { COLORS, Z } from "./config/theme.js";
import { distanceScore, buildRecommendation, nearbyItems } from "./utils/geo.js";
import { useResponsiveColumns } from "./hooks/useResponsiveColumns.js";
import { useAnalysisWorkflow } from "./hooks/useAnalysisWorkflow.js";
import { useCityDataset } from "./hooks/useCityDataset.js";
import { useRoutePlanner } from "./hooks/useRoutePlanner.js";
import { WriteOverlay } from "./components/WriteOverlay.jsx";
import { SyncStatusBar } from "./components/SyncStatusBar.jsx";
import { UrlAnalyzerPanel } from "./components/UrlAnalyzerPanel.jsx";
import { CitySection } from "./components/CitySection.jsx";
import { MapSection } from "./components/MapSection.jsx";
import { RoutePlannerSection } from "./components/RoutePlannerSection.jsx";

export default function App() {
  const isMobile = useResponsiveColumns();
  const [selectedCitySlug, setSelectedCitySlug] = useState("unselected");
  const [selectedContentMode, setSelectedContentMode] = useState("spots");
  const [search, setSearch] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("下午");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [showCitySources, setShowCitySources] = useState(false);
  const [pendingRouteIds, setPendingRouteIds] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [mapViewTab, setMapViewTab] = useState("list");
  const [nearbyMode, setNearbyMode] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(2);

  const hasCitySelected = selectedCitySlug !== "unselected";

  const {
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
  } = useCityDataset({
    selectedCitySlug,
    selectedContentMode,
    reloadKey,
    setReloadKey,
    pendingRouteIds,
    setPendingRouteIds,
  });

  const {
    submitUrl, setSubmitUrl,
    submitTitle, setSubmitTitle,
    submitType, setSubmitType,
    submitCitySlug, setSubmitCitySlug,
    submitNotes, setSubmitNotes,
    analysisPreview, setAnalysisPreview,
    submitStatus, setSubmitStatus,
    isAnalyzing, isConfirming,
    writeOverlay, setWriteOverlay,
    selectedAnalysisItemIds, setSelectedAnalysisItemIds,
    inputExpanded, setInputExpanded,
    clipboardPrompt, setClipboardPrompt,
    urlQueue,
    isDuplicateUrl,
    shouldShowInput,
    resetSubmitForm,
    handleAnalyzeUrl,
    handleConfirmAnalysis,
    handleSaveToQueue,
    handleRemoveFromQueue,
    handleLoadFromQueue,
  } = useAnalysisWorkflow({
    selectedCitySlug,
    selectedCity,
    setLoadedSpots,
    setLoadedEvents,
  });

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
      if (spotsParam) {
        setPendingRouteIds({ ids: spotsParam.split(","), order: orderParam ? orderParam.split(",") : null });
      }
    }
  }, [setSubmitUrl, setInputExpanded]);

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
    ? [...(filteredSpots.length ? filteredSpots : loadedSpots), ...(filteredEvents.length ? filteredEvents : loadedEvents)]
    : selectedContentMode === "events"
      ? (filteredEvents.length ? filteredEvents : loadedEvents)
      : (filteredSpots.length ? filteredSpots : loadedSpots);

  const nearbyResults = useMemo(() => {
    if (!nearbyMode || !userLocation) return null;
    return nearbyItems(activeCollection, userLocation, nearbyRadius);
  }, [nearbyMode, userLocation, activeCollection, nearbyRadius]);

  const effectiveCollection = nearbyResults || activeCollection;

  const effectiveVisibleIds = useMemo(() => {
    if (visibleItemIds === null) return new Set(effectiveCollection.map((i) => i.id));
    return visibleItemIds;
  }, [visibleItemIds, effectiveCollection]);

  const visibleItems = useMemo(() => effectiveCollection.filter((i) => effectiveVisibleIds.has(i.id)), [effectiveCollection, effectiveVisibleIds]);

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

  const {
    dragSourceId,
    dragOverId,
    setDragSourceId,
    setDragOverId,
    savedRoutes,
    newRouteName,
    setNewRouteName,
    showSavedRoutes,
    setShowSavedRoutes,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSaveRoute,
    handleLoadRoute,
    handleCopyShare,
  } = useRoutePlanner({
    hasCitySelected,
    selectedCitySlug,
    setSelectedCitySlug,
    selectedContentMode,
    setSelectedContentMode,
    routeItems,
    routeOrder,
    setRouteOrder,
    setPendingRouteIds,
  });

  function toggleCategory(cat) {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }

  function toggleItemVisible(id) {
    setVisibleItemIds((prev) => {
      const base = prev ?? new Set(effectiveCollection.map((i) => i.id));
      const next = new Set(base);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function setAllVisible(on) {
    if (on) setVisibleItemIds(null);
    else setVisibleItemIds(new Set());
  }

  function handleGetLocation() {
    if (!navigator.geolocation) { alert("您的瀏覽器不支援定位功能。"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { alert("無法取得定位，請確認已允許位置權限。"); setLocating(false); }
    );
  }

  const submitStatusStyle = submitStatus.kind === "success"
    ? { background: COLORS.successBg, color: COLORS.successText }
    : submitStatus.kind === "error"
      ? { background: COLORS.errorBg, color: COLORS.errorText }
      : { background: COLORS.infoBg, color: COLORS.infoText };

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
        <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 26 : 34, fontWeight: 900, letterSpacing: "-0.5px" }}>Travel Reels</h1>
            <p style={{ margin: "6px 0 0", fontSize: 14, color: COLORS.subtext }}>從 Reels 收集靈感，規劃你的旅行行程</p>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 13, color: COLORS.subtext, alignItems: "center", flexWrap: "wrap" }}>
            {(globalStats.spots > 0 || globalStats.events > 0) && (
              <>
                <span>🗺 {globalStats.spots} 個景點</span>
                <span>🎫 {globalStats.events} 個活動</span>
              </>
            )}
            <a href="/ios-shortcut-setup.html" target="_blank" rel="noreferrer" style={{ fontSize: 12, color: COLORS.subtext, textDecoration: "none", opacity: 0.7 }}>iPhone 捷徑設定</a>
          </div>
        </div>

        {clipboardPrompt && !inputExpanded && !submitUrl && (
          <div style={{ position: "fixed", bottom: 80, right: 24, zIndex: Z.floatingPanel + 1, maxWidth: isMobile ? "calc(100vw - 48px)" : 380, background: COLORS.card, borderRadius: 18, padding: "14px 18px", boxShadow: "0 8px 28px rgba(0,0,0,0.18)", border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>偵測到社群連結</div>
            <div style={{ fontSize: 12, color: COLORS.subtext, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 10 }}>{clipboardPrompt}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => { setSubmitUrl(clipboardPrompt); setInputExpanded(true); setClipboardPrompt(null); }} style={{ flex: 1, padding: "8px 12px", borderRadius: 12, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>分析此連結</button>
              <button type="button" onClick={() => setClipboardPrompt(null)} style={{ padding: "8px 12px", borderRadius: 12, border: `1px solid ${COLORS.border}`, background: "#fff", fontSize: 13, cursor: "pointer" }}>忽略</button>
            </div>
          </div>
        )}

        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: Z.floatingPanel, maxWidth: isMobile ? "calc(100vw - 48px)" : 420 }}>
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
            onClose={{ open: () => setInputExpanded(true), close: resetSubmitForm }}
            selectedItems={[...selectedAnalysisItemIds]}
            setSelectedItems={(updater) => setSelectedAnalysisItemIds((prev) => new Set(typeof updater === "function" ? updater([...prev]) : updater))}
            urlQueue={urlQueue}
            onSaveToQueue={handleSaveToQueue}
            onRemoveFromQueue={handleRemoveFromQueue}
            onLoadFromQueue={handleLoadFromQueue}
          />
        </div>

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
            activeCollection={effectiveCollection}
            activeItemId={activeItemId} setActiveItemId={setActiveItemId}
            effectiveVisibleIds={effectiveVisibleIds}
            visibleItems={visibleItems}
            toggleItemVisible={toggleItemVisible}
            setAllVisible={setAllVisible}
            loadedSpots={loadedSpots}
            loadedEvents={loadedEvents}
            nearbyMode={nearbyMode} setNearbyMode={setNearbyMode}
            nearbyRadius={nearbyRadius} setNearbyRadius={setNearbyRadius}
            userLocation={userLocation}
            locating={locating}
            handleGetLocation={handleGetLocation}
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
