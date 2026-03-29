import React from "react";
import { COLORS, ANALYZE_TYPE_OPTIONS } from "../config/theme.js";
import { prettyAnalysisKind } from "../utils/format.js";
import { PrimaryButton } from "./ui/PrimaryButton.jsx";

export function UrlAnalyzerPanel({
  isMobile, cityIndex,
  submitUrl, setSubmitUrl,
  submitTitle, setSubmitTitle,
  submitType, setSubmitType,
  submitCitySlug, setSubmitCitySlug,
  submitNotes, setSubmitNotes,
  analysisPreview, setAnalysisPreview,
  submitStatus, setSubmitStatus,
  isAnalyzing, isConfirming,
  isDuplicateUrl, shouldShowInput,
  submitStatusStyle,
  onAnalyze, onConfirm, onClose,
  selectedItems, setSelectedItems,
}) {
  if (!shouldShowInput) {
    return (
      <button type="button"
        onMouseEnter={onClose.open}
        onClick={onClose.open}
        style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 20, padding: "13px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 28px rgba(0,0,0,0.22)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 18 }}>＋</span> 貼網址分析
      </button>
    );
  }

  return (
    <div style={{ background: COLORS.primary, color: "#fff", borderRadius: 24, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.35)", maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>貼網址 → 分析 → 確認寫入</div>
        <button type="button" onClick={onClose.close}
          style={{ background: "transparent", border: "none", color: "#a8a29e", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>

      <form onSubmit={onAnalyze} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <input value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)}
          placeholder="只貼 Instagram Reel / Threads / 網址 就可以"
          style={{ width: "100%", borderRadius: 18, border: `1px solid ${isDuplicateUrl ? "#fb923c" : "rgba(255,255,255,0.15)"}`, background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none", boxSizing: "border-box" }} />
        {isDuplicateUrl && (
          <div style={{ borderRadius: 14, padding: "8px 14px", background: COLORS.warningBg, color: COLORS.warningText, fontSize: 12, fontWeight: 600 }}>
            ⚠️ 此網址已提交過，如有需要仍可繼續送出。
          </div>
        )}
        <input value={submitTitle} onChange={(e) => setSubmitTitle(e.target.value)}
          placeholder="可選：人工補充標題提示"
          style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none", boxSizing: "border-box" }} />
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
          <select value={submitCitySlug} onChange={(e) => setSubmitCitySlug(e.target.value)}
            style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}>
            <option value="" style={{ color: COLORS.text }}>自動判斷城市</option>
            {cityIndex.map((city) => <option key={city.slug} value={city.slug} style={{ color: COLORS.text }}>{city.label}</option>)}
          </select>
          <select value={submitType} onChange={(e) => setSubmitType(e.target.value)}
            style={{ borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: "14px 16px", outline: "none" }}>
            {ANALYZE_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t} style={{ color: COLORS.text }}>
                {t === "auto" ? "自動判斷類型" : t === "spot" ? "偏向景點 / 美食" : "偏向活動 / 展覽"}
              </option>
            ))}
          </select>
        </div>
        <textarea value={submitNotes} onChange={(e) => setSubmitNotes(e.target.value)}
          placeholder="可選：補充提示"
          style={{ width: "100%", minHeight: 80, borderRadius: 18, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.10)", color: "#ffffff", padding: 16, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
          <PrimaryButton type="submit" disabled={isAnalyzing || isConfirming}>
            {isAnalyzing ? "分析中…" : "先分析網址"}
          </PrimaryButton>
          <PrimaryButton type="button" secondary onClick={onConfirm} disabled={!analysisPreview || isAnalyzing || isConfirming}>
            {isConfirming ? "寫入中…" : "確認後寫入"}
          </PrimaryButton>
        </div>
      </form>

      {submitStatus.kind !== "idle" && (
        <div style={{ marginTop: 14, borderRadius: 18, padding: 14, fontSize: 13, lineHeight: 1.8, ...submitStatusStyle }}>
          {submitStatus.message}
        </div>
      )}

      {analysisPreview && (
        <div style={{ marginTop: 16, borderRadius: 22, background: "rgba(255,255,255,0.10)", padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "#d6d3d1" }}>分析預覽 {analysisPreview.cached && "⚡ 快取"}</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800 }}>{analysisPreview.sourceTitle}</div>
              <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: "#f5f5f4" }}>
                類型：{prettyAnalysisKind(analysisPreview.contentKind)} ｜ 平台：{analysisPreview.sourcePlatform} ｜ 城市：{analysisPreview.citySlug || "待判定"}
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#d6d3d1" }}>城市（可修正）</span>
                <input
                  value={analysisPreview.citySlug || ""}
                  onChange={(e) => setAnalysisPreview((prev) => ({ ...prev, citySlug: e.target.value.toLowerCase().trim() }))}
                  placeholder="如 seoul / tokyo"
                  style={{ flex: 1, minWidth: 120, borderRadius: 10, border: "1px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.12)", color: "#fff", padding: "6px 10px", fontSize: 12, outline: "none" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ borderRadius: 999, padding: "6px 10px", fontSize: 12, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                信心 {Math.round((analysisPreview.confidence || 0) * 100)}%
              </span>
              <span style={{ borderRadius: 999, padding: "6px 10px", fontSize: 12, background: analysisPreview.needsReview ? COLORS.warningBg : COLORS.successBg, color: analysisPreview.needsReview ? COLORS.warningText : COLORS.successText }}>
                {analysisPreview.needsReview ? "建議人工確認" : "可直接寫入"}
              </span>
            </div>
          </div>
          {analysisPreview.summary && (
            <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8, color: "#f5f5f4" }}>{analysisPreview.summary}</div>
          )}
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#d6d3d1" }}>選擇要寫入的項目：</span>
            <button type="button" onClick={() => setSelectedItems(analysisPreview.items.map((i) => i.id))}
              style={{ fontSize: 11, borderRadius: 8, padding: "3px 8px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", cursor: "pointer" }}>全選</button>
            <button type="button" onClick={() => setSelectedItems([])}
              style={{ fontSize: 11, borderRadius: 8, padding: "3px 8px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", cursor: "pointer" }}>全取消</button>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {analysisPreview.items.length ? analysisPreview.items.map((item) => {
              const checked = selectedItems.includes(item.id);
              return (
                <div key={item.id} style={{ borderRadius: 18, background: checked ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)", padding: 14, cursor: "pointer", border: `1px solid ${checked ? "rgba(255,255,255,0.3)" : "transparent"}` }}
                  onClick={() => setSelectedItems((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? "#fff" : "rgba(255,255,255,0.4)"}`, background: checked ? "#fff" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {checked && <span style={{ fontSize: 11, color: COLORS.primary }}>✓</span>}
                      </div>
                      <div style={{ fontWeight: 800 }}>{item.name}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12, background: "rgba(255,255,255,0.12)", color: "#fff" }}>{item.category}</span>
                    </div>
                  </div>
                  {item.area && <div style={{ marginTop: 5, fontSize: 12, color: "#d6d3d1" }}>📍 {item.area}</div>}
                  {item.description && <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.7, color: "#f5f5f4" }}>{item.description}</div>}
                  {item.reason && <div style={{ marginTop: 5, fontSize: 11, color: "#a8a29e", fontStyle: "italic" }}>💡 {item.reason}</div>}
                </div>
              );
            }) : (
              <div style={{ borderRadius: 18, background: "rgba(255,255,255,0.08)", padding: 14, fontSize: 13, color: "#f5f5f4", lineHeight: 1.8 }}>
                目前沒有拆出明確的景點或活動項目，確認後會先以來源資料寫入待整理清單。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
