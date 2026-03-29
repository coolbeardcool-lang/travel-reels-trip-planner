import React, { useState, useEffect } from "react";
import { COLORS } from "../config/theme.js";

export function SuccessView({ result, onReset }) {
  const [countdown, setCountdown] = useState(90);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!result.dispatched) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSynced(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [result.dispatched]);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", marginTop: 40, padding: "0 16px" }}>
      <div style={{ background: COLORS.successBg, border: `1px solid #bbf7d0`, borderRadius: 24, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <div style={{ marginTop: 12, fontSize: 20, fontWeight: 800, color: COLORS.successText }}>已寫入 Notion！</div>

        {result.dispatched ? (
          <div style={{ marginTop: 16 }}>
            {!synced ? (
              <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 13, color: COLORS.successText, fontWeight: 600 }}>⚙️ GitHub Actions 同步中...</div>
                <div style={{ marginTop: 8, fontSize: 28, fontWeight: 900, color: "#15803d" }}>{countdown}s</div>
                <div style={{ marginTop: 6, fontSize: 12, color: "#4ade80" }}>約 {countdown} 秒後頁面資料將更新</div>
                <div style={{ marginTop: 10, background: "#dcfce7", borderRadius: 999, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#16a34a", width: `${((90 - countdown) / 90) * 100}%`, transition: "width 1s linear" }} />
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 13, color: COLORS.successText, fontWeight: 600 }}>✨ 同步完成！點下方按鈕查看最新資料</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 13, color: COLORS.subtext }}>資料已寫入，請稍後手動重新整理頁面查看。</div>
        )}

        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {synced && (
            <button
              onClick={() => window.location.reload()}
              style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              🔄 重新載入查看新資料
            </button>
          )}
          <button
            onClick={onReset}
            style={{ background: "#fff", color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            再貼一個網址
          </button>
        </div>

        {result.created?.sourcePageId && (
          <div style={{ marginTop: 16, fontSize: 12, color: "#9ca3af" }}>
            Source ID: <code>{result.created.sourcePageId}</code>
          </div>
        )}
      </div>
    </div>
  );
}
