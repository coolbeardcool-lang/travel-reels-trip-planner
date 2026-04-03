import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const allPath = path.join(root, "public/data/all.json");
const citiesPath = path.join(root, "public/data/cities/index.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isFlatArray(value) {
  return Array.isArray(value) && value.every((item) => !Array.isArray(item));
}

function isLikelyId(value) {
  return typeof value === "string" && /^[a-z0-9-]{20,}$/i.test(value);
}

function hasLatinAdminToken(value) {
  return typeof value === "string" && /\b(?:-gu|-si|-dong|-gun|-ku|-do)\b/i.test(value);
}

function toIssue(issues, type, message, sample = null) {
  issues.push({ type, message, sample });
}

function main() {
  const all = readJson(allPath);
  const citiesIndex = readJson(citiesPath);
  const issues = [];

  const indexSlugs = new Set((citiesIndex.cities || []).map((c) => String(c.slug || "").trim()).filter(Boolean));
  const spotCitySlugs = new Set((all.spots || []).map((s) => String(s.citySlug || "").trim()).filter(Boolean));
  const eventCitySlugs = new Set((all.events || []).map((e) => String(e.citySlug || "").trim()).filter(Boolean));
  const allDataSlugs = new Set([...spotCitySlugs, ...eventCitySlugs].filter((slug) => slug !== "all"));

  for (const slug of allDataSlugs) {
    if (!indexSlugs.has(slug)) {
      toIssue(issues, "city-index-mismatch", `Missing city slug in public/data/cities/index.json: ${slug}`, { slug });
    }
  }

  const sourceKeyMap = new Map();
  for (const source of all.sources || []) {
    const title = String(source.title || "").trim();
    const url = String(source.url || "").trim();
    if (!title && !url) continue;
    const key = `${title} || ${url}`;
    if (!sourceKeyMap.has(key)) sourceKeyMap.set(key, []);
    sourceKeyMap.get(key).push(source.id);
  }
  for (const [key, ids] of sourceKeyMap.entries()) {
    if (ids.length > 1) {
      toIssue(issues, "duplicate-source", `Duplicate source rows share the same title + url: ${key}`, { ids });
    }
  }

  for (const source of all.sources || []) {
    const relCity = source.relatedCityIds;
    if (Array.isArray(relCity) && !isFlatArray(relCity)) {
      toIssue(issues, "nested-relatedCityIds", `Source ${source.id} has nested relatedCityIds`, relCity);
    }

    const relFields = [
      ["relatedSpotIds", source.relatedSpotIds],
      ["relatedEventIds", source.relatedEventIds],
    ];
    for (const [field, value] of relFields) {
      if (Array.isArray(value)) {
        if (!isFlatArray(value)) {
          toIssue(issues, `nested-${field}`, `Source ${source.id} has nested ${field}`, value);
          continue;
        }
        const bad = value.filter((entry) => typeof entry === "string" && (entry.includes(";") || !isLikelyId(entry)));
        if (bad.length) {
          toIssue(issues, `non-id-${field}`, `Source ${source.id} has ${field} values that are not clean IDs`, bad.slice(0, 3));
        }
      }
    }

    const cityHints = Array.isArray(source.cityHints) ? source.cityHints : [];
    const badHints = cityHints.filter((value) => typeof value === "string" && /[\u4e00-\u9fff]/.test(value));
    if (badHints.length) {
      toIssue(issues, "non-slug-cityHints", `Source ${source.id} has cityHints that are not normalized slugs`, badHints);
    }
  }

  const allItems = [...(all.spots || []), ...(all.events || [])];
  for (const item of allItems) {
    if (hasLatinAdminToken(item.area)) {
      toIssue(issues, "area-admin-token", `Item ${item.id} uses untranslated admin token in area`, { area: item.area, name: item.name });
    }
    if ((item.lat === 0 || item.lng === 0) && item.published) {
      toIssue(issues, "zero-coordinates", `Published item ${item.id} still has lat/lng = 0`, { name: item.name, citySlug: item.citySlug });
    }
  }

  const summary = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {});

  console.log("Data quality summary:");
  if (!issues.length) {
    console.log("  ✅ no issues found");
    process.exit(0);
  }

  Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

  console.log("\nSample issues:");
  issues.slice(0, 20).forEach((issue, index) => {
    console.log(`${index + 1}. [${issue.type}] ${issue.message}`);
    if (issue.sample) console.log(`   sample: ${JSON.stringify(issue.sample)}`);
  });

  process.exit(1);
}

main();
