# Output Schema

Return the result in JSON-like structure using the following shape.

## Top-level object

```json
{
  "extraction_summary": {
    "source_type": "short_video | article | event_page | map_page | weak_information",
    "extraction_mode": "audio_visual | metadata_only | metadata_plus_notes | mixed",
    "source_credibility": "high | medium | low",
    "overall_confidence": 0.0,
    "needs_review": true,
    "review_reason": "string"
  },
  "source_record": {
    "source_title": "string",
    "source_platform": "Instagram | Threads | Facebook | YouTube | TikTok | Website",
    "content_kind": "spot | event | source_only",
    "city_slug": "string or null",
    "area": "string or null",
    "confidence": 0.0,
    "needs_review": true,
    "summary": "string",
    "source_credibility": "high | medium | low",
    "review_reason": "string",
    "write_targets": ["notion_source"]
  },
  "items": [],
  "write_recommendations": [],
  "schema_recommendations": []
}

{
  "name": "string",
  "item_kind": "spot | event | source_only",
  "category": "string",
  "description": "string",
  "tags": ["string"],
  "city_slug": "string or null",
  "area": "string or null",
  "best_time": "string or null",
  "stay_minutes": 0,
  "starts_on": "YYYY-MM-DD or null",
  "ends_on": "YYYY-MM-DD or null",
  "start_time": "HH:MM or empty",
  "end_time": "HH:MM or empty",
  "price_note": "string or null",
  "ticket_type": "string or null",
  "venue_name": "string or null",
  "lat": 0,
  "lng": 0,
  "map_url": "string or null",
  "official_url": "string or null",
  "thumbnail": "emoji or null",
  "source_credibility": "high | medium | low",
  "item_confidence": 0.0,
  "needs_review": true,
  "review_reason": "string",
  "evidence": [
    {
      "type": "audio | visual_text | caption | title | description | metadata | note",
      "value": "string"
    }
  ],
  "reason": "string",
  "write_targets": ["notion_spot"]
}

{
  "target": "notion_source | notion_spot | notion_event | quick_access | handoff",
  "scope": "source | item",
  "name": "source title or item name",
  "why": "string"
}

{
  "field": "string",
  "level": "source | item",
  "reason": "string",
  "priority": "high | medium | low"
}