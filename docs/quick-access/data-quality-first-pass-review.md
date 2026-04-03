# Data Quality First-Pass Review

## Scope
Review target:
- `public/data/all.json`
- `public/data/cities/index.json`
- `scripts/check-data-quality.mjs`
- `scripts/clean-data-phase3.mjs`

## What Phase 3 cleanup is designed to do
- flatten nested `relatedCityIds`
- normalize `cityHints` and `relatedCityIds` to slug values
- resolve relation fields from display names into actual IDs when possible
- merge duplicate sources by URL (or title when URL is absent)
- preserve one canonical source row and re-point related `spots` / `events`
- normalize known admin-token areas such as `Mapo-gu -> 麻浦區`

## Duplicate source merge policy
Duplicate sources are merged semantically, not by raw string concatenation.

Current merge rules:
- choose one canonical source row by reference count and relation richness
- choose the most descriptive non-generic title
- choose platform / sourceType / status by priority, not by last-write-wins
- synthesize `note` by de-duplicating overlapping notes and keeping the most informative phrasing
- union normalized city hints and relation IDs
- update `spots` / `events` to point at the canonical source row

## Checker summary before cleanup logic
Expected issue categories from the current data snapshot:
- nested `relatedCityIds`
- non-slug `cityHints`
- duplicate sources
- relation arrays mixing IDs and display names
- untranslated area admin token (`Mapo-gu`)
- published items with `lat/lng = 0`

## Expected checker summary after applying current cleanup logic
The current cleanup logic is expected to remove:
- nested relation arrays
- non-slug city hint issues
- duplicate source rows
- relation arrays containing display-name strings
- known area admin token issues

The main remaining category is expected to be:
- `zero-coordinates`

## Recommended next action after Phase 3 cleanup
1. apply `node scripts/clean-data-phase3.mjs`
2. run `npm run check:data-quality`
3. review remaining `zero-coordinates`
4. decide whether to backfill coordinates automatically or only for high-value published items
