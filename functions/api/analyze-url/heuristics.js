import { inferCitySlug } from "./platform.js";

const EVENT_KEYWORDS = ["活動","展覽","演唱會","音樂節","市集","節慶","開幕","講座","祭","花火","煙火","限定","快閃","event","festival","concert","exhibition","market","fair","workshop","popup","pop-up"];
const SPOT_KEYWORDS = ["餐廳","咖啡","景點","美食","小吃","住宿","飯店","旅館","海灘","公園","博物館","夜市","老街","神社","寺","瀑布","溫泉","restaurant","cafe","coffee","hotel","beach","park","museum","street food","shrine","temple","onsen"];
const ITEM_STOPWORDS = new Set(["instagram","reel","threads","facebook","youtube","tiktok","twitter","x","travel","trip","vlog","推薦","分享","旅遊","景點","活動","美食"]);

function inferContentKind({ eventScore, spotScore, typeHint }) {
  if (typeHint === "event") return "event";
  if (typeHint === "spot") return "spot";
  if (eventScore > 0 && spotScore > 0) return "mixed";
  if (eventScore >= 2 && eventScore > spotScore) return "event";
  if (spotScore >= 2 && spotScore > eventScore) return "spot";
  if (eventScore === 1 && spotScore === 0) return "event";
  if (spotScore === 1 && eventScore === 0) return "spot";
  return "source_only";
}

function inferHeuristicConfidence({ eventScore, spotScore, contentKind, typeHint }) {
  let confidence = 0.3;
  const maxScore = Math.max(eventScore, spotScore);
  if (contentKind === "mixed") confidence = 0.62;
  else if (maxScore >= 3) confidence = 0.85;
  else if (maxScore === 2) confidence = 0.72;
  else if (maxScore === 1) confidence = 0.55;
  if (typeHint) confidence = Math.max(confidence, 0.8);
  return confidence;
}

function buildHeuristicReviewReason({ confidence, contentKind, mergedText }) {
  if (!mergedText) return "no textual evidence available";
  if (contentKind === "mixed") return "mixed spot/event signals detected";
  if (contentKind === "source_only") return "insufficient evidence for structured item extraction";
  if (confidence < 0.7) return "heuristic confidence below threshold";
  return null;
}

function detectItemKindFromText(text, fallback) {
  const lower = String(text || "").toLowerCase();
  const hasEvent = EVENT_KEYWORDS.some((k) => lower.includes(k));
  const hasSpot = SPOT_KEYWORDS.some((k) => lower.includes(k));
  if (hasEvent && hasSpot) return "source_only";
  if (hasEvent) return "event";
  if (hasSpot) return "spot";
  return fallback === "mixed" ? "source_only" : fallback;
}

function inferSpotCategory(text) {
  const v = String(text || "").toLowerCase();
  if (/(咖啡|cafe|coffee)/i.test(v)) return "咖啡";
  if (/(甜點|蛋糕|dessert)/i.test(v)) return "甜點";
  if (/(夜市)/i.test(v)) return "夜市";
  if (/(餐廳|restaurant|食堂|火鍋|燒肉|壽司|牛排)/i.test(v)) return "餐廳";
  if (/(小吃|麵|肉圓|羊肉|滷肉飯|豆花|米糕|鹽酥雞|food)/i.test(v)) return "小吃";
  return "景點";
}

function inferAreaFromText(text) {
  const match = String(text || "").match(/([\u4e00-\u9fff]{2,8}(?:鄉|鎮|市|區))/);
  return match ? match[1] : null;
}

function inferThumbnailByCategory(category, itemKind) {
  const map = { 餐廳:"🍽️", 小吃:"🍢", 咖啡:"☕", 甜點:"🍰", 夜市:"🏮", 景點:"📍", 活動:"🎫" };
  return map[category] || (itemKind === "event" ? "🎫" : "📍");
}

function normalizeCandidateName(value) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#＠@][\w\u4e00-\u9fff_-]+/g, " ")
    .replace(/[|｜]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function extractCandidatesFromText(mergedText) {
  const text = String(mergedText || "");
  if (!text) return [];
  const candidates = [];
  const lineLikeParts = text.split(/[\n\r]+|(?<=[。！？!?.])\s+/).map((part) => part.trim()).filter(Boolean);
  candidates.push(...lineLikeParts);
  const numberedRegex = /(?:^|[\n\r])\s*(?:\d{1,2}[.)、]|[•●▪\-])\s*([^\n\r]+)/g;
  let match;
  while ((match = numberedRegex.exec(text))) candidates.push(match[1]);
  const inlineNumberedRegex = /(?:^|\s)\d{1,2}[.)、]\s*([^0-9]{2,80}?)(?=(?:\s+\d{1,2}[.)、])|$)/g;
  while ((match = inlineNumberedRegex.exec(text))) candidates.push(match[1]);
  return candidates;
}

function buildHeuristicItems({ mergedText, contentKind, citySlug, area, confidence }) {
  const seen = new Set();
  const candidates = extractCandidatesFromText(mergedText);
  const items = [];
  for (const raw of candidates) {
    const name = normalizeCandidateName(raw);
    const lower = name.toLowerCase();
    if (!name || name.length < 2 || name.length > 60) continue;
    if (ITEM_STOPWORDS.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    const itemKind = detectItemKindFromText(name, contentKind);
    const inferredCity = inferCitySlug(lower, citySlug);
    const category = itemKind === "event" ? "活動" : inferSpotCategory(name);
    const areaFromText = inferAreaFromText(name);
    const tags = [category];
    if (areaFromText) tags.push(areaFromText);
    if (inferredCity) tags.push(inferredCity);
    const mapQuery = encodeURIComponent([name, areaFromText || "", inferredCity || ""].filter(Boolean).join(" "));
    items.push({ id: `heuristic-item-${items.length + 1}`, name, itemKind, item_kind: itemKind, category, description: "", tags, citySlug: inferredCity || null, city_slug: inferredCity || null, area: areaFromText || area || null, best_time: null, stay_minutes: null, starts_on: null, ends_on: null, start_time: "", end_time: "", lat: null, lng: null, map_url: mapQuery ? `https://www.google.com/maps/search/?api=1&query=${mapQuery}` : null, official_url: null, venue_name: null, price_note: null, ticket_type: null, thumbnail: inferThumbnailByCategory(category, itemKind), itemConfidence: Math.min(confidence, 0.58), item_confidence: Math.min(confidence, 0.58), sourceCredibility: "low", source_credibility: "low", needsReview: true, needs_review: true, reviewReason: "heuristic extraction from limited source text", review_reason: "heuristic extraction from limited source text", evidence: [{ type: "metadata", value: name }], reason: "Derived from source text segment only." });
    if (items.length >= 8) break;
  }
  return items;
}

export function cheapHeuristicAnalysis({ sourceTitle, sourcePlatform, mergedText, cityHint, typeHint }) {
  const text = String(mergedText || "").toLowerCase();
  let eventScore = 0;
  let spotScore = 0;
  EVENT_KEYWORDS.forEach((k) => { if (text.includes(k)) eventScore += 1; });
  SPOT_KEYWORDS.forEach((k) => { if (text.includes(k)) spotScore += 1; });
  const contentKind = inferContentKind({ eventScore, spotScore, typeHint });
  const confidence = inferHeuristicConfidence({ eventScore, spotScore, contentKind, typeHint });
  const citySlug = inferCitySlug(text, cityHint || null);
  const reviewReason = buildHeuristicReviewReason({ confidence, contentKind, mergedText });
  const items = buildHeuristicItems({ mergedText, contentKind, citySlug: citySlug || null, area: null, confidence });
  return { schemaVersion: "2.0", sourceTitle, sourcePlatform, contentKind, citySlug: citySlug || null, area: null, confidence, needsReview: Boolean(reviewReason), summary: "", reviewReason, sourceCredibility: mergedText?.length > 120 ? "medium" : "low", source_credibility: mergedText?.length > 120 ? "medium" : "low", extractionMode: "metadata_plus_notes", extraction_mode: "metadata_plus_notes", sourceEvidence: mergedText ? [{ type: "metadata", value: mergedText.slice(0, 220) }] : [], source_evidence: mergedText ? [{ type: "metadata", value: mergedText.slice(0, 220) }] : [], items };
}

export function shouldUseOpenAI(heuristic, mergedText) {
  if (!mergedText || mergedText.length < 20) return false;
  if (heuristic.contentKind === "mixed") return true;
  if (heuristic.confidence >= 0.8 && !heuristic.needsReview) return false;
  return true;
}
