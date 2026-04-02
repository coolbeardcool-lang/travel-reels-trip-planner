import { CITY_SLUG_MAP } from "../../../src/utils/citySlugMap.js";

export const NOTION_VERSION = "2025-09-03";
export const NOMINATIM_USER_AGENT = "TravelReelsTripPlanner/1.0 (https://travel-reels-trip-planner.pages.dev)";

export const CITY_COUNTRY_CODES = {
  kyoto: "jp", osaka: "jp", tokyo: "jp", nara: "jp",
  fukuoka: "jp", hokkaido: "jp", okinawa: "jp",
  taipei: "tw", taichung: "tw", tainan: "tw", kaohsiung: "tw",
  seoul: "kr", busan: "kr",
};

export const CITY_DATA_MAP = {
  tokyo:     { label: "東京",   emoji: "🗼",  region: "日本", timezone: "Asia/Tokyo",  lat: 35.6762, lng: 139.6503, sort: 10,  heroArea: "新宿／澀谷",    spotlight: "購物,美食,文化",   description: "融合傳統與現代的大都市，購物、美食與文化密度極高。" },
  kyoto:     { label: "京都",   emoji: "⛩️",  region: "關西", timezone: "Asia/Tokyo",  lat: 35.0116, lng: 135.7681, sort: 20,  heroArea: "佛光寺周邊",    spotlight: "寺社,甜點,散步",   description: "寺社、散步、甜點與選物密度高，適合慢節奏安排。" },
  osaka:     { label: "大阪",   emoji: "🍢",  region: "關西", timezone: "Asia/Tokyo",  lat: 34.6937, lng: 135.5023, sort: 30,  heroArea: "新世界／通天閣",  spotlight: "小吃,商圈,夜生活", description: "小吃、商圈與夜間行程豐富，適合美食導向安排。" },
  nara:      { label: "奈良",   emoji: "🦌",  region: "關西", timezone: "Asia/Tokyo",  lat: 34.6851, lng: 135.8048, sort: 40,  heroArea: "奈良公園",      spotlight: "景點,自然,歷史",   description: "鹿群漫步的古都，世界遺產與自然景觀並存。" },
  fukuoka:   { label: "福岡",   emoji: "🍜",  region: "日本", timezone: "Asia/Tokyo",  lat: 33.5904, lng: 130.4017, sort: 50,  heroArea: "天神／博多",    spotlight: "拉麵,美食,購物",   description: "九州最大城市，拉麵與海鮮聞名，生活感十足。" },
  hokkaido:  { label: "北海道", emoji: "🐻",  region: "日本", timezone: "Asia/Tokyo",  lat: 43.0642, lng: 141.3469, sort: 60,  heroArea: "札幌市區",      spotlight: "自然,美食,滑雪",   description: "四季分明的北國，自然景觀與乳製品美食著稱。" },
  okinawa:   { label: "沖繩",   emoji: "🌺",  region: "日本", timezone: "Asia/Tokyo",  lat: 26.2124, lng: 127.6809, sort: 70,  heroArea: "國際通",        spotlight: "海灘,文化,美食",   description: "熱帶海島風情，珊瑚礁海灘與獨特琉球文化。" },
  taipei:    { label: "台北",   emoji: "🏙️",  region: "台灣", timezone: "Asia/Taipei", lat: 25.0330, lng: 121.5654, sort: 80,  heroArea: "大安／信義",    spotlight: "美食,夜市,文化",   description: "美食、夜市與文創密度極高，交通便利易遊。" },
  taichung:  { label: "台中",   emoji: "🌳",  region: "台灣", timezone: "Asia/Taipei", lat: 24.1477, lng: 120.6736, sort: 90,  heroArea: "審計新村",      spotlight: "文創,咖啡,美食",   description: "文創咖啡廳密集，氣候宜人適合悠閒散步。" },
  tainan:    { label: "台南",   emoji: "🏯",  region: "台灣", timezone: "Asia/Taipei", lat: 22.9999, lng: 120.2269, sort: 100, heroArea: "安平古堡周邊",  spotlight: "古蹟,小吃,歷史",   description: "台灣最古老城市，古蹟與傳統小吃文化深厚。" },
  kaohsiung: { label: "高雄",   emoji: "🌊",  region: "台灣", timezone: "Asia/Taipei", lat: 22.6273, lng: 120.3014, sort: 110, heroArea: "駁二藝術特區",  spotlight: "港口,文創,美食",   description: "港都風情濃厚，文創聚落與海港夜景值得一遊。" },
  seoul:     { label: "首爾",   emoji: "🇰🇷", region: "韓國", timezone: "Asia/Seoul",  lat: 37.5665, lng: 126.9780, sort: 120, heroArea: "望遠洞／弘大",    spotlight: "美食,市場,燒肉",   description: "市場小吃、韓牛燒烤與弘大街頭文化密集，適合美食導向安排。" },
  busan:     { label: "釜山",   emoji: "🌊",  region: "韓國", timezone: "Asia/Seoul",  lat: 35.1796, lng: 129.0756, sort: 130, heroArea: "海雲台",        spotlight: "海灘,美食,文化",   description: "韓國第二大城市，海灘、海鮮與山城景觀著稱。" },
};

export function normalizeCitySlug(raw) {
  const v = String(raw || "").trim();
  return CITY_SLUG_MAP[v] || v.toLowerCase().replace(/\s+/g, "-") || null;
}
