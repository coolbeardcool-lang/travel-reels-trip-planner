import React from "react";
import { COLORS } from "../config/theme.js";
import { SectionCard } from "./ui/SectionCard.jsx";

export function CitySection({
  isMobile, cityIndex, selectedCitySlug, hasCitySelected,
  loadedSpots, loadedEvents, sources, showCitySources,
  setSelectedCitySlug, setShowCitySources,
}) {
  return (
    <SectionCard title="城市入口">
      {hasCitySelected ? (
        <div style={{ display: "grid", gap: 14 }}>
          {cityIndex.filter((c) => c.slug === selectedCitySlug).map((city) => (
            <div key={city.slug} style={{ border: `2px solid ${COLORS.primary}`, borderRadius: 24, background: "#fff", boxShadow: "0 10px 26px rgba(0,0,0,0.08)", padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 40 }}>{city.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{city.label}</div>
                  <div style={{ fontSize: 13, color: COLORS.subtext }}>{city.region}</div>
                </div>
                <button type="button"
                  onClick={() => { setSelectedCitySlug("unselected"); setShowCitySources(false); }}
                  style={{ fontSize: 12, color: COLORS.subtext, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "6px 12px", background: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
                  取消選擇
                </button>
              </div>
              {city.description && (
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.8, color: COLORS.subtext }}>{city.description}</div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
                {[
                  { label: "景點數", value: loadedSpots.length, key: "spots", clickable: false },
                  { label: "活動數", value: loadedEvents.length, key: "events", clickable: false },
                  { label: "來源數", value: sources.length, key: "sources", clickable: true },
                ].map(({ label, value, key, clickable }) => {
                  const active = showCitySources && key === "sources";
                  return (
                    <div key={key}
                      onClick={clickable ? () => setShowCitySources((s) => !s) : undefined}
                      style={{ background: active ? COLORS.primary : COLORS.cardMuted, borderRadius: 14, padding: "10px 12px", border: `1px solid ${active ? COLORS.primary : COLORS.border}`, cursor: clickable ? "pointer" : "default", transition: "background 0.15s" }}>
                      <div style={{ fontSize: 11, color: active ? "#d6d3d1" : COLORS.subtext }}>
                        {label} {clickable && <span style={{ fontSize: 10 }}>{showCitySources ? "▲" : "▼"}</span>}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: active ? "#fff" : COLORS.text }}>{value}</div>
                    </div>
                  );
                })}
              </div>
              {showCitySources && sources.length > 0 && (
                <div style={{ marginTop: 14, display: "grid", gap: 10, gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)" }}>
                  {sources.map((source) => (
                    <div key={source.id} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 16, background: COLORS.cardMuted, padding: 14 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "4px 8px", fontSize: 11, color: COLORS.subtext }}>{source.platform}</span>
                        <span style={{ borderRadius: 999, background: "#fff", border: `1px solid ${COLORS.border}`, padding: "4px 8px", fontSize: 11, color: COLORS.subtext }}>{source.status}</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>{source.title}</div>
                      {source.note && <div style={{ marginTop: 4, fontSize: 12, color: COLORS.subtext, lineHeight: 1.6 }}>{source.note}</div>}
                      <a href={source.url} target="_blank" rel="noreferrer"
                        style={{ display: "inline-block", marginTop: 10, fontSize: 12, color: COLORS.primary, fontWeight: 700, textDecoration: "none" }}>
                        → 查看來源
                      </a>
                    </div>
                  ))}
                </div>
              )}
              {city.spotlight.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {city.spotlight.map((item) => (
                    <span key={item} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{item}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {cityIndex.filter((c) => c.slug !== selectedCitySlug).map((city) => (
              <button key={city.slug} type="button" onClick={() => setSelectedCitySlug(city.slug)}
                style={{ textAlign: "left", border: `1px solid ${COLORS.border}`, borderRadius: 18, background: COLORS.cardMuted, padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ fontSize: 26 }}>{city.emoji}</div>
                <div style={{ marginTop: 6, fontSize: 15, fontWeight: 800 }}>{city.label}</div>
                <div style={{ marginTop: 2, fontSize: 12, color: COLORS.subtext }}>{city.region}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))" }}>
          {cityIndex.map((city) => (
            <button key={city.slug} type="button" onClick={() => setSelectedCitySlug(city.slug)}
              style={{ textAlign: "left", border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.card, boxShadow: "0 6px 18px rgba(0,0,0,0.04)", padding: 20, cursor: "pointer" }}>
              <div style={{ fontSize: 34 }}>{city.emoji}</div>
              <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900 }}>{city.label}</div>
              <div style={{ marginTop: 4, fontSize: 13, color: COLORS.subtext }}>{city.region}</div>
              <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.8, color: COLORS.subtext }}>{city.description}</div>
              {city.spotlight.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {city.spotlight.map((item) => (
                    <span key={item} style={{ borderRadius: 999, background: COLORS.primarySoft, padding: "6px 10px", fontSize: 12, color: COLORS.subtext }}>{item}</span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
