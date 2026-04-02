import { sha256, getCachedAnalysis, setCachedAnalysis } from "./analyze-url/cache.js";
import { scrapeUrl } from "./analyze-url/scrape.js";
import { detectPlatform, normalizeUrl } from "./analyze-url/platform.js";
import { cheapHeuristicAnalysis, shouldUseOpenAI } from "./analyze-url/heuristics.js";
import { normalizeAIResult } from "./analyze-url/normalize.js";
import { callOpenAI } from "./analyze-url/ai.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  };

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const rawUrl = String(body?.url || "").trim();
  const hints = body?.hints || {};

  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    return new Response(
      JSON.stringify({ message: "url 不可空白，且必須是 http/https 網址。" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const normalizedUrl = normalizeUrl(rawUrl);
  const analysisId = await sha256(normalizedUrl);

  const cached = await getCachedAnalysis(env, analysisId);
  if (cached) {
    return new Response(
      JSON.stringify({
        ...cached,
        cached: true,
        analysis_id: analysisId,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  const scraped = await scrapeUrl(normalizedUrl);
  const sourcePlatform = detectPlatform(normalizedUrl);
  const sourceTitle =
    String(hints.title || "").trim() ||
    scraped.ogTitle ||
    scraped.title ||
    "未命名來源";

  const mergedText = [
    sourceTitle,
    scraped.ogTitle,
    scraped.ogDescription,
    scraped.title,
    scraped.description,
    hints.notes || "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const heuristic = cheapHeuristicAnalysis({
    sourceTitle,
    sourcePlatform,
    mergedText,
    cityHint: hints.citySlug || "",
    typeHint: hints.type || "",
  });

  let result = { ...heuristic };
  let usedAI = false;

  if (shouldUseOpenAI(heuristic, mergedText) && env.OPENAI_API_KEY) {
    try {
      const aiResult = await callOpenAI(
        env.OPENAI_API_KEY,
        normalizedUrl,
        mergedText,
        heuristic.contentKind,
        sourcePlatform
      );

      result = normalizeAIResult(
        aiResult,
        heuristic,
        sourceTitle,
        sourcePlatform,
        mergedText
      );
      usedAI = true;
    } catch {
      result = {
        ...heuristic,
        needsReview: true,
        reviewReason: heuristic.reviewReason || "ai parsing failed; fallback to heuristic result",
      };
    }
  } else if (shouldUseOpenAI(heuristic, mergedText) && !env.OPENAI_API_KEY) {
    result = {
      ...heuristic,
      needsReview: true,
      reviewReason:
        heuristic.reviewReason || "OPENAI_API_KEY not set; fallback to heuristic result",
    };
  }

  await setCachedAnalysis(env, analysisId, result);

  return new Response(
    JSON.stringify({
      ...result,
      cached: false,
      analysis_id: analysisId,
      _usedAI: usedAI,
    }),
    { status: 200, headers: corsHeaders }
  );
}
