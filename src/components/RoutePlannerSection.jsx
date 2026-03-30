import React from "react";
import { COLORS } from "../config/theme.js";
import { chipStyle } from "./ui/chipStyle.js";
import { SectionCard } from "./ui/SectionCard.jsx";
import { estimateTransport } from "../utils/geo.js";

export function RoutePlannerSection({
  isMobile, hasCitySelected,
  routeItems, allAreas,
  timeOfDay, setTimeOfDay,
  baseArea, setBaseArea,
  dragSourceId, dragOverId,
  handleDragStart, handleDragOver, handleDrop,
  setDragSourceId, setDragOverId,
  userLocation, setUserLocation, locating, handleGetLocation,
  newRouteName, setNewRouteName,
  savedRoutes, showSavedRoutes, setShowSavedRoutes,
  handleSaveRoute, handleCopyShare, handleLoadRoute,
}) {
  return (
    <SectionCard
      title="行程規劃"
      right={
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}
            style={{ borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: "8px 10px", outline: "none", fontSize: 13 }}
            disabled={!hasCitySelected}>
            {["早上", "中午", "下午", "晚上"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={baseArea} onChange={(e) => setBaseArea(e.target.value)}
            style={{ borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: "8px 10px", outline: "none", fontSize: 13 }}
            disabled={!hasCitySelected || !allAreas.length}>
            {allAreas.length ? allAreas.map((a) => <option key={a} value={a}>{a}</option>) : <option value="">起點區域</option>}
          </select>
        </div>
      }
    >
      {hasCitySelected && routeItems.length > 0 ? (
        <>
          <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: COLORS.subtext }}>拖曳 ☰ 調整順序。點擊 📍 開啟 Google Maps 導航。</span>
            <button type="button" onClick={handleGetLocation} disabled={locating}
              style={{ borderRadius: 10, padding: "6px 14px", background: userLocation ? COLORS.successBg : "#fff", color: userLocation ? COLORS.successText : COLORS.text, border: `1px solid ${userLocation ? "#bbf7d0" : COLORS.border}`, fontSize: 12, fontWeight: 700, cursor: locating ? "not-allowed" : "pointer" }}>
              {locating ? "定位中…" : userLocation ? "✅ 已取得位置" : "📍 從我的位置出發"}
            </button>
            {userLocation && (
              <button type="button" onClick={() => setUserLocation(null)}
                style={{ fontSize: 11, color: COLORS.subtext, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "4px 8px", background: "#fff", cursor: "pointer" }}>清除</button>
            )}
          </div>

          <div style={{ display: "grid", gap: 0 }}>
            {routeItems.map((item, i) => {
              const prevItem = i > 0 ? routeItems[i - 1] : null;
              const prevPoint = i === 0 && userLocation ? userLocation : prevItem;
              const transport = prevPoint ? estimateTransport(prevPoint, item) : null;
              const isTransit = transport?.icon === "🚌" || transport?.icon === "🚇";
              const originCoords = i === 0 && userLocation
                ? `${userLocation.lat},${userLocation.lng}`
                : prevItem?.lat && prevItem?.lng ? `${prevItem.lat},${prevItem.lng}` : null;
              const dirUrl = originCoords && item.lat && item.lng
                ? `https://www.google.com/maps/dir/?api=1&origin=${originCoords}&destination=${item.lat},${item.lng}&travelmode=transit`
                : null;
              const isDraggingOver = dragOverId === item.id;
              return (
                <React.Fragment key={item.id}>
                  {transport && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 4px 24px" }}>
                      <div style={{ width: 2, height: 22, background: COLORS.border, flexShrink: 0 }} />
                      <span style={{ fontSize: 16 }}>{transport.icon}</span>
                      <span style={{ fontSize: 12, color: COLORS.subtext }}>{transport.label}・約 {transport.minutes} 分・{transport.km.toFixed(1)} km</span>
                      {(isTransit || (i === 0 && userLocation)) && dirUrl && (
                        <a href={dirUrl} target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: "#1a73e8", fontWeight: 700, textDecoration: "none", marginLeft: 4 }}>查路線 →</a>
                      )}
                    </div>
                  )}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={() => { setDragSourceId(null); setDragOverId(null); }}
                    style={{ border: `1px solid ${isDraggingOver ? COLORS.primary : COLORS.border}`, borderRadius: 20, background: isDraggingOver ? COLORS.primarySoft : COLORS.card, padding: "14px 16px", opacity: dragSourceId === item.id ? 0.45 : 1, cursor: "grab" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 18, color: COLORS.subtext, cursor: "grab", userSelect: "none" }}>☰</span>
                      <div style={{ width: 30, height: 30, borderRadius: 999, background: COLORS.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{item.order}</div>
                      <span style={{ fontSize: 22 }}>{item.thumbnail}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.name}{item._optimistic && <span style={{ marginLeft: 4, fontSize: 10, color: COLORS.subtext, fontWeight: 400 }}>同步中</span>}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, alignItems: "center" }}>
                          <span style={chipStyle(item.category)}>{item.category}</span>
                          <span style={{ fontSize: 12, color: COLORS.subtext }}>{item.bestTime}・⏱ {item.stayMinutes} 分</span>
                        </div>
                        {item.reason && (
                          <div style={{ marginTop: 4, fontSize: 11, color: COLORS.subtext, lineHeight: 1.5, fontStyle: "italic" }}>💡 {item.reason}</div>
                        )}
                      </div>
                      {item.mapUrl && (
                        <a href={item.mapUrl} target="_blank" rel="noreferrer"
                          style={{ fontSize: 20, textDecoration: "none", flexShrink: 0 }}
                          onClick={(e) => e.stopPropagation()}
                          title="Google Maps">📍</a>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {routeItems.length > 1 && (() => {
            const stayTotal = routeItems.reduce((s, item) => s + (item.stayMinutes || 0), 0);
            const travelTotal = routeItems.slice(1).reduce((s, item, i) => {
              const t = estimateTransport(routeItems[i], item);
              return s + (t?.minutes || 0);
            }, 0);
            const kmTotal = routeItems.slice(1).reduce((s, item, i) => {
              const t = estimateTransport(routeItems[i], item);
              return s + (t?.km || 0);
            }, 0);
            const totalHours = Math.round((stayTotal + travelTotal) / 6) / 10;
            return (
              <div style={{ marginTop: 14, borderRadius: 16, background: COLORS.cardMuted, border: `1px solid ${COLORS.border}`, padding: "12px 16px", display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: COLORS.subtext }}>
                <span>🗓 共 <strong style={{ color: COLORS.text }}>{routeItems.length}</strong> 個景點</span>
                <span>⏱ 預計 <strong style={{ color: COLORS.text }}>{totalHours}</strong> 小時</span>
                <span>🚶 總移動 <strong style={{ color: COLORS.text }}>{kmTotal.toFixed(1)}</strong> km</span>
              </div>
            );
          })()}

          <div style={{ marginTop: 20, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={newRouteName} onChange={(e) => setNewRouteName(e.target.value)}
              placeholder="輸入行程名稱…"
              style={{ flex: 1, minWidth: 140, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: "10px 14px", outline: "none", fontSize: 14 }} />
            <button type="button" onClick={handleSaveRoute} disabled={!newRouteName.trim()}
              style={{ borderRadius: 12, padding: "10px 18px", background: newRouteName.trim() ? COLORS.primary : COLORS.primarySoft, color: newRouteName.trim() ? "#fff" : COLORS.subtext, border: "none", fontWeight: 700, fontSize: 14, cursor: newRouteName.trim() ? "pointer" : "not-allowed" }}>
              💾 儲存行程
            </button>
            <button type="button" onClick={handleCopyShare}
              style={{ borderRadius: 12, padding: "10px 18px", background: "#fff", border: `1px solid ${COLORS.border}`, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              🔗 複製分享連結
            </button>
            {savedRoutes.length > 0 && (
              <button type="button" onClick={() => setShowSavedRoutes((s) => !s)}
                style={{ borderRadius: 12, padding: "10px 18px", background: "#fff", border: `1px solid ${COLORS.border}`, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                📋 已儲存 ({savedRoutes.length}) {showSavedRoutes ? "▲" : "▼"}
              </button>
            )}
          </div>

          {showSavedRoutes && (
            <div style={{ marginTop: 14, display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)" }}>
              {savedRoutes.map((route) => (
                <div key={route.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 16, background: COLORS.cardMuted, padding: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{route.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.subtext, marginTop: 4 }}>
                    {route.citySlug}・{route.itemIds.length} 個景點・{new Date(route.createdAt).toLocaleDateString("zh-TW")}
                  </div>
                  <button type="button" onClick={() => handleLoadRoute(route)}
                    style={{ marginTop: 10, borderRadius: 10, padding: "8px 14px", background: COLORS.primary, color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                    載入此行程
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ borderRadius: 18, background: COLORS.cardMuted, padding: 16, color: COLORS.subtext }}>
          {hasCitySelected ? "請在地圖上勾選景點以規劃行程。" : "請先選擇城市，再從地圖勾選景點。"}
        </div>
      )}
    </SectionCard>
  );
}
