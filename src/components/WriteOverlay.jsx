import React, { useState, useEffect } from "react";
import { COLORS, CATEGORY_THEME } from "../config/theme.js";

export function WriteOverlay({ status, dispatched, submittedItems, result, onClose, onReload }) {
  const [countdown, setCountdown] = useState(90);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (status !== "syncing" || !dispatched) return;
    setCountdown(90); setSynced(false);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); setSynced(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, dispatched]);

  if (status === "idle") return null;

  const resultSpots = result?.created?.spots ?? [];
  const createdSpots = resultSpots.filter((s) => s.action !== "merged");
  const mergedSpots = resultSpots.filter((s) => s.action === "merged");
  const totalWritten = resultSpots.length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 28, padding: 28, maxWidth: 480, width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.3)" }}>

        {status === "writing" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>📝</div>
            <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800, color: COLORS.text }}>寫入中…</div>
            <div style={{ marginTop: 8, fontSize: 13, color: COLORS.subtext }}>正在將資料寫入 Notion 資料庫</div>
            <div style={{ marginTop: 16, height: 6, background: COLORS.border, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", background: COLORS.primary, width: "60%" }} />
            </div>
          </div>
        )}

        {status === "syncing" && (
          <div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>{synced ? "✅" : "⚙️"}</div>
              <div style={{ marginTop: 12, fontSize: 18, fontWeight: 800, color: synced ? COLORS.successText : COLORS.text }}>
                {synced ? "同步完成！" : "GitHub Actions 同步中…"}
              </div>
              {!synced && (
                <>
                  <div style={{ marginTop: 6, fontSize: 28, fontWeight: 900, color: "#15803d" }}>{countdown}s</div>
                  <div style={{ marginTop: 8, height: 6, background: "#dcfce7", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "#16a34a", width: `${((90 - countdown) / 90) * 100}%`, transition: "width 1s linear" }} />
                  </div>
                </>
              )}
            </div>

            {totalWritten > 0 && (
              <div style={{ marginTop: 20, borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.subtext, marginBottom: 10 }}>
                  {createdSpots.length > 0 && mergedSpots.length > 0
                    ? `✨ 新增 ${createdSpots.length} 筆，合併 ${mergedSpots.length} 筆`
                    : mergedSpots.length > 0
                      ? `🔀 已合併 ${mergedSpots.length} 筆至現有景點`
                      : `✨ 已建立 ${createdSpots.length} 筆資料`}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {resultSpots.map((spot, i) => {
                    const display = submittedItems.find((s) => s.name === spot.name) || submittedItems[i] || {};
                    const isMerged = spot.action === "merged";
                    return (
                      <div key={spot.id || i} style={{ display: "flex", gap: 10, alignItems: "center", borderRadius: 12, background: isMerged ? "#fefce8" : COLORS.successBg, border: `1px solid ${isMerged ? "#fde68a" : "#bbf7d0"}`, padding: "10px 14px" }}>
                        <span style={{ fontSize: 18 }}>{isMerged ? "🔀" : "✅"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isMerged ? "#92400e" : COLORS.successText }}>{spot.name}</div>
                          <div style={{ fontSize: 11, color: COLORS.subtext }}>
                            {isMerged ? "已合併至現有景點" : `${display.category || ""}${display.area ? `・${display.area}` : ""}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {result?.created?.sourcePageId && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", borderRadius: 12, background: COLORS.infoBg, border: "1px solid #bfdbfe", padding: "10px 14px" }}>
                      <span>📋</span>
                      <div style={{ fontSize: 12, color: COLORS.infoText }}>來源頁面已建立</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {synced && (
                <button onClick={onReload} style={{ flex: 1, background: "#16a34a", color: "#fff", border: "none", borderRadius: 14, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  🔄 重新載入查看新資料
                </button>
              )}
              <button onClick={onClose} style={{ flex: 1, background: "#fff", color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                繼續使用
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
