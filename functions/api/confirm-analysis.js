export async function onRequestPost(context) {
  try {
    const env = context.env;
    const body = await context.request.json();

    const url = String(body?.url || "").trim();
    const sourceTitle = String(body?.sourceTitle || "").trim() || "未命名來源";
    const notes = String(body?.notes || "").trim();
    const analysisId = String(body?.analysisId || "").trim();
    const analysis = body?.analysis || {};

    if (!url || !/^https?:\/\//i.test(url)) {
      return json(
        { message: "url 不可空白，且必須是 http/https 網址。" },
        400
      );
    }

    if (!analysis || typeof analysis !== "object") {
      return json({ message: "缺少 analysis，請先完成分析。" }, 400);
    }

    if (!analysis.contentKind || !analysis.sourcePlatform) {
      return json({ message: "analysis 格式不完整，請重新分析。" }, 400);
    }

    if (!env.NOTION_TOKEN || !env.NOTION_SOURCES_DATA_SOURCE_ID) {
      return json({ message: "Notion 環境變數尚未設定。" }, 500);
    }

    const platform = String(analysis.sourcePlatform || "Website");
    const contentKind = String(analysis.contentKind || "source_only");
    const citySlug = String(analysis.citySlug || "");
    const summary = String(analysis.summary || "");
    const confidence = Number(analysis.confidence || 0);
    const items = Array.isArray(analysis.items) ? analysis.items : [];

}
