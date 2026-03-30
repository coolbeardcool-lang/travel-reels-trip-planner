# analyze-url Quick Access

**Source file**: `functions/api/analyze-url.js`
**Purpose**: analyze an input URL with the cheapest reliable pipeline: normalize URL, scrape metadata, run heuristics, optionally call OpenAI, normalize result, cache response.

---

## Entrypoint
- `onRequestPost(context)`

## Main flow
1. Validate request body and URL
2. Normalize URL and derive `analysis_id`
3. Read cache via `getCachedAnalysis()`
4. Scrape metadata via `scrapeUrl()`
5. Build `mergedText` from title / OG / description / notes
6. Run `cheapHeuristicAnalysis()`
7. Decide whether to call OpenAI with `shouldUseOpenAI()`
8. If AI is used:
   - call `callOpenAI()`
   - normalize via `normalizeAIResult()`
9. Cache final result
10. Return normalized analysis payload

---

## Key dependencies
- `./city-aliases.js`
- Workers cache binding: `ANALYSIS_CACHE`
- OpenAI chat completions API
- internal prompt rules mirrored in `docs/quick-access/ai-prompt-contract.md`

---

## Pipeline boundaries
### Cheap layer
- URL normalization
- platform detection
- metadata scrape
- keyword scoring
- cheap item extraction
- cache

### Expensive layer
- `callOpenAI()` prompt + remote inference

### Normalization layer
- `normalizeAIItem()`
- `normalizeAIResult()`
- confidence / evidence / item kind coercion

This separation is important. Most token / latency cost lives in the AI layer.

---

## Fragile areas
- prompt rules and quick-access contract must stay in sync
- `mergedText` quality strongly affects downstream extraction quality
- heuristic and AI output must converge to the same normalized schema
- `contentKind`, `citySlug`, and item-level `itemKind` are easy to desynchronize during edits
- prompt size drift can silently increase cost

---

## Common edit patterns
### Change platform or URL normalization
- inspect `PLATFORM_MAP`, `normalizeUrl()`, and `detectPlatform()`

### Change heuristic behavior
- inspect keyword lists
- inspect `cheapHeuristicAnalysis()` and `buildHeuristicItems()`
- verify whether the change should still avoid AI in some cases

### Change AI schema or prompt rules
- inspect `callOpenAI()`
- inspect `normalizeAIResult()` and `normalizeAIItem()`
- update `docs/quick-access/ai-prompt-contract.md` in the same change

### Change cache behavior
- inspect `getCachedAnalysis()` / `setCachedAnalysis()` and `analysis_id` generation

---

## Best candidate future split points
- platform / URL helpers
- scrape helpers
- heuristic analysis
- AI prompt builder
- AI result normalization
- cache helpers

This file already has natural layer boundaries; splitting should follow those boundaries instead of arbitrary line counts.

---

## Suggested read order next time
1. this quick-access file
2. `docs/quick-access/ai-prompt-contract.md`
3. `cheapHeuristicAnalysis()`
4. `shouldUseOpenAI()`
5. `callOpenAI()`
6. `normalizeAIResult()`
7. full file only if needed
