export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const { url, title, type, citySlug, notes } = body || {};

    if (!url || !String(url).startsWith("http")) {
      return Response.json(
        { ok: false, message: "url 不可空白，且必須是 http/https 網址。" },
        { status: 400 }
      );
    }

    const notionToken = context.env.NOTION_TOKEN;
    const notionSourcesDataSourceId = context.env.NOTION_SOURCES_DATA_SOURCE_ID;
    const githubToken = context.env.GITHUB_TOKEN;
    const githubOwner = context.env.GITHUB_OWNER;
    const githubRepo = context.env.GITHUB_REPO;

    if (!notionToken || !notionSourcesDataSourceId) {
      return Response.json(
        { ok: false, message: "Notion 環境變數尚未設定。" },
        { status: 500 }
      );
    }

    // 1) 寫入 Notion Sources
    const notionResp = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      body: JSON.stringify({
        parent: {
          data_source_id: notionSourcesDataSourceId
        },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: title?.trim() || "待整理 Reel"
                }
              }
            ]
          },
          SourceUrl: {
            url
          },
          Platform: {
            select: {
              name: "Instagram Reel"
            }
          },
          SourceType: {
            select: {
              name: type === "event" ? "影片" : "影片"
            }
          },
          Status: {
            status: {
              name: "待整理"
            }
          },
          Note: {
            rich_text: [
              {
                text: {
                  content: `citySlug=${citySlug || ""}\nnotes=${notes || ""}`
                }
              }
            ]
          }
        }
      })
    });

    const notionData = await notionResp.json();

    if (!notionResp.ok) {
      return Response.json(
        {
          ok: false,
          message: notionData?.message || "寫入 Notion 失敗",
          detail: notionData
        },
        { status: 500 }
      );
    }

    // 2) 觸發 GitHub Actions 同步
    if (githubToken && githubOwner && githubRepo) {
      await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${githubToken}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_type: "sync_notion_after_reel_submit",
          client_payload: {
            source_url: url,
            city_slug: citySlug || "",
            type: type || "spot"
          }
        })
      });
    }

    return Response.json({
      ok: true,
      message: "已送出 Reel，來源已寫入 Notion，後續會觸發同步流程。",
      notion_page_id: notionData?.id || null
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "未知錯誤"
      },
      { status: 500 }
    );
  }
}
