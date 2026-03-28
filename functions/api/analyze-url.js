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

    if (!context.env.OPENAI_API_KEY) {
      return json(
        { message: "OPENAI_API_KEY 尚未設定。" },
        500
      );
    }

    let sourceTitle = hints.title?.trim() || "";
    let sourcePlatform = detectPlatform(url);
    let html = "";
    let extracted = {
      title: "",
      description: "",
      ogTitle: "",
      ogDescription: "",
    };

    try {
      const resp = await fetch(url, {
        headers: {
          "user-agent": "Mozilla/5.0 TravelReelsTripPlanner/1.0",
        },
      });

      if (resp.ok) {
        html = await resp.text();
        extracted = extractBasicMetadata(html);
        sourceTitle =
          sourceTitle ||
          extracted.ogTitle ||
          extracted.title ||
          "未命名來源";
      }
    } catch (_error) {
      sourceTitle = sourceTitle || "未命名來源";
    }

    const input = {
      url,
      source_title: sourceTitle || "未命名來源",
      source_platform: sourcePlatform,
      scraped: {
        title: extracted.title,
        description: extracted.description,
        og_title: extracted.ogTitle,
        og_description: extracted.ogDescription,
      },
      hints: {
        title: hints.title || "",
        type: hints.type || "",
        citySlug: hints.citySlug || "",
        notes: hints.notes || "",
      },
    };

    const analysis = await analyzeWithOpenAI(context.env, input);
    return json(analysis);
  } catch (error) {
    return json(
      {
        message: error instanceof Error ? error.message : "分析失敗。",
      },
      500
    );
  }
}

async function analyzeWithOpenAI(env, input) {
  const schema = {
    name: "travel_url_analysis",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        source_title: { type: "string" },
        source_platform: { type: "string" },
        content_kind: {
          type: "string",
          enum: ["spot", "event", "source_only"],
        },
        city_slug: { type: "string" },
        area: { type: "string" },
        confidence: { type: "number" },
        needs_review: { type: "boolean" },
        summary: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              category: { type: "string" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              area: { type: "string" },
              best_time: { type: "string" },
              stay_minutes: { type: "number" },
              starts_on: { type: ["string", "null"] },
              ends_on: { type: ["string", "null"] },
              reason: { type: "string" },
            },
            required: [
              "name",
              "category",
              "description",
              "tags",
              "area",
              "best_time",
              "stay_minutes",
              "starts_on",
              "ends_on",
              "reason",
            ],
          },
        },
      },
      required: [
        "source_title",
        "source_platform",
        "content_kind",
        "city_slug",
        "area",
        "confidence",
        "needs_review",
        "summary",
        "items",
      ],
    },
    strict: true,
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text:
                "你是旅遊內容分析器。請根據提供的網址摘要，判斷這是景點、活動，還是只適合先當來源收錄。只輸出符合 schema 的 JSON。若不確定，needs_review 必須為 true。",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(input),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: schema.name,
          schema: schema.schema,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI 分析失敗: ${err}`);
  }

  const data = await response.json();
  const outputText =
    data.output
      ?.flatMap((item) => item.content || [])
      ?.find((item) => item.type === "output_text")
      ?.text || "{}";

  return JSON.parse(outputText);
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
