// functions/api/confirm-analysis.js

const NOTION_VERSION = "2022-06-28";
const CITY_LABEL_MAP = {
  tokyo: "東京", kyoto: "京都", osaka: "大阪", nara: "奈良",
  okinawa: "沖繩", hokkaido: "北海道", fukuoka: "福岡",
  taipei: "台北", taichung: "台中", tainan: "台南",
  kaohsiung: "高雄", seoul: "首爾", busan: "釜山",
};
const CITY_EMOJI_MAP = {
  tokyo: "🗼", kyoto: "⛩️", osaka: "🍢", nara: "🦌",
  okinawa: "🌺", hokkaido: "🐻", fukuoka: "🍜",
  taipei: "🏙️", taichung: "🌳", tainan: "🏯",
  kaohsiung: "🌊", seoul: "🇰🇷", busan: "🌊",
};

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

    const debugInfo = {
      citySlug,
      hasCitiesDb: !!env.NOTION_CITIES_DATA_SOURCE_ID,
      cityEnsureError,
    };

let cityEnsureError = null;
    if (citySlug && env.NOTION_CITIES_DATA_SOURCE_ID) {
      try {
        await ensureCityExists(env, citySlug);
      } catch (e) {
        cityEnsureError = e?.message || String(e);
      }
    }

    const sourcePage = await createSourcePage({
      env, sourceTitle, url, platform, notes,
      summary, contentKind, citySlug, confidence, items,
    });

    const created = {
      sourcePageId: sourcePage?.id || null,
      spots: [],
      events: [],
    };

    if (contentKind === "spot" && env.NOTION_SPOTS_DATA_SOURCE_ID) {
      for (const item of items) {
        const spotPage = await createSpotPage({ env, item, citySlug, sourceUrl: url });
        created.spots.push({ id: spotPage?.id || null, name: item.name || "未命名景點" });
      }
    }

    if (contentKind === "event" && env.NOTION_EVENTS_DATA_SOURCE_ID) {
      for (const item of items) {
        const eventPage = await createEventPage({ env, item, citySlug, sourceUrl: url });
        created.events.push({ id: eventPage?.id || null, name: item.name || "未命名活動" });
      }
    }

    let dispatched = false;
    if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO) {
      dispatched = await triggerGitHubDispatch(env);
    }

    return json({ message: "已確認寫入。", created, dispatched, debugInfo });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "確認寫入失敗。" }, 500);
  }
}

// ── 自動確保城市存在 ───────────────────────────────────────
async function ensureCityExists(env, citySlug) {
  try {
    const res = await fetch(
      `https://api.notion.com/v1/data_sources/${env.NOTION_CITIES_DATA_SOURCE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": NOTION_VERSION,
        },
        body: JSON.stringify({ page_size: 100 }),
      }
    );

    if (!res.ok) return;

    const data = await res.json();
    const pages = data.results || [];

    const existingSlugs = pages.map((page) => {
      const slugProp = page.properties?.Slug;
      if (slugProp?.type === "rich_text") {
        return (slugProp.rich_text || []).map((r) => r.plain_text || "").join("").trim().toLowerCase();
      }
      return "";
    }).filter(Boolean);

    if (existingSlugs.includes(citySlug.toLowerCase())) return;

    const label = CITY_LABEL_MAP[citySlug] || citySlug;
    const emoji = CITY_EMOJI_MAP[citySlug] || "📍";

    await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        parent: { data_source_id: env.NOTION_CITIES_DATA_SOURCE_ID },
        properties: {
          Name: { title: [{ text: { content: label } }] },
          Slug: { rich_text: [{ text: { content: citySlug } }] },
          Emoji: { rich_text: [{ text: { content: emoji } }] },
          Published: { checkbox: false },
        },
      }),
    });
  } catch (e) {
    throw new Error("ensureCityExists failed: " + (e?.message || String(e)));
  }
}

// ── Sources ────────────────────────────────────────────────
async function createSourcePage({
  env, sourceTitle, url, platform, notes,
  summary, contentKind, citySlug, confidence, items,
}) {
  const noteContent = [
    notes,
    summary,
    `kind=${contentKind}`,
    citySlug ? `city=${citySlug}` : "",
    `confidence=${confidence}`,
    items.length ? `items=${items.map((i) => i.name).join(" / ")}` : "",
  ].filter(Boolean).join("\n");

  const payload = {
    parent: { data_source_id: env.NOTION_SOURCES_DATA_SOURCE_ID },
    properties: {
      Name: { title: [{ text: { content: sourceTitle.slice(0, 200) } }] },
      SourceUrl: { url },
      Platform: { rich_text: [{ text: { content: platform } }] },
      SourceType: { rich_text: [{ text: { content: "手動整理" } }] },
      Status: { rich_text: [{ text: { content: "已匯入" } }] },
      Note: { rich_text: [{ text: { content: noteContent.slice(0, 2000) } }] },
      Published: { checkbox: false },
    },
  };

  return await notionCreatePage(env, payload);
}

// ── Spots ──────────────────────────────────────────────────
async function createSpotPage({ env, item, citySlug, sourceUrl }) {
  const tags = Array.isArray(item.tags) ? item.tags.join(", ") : "";
  const cityLabel = CITY_LABEL_MAP[citySlug] || citySlug;

  const payload = {
    parent: { data_source_id: env.NOTION_SPOTS_DATA_SOURCE_ID },
    properties: {
      Name: { title: [{ text: { content: String(item.name || "未命名景點").slice(0, 200) } }] },
      Area: { rich_text: [{ text: { content: String(item.area || "") } }] },
      BestTime: { rich_text: [{ text: { content: String(item.best_time || "") } }] },
      Category: { rich_text: [{ text: { content: String(item.category || "景點") } }] },
      City: { select: { name: cityLabel || "未分類" } },
      CitySlug: { select: { name: String(citySlug || "未分類") } },
      Description: { rich_text: [{ text: { content: String(item.description || "").slice(0, 2000) } }] },
      MapUrl: { url: String(item.map_url || sourceUrl || "") || null },
      Notes: { rich_text: [{ text: { content: String(item.reason || "") } }] },
      PriorityScore: { number: 0 },
      Published: { checkbox: false },
      StayMinutes: { number: Number(item.stay_minutes || 60) },
      Tags: { rich_text: [{ text: { content: tags } }] },
      Thumbnail: { rich_text: [{ text: { content: String(item.thumbnail || "📍") } }] },
    },
  };

  return await notionCreatePage(env, payload);
}

// ── Events ─────────────────────────────────────────────────
async function createEventPage({ env, item, citySlug, sourceUrl }) {
  const tags = Array.isArray(item.tags) ? item.tags.join(", ") : "";
  const cityLabel = CITY_LABEL_MAP[citySlug] || citySlug;

  const payload = {
    parent: { data_source_id: env.NOTION_EVENTS_DATA_SOURCE_ID },
    properties: {
      Name: { title: [{ text: { content: String(item.name || "未命名活動").slice(0, 200) } }] },
      Area: { rich_text: [{ text: { content: String(item.area || "") } }] },
      Category: { select: { name: String(item.category || "活動") } },
      City: { rich_text: [{ text: { content: cityLabel } }] },
      CitySlug: { rich_text: [{ text: { content: String(citySlug || "") } }] },
      Description: { rich_text: [{ text: { content: String(item.description || "").slice(0, 2000) } }] },
      EndTimeText: { rich_text: [{ text: { content: String(item.end_time || "") } }] },
      EndsOn: item.ends_on ? { date: { start: String(item.ends_on) } } : { date: null },
      MapUrl: { url: String(item.map_url || "") || null },
      OfficialUrl: { url: String(item.official_url || sourceUrl || "") || null },
      PriceNote: { rich_text: [{ text: { content: String(item.price_note || "") } }] },
      Published: { checkbox: false },
      RecurringType: { select: { name: "一次性" } },
      StartTimeText: { rich_text: [{ text: { content: String(item.start_time || "") } }] },
      StartsOn: item.starts_on ? { date: { start: String(item.starts_on) } } : { date: null },
      Status: { select: { name: "待整理" } },
      Tags: { rich_text: [{ text: { content: tags } }] },
      TicketType: { rich_text: [{ text: { content: String(item.ticket_type || "") } }] },
      VenueName: { rich_text: [{ text: { content: String(item.venue_name || "") } }] },
    },
  };

  return await notionCreatePage(env, payload);
}

// ── Notion API ─────────────────────────────────────────────
async function notionCreatePage(env, payload) {
  const resp = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify(payload),
  });

  const jsonBody = await resp.json();
  if (!resp.ok) throw new Error(jsonBody?.message || "寫入 Notion 失敗。");
  return jsonBody;
}

// ── GitHub Actions ─────────────────────────────────────────
async function triggerGitHubDispatch(env) {
  const resp = await fetch(
    `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "TravelReelsBot/1.0",
      },
      body: JSON.stringify({ event_type: "sync_notion_after_reel_submit" }),
    }
  );
  return resp.ok;
}

// ── 工具 ───────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
