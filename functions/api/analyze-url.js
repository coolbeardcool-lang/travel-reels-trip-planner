export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const rawUrl = String(body?.url || "").trim();
    const hints = body?.hints || {};

    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      return json(
        { message: "url 不可空白，且必須是 http/https 網址。" },
        400
      );
    }

    if (!context.env.OPENAI_API_KEY) {
      return json({ message: "OPENAI_API_KEY 尚未設定。" }, 500);
    }

    const normalizedUrl = normalizeUrl(rawUrl);
    const analysisId = await sha256(normalizedUrl);

    const cached = await getCachedAnalysis(context.env, analysisId);
    if (cached) {
      return json({
        ...cached,
        cached: true,
        analysis_id: analysisId,
      });
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
      scraped.title,
      scraped.description,
      scraped.ogTitle,
      scraped.ogDescription,
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

    if (!shouldUseOpenAI(heuristic, mergedText)) {
      await setCachedAnalysis(context.env, analysisId, heuristic);
      return json({
        ...heuristic,
        cached: false,
        analysis_id: analysisId,
      });
    }
}
