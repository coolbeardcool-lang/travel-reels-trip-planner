// functions/api/confirm-analysis.js

const NOTION_VERSION = "2022-06-28";

const CITY_DATA_MAP = {
  tokyo:     { label: "東京",   emoji: "🗼",  region: "日本", timezone: "Asia/Tokyo",  lat: 35.6762, lng: 139.6503, sort: 10,  heroArea: "新宿／澀谷",    spotlight: "購物,美食,文化",   description: "融合傳統與現代的大都市，購物、美食與文化密度極高。" },
  kyoto:     { label: "京都",   emoji: "⛩️",  region: "日本", timezone: "Asia/Tokyo",  lat: 35.0116, lng: 135.7681, sort: 20,  heroArea: "佛光寺周邊",    spotlight: "寺社,甜點,散步",   description: "寺社、散步、甜點與選物密度高，適合慢節奏安排。" },
  osaka:     { label: "大阪",   emoji: "🍢",  region: "日本", timezone: "Asia/Tokyo",  lat: 34.6937, lng: 135.5023, sort: 30,  heroArea: "新世界／通天閣",  spotlight: "小吃,商圈,夜生活", description: "小吃、商圈與夜間行程豐富，適合美食導向安排。" },
  nara:      { label: "奈良",   emoji: "🦌",  region: "日本", timezone: "Asia/Tokyo",  lat: 34.6851, lng: 135.8048, sort: 40,  heroArea: "奈良公園",      spotlight: "景點,自然,歷史",   description: "鹿群漫步的古都，世界遺產與自然景觀並存。" },
  fukuoka:   { label: "福岡",   emoji: "🍜",  region: "日本", timezone: "Asia/Tokyo",  lat: 33.5904, lng: 130.4017, sort: 50,  heroArea: "天神／博多",    spotlight: "拉麵,美食,購物",   description: "九州最大城市，拉麵與海鮮聞名，生活感十足。" },
  hokkaido:  { label: "北海道", emoji: "🐻",  region: "日本", timezone: "Asia/Tokyo",  lat: 43.0642, lng: 141.3469, sort: 60,  heroArea: "札幌市區",      spotlight: "自然,美食,滑雪",   description: "四季分明的北國，自然景觀與乳製品美食著稱。" },
  okinawa:   { label: "沖繩",   emoji: "🌺",  region: "日本", timezone: "Asia/Tokyo",  lat: 26.2124, lng: 127.6809, sort: 70,  heroArea: "國際通",        spotlight: "海灘,文化,美食",   description: "熱帶海島風情，珊瑚礁海灘與獨特琉球文化。" },
  taipei:    { label: "台北",   emoji: "🏙️",  region: "台灣", timezone: "Asia/Taipei", lat: 25.0330, lng: 121.5654, sort: 80,  heroArea: "大安／信義",    spotlight: "美食,夜市,文化",   description: "美食、夜市與文創密度極高，交通便利易遊。" },
  taichung:  { label: "台中",   emoji: "🌳",  region: "台灣", timezone: "Asia/Taipei", lat: 24.1477, lng: 120.6736, sort: 90,  heroArea: "審計新村",      spotlight: "文創,咖啡,美食",   description: "文創咖啡廳密集，氣候宜人適合悠閒散步。" },
  tainan:    { label: "台南",   emoji: "🏯",  region: "台灣", timezone: "Asia/Taipei", lat: 22.9999, lng: 120.2269, sort: 100, heroArea: "安平古堡周邊",  spotlight: "古蹟,小吃,歷史",   description: "台灣最古老城市，古蹟與傳統小吃文化深厚。" },
  kaohsiung: { label: "高雄",   emoji: "🌊",  region: "台灣", timezone: "Asia/Taipei", lat: 22.6273, lng: 120.3014, sort: 110, heroArea: "駁二藝術特區",  spotlight: "港口,文創,美食",   description: "港都風情濃厚，文創聚落與海港夜景值得一遊。" },
  seoul:     { label: "首爾",   emoji: "🇰🇷", region: "韓國", timezone: "Asia/Seoul",  lat: 37.5665, lng: 126.9780, sort: 120, heroArea: "明洞／弘大",    spotlight: "美食,購物,文化",   description: "韓流文化發源地，美食、購物與歷史景點密集。" },
  busan:     { label: "釜山",   emoji: "🌊",  region: "韓國", timezone: "Asia/Seoul",  lat: 35.1796, lng: 129.0756, sort: 130, heroArea: "海雲台",        spotlight: "海灘,美食,文化",   description: "韓國第二大城市，海灘、海鮮與山城景觀著稱。" },
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

    // 確保城市存在
    let cityEnsureError = null;
    if (citySlug && env.NOTION_CITIES_DATA_SOURCE_ID) {
      try {
        await ensureCityExists(env, citySlug);
      } catch (e) {
        cityEnsureError = e?.message || String(e);
      }
    }

    // 先寫 Source，拿到 page ID
    const sourcePage = await createSourcePage({
      env, sourceTitle, url, platform, notes,
      summary, contentKind, citySlug, confidence, items,
    });
    const sourcePageId = sourcePage?.id || null;

    const created = {
      sourcePageId,
      spots: [],
      events: [],
    };

    const spotPageIds = [];
    const eventPageIds = [];

    // 寫 Spots，帶入 source page ID
    if (contentKind === "spot" && env.NOTION_SPOTS_DATA_SOURCE_ID) {
      for (const item of items) {
        const spotPage = await createSpotPage({
          env, item, citySlug, sourceUrl: url,
          sourcePageId, sourceTitle,
        });
        const spotId = spotPage?.id || null;
        if (spotId) spotPageIds.push(spotId);
        created.spots.push({ id: spotId, name: item.name || "未命名景點" });
      }
    }

    // 寫 Events，帶入 source page ID
    if (contentKind === "event" && env.NOTION_EVENTS_DATA_SOURCE_ID) {
      for (const item of items) {
        const eventPage = await createEventPage({
          env, item, citySlug, sourceUrl: url,
          sourcePageId, sourceTitle,
        });
        const eventId = eventPage?.id || null;
        if (eventId) eventPageIds.push(eventId);
        created.events.push({ id: eventId, name: item.name || "未命名活動" });
      }
    }

    // 回寫 Source 的 RelatedSpots / RelatedEvents
    if (sourcePageId && (spotPageIds.length > 0 || eventPageIds.length > 0)) {
      await updateSourceRelations(env, sourcePageId, spotPageIds, eventPageIds, citySlug);
    }

    let dispatched = false;
    if (env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO) {
      dispatched = await triggerGitHubDispatch(env);
    }

    return json({ message: "已確認寫入。", created, dispatched, cityEnsureError });
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : "確認寫入失敗。" }, 500);
  }
}

// ── 回寫 Source 的 relation 欄位 ──────────────────────────
async function updateSourceRelations(env, sourcePageId, spotIds, eventIds, citySlug) {
  try {
    const properties = {};

    if (spotIds.length > 0) {
      properties.RelatedSpots = {
        relation: spotIds.map((id) => ({ id })),
      };
    }
    if (eventIds.length > 0) {
      properties.RelatedEvents = {
        relation: eventIds.map((id) => ({ id })),
      };
    }
    if (citySlug) {
      properties.CityHints = {
        rich_text: [{ text: { content: citySlug } }],
      };
    }

    if (Object.keys(properties).length === 0) return;

    await fetch(`https://api.notion.com/v1/pages/${sourcePageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({ properties }),
    });
  } catch {
    // relation 回寫失敗不中斷主流程
  }
}

// ── 自動確保城市存在 ───────────────────────────────────────
async function ensureCityExists(env, citySlug) {
  try {
    const res = await fetch(
      `https://api.notion.com/v1/databases/${env.NOTION_CITIES_DATA_SOURCE_ID}/query`,
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

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cities 查詢失敗 ${res.status}: ${errText}`);
    }

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

    const city = CITY_DATA_MAP[citySlug] || {
      label: citySlug, emoji: "📍", region: "其他",
      timezone: "Asia/Tokyo", lat: 0, lng: 0, sort: 9999,
      heroArea: "", spotlight: "", description: "",
    };

    const createRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_CITIES_DATA_SOURCE_ID },
        properties: {
          Name:          { title: [{ text: { content: city.label } }] },
          Slug:          { rich_text: [{ text: { content: citySlug } }] },
          Emoji:         { rich_text: [{ text: { content: city.emoji } }] },
          Region:        { select: { name: city.region } },
          Status:        { select: { name: "active" } },
          Timezone:      { select: { name: city.timezone } },
          Description:   { rich_text: [{ text: { content: city.description } }] },
          HeroArea:      { rich_text: [{ text: { content: city.heroArea } }] },
          CoverImageUrl: { rich_text: [{ text: { content: "" } }] },
          SpotlightTags: { rich_text: [{ text: { content: city.spotlight } }] },
          SortOrder:     { number: city.sort },
          DefaultMapLat: { number: city.lat },
          DefaultMapLng: { number: city.lng },
          Published:     { checkbox: false },
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Cities 新增失敗 ${createRes.status}: ${errText}`);
    }
  } catch (e) {
    throw new Error(e?.message || String(e));
  }
}

// ── Sources ────────────────────────────────────────────────
async function createSourcePage({
  env, sourceTitle, url, platform, notes,
  summary, contentKind, citySlug, confidence, items,
}) {
  // Name 用摘要版：平台 + 城市 + summary
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const kindLabel = contentKind === "event" ? "活動" : contentKind === "spot" ? "景點" : "來源";
  const shortName = summary
    ? `${cityLabel ? cityLabel + "・" : ""}${summary}`.slice(0, 80)
    : `${platform} ${kindLabel}${cityLabel ? "・" + cityLabel : ""}`.slice(0, 80);

  const payload = {
    parent: { data_source_id: env.NOTION_SOURCES_DATA_SOURCE_ID },
    properties: {
      Name:       { title: [{ text: { content: shortName } }] },
      SourceUrl:  { url },
      Platform:   { rich_text: [{ text: { content: platform } }] },
      SourceType: { rich_text: [{ text: { content: contentKind === "event" ? "活動資訊" : contentKind === "spot" ? "景點美食" : "手動整理" } }] },
      Status:     { rich_text: [{ text: { content: "已匯入" } }] },
      Note:       { rich_text: [{ text: { content: (notes || summary || "").slice(0, 2000) } }] },
      CityHints:  { rich_text: [{ text: { content: citySlug || "" } }] },
      Published:  { checkbox: true },
    },
  };

  return await notionCreatePage(env, payload);
}

// ── Spots ──────────────────────────────────────────────────
async function createSpotPage({ env, item, citySlug, sourceUrl, sourcePageId, sourceTitle }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const tags = Array.isArray(item.tags) ? item.tags.join(", ") : item.category || "景點";

  const mapQuery = encodeURIComponent(`${item.name} ${cityLabel}`);
  const mapUrl = item.map_url ||
    `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const lat = typeof item.lat === "number" && item.lat !== 0 ? item.lat : (cityData?.lat || 0);
  const lng = typeof item.lng === "number" && item.lng !== 0 ? item.lng : (cityData?.lng || 0);

  const properties = {
    Name:             { title: [{ text: { content: String(item.name || "未命名景點").slice(0, 200) } }] },
    Area:             { rich_text: [{ text: { content: String(item.area || cityLabel) } }] },
    BestTime:         { rich_text: [{ text: { content: String(item.best_time || guessBestTime(item.category)) } }] },
    Category:         { rich_text: [{ text: { content: String(item.category || "景點") } }] },
    City:             { select: { name: cityLabel || "未分類" } },
    CitySlug:         { select: { name: String(citySlug || "未分類") } },
    Description:      { rich_text: [{ text: { content: String(item.description || `${cityLabel}的${item.category || "景點"}，值得一訪。`).slice(0, 2000) } }] },
    Lat:              { number: lat },
    Lng:              { number: lng },
    MapUrl:           { url: mapUrl || null },
    Notes:            { rich_text: [{ text: { content: String(item.reason || "") } }] },
    PriorityScore:    { number: 0 },
    Published:        { checkbox: true },
    SourceTitleCache: { rich_text: [{ text: { content: String(sourceTitle || "").slice(0, 200) } }] },
    StayMinutes:      { number: Number(item.stay_minutes || guessStayMinutes(item.category)) },
    Tags:             { rich_text: [{ text: { content: tags } }] },
    Thumbnail:        { rich_text: [{ text: { content: String(item.thumbnail || guessThumbnail(item.category)) } }] },
  };

  // SourceLinks relation
  if (sourcePageId) {
    properties.SourceLinks = { relation: [{ id: sourcePageId }] };
  }

  return await notionCreatePage(env, {
    parent: { data_source_id: env.NOTION_SPOTS_DATA_SOURCE_ID },
    properties,
  });
}

// ── Events ─────────────────────────────────────────────────
async function createEventPage({ env, item, citySlug, sourceUrl, sourcePageId, sourceTitle }) {
  const cityData = CITY_DATA_MAP[citySlug];
  const cityLabel = cityData?.label || citySlug;
  const tags = Array.isArray(item.tags) ? item.tags.join(", ") : item.category || "活動";

  const mapQuery = encodeURIComponent(`${item.venue_name || item.name} ${cityLabel}`);
  const mapUrl = item.map_url ||
    `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const lat = typeof item.lat === "number" && item.lat !== 0 ? item.lat : (cityData?.lat || 0);
  const lng = typeof item.lng === "number" && item.lng !== 0 ? item.lng : (cityData?.lng || 0);

  const properties = {
    Name:          { title: [{ text: { content: String(item.name || "未命名活動").slice(0, 200) } }] },
    Area:          { rich_text: [{ text: { content: String(item.area || cityLabel) } }] },
    Category:      { select: { name: String(item.category || "活動") } },
    City:          { rich_text: [{ text: { content: cityLabel } }] },
    CitySlug:      { rich_text: [{ text: { content: String(citySlug || "") } }] },
    Description:   { rich_text: [{ text: { content: String(item.description || `${cityLabel}的${item.category || "活動"}，詳情請洽官網。`).slice(0, 2000) } }] },
    EndTimeText:   { rich_text: [{ text: { content: String(item.end_time || "") } }] },
    EndsOn:        item.ends_on ? { date: { start: String(item.ends_on) } } : { date: null },
    Lat:           { number: lat },
    Lng:           { number: lng },
    MapUrl:        { url: mapUrl || null },
    OfficialUrl:   { url: String(item.official_url || sourceUrl || "") || null },
    PriceNote:     { rich_text: [{ text: { content: String(item.price_note || "請洽官網") } }] },
    Published:     { checkbox: true },
    RecurringType: { select: { name: "一次性" } },
    StartTimeText: { rich_text: [{ text: { content: String(item.start_time || "") } }] },
    StartsOn:      item.starts_on ? { date: { start: String(item.starts_on) } } : { date: null },
    Status:        { select: { name: "待整理" } },
    Tags:          { rich_text: [{ text: { content: tags } }] },
    TicketType:    { rich_text: [{ text: { content: String(item.ticket_type || "請洽官網") } }] },
    VenueName:     { rich_text: [{ text: { content: String(item.venue_name || item.name || "") } }] },
  };

  if (sourcePageId) {
    properties.SourceLinks = { relation: [{ id: sourcePageId }] };
  }

  return await notionCreatePage(env, {
    parent: { data_source_id: env.NOTION_EVENTS_DATA_SOURCE_ID },
    properties,
  });
}

// ── 智慧預設值 ─────────────────────────────────────────────
function guessBestTime(category) {
  const map = {
    餐廳: "晚上", 小吃: "下午", 咖啡: "下午", 甜點: "下午",
    景點: "下午", 逛街: "下午", 寺社: "早上", 住宿: "下午",
    博物館: "下午", 夜市: "晚上", 活動: "下午",
  };
  return map[category] || "下午";
}

function guessStayMinutes(category) {
  const map = {
    餐廳: 75, 小吃: 30, 咖啡: 60, 甜點: 45,
    景點: 60, 逛街: 90, 寺社: 40, 住宿: 60,
    博物館: 120, 夜市: 90, 活動: 120,
  };
  return map[category] || 60;
}

function guessThumbnail(category) {
  const map = {
    餐廳: "🍽️", 小吃: "🍢", 咖啡: "☕", 甜點: "🍰",
    景點: "📍", 逛街: "🛍️", 寺社: "⛩️", 住宿: "🏨",
    博物館: "🏛️", 夜市: "🏮", 活動: "🎫",
  };
  return map[category] || "📍";
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
