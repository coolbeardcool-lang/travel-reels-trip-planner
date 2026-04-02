export async function callOpenAI(apiKey, url, mergedText, contentKindHint, platformHint) {
  const prompt = `
你是旅遊資訊萃取助手。
請根據提供的 URL 與文字內容，輸出單一 JSON 物件，不要有任何其他文字。

規則：
1. 盡量列出內容中所有提到的景點、餐廳、活動、地點，即使只有簡短提及也要列出。
2. 每個 item 必須給 priority 欄位（1=最值得關注，數字越大越次要），由最可能讓旅客感興趣的排在最前面。
3. 不確定時請填 null、空陣列，或 needsReview=true。
4. 座標（lat/lng）：盡量提供座標以減少後續 geocoding 查詢。知名景點、連鎖店、市場、車站等可直接填入十進位座標（精確至小數點後4位）。一般餐廳或商家若能從名稱與區域合理推斷位置，也請嘗試填入（即使精確度較低，仍優於 null）。僅在完全無法判斷時填 null。
5. 若同一來源提到多個獨立地點，請全部拆成獨立 item，每個 item 對應一個實體店家或景點；但若是同一店家的分店（相同店名、不同地址/區域），每個分店各為獨立 item，並在 area 填入各自所在區域；同一店家同一地點的子項目（如套餐多道菜、市場內的攤位），請合併為一個 item 並在 description 補充細節。名稱來自社群貼文 caption 或留言時，每行獨立意義的店名各為一個 item，不要將多行合併或截斷。
6. 若同時有景點與活動，contentKind 請填 "mixed"，且每個 item 都要有 itemKind。
7. 每個 item 都要附 evidence 陣列，指出資訊來源。
8. 若資料太弱，不要硬造 item，可回傳空 items，並將 contentKind 設為 "source_only"。
9. 語言：name/area/description 必須包含繁體中文。若有原始語言，可附加於中文後作補充（格式：「中文名 (原文)」），品牌英文名或固有名詞例外。
10. thumbnail：依景點實際內容選擇合適 emoji（如 🏪市場/夜市、🥩燒烤/牛肉、☕咖啡廳、🍜麵食、🍰甜點、🛍️購物、⛩️寺廟、🏖️海灘、🏛️博物館、🎭活動），禁止使用 📍（除非完全無法判斷類型）。
11. area：必須是繁體中文地區名稱（如「望遠洞」、「弘大周邊」、「新世界」）；禁止填寫行政代碼（如「Mapo-gu」）或英文地名；不確定時填城市名稱。

URL: ${url}
平台提示: ${platformHint}
初步判斷: ${contentKindHint}
內容:
${String(mergedText || "").slice(0, 2000)}

輸出格式：
{
  "contentKind": "spot" | "event" | "mixed" | "source_only",
  "citySlug": "tokyo" | "kyoto" | "osaka" | "nara" | "okinawa" | "hokkaido" | "fukuoka" | "taipei" | "taichung" | "tainan" | "kaohsiung" | "seoul" | "busan" | null,
  "area": "string | null",
  "confidence": 0.0,
  "needsReview": true,
  "summary": "一句話中文摘要，可為空字串",
  "reviewReason": "string | null",
  "sourceCredibility": "high" | "medium" | "low",
  "extractionMode": "metadata_only" | "metadata_plus_notes" | "mixed" | "audio_visual",
  "sourceEvidence": [{ "type": "metadata | title | description | caption | audio | visual_text | notes", "value": "string" }],
  "items": [{
      "name": "string",
      "itemKind": "spot" | "event" | "source_only",
      "category": "string",
      "description": "string",
      "tags": ["string"],
      "citySlug": "string | null",
      "area": "string | null",
      "best_time": "string | null",
      "stay_minutes": 0,
      "starts_on": null,
      "ends_on": null,
      "start_time": "",
      "end_time": "",
      "lat": 35.6762,
      "lng": 139.6503,
      "map_url": null,
      "official_url": null,
      "venue_name": null,
      "price_note": null,
      "ticket_type": null,
      "thumbnail": null,
      "priority": 1,
      "itemConfidence": 0.0,
      "sourceCredibility": "high" | "medium" | "low",
      "needsReview": true,
      "reviewReason": "string | null",
      "evidence": [{ "type": "metadata | title | description | caption | audio | visual_text | notes", "value": "string" }],
      "reason": "string"
    }]
}
  `.trim();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2400,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "OpenAI error");
  const content = data?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed.items)) {
    parsed.items = parsed.items.filter((item) => {
      const name = String(item?.name || "").trim();
      if (name.length < 2) return false;
      if (/[\r\n]/.test(name)) return false;
      return true;
    });
  }
  return parsed;
}
