import { NOTION_VERSION } from "./constants.js";

function notionHeaders(env) {
  return {
    Authorization: `Bearer ${env.NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

export async function notionQueryDataSource(env, dataSourceId, body) {
  const resp = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
    method: "POST",
    headers: notionHeaders(env),
    body: JSON.stringify(body),
  });
  const jsonBody = await resp.json();
  if (!resp.ok) throw new Error(jsonBody?.message || "查詢 Notion 失敗。");
  return jsonBody;
}

export async function notionPatchPage(env, pageId, properties) {
  const resp = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: notionHeaders(env),
    body: JSON.stringify({ properties }),
  });
  const jsonBody = await resp.json();
  if (!resp.ok) throw new Error(jsonBody?.message || "合併更新 Notion 失敗。");
  return jsonBody;
}

export async function notionCreatePage(env, payload) {
  const resp = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: notionHeaders(env),
    body: JSON.stringify(payload),
  });
  const jsonBody = await resp.json();
  if (!resp.ok) throw new Error(jsonBody?.message || "寫入 Notion 失敗。");
  return jsonBody;
}
