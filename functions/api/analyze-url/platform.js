import { CITY_ALIASES } from "../city-aliases.js";

const PLATFORM_MAP = {
  "instagram.com": "Instagram",
  "threads.net": "Threads",
  "facebook.com": "Facebook",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "tiktok.com": "TikTok",
  "twitter.com": "Twitter",
  "x.com": "Twitter",
};

const CITY_ALIAS_MAP = CITY_ALIASES.reduce((acc, entry) => {
  const alias = String(entry?.alias || "").trim().toLowerCase();
  const slug = String(entry?.slug || "").trim().toLowerCase();
  if (alias && slug) acc[alias] = slug;
  if (slug) acc[slug] = slug;
  return acc;
}, {});

export function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return PLATFORM_MAP[host] || "Website";
  } catch {
    return "Website";
  }
}

export function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    const remove = [
      "utm_source","utm_medium","utm_campaign","utm_content","utm_term",
      "fbclid","igshid","ref","share",
    ];
    remove.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return raw;
  }
}

export function normalizeCitySlug(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

export function inferCitySlug(text, cityHint) {
  const normalizedHint = normalizeCitySlug(cityHint);
  if (normalizedHint) return CITY_ALIAS_MAP[normalizedHint] || normalizedHint;

  const normalizedText = String(text || "").toLowerCase();
  for (const [keyword, slug] of Object.entries(CITY_ALIAS_MAP)) {
    if (normalizedText.includes(keyword.toLowerCase())) return slug;
  }

  const cityTokenMatch = normalizedText.match(/([\u4e00-\u9fff]{2,8})(?:市|縣|鄉|鎮|區)/);
  if (cityTokenMatch) return normalizeCitySlug(cityTokenMatch[1]);
  return null;
}
