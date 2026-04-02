export function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\w]/g, "");
}

export function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function joinClean(values, sep = " ") {
  return values.map((v) => cleanText(v)).filter(Boolean).join(sep).trim();
}

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => cleanText(t)).filter(Boolean).slice(0, 20);
}

export function guessThumbnail(category) {
  const map = {
    "餐廳": "🍽️",
    "小吃": "🍢",
    "咖啡": "☕",
    "甜點": "🍰",
    "景點": "📍",
    "逛街": "🛍️",
    "寺社": "⛩️",
    "住宿": "🏨",
    "博物館": "🏛️",
    "夜市": "🏮",
    "活動": "🎫"
  };
  return map[category] || "📍";
}

export function buildItemNotes(item) {
  const parts = [];
  const reason = cleanText(item?.reason);
  const reviewReason = cleanText(item?.reviewReason || item?.review_reason);
  if (reason) parts.push(`reason: ${reason}`);
  if (reviewReason) parts.push(`review: ${reviewReason}`);
  if (Array.isArray(item?.evidence) && item.evidence.length) {
    const evidenceText = item.evidence
      .map((e) => cleanText(typeof e === "string" ? e : e?.value || e?.text))
      .filter(Boolean)
      .slice(0, 6)
      .join(" | ");
    if (evidenceText) parts.push(`evidence: ${evidenceText}`);
  }
  return parts.join(" || ").slice(0, 2000);
}
