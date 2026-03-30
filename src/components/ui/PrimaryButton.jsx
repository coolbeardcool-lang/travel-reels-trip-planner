import React from "react";
import { COLORS } from "../../config/theme.js";

export function PrimaryButton({ children, href, secondary = false, block = false, onClick, type = "button", disabled = false }) {
  const style = {
    display: block ? "flex" : "inline-flex",
    width: block ? "100%" : undefined,
    justifyContent: "center", alignItems: "center", gap: 8,
    borderRadius: 18, padding: "12px 16px", textDecoration: "none",
    border: secondary ? `1px solid ${COLORS.border}` : `1px solid ${COLORS.primary}`,
    background: disabled ? COLORS.primarySoft : secondary ? "#ffffff" : COLORS.primary,
    color: disabled ? COLORS.subtext : secondary ? COLORS.text : "#ffffff",
    fontWeight: 700, fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    boxSizing: "border-box",
  };
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={style}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}
