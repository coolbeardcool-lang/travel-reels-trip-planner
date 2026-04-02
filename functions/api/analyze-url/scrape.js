function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#([0-9]+);/g, (_, dec) =>
      String.fromCodePoint(parseInt(dec, 10))
    )
    .trim()
    .slice(0, 500);
}

export async function scrapeUrl(url) {
  const result = {
    title: null,
    description: null,
    ogTitle: null,
    ogDescription: null,
  };

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TravelReelsBot/1.0)",
      },
      signal: AbortSignal.timeout(7000),
      redirect: "follow",
    });

    if (!res.ok) return result;

    const html = await res.text();

    const get = (pattern) => {
      const match = html.match(pattern);
      if (!match) return null;
      return decodeHtmlEntities(match[1]);
    };

    result.ogTitle =
      get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);

    result.ogDescription =
      get(
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i
      ) ||
      get(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i
      );

    result.title = get(/<title[^>]*>([^<]+)<\/title>/i);

    result.description =
      get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      get(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  } catch {}

  return result;
}
