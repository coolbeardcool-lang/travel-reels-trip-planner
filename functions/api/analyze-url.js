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
          enum: ["spot", "event", "source_only"]
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
              reason: { type: "string" }
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
              "reason"
            ]
          }
        }
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
        "items"
      ]
    },
    strict: true
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
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
                "你是旅遊內容分析器。請從提供的網址摘要中判斷：這是景點、活動，還是只適合先當來源收錄。只輸出符合 schema 的 JSON。"
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(input)
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: schema.name,
          schema: schema.schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI 分析失敗: ${err}`);
  }

  const data = await response.json();

  // Responses API 的結構會把文字內容放在 output_text 類型裡
  const outputText =
    data.output?.flatMap((item) => item.content || [])
      ?.find((item) => item.type === "output_text")
      ?.text || "{}";

  return JSON.parse(outputText);
}
