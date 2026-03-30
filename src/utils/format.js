export function formatEventWindow(event) {
  const parts = [];
  if (event.startsOn) parts.push(`${event.startsOn}${event.endsOn && event.endsOn !== event.startsOn ? ` ~ ${event.endsOn}` : ""}`);
  if (event.startTime) parts.push(`${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}`);
  return parts.join("  ") || "時間未定";
}

export function prettyAnalysisKind(kind) {
  if (kind === "spot") return "景點 / 美食";
  if (kind === "event") return "活動 / 展覽";
  return "來源資料";
}
