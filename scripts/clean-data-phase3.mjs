import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const allPath = path.join(root, "public/data/all.json");

const CITY_ALIAS_TO_SLUG = {
  京都: "kyoto",
  大阪: "osaka",
  首爾: "seoul",
  彰化: "changhua",
  kyoto: "kyoto",
  osaka: "osaka",
  seoul: "seoul",
  changhua: "changhua",
};

const AREA_NORMALIZATION = {
  "Mapo-gu": "麻浦區",
};

const STATUS_PRIORITY = { "已匯入": 3, "待整理": 2, "": 1 };
const SOURCE_TYPE_PRIORITY = { "活動資訊": 5, "景點美食": 4, "影片": 3, "文章": 3, "手動整理": 2, "": 1 };
const PLATFORM_PRIORITY = { "Instagram": 5, "Instagram Reel": 4, "Threads": 4, "Website": 2, "Manual": 1, "": 0 };

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function flatten(value) {
  if (!Array.isArray(value)) return [];
  return value.flat(Infinity);
}

function normalizeSlug(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return CITY_ALIAS_TO_SLUG[v] || v.toLowerCase();
}

function isLikelyId(value) {
  return typeof value === "string" && /^[a-z0-9-]{20,}$/i.test(value);
}

function normalizeName(value) {
  return String(value || "")
    .replace(/[\s（）()・｜|／/\-]+/g, "")
    .toLowerCase();
}

function isGenericTitle(value) {
  return (
    value.startsWith("Instagram 來源") ||
    value.startsWith("Website 景點") ||
    value.endsWith("Reel") ||
    value.includes("範例")
  );
}

function chooseBest(values, priority = null, genericFilter = false) {
  let uniq = [...new Set(values.filter((v) => v !== null && v !== undefined && v !== ""))];
  if (!uniq.length) return "";
  if (genericFilter) {
    const nonGeneric = uniq.filter((v) => !isGenericTitle(v));
    if (nonGeneric.length) uniq = nonGeneric;
  }
  if (priority) {
    uniq.sort((a, b) => (priority[b] || 0) - (priority[a] || 0) || String(b).length - String(a).length);
    return uniq[0];
  }
  uniq.sort((a, b) => String(b).length - String(a).length);
  return uniq[0];
}

function noteSimilarity(a, b) {
  const at = new Set(String(a).match(/[\u4e00-\u9fffA-Za-z0-9]+/g) || []);
  const bt = new Set(String(b).match(/[\u4e00-\u9fffA-Za-z0-9]+/g) || []);
  if (!at.size || !bt.size) return 0;
  let overlap = 0;
  for (const token of at) {
    if (bt.has(token)) overlap += 1;
  }
  return overlap / Math.max(1, Math.min(at.size, bt.size));
}

function synthesizeNote(notes) {
  let uniq = [...new Set(notes.map((n) => String(n || "").trim()).filter(Boolean))];
  if (!uniq.length) return "";
  uniq = uniq.filter((n) => !uniq.some((m) => m !== n && m.includes(n)));
  if (uniq.length === 1) return uniq[0];
  const longest = uniq.slice().sort((a, b) => b.length - a.length)[0];
  if (uniq.every((n) => n === longest || noteSimilarity(longest, n) >= 0.6)) {
    return longest;
  }
  const clauses = [];
  for (const note of uniq) {
    for (const clause of note.split(/[。；;]+/)) {
      const v = clause.trim();
      if (v && !clauses.includes(v)) clauses.push(v);
    }
  }
  if (!clauses.length) return longest;
  if (clauses.length === 1) return clauses[0];
  return clauses.slice(0, 3).join("；");
}

function buildNameIndex(items) {
  const map = new Map();
  for (const item of items) {
    const key = normalizeName(item.name);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item.id);
  }
  return map;
}

function resolveRelationList(values, nameIndex) {
  const out = [];
  for (const entry of flatten(values)) {
    if (typeof entry !== "string") continue;
    const parts = entry.includes(";") ? entry.split(";") : [entry];
    for (const part of parts.map((v) => v.trim()).filter(Boolean)) {
      if (isLikelyId(part)) {
        out.push(part);
        continue;
      }
      const ids = nameIndex.get(normalizeName(part)) || [];
      out.push(...ids);
    }
  }
  return [...new Set(out)];
}

function main() {
  const all = readJson(allPath);
  const spotNameIndex = buildNameIndex(all.spots || []);
  const eventNameIndex = buildNameIndex(all.events || []);

  const refCount = new Map();
  for (const item of [...(all.spots || []), ...(all.events || [])]) {
    const sourceId = item.sourceId;
    refCount.set(sourceId, (refCount.get(sourceId) || 0) + 1);
  }

  const groups = new Map();
  for (const source of all.sources || []) {
    const key = source.url ? `url:${String(source.url).trim()}` : `title:${String(source.title).trim()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(source);
  }

  const mergedSources = [];
  const oldToNew = new Map();

  for (const group of groups.values()) {
    const sorted = group.slice().sort((a, b) => {
      const aScore = (refCount.get(a.id) || 0) + flatten(a.relatedSpotIds).length + flatten(a.relatedEventIds).length;
      const bScore = (refCount.get(b.id) || 0) + flatten(b.relatedSpotIds).length + flatten(b.relatedEventIds).length;
      return bScore - aScore || String(b.note || "").length - String(a.note || "").length;
    });

    const canonical = { ...sorted[0] };
    canonical.title = chooseBest(group.map((s) => s.title || ""), null, true) || canonical.title;
    canonical.note = synthesizeNote(group.map((s) => s.note || ""));
    canonical.platform = chooseBest(group.map((s) => s.platform || ""), PLATFORM_PRIORITY) || canonical.platform;
    canonical.sourceType = chooseBest(group.map((s) => s.sourceType || ""), SOURCE_TYPE_PRIORITY) || canonical.sourceType;
    canonical.status = chooseBest(group.map((s) => s.status || ""), STATUS_PRIORITY) || canonical.status;
    canonical.authorOrAccount = chooseBest(group.map((s) => s.authorOrAccount || "")) || canonical.authorOrAccount;
    canonical.capturedAt = chooseBest(group.map((s) => s.capturedAt || "")) || canonical.capturedAt;

    canonical.cityHints = [...new Set(group.flatMap((s) => flatten(s.cityHints).map(normalizeSlug).filter(Boolean)))];
    canonical.relatedCityIds = [...new Set(group.flatMap((s) => flatten(s.relatedCityIds).map(normalizeSlug).filter(Boolean)))];
    if (!canonical.relatedCityIds.length) canonical.relatedCityIds = [...canonical.cityHints];
    canonical.relatedSpotIds = [...new Set(group.flatMap((s) => resolveRelationList(s.relatedSpotIds, spotNameIndex)))];
    canonical.relatedEventIds = [...new Set(group.flatMap((s) => resolveRelationList(s.relatedEventIds, eventNameIndex)))];

    mergedSources.push(canonical);
    for (const source of group) oldToNew.set(source.id, canonical.id);
  }

  const sourceById = new Map(mergedSources.map((s) => [s.id, s]));
  const titleToCanonicalId = new Map();
  for (const source of mergedSources) titleToCanonicalId.set(source.title, source.id);
  for (const source of all.sources || []) {
    if (oldToNew.has(source.id)) titleToCanonicalId.set(source.title, oldToNew.get(source.id));
  }

  for (const item of [...(all.spots || []), ...(all.events || [])]) {
    const newSourceId = oldToNew.get(item.sourceId) || titleToCanonicalId.get(item.sourceId) || item.sourceId;
    const source = sourceById.get(newSourceId);
    if (source) {
      item.sourceId = source.id;
      item.sourceTitle = source.title;
      item.sourceUrl = source.url;
    }
    if (AREA_NORMALIZATION[item.area]) {
      item.area = AREA_NORMALIZATION[item.area];
    }
  }

  all.sources = mergedSources;
  all.meta.count = mergedSources.length;
  writeJson(allPath, all);

  console.log(`✅ cleaned public/data/all.json`);
  console.log(`   merged sources: ${groupedCount(groups)} groups from ${(all.sources || []).length} current rows`);
}

function groupedCount(groups) {
  return [...groups.values()].length;
}

main();
