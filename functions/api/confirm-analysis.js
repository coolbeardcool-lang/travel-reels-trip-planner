export async function onRequestPost(context) {
  try {
    const env = context.env;
    const body = await context.request.json();

    const url = String(body?.url || "").trim();
    const sourceTitle = String(body?.sourceTitle || "").trim() || "未命名來源";
    const notes = String(body?.notes || "").trim();
    const analysis = body?.analysis || {};

    if (!url || !/^https?:\/\//i.test(url)) {
      return json(
        { message: "url 不可空白，且必須是 http/https 網址。" },
        400
      );
    }

    if (!env.NOTION_TOKEN || !env.NOTION_SOURCES_DATA_SOURCE_ID) {
      return json(
        { message: "Notion 環境變數尚未設定。" },
        500
      );
    }

    const platform = String(analysis.sourcePlatform || "Website");
    const contentKind = String(analysis.contentKind || "source_only");
    const citySlug = String(analysis.citySlug || "");
    const summary = String(analysis.summary || "");
    const confidence = Number(analysis.confidence || 0);
    const items = Array.isArray(analysis.items) ? analysis.items : [];

    const notionPayload = {
      parent: {
        data_source_id: env.NOTION_SOURCES_DATA_SOURCE_ID,
      },
      properties: {
        Name: {
          title: [{ text: { content: sourceTitle } }],
        },
        SourceUrl: {
          url,
        },
        Platform: {
          select: { name: platform },
        },
        SourceType: {
          select: { name: "手動整理" },
        },
        Status: {
          status: { name: "待整理" },
        },
        Note: {
          rich_text: [
            {
              text: {
                content: [
                  notes,
                  summary,
                  `kind=${contentKind}`,
                  citySlug ? `city=${citySlug}` : "",
                  `confidence=${confidence}`,
                  items.length ? `items=${items.map((i) => i.name).join(" / ")}` : "",
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            },
          ],
        },
      },
    };

    const notionResp = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(notionPayload),
    });

    const notionJson = await notionResp.json();

    if (!notionResp.ok) {
      return json(
        {
          message: notionJson?.message || "寫入 Notion 失敗。",
          notion: notionJson,
        },
        500
      );
    }

    return json({
      message: "已確認寫入 Sources。下一步可再擴充成同步建立 Spots / Events。",
      notionPageId: notionJson?.id || null,
    });
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "確認寫入失敗。",
      },
      500
    );
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
