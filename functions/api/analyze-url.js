export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const url = String(body?.url || "").trim();
    const hints = body?.hints || {};

    if (!url || !/^https?:\/\//i.test(url)) {
      return json(
        { message: "url 不可空白，且必須是 http/https 網址。" },
        400
      );
    }

    let sourceTitle = hints.title?.trim() || "";
    let sourcePlatform = detectPlatform(url);
    let pageText = "";
    let html = "";

    try {
      const resp = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 TravelReelsTripPlanner/1.0",
        },
      });

      if (resp.ok) {
        html = await resp.text();
        const parsed = extractBasicMetadata(html);
        sourceTitle = sourceTitle || parsed.title || "未命名來源";
        pageText = [parsed.title, parsed.description, parsed.ogTitle, parsed.ogDescription]
          .filter(Boolean)
          .join(" ");
      }
    } catch (_error) {
      sourceTitle = sourceTitle || "未命名來源";
    }

    const mergedText = `${sourceTitle} ${pageText} ${hints.notes || ""}`.trim();
    const citySlug = normalizeCitySlug(hints.citySlug || inferCitySlug(mergedText));
    const contentKind = normalizeKind(hints.type || inferKind(mergedText, url));
    const items = buildCandidateItems({
      title: sourceTitle,
      text: mergedText,
      citySlug,
      contentKind,
    });

    const confidence = contentKind === "source_only" ? 0.45 : 0.72;
    const needsReview = true;

    return json({
      source_title: sourceTitle || "未命名來源",
      source_platform: sourcePlatform,
      content_kind: contentKind,
      city_slug: citySlug,
      area: inferArea(mergedText),
      confidence,
      needs_review: needsReview,
      summary:
        contentKind === "event"
          ? "系統判斷這比較像活動型內容，建議確認日期與場地。"
          : contentKind === "spot"
            ? "系統判斷這比較像景點或餐廳內容，建議確認名稱與地點。"
            : "目前只適合先當作來源收錄，待後續整理。",
      items,
    });
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "分析失敗。",
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

function detectPlatform(url) {
  const lower = url.toLowerCase();
  if (lower.includes("instagram.com")) return "Instagram Reel";
  if (lower.includes("threads.net") || lower.includes("threads.com")) return "Threads";
  if (lower.includes("maps.google")) return "Google Maps";
  return "Website";
}

function extractBasicMetadata(html) {
  return {
    title: matchTag(html, /<title>([\s\S]*?)<\/title>/i),
    description: matchMeta(html, "description"),
    ogTitle: matchMetaProperty(html, "og:title"),
    ogDescription: matchMetaProperty(html, "og:description"),
  };
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

function normalizeCitySlug(value) {
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

function inferCitySlug(text) {
  if (/京都/.test(text)) return "kyoto";
  if (/大阪/.test(text)) return "osaka";
  if (/東京/.test(text)) return "tokyo";
  if (/福岡/.test(text)) return "fukuoka";
  if (/沖繩/.test(text)) return "okinawa";
  return "";
}

function normalizeKind(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "spot" || raw === "event") return raw;
  return "source_only";
}

function inferKind(text, url) {
  if (/活動|展覽|市集|祭|快閃|期間限定|點燈/.test(text)) return "event";
  if (/餐廳|咖啡|甜點|景點|寺|神社|拉麵|牛舌|串炸|選物/.test(text)) return "spot";
  if (/event|festival|market|exhibition/i.test(url)) return "event";
  return "source_only";
}

function inferArea(text) {
  const areaKeywords = ["心齋橋", "新世界", "通天閣", "佛光寺", "東山", "烏丸御池", "四條烏丸"];
  return areaKeywords.find((item) => text.includes(item)) || "";
}

function buildCandidateItems({ title, text, citySlug, contentKind }) {
  if (contentKind === "source_only") return [];
  return [
    {
      name: title || "候選項目",
      category: contentKind === "event" ? "活動" : "景點",
      description: text.slice(0, 160),
      tags: extractTags(text),
      area: inferArea(text),
      best_time: contentKind === "spot" ? inferBestTime(text) : "",
      stay_minutes: contentKind === "spot" ? 60 : 0,
      starts_on: null,
      ends_on: null,
      reason: citySlug
        ? `已從內容推定城市為 ${citySlug}`
        : "尚未能明確推定城市，建議人工確認",
    },
  ];
}

function extractTags(text) {
  const tags = [];
  if (/牛舌/.test(text)) tags.push("牛舌");
  if (/甜點|和菓子/.test(text)) tags.push("甜點");
  if (/寺|神社/.test(text)) tags.push("寺社");
  if (/市集|展覽|祭/.test(text)) tags.push("活動");
  return tags;
}

function inferBestTime(text) {
  if (/早餐|早上/.test(text)) return "早上";
  if (/晚餐|夜景|晚上/.test(text)) return "晚上";
  return "下午";
}
