// Single source of truth for Chinese city name → English slug mapping.
// Shared by: src/utils/normalize.js, src/components/UrlAnalyzerPanel.jsx,
//            functions/api/confirm-analysis.js, scripts/sync-notion.mjs
export const CITY_SLUG_MAP = {
  東京: "tokyo",    京都: "kyoto",     大阪: "osaka",   奈良: "nara",
  沖繩: "okinawa",  北海道: "hokkaido", 福岡: "fukuoka",
  台北: "taipei",   台中: "taichung",  台南: "tainan",  高雄: "kaohsiung",
  首爾: "seoul",    釜山: "busan",      彰化: "changhua",
};
