import React from "react";
import { COLORS } from "../config/theme.js";

export function SyncStatusBar({ lastSyncedAt, syncing, onSync }) {
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, zIndex: 999,
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(8px)",
      border: `1px solid ${COLORS.border}`,
      borderRadius: "0 0 0 16px",
      padding: "8px 16px",
      fontSize: 12, color: COLORS.subtext,
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
    }}>
      {lastSyncedAt ? (
        <span>
          資料版本：{new Date(lastSyncedAt).toLocaleString("zh-TW", {
            month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit",
          })}
        </span>
      ) : (
        <span>載入中...</span>
      )}
      <button
        onClick={onSync}
        disabled={syncing}
        style={{
          background: syncing ? COLORS.primarySoft : COLORS.primary,
          color: syncing ? COLORS.subtext : "#fff",
          border: "none", borderRadius: 10,
          padding: "5px 12px", fontSize: 12, fontWeight: 700,
          cursor: syncing ? "not-allowed" : "pointer",
        }}
      >
        {syncing ? "檢查中..." : "🔄 更新"}
      </button>
    </div>
  );
}
