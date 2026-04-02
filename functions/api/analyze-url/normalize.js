export function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12);
}

export function normalizeEvidenceArray(value, fallbackText = "") {
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => {
        if (typeof entry === "string") {
          const text = entry.trim();
          return text ? { type: "note", value: text } : null;
        }
        if (!entry || typeof entry !== "object") return null;
        const type = String(entry.type || entry.kind || "note").trim();
        const text = String(entry.value || entry.text || "").trim();
        if (!text) return null;
        return { type, value: text.slice(0, 300) };
      })
      .filter(Boolean);
    if (normalized.length) return normalized;
  }
  if (fallbackText) return [{ type: "metadata", value: String(fallbackText).slice(0, 220) }];
  return [];
}

export function normalizeNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function normalizeConfidence(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num < 0) return 0;
  if (num > 1) return 1;
  return num;
}

function inferItemKind(item, fallbackContentKind) {
  const explicit = String(item?.itemKind || item?.item_kind || "").trim();
  if (explicit === "spot" || explicit === "event" || explicit === "source_only") return explicit;
  if (item?.starts_on || item?.ends_on || item?.start_time || item?.end_time || item?.price_note || item?.ticket_type || item?.venue_name) return "event";
  if (fallbackContentKind === "spot" || fallbackContentKind === "event") return fallbackContentKind;
  return "source_only";
}

function normalizeAIItem(item, index, fallbackContentKind, fallbackCitySlug, fallbackArea, fallbackText) {
  const itemKind = inferItemKind(item, fallbackContentKind);
  const citySlug = item?.citySlug || item?.city_slug || fallbackCitySlug || null;
  const sourceCredibility = item?.sourceCredibility || item?.source_credibility || "medium";
  const itemConfidence = normalizeConfidence(item?.itemConfidence ?? item?.item_confidence, 0.55);
  const needsReview = item?.needsReview !== false && item?.needs_review !== false;
  const reviewReason = item?.reviewReason || item?.review_reason || (needsReview ? "item evidence requires review" : null);
  const stayMinutesRaw = item?.stay_minutes;
  const stayMinutes = stayMinutesRaw === null || stayMinutesRaw === undefined || stayMinutesRaw === "" ? null : Number.isFinite(stayMinutesRaw) ? stayMinutesRaw : Number.isFinite(Number(stayMinutesRaw)) ? Number(stayMinutesRaw) : null;
  const normalizedName = String(item?.name || "").trim();
  return {
    id: item?.id || `analysis-item-${index + 1}`,
    name: normalizedName || null,
    itemKind,
    item_kind: itemKind,
    category: String(item?.category || (itemKind === "event" ? "活動" : itemKind === "spot" ? "景點" : "")).trim(),
    description: String(item?.description || "").trim(),
    tags: normalizeStringArray(item?.tags),
    citySlug,
    city_slug: citySlug,
    area: String(item?.area || fallbackArea || "").trim() || null,
    best_time: item?.best_time || null,
    stay_minutes: stayMinutes,
    starts_on: item?.starts_on || null,
    ends_on: item?.ends_on || null,
    start_time: item?.start_time || "",
    end_time: item?.end_time || "",
    lat: normalizeNullableNumber(item?.lat),
    lng: normalizeNullableNumber(item?.lng),
    map_url: item?.map_url || null,
    official_url: item?.official_url || null,
    venue_name: item?.venue_name || null,
    price_note: item?.price_note || null,
    ticket_type: item?.ticket_type || null,
    thumbnail: item?.thumbnail || null,
    itemConfidence,
    item_confidence: itemConfidence,
    sourceCredibility,
    source_credibility: sourceCredibility,
    needsReview,
    needs_review: needsReview,
    reviewReason,
    review_reason: reviewReason,
    evidence: normalizeEvidenceArray(item?.evidence, fallbackText),
    reason: String(item?.reason || "").trim(),
  };
}

export function normalizeAIResult(aiResult, heuristic, sourceTitle, sourcePlatform, mergedText) {
  const contentKindRaw = aiResult?.contentKind || aiResult?.content_kind || heuristic.contentKind;
  const contentKind = ["spot","event","mixed","source_only"].includes(contentKindRaw) ? contentKindRaw : heuristic.contentKind;
  const citySlug = aiResult?.citySlug || aiResult?.city_slug || heuristic.citySlug || null;
  const area = aiResult?.area || heuristic.area || null;
  const confidence = normalizeConfidence(aiResult?.confidence, heuristic.confidence);
  const needsReview = aiResult?.needsReview !== false && aiResult?.needs_review !== false;
  const reviewReason = aiResult?.reviewReason || aiResult?.review_reason || heuristic.reviewReason || null;
  const sourceCredibility = aiResult?.sourceCredibility || aiResult?.source_credibility || heuristic.sourceCredibility || "medium";
  const extractionMode = aiResult?.extractionMode || aiResult?.extraction_mode || heuristic.extractionMode || "mixed";
  const sourceEvidence = normalizeEvidenceArray(aiResult?.sourceEvidence || aiResult?.source_evidence, mergedText);
  const itemsRaw = Array.isArray(aiResult?.items) ? aiResult.items : [];
  const items = itemsRaw.map((item, index) => normalizeAIItem(item, index, contentKind, citySlug, area, mergedText));
  return {
    schemaVersion: "2.0",
    sourceTitle,
    sourcePlatform,
    contentKind,
    citySlug,
    area,
    confidence,
    needsReview,
    summary: String(aiResult?.summary || "").trim(),
    reviewReason,
    sourceCredibility,
    source_credibility: sourceCredibility,
    extractionMode,
    extraction_mode: extractionMode,
    sourceEvidence,
    source_evidence: sourceEvidence,
    items,
  };
}
