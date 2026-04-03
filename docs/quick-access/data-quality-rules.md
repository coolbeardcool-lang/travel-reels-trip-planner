# Data Quality Rules

## Purpose
Keep generated JSON predictable, low-noise, and cheap to reason about.

## Canonical expectations
- `citySlug`, `cityHints`, `relatedCityIds` should use **slug values**, not mixed Chinese labels / English admin tokens.
- `relatedCityIds`, `relatedSpotIds`, `relatedEventIds` should be **flat arrays**.
- Relation fields should contain **IDs only**. Display-name strings belong in notes, not relation arrays.
- `public/data/cities/index.json` must include every city slug that appears in published `spots` / `events`.
- `platform` and `sourceType` should come from a controlled vocabulary.

## Data patterns to avoid
- nested arrays like `[["seoul"]]`
- mixed slug / label values like `["seoul"]` and `["首爾"]`
- relation arrays that contain semicolon-separated names
- `area` values that expose untranslated admin codes such as `Mapo-gu`
- repeated source rows with the same `url + title`
- `lat/lng = 0` on high-value published spots when a reasonable map query or verified point is available

## Cleanup order
1. city index mismatch
2. nested / malformed relation arrays
3. slug normalization
4. duplicate sources
5. relation fields mixing IDs and names
6. area normalization
7. coordinate backfill

## Validation rule
Before merging data-shape changes, run:
- `npm run check:data-quality`

If the checker reports failures, fix or explicitly defer them before continuing broad refactors.
