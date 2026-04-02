export async function sha256(str) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

export async function getCachedAnalysis(env, analysisId) {
  if (!env.ANALYSIS_CACHE) return null;
  try {
    return await env.ANALYSIS_CACHE.get(analysisId, { type: "json" });
  } catch {
    return null;
  }
}

export async function setCachedAnalysis(env, analysisId, data) {
  if (!env.ANALYSIS_CACHE) return;
  try {
    await env.ANALYSIS_CACHE.put(analysisId, JSON.stringify(data), {
      expirationTtl: 86400,
    });
  } catch {}
}
