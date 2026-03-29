const BASE_URL = import.meta.env.BASE_URL;

export const ANALYZE_API_PATH = `${BASE_URL}api/analyze-url`;
export const CONFIRM_ANALYSIS_API_PATH = `${BASE_URL}api/confirm-analysis`;
export const CONTENT_MODES = ["spots", "events"];
export const ANALYZE_TYPE_OPTIONS = ["auto", "spot", "event"];

export const COLORS = {
  pageBg: "linear-gradient(135deg, #fafaf9 0%, #ffffff 48%, #fff7ed 100%)",
  card: "#ffffff",
  cardMuted: "#fafaf9",
  text: "#292524",
  subtext: "#57534e",
  border: "#e7e5e4",
  primary: "#1c1917",
  primarySoft: "#f5f5f4",
  successBg: "#ecfdf5",
  successText: "#166534",
  errorBg: "#fef2f2",
  errorText: "#991b1b",
  infoBg: "#eff6ff",
  infoText: "#1d4ed8",
  warningBg: "#fff7ed",
  warningText: "#c2410c",
};

export const CATEGORY_THEME = {
  景點: { bg: "#e0f2fe", color: "#0369a1" },
  餐廳: { bg: "#ffe4e6", color: "#be123c" },
  小吃: { bg: "#fef3c7", color: "#b45309" },
  逛街: { bg: "#ede9fe", color: "#6d28d9" },
  甜點: { bg: "#fce7f3", color: "#be185d" },
  寺社: { bg: "#d1fae5", color: "#047857" },
  活動: { bg: "#ffedd5", color: "#c2410c" },
};

export { BASE_URL };
