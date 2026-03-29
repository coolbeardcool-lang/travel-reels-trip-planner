# AI Prompt Quality Contract

**Source file**: `functions/api/analyze-url.js` (system prompt passed to Claude)
**Last updated**: 2026-03-29

This document is the canonical reference for quality rules enforced through the AI analysis prompt.
When adding a second AI endpoint, copy these rules into the new prompt and keep this doc in sync.

---

## Output Language Rules

| Field | Rule |
|-------|------|
| `name` | Must contain Traditional Chinese. Original language may be appended in parentheses: `中文名 (原文)` |
| `area` | Must be a Traditional Chinese area name. English admin codes (e.g. `Mapo-gu`, `Shibuya-ku`) are forbidden |
| `description` | Must contain Traditional Chinese. English/Japanese/Korean may supplement but cannot replace |
| `thumbnail` | Must reflect actual content category (e.g. 🥩 for BBQ, 🏪 for market). `📍` is forbidden |

## Sub-item Merging Rule (Rule 5)
If multiple items in the source refer to sub-locations of the same place (e.g. stalls within a market,
dishes within a restaurant), merge them into a single item. Add sub-item details in `description`.

Do not emit multiple items for sub-locations. This was the root cause of numbered list explosion in Seoul data.

## CitySlug Rule
`citySlug` must resolve to a known English slug. Chinese city names are acceptable input and will be
normalized via `CITY_SLUG_MAP`. Unknown cities fall back to `lowercase-with-dashes`.

## Confidence and Review Flags
- `itemConfidence`: 0.0–1.0 float. High confidence = well-known landmark. Low = uncertain reference.
- `needsReview`: true if the item requires human verification before publishing.

## Known Fragile Areas
- Korean area names: model tends to output Romanized admin codes (e.g. `Mapo-gu`). Rule 11 prevents this.
- Generic thumbnails: model tends to default to `📍`. Rule 10 prevents this.
- Numbered list explosion: model outputs `市場1`, `市場2`... Rule 5 prevents this.
- English-only names: model may omit CJK when source is English. Rule 9 prevents this.

## Rule Change Protocol
When modifying rules in `analyze-url.js`:
1. Update this doc in the same commit
2. Test with at least one problematic case that the old rule failed to catch
3. Note the previous failure mode in the commit message
