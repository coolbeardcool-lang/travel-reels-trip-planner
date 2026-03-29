import React from "react";
import { COLORS } from "../../config/theme.js";

export function MetricCard({ label, value, sub }) {
  return (
    <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 24, background: COLORS.cardMuted, padding: 16 }}>
      <div style={{ fontSize: 13, color: COLORS.subtext }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 30, fontWeight: 800, color: COLORS.text }}>{value}</div>
      <div style={{ marginTop: 4, fontSize: 12, color: COLORS.subtext }}>{sub}</div>
    </div>
  );
}
