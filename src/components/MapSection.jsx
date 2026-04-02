import React from "react";
import { COLORS, CATEGORY_THEME, CONTENT_MODES, Z } from "../config/theme.js";
import { chipStyle } from "./ui/chipStyle.js";
import { SectionCard } from "./ui/SectionCard.jsx";
import { LeafletMap } from "./LeafletMap.jsx";
import { formatEventWindow } from "../utils/format.js";
import { useResolvedLocations } from "../hooks/useResolvedLocations.js";

function hasCoords(item) {
  return Number.isFinite(item?.lat) && Number.isFinite(item?.lng) && item.lat !== 0 && item.lng !== 0;
}

function locationBadge(item) {
  if (item._locationResolvedBy === "geocode-cache") {
    return { label: "📡 動態定位", bg: "#fef9c3", color: "#92400e" };
  }
  if (item._locationResolvedBy === "city-fallback") {
    return { label: "🏙️ 城市中心", bg: "#e0e7ff", color: "#3730a3" };
  }
  return null;
}

export function MapSection({
  isMobile, selectedCity, hasCitySelected,
  cityIndex, selectedCitySlug, setSelectedCitySlug,
  search, setSearch,
  selectedContentMode, setSelectedContentMode,
  allCategories, selectedCategories, toggleCategory,
  mapViewTab, setMapViewTab,
  activeCollection, activeItemId, setActiveItemId,
  effectiveVisibleIds, visibleItems,
  toggleItemVisible, setAllVisible,
  loadedSpots, loadedEvents,
  nearbyMode, setNearbyMode,
  nearbyRadius, setNearbyRadius,
  userLocation, locating, handleGetLocation,
}) {
  const { resolvedItems, isResolving } = useResolvedLocations({
    items: activeCollection,
    visibleIds: effectiveVisibleIds,
  });

  const resolvedItemMap = React.useMemo(
    () => new Map(resolvedItems.map((item) => [item.id, item])),
    [resolvedItems]
  );

  const detailItems = React.useMemo(
    () => visibleItems.map((item) => resolvedItemMap.get(item.id) || item),
    [visibleItems, resolvedItemMap]
  );

  return (
    <SectionCard
      title={selectedCity ? `${selectedCity.label} 旅遊地圖` : "城市地傖"}
      right={
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋景點、活動、地區"
            style={{ minWidth: 180, borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }}
            disabled={!hasCitySelected} />
          <select value={selectedCitySlug} onChange={(e) => setSelectedCitySlug(e.target.value)}
            style={{ borderRadius: 14, border: `1px solid ${COLORS.border}`, padding: "10px 12px", outline: "none" }}>
            <option value="unselected">請先選擇城市</option>
            {cityIndex.map((city) => <option key={city.slug} value={city.slug}>{city.label}</option>)}
            <option value="all">全部城市</option>
          </select>
        </div>
      }
    >
      <div style={{ marginBottom: 16, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {CONTENT_MODES.map((mode) => {
            const active = selectedContentMode === mode;
            const label = mode === "all"
              ? `全部 (${loadedSpots.length + loadedEvents.length})`
              : mode === "spots" ? `景點 (${loadedSpots.length})` : `活動 (${loadedEvents.length})`;
            return (
              <button key={mode} type="button" onClick={() => setSelectedContentMode(mode)}
                style={{ borderRadius: 999, padding: "10px 14px", border: `1px solid ${active ? COLORS.primary : COLORS.border}`, background: active ? COLORS.primary : "#ffffff", color: active ? "#ffffff" : COLORS.text, cursor: "pointer", fontWeight: 700 }}>
                {label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {allCategories.map((cat) => {
            const active = selectedCategories.includes(cat);
            const theme = CATEGORY_THEME[cat] || { bg: COLORS.primarySoft, color: COLORS.text };
            return (
              <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                style={{ ...chipStyle(cat), background: active ? theme.bg : "#ffffff", color: active ? theme.color : COLORS.subtext, border: `1px solid ${active ? theme.bg : COLORS.border}`, cursor: "pointer" }}>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {hasCitySelected && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <button type="button"
            onClick={() => {
              if (!nearbyMode && !userLocation) handleGetLocation();
              setNearbyMode((v) => !v);
            }}
            disabled={locating}
            style={{ borderRadius: 999, padding: "8px 16px", border: `1px solid ${nearbyMode ? COLORS.primary : COLORS.border}`, background: nearbyMode ? COLORS.primary : "#fff", color: nearbyMode ? "#fff" : COLORS.text, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            {locating ? "定位中…" : nearbyMode ? "關閉附近模式" : "我在這裡"}
          </button>
          {nearbyMode && (
            <>
              <select value={nearbyRadius} onChange={(e) => setNearbyRadius(Number(e.target.value))}
                style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "6px 10px", fontSize: 12 }}>
                <option value={0.5}>500m 內</option>
                <option value={1}>1km 內</option>
                <option value={2}>2km 內</option>
                <option value={5}>5km 內</option>
              </select>
              <span style={{ fontSize: 12, color: COLORS.subtext }}>
                找到 {activeCollection.length} 個{activeCollection.length > 0 && activeCollection[0]?.distanceKm != null ? "景點" : "結果"}
              </span>
            </>
          )}
        </div>
      )}

      {hasCitySelected ? (
        <div>
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {isMobile && (
              <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
                {["list", "map"].map((tab) => (
                  <button key={tab} type="button" onClick={() => setMapViewTab(tab)}
                    style={{ padding: "6px 16px", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", background: mapViewTab === tab ? COLORS.primary : "#fff", color: mapViewTab === tab ? "#fff" : COLORS.text }}>
                    {tab === "list" ? "清單" : "地圖"}
                  </button>
                ))}
              </div>
            )}
            <span style={{ fontSize: 13, color: COLORS.subtext }}>在地圖上標示：</span>
            <button type="button" onClick={() => setAllVisible(true)}
              style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", cursor: "pointer", fontWeight: 600 }}>全選</button>
            <button type="button" onClick={() => setAllVisible(false)}
              style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", cursor: "pointer", fontWeight: 600 }}>全取消</button>
            <span style={{ fontSize: 12, color: COLORS.subtext }}>已選 {effectiveVisibleIds.size} / {activeCollection.length}</span>
            {isResolving && (
              <span style={{ fontSize: 12, color: COLORS.infoText, background: COLORS.infoBg, borderRadius: 999, padding: "4px 10px", fontWeight: 600 }}>
                正在解析地址…
              </span>
            )}
          </div

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr", borderRadius: 20, overflow: "hidden", border: `1px solid ${COLORS.border}`, height: 460 }}>
            <div style={{ overflowY: "auto", height: 460, borderRight: isMobile ? "none" : `1px solid ${COLORS.border}`, display: isMobile && mapViewTab === "map" ? "none" : "block" }}>
              {resolvedItems.length ? resolvedItems.map((item) => {
                const active = activeItemId === item.id;
                const checked = effectiveVisibleIds.has(item.id);
                return (
                  <div key={item.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}`, background: active ? COLORS.primarySoft : "#fff", cursor: "pointer" }}
                    onClick={() => setActiveItemId(item.id)}>
                    <input type="checkbox" checked={checked}
                      onChange={(e) => { e.stopPropagation(); toggleItemVisible(item.id); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer", width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ fontSize: 20, flexShrink: 0, opacity: item._optimistic ? 0.5 : 1 }}>{item.thumbnail}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: active ? 800 : 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: active ? COLORS.primary : checked ? COLORS.text : COLORS.subtext }}>
                        {item.name}{item._optimistic && <span style={{ marginLeft: 4, fontSize: 10, color: COLORS.subtext, fontWeight: 400 }}>同正中</span>}
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.subtext }}>
                        {item.area}{item.distanceKm != null && <span style={{ marginLeft: 4 }}>({item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)}m` : `${item.distanceKm.toFixed(1)}km`})</span>}
                      </div>
                    </div>
                  </div>
                );
              }) : <div style={{ padding: 16, fontSize: 13, color: COLORS.subtext }}>目前無訳亖</div>}
            </div>
            <div style={{ height: 460, position: "relative", display: isMobile && mapViewTab === "list" ? "none" : "block" }}>
              {(() => {
                const visibleWithCoords = resolvedItems.filter((i) => effectiveVisibleIds.has(i.id) && hasCoords(i)).length;
                const hasVisible = effectiveVisibleIds.size > 0;
                if (activeCollection.length === 0) {
                  return (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: COLORS.cardMuted, zIndex: Z.mapOverlay, borderRadius: 0 }}>
                      <div style={{ fontSize: 32 }}>🗮���</div>
                      <div style={{ marginTop: 8, fontWeight: 700, color: COLORS.text }}>尚無景點賄料</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: COLORS.subtext }}>先貼綐址分析並寯入，景點就會出現在地圖上。</div>
                    </div>
                  );
                }
                if (hasVisible && visibleWithCoords === 0 && isResolving) {
                  return (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(239,246,255,0.92)", zIndex: Z.mapOverlay, borderRadius: 0 }}>
                      <div style={{ fontSize: 32 }}>📡</div>
                      <div style={{ marginTop: 8, fontWeight: 700, color: COLORS.infoText }}>正在解析地址…</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: COLORS.subtext, textAlign: "center", maxWidth: 220 }}>系統會用店名、區域(��城市即偂解析位置，不回寪主寃料。</div>
                    </div>
                  );
                }
                return null;
              })()}
              <LeafletMap
                items={resolvedItems}
                visibleIds={effectiveVisibleIds}
                activeItemId={activeItemId}
                onSelectItem={setActiveItemId}
              />
            </div>
          </div>

          {detailItems.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.subtext, marginBottom: 10 }}>
                已選景點詣情（{detailItems.length} 筆）
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)" }}>
                {detailItems.map((item) => {
                  const badge = locationBadge(item);
                  return (
                    <div key={item.id}
                      style={{ border: `1px solid ${activeItemId === item.id ? COLORS.primary : COLORS.border}`, borderRadius: 20, background: COLORS.card, padding: 16, cursor: "pointer" }}
                      onClick={() => setActiveItemId(item.id)}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ fontSize: 32 }}>{item.thumbnail}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                            <span style={chipStyle(item.category)}>{item.category}</span>
                            <span style={{ borderRadius: 999, border: `1px solid ${COLORS.border}`, padding: "4px 8px", fontSize: 11 }}>{item.bestTime}</span>
                            {item._optimistic ? (
                              <span style={{ borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 600, background: "#e0f2fe", color: "#0369a1" }}>
                                住步中
                            </span>
                            ) : item.confidence && (
                              <span style={{ borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 600, background: item.confidence === "已確認" ? "#dcfce7" : "#fef9c3", color: item.confidence === "已確認" ? "#15803d" : "#92400e" }}>
                                {item.confidence === "已確認" ? "🟢 已確認" : "🟡 推定"}
                              </span>
                            )}
                            {badge && (
                              <span style={{ borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 900, fontSize: 15 }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: COLORS.subtext, marginTop: 2 }}>{item.city}・{item.area}</div>
                        </div>
                      </div>
                      {item.description && (
                        <div style={{ marginTop: 10, fontSize: 13, color: COLORS.subtext, lineHeight: 1.7 }}>{item.description}</div>
                      )}
                      {item.startsOn && (
                        <div style={{ marginTop: 10, borderRadius: 12, background: COLORS.warningBg, color: COLORS.warningText, padding: 10, fontSize: 12 }}>
                          {formatEventWindow(item)} ｜ {item.ticketType || "未設定票務"}{item.priceNote ? ` ／ ${item.priceNote}` : ""}
                        </div>
                      )}
                      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: COLORS.subtext, background: COLORS.cardMuted, borderRadius: 8, padding: "4px 8px" }}>⏱ {item.stayMinutes} 分</span>
                        {item.mapUrl && (
                          <a href={item.mapUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: 12, color: "#1a73e8", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                            onClick={(e) => e.stopPropagation()}>
                            📍 Google Maps
                          </a>
                        )}
                        {item.sourceUrl && (
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: 12, color: COLORS.subtext, textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}>
                            → 原始來源
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ border: `1px dashed ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 28, textAlign: "center", color: COLORS.subtext }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: COLORS.text }}>請先選擇城市</div>
          <div style={{ marginTop: 10, lineHeight: 1.8 }}>選好城市後，頁面才會載入對應的景點與宪动誓料胋。</div>
        </div>
      )}
    </SectionCard>
  );
}
