import React from "react";
import { COLORS } from "../../config/theme.js";

export function SectionCard({ children, title, right }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 28, boxShadow: "0 8px 30px rgba(0,0,0,0.05)" }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "24px 24px 8px" }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: COLORS.text }}>{title}</h2>
          {right}
        </div>
      )}
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}
