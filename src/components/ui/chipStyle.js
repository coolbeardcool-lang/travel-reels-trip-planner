import { COLORS, CATEGORY_THEME } from "../../config/theme.js";

export function chipStyle(category) {
  const theme = CATEGORY_THEME[category] || { bg: COLORS.primarySoft, color: COLORS.text };
  return { display: "inline-flex", alignItems: "center", gap: 6, background: theme.bg, color: theme.color, borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700, border: `1px solid ${theme.bg}` };
}
