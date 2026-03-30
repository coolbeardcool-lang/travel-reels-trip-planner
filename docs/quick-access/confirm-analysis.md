# confirm-analysis Quick Access

**Source file**: `functions/api/confirm-analysis.js`
**Purpose**: confirm analyzed URL output, upsert Source / Spot / Event records into Notion, enrich coordinates, and trigger downstream sync.

---

## Entrypoint
- `onRequestPost(context)`

## Main flow
1. Validate request body and Notion env vars
2. Normalize top-level `citySlug`
3. Optionally call `ensureCityExists()` before writes
4. Create Source page via `createSourcePage()`
5. Geocode items in one pass:
   - prefer AI-provided coords
   - else call `geocodeWithNominatim()`
   - else fall back to city defaults
6. Upsert Spots and/or Events:
   - `upsertSpotPage()`
   - `upsertEventPage()`
7. Backfill source relations via `updateSourceRelations()`
8. Optionally dispatch GitHub sync event

---

## Key dependencies
- `../../src/utils/citySlugMap.js`
- `CITY_DATA_MAP` in this file
- Notion APIs:
  - page create
  - page patch
  - data source query
- Nominatim search API
- GitHub repository dispatch API

---

## Canonical write-path rules
This file is the canonical upsert path for structured writes.

Important invariants:
- city slug must be normalized before any city write
- duplicate detection uses `findExistingRecord()` + `normalizeName()`
- merge behavior is centralized in `buildMergedPatch()`
- new write paths should not bypass this dedup pattern

See also:
- `.claude/rules/40-schema-and-data.md`

---

## Fragile areas
- `ensureCityExists()` can create ghost city rows if slug normalization is skipped
- `CITY_DATA_MAP` is both fallback geo source and city metadata source; changes affect multiple flows
- geocoding is rate-limited; loop order and sleep behavior matter
- Spot and Event write paths look similar but do not use identical field types
- manual edits to generated city JSON should not be treated as canonical truth

---

## Common edit patterns
### Add / change Spot fields
- update `upsertSpotPage()` properties
- check `buildMergedPatch()` if the field should merge instead of overwrite
- confirm downstream Notion schema still matches

### Add / change Event fields
- update `upsertEventPage()` properties
- check field type differences vs Spot path

### Change duplicate logic
- update `normalizeName()` / `findExistingRecord()` carefully
- verify no parallel path bypasses dedup

### Change geocoding behavior
- inspect `geocodeWithNominatim()` and fallback behavior together
- preserve graceful failure semantics

---

## Suggested read order next time
1. this quick-access file
2. `.claude/rules/40-schema-and-data.md`
3. `upsertSpotPage()` / `upsertEventPage()`
4. `buildMergedPatch()`
5. `ensureCityExists()`
6. full file only if needed
