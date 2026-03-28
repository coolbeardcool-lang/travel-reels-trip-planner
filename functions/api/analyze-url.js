export async function onRequestPost(context) {
  removeKeys.forEach((key) => url.searchParams.delete(key));
  url.hash = "";
  let normalized = url.toString();
  if (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  return normalized;
}

function truncate(value, max) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function matchTag(html, regex) {
  const match = html.match(regex);
  return match?.[1]?.trim() || "";
}

function matchMeta(html, name) {
  const regex = new RegExp(
    `<meta[^>]+name=["']${escapeRegex(name)}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  return html.match(regex)?.[1]?.trim() || "";
}

function matchMetaProperty(html, property) {
  const regex = new RegExp(
    `<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  return html.match(regex)?.[1]?.trim() || "";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCitySlugValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const map = {
    京都: "kyoto",
    大阪: "osaka",
    東京: "tokyo",
    福岡: "fukuoka",
    沖繩: "okinawa",
  };
  return map[raw] || raw.toLowerCase();
}

async function sha256(input) {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getCachedAnalysis(env, key) {
  if (!env.ANALYSIS_CACHE) return null;
  return await env.ANALYSIS_CACHE.get(key, "json");
}

async function setCachedAnalysis(env, key, value) {
  if (!env.ANALYSIS_CACHE) return;
  await env.ANALYSIS_CACHE.put(key, JSON.stringify(value), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
