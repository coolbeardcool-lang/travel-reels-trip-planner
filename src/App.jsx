export async function onRequestPost(context) {
  try {
    const env = context.env;
    const body = await context.request.json();

    const url = String(body?.url || "").trim();
    const sourceTitle = String(body?.sourceTitle || "").trim() || "未命名來源";
    const notes = String(body?.notes || "").trim();
    const analysis = body?.analysis || {};

    if (!url || !/^https?:\/\//i.test(url)) {
      return json({ message: "url 不可空白，且必須是 http/https 網址。" }, 400);
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

    const sourcePage = await createSourcePage({
      env,
      sourceTitle,
      url,
      platform,
      notes,
      summary,
      contentKind,
      citySlug,
      confidence,
      items,
    });

    const created = {
      sourcePageId: sourcePage?.id || null,
      spots: [],
      events: [],
    };

    if (contentKind === "spot" && env.NOTION_SPOTS_DATA_SOURCE_ID) {
      for (const item of items) {
        const spotPage = await createSpotPage({
          env,
          item,
          citySlug,
          sourceUrl: url,
        });
        created.spots.push({
          id: spotPage?.id || null,
          name: item.name || "未命名景點",
        });
      }
    }

    if (contentKind === "event" && env.NOTION_EVENTS_DATA_SOURCE_ID) {
      for (const item of items) {
        const eventPage = await createEventPage({
          env,
          item,
          citySlug,
          sourceUrl: url,
        });
        created.events.push({
          id: eventPage?.id || null,
          name: item.name || "未命名活動",
        });
      }
    }

    let dispatched = false;
    if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO) {
      dispatched = await triggerGitHubDispatch(env);
    }

    return json({
      message: "已確認寫入。",
      created,
      dispatched,
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

async function createSourcePage({
  env,
  sourceTitle,
  url,
  platform,
  notes,
  summary,
  contentKind,
  citySlug,
  confidence,
  items,
}) {
  const payload = {
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
        status: { name: "已匯入" },
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

  return await notionCreatePage(env, payload);
}

async function createSpotPage({ env, item, citySlug, sourceUrl }) {
  const payload = {
    parent: {
      data_source_id: env.NOTION_SPOTS_DATA_SOURCE_ID,
    },
    properties: {
      Name: {
        title: [{ text: { content: String(item.name || "未命名景點") } }],
      },
      CitySlug: {
        rich_text: [{ text: { content: String(citySlug || "") } }],
      },
      Area: {
        rich_text: [{ text: { content: String(item.area || "") } }],
      },
      Category: {
        select: { name: String(item.category || "景點") },
      },
      Description: {
        rich_text: [{ text: { content: String(item.description || "") } }],
      },
      Tags: {
        multi_select: (Array.isArray(item.tags) ? item.tags : []).map((tag) => ({
          name: String(tag),
        })),
      },
      BestTime: {
        select: { name: String(item.best_time || "下午") },
      },
      StayMinutes: {
        number: Number(item.stay_minutes || 60),
      },
      MapUrl: {
        url: String(item.map_url || sourceUrl || ""),
      },
      Published: {
        checkbox: true,
      },
      Notes: {
        rich_text: [{ text: { content: String(item.reason || "") } }],
      },
    },
  };

  return await notionCreatePage(env, payload);
}

async function createEventPage({ env, item, citySlug, sourceUrl }) {
  const payload = {
    parent: {
      data_source_id: env.NOTION_EVENTS_DATA_SOURCE_ID,
    },
    properties: {
      Name: {
        title: [{ text: { content: String(item.name || "未命名活動") } }],
      },
      CitySlug: {
        rich_text: [{ text: { content: String(citySlug || "") } }],
      },
      Area: {
        rich_text: [{ text: { content: String(item.area || "") } }],
      },
      Category: {
        select: { name: String(item.category || "活動") },
      },
      Description: {
        rich_text: [{ text: { content: String(item.description || "") } }],
      },
      Tags: {
        multi_select: (Array.isArray(item.tags) ? item.tags : []).map((tag) => ({
          name: String(tag),
        })),
      },
      StartsOn: item.starts_on
        ? { date: { start: String(item.starts_on) } }
        : { date: null },
      EndsOn: item.ends_on
        ? { date: { start: String(item.ends_on) } }
        : { date: null },
      OfficialUrl: {
        url: String(item.map_url || sourceUrl || ""),
      },
      Published: {
        checkbox: true,
      },
      PriceNote: {
        rich_text: [{ text: { content: String(item.reason || "") } }],
      },
    },
  };

  return await notionCreatePage(env, payload);
}

async function notionCreatePage(env, payload) {
  const resp = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(payload),
  });

  const jsonBody = await resp.json();

  if (!resp.ok) {
    throw new Error(jsonBody?.message || "寫入 Notion 失敗。");
  }

  return jsonBody;
}

async function triggerGitHubDispatch(env) {
  const resp = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "sync_notion_after_reel_submit",
      }),
    }
  );

  return resp.ok;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
