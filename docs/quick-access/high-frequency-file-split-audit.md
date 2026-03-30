# High-Frequency File Split Audit

**Scope**:
- `functions/api/confirm-analysis.js`
- `functions/api/analyze-url.js`
- `src/App.jsx`

**Goal**: evaluate whether these three high-frequency files should be split to reduce reread cost and restore cost without creating unnecessary architectural churn.

---

## Decision summary
- `confirm-analysis.js`: **split recommended**
- `analyze-url.js`: **split recommended**
- `App.jsx`: **partial split recommended** (prefer hooks, not more display components)

---

## 1) confirm-analysis.js
### Why split
- mixes request handling, geocoding, city defaults, Notion queries, dedup, merge logic, and dispatch logic
- high reread cost even for small edits
- contains canonical dedup / merge behavior used by schema rules

### Best split shape
- city defaults / city helpers
- geocoding helper
- Notion client helpers
- dedup / merge helpers
- Spot upsert
- Event upsert
- source relation update

### Caution
Do not create a parallel write path that bypasses:
- `normalizeCitySlug()`
- `findExistingRecord()`
- `buildMergedPatch()`

### Priority
**Highest**

---

## 2) analyze-url.js
### Why split
- has clear layer boundaries already
- mixes cheap heuristics, expensive AI call, prompt text, normalization, caching, and request handling
- prompt changes and schema changes currently require reading too much unrelated code

### Best split shape
- platform / URL helpers
- scrape helpers
- heuristic analysis
- AI prompt builder
- AI result normalization
- cache helpers
- request handler stays thin

### Caution
Keep heuristic and AI outputs converging to one normalized schema.
Update prompt contract doc when AI prompt rules change.

### Priority
**High**

---

## 3) App.jsx
### Why only partial split
- UI rendering is already decomposed into child sections
- biggest remaining cost is state + effect + workflow concentration, not visual component size alone

### Best split shape
Prefer hooks over more JSX-only component extraction:
- `useAnalysisWorkflow`
- `useCityDataset`
- `useRoutePlanner`
- `useClipboardImport`
- `useUrlQueue`

### Caution
Do not scatter shared orchestration state so broadly that resuming a workflow requires opening many files at once.

### Priority
**Medium**

---

## Recommended execution order
1. create quick-access notes first
2. split `analyze-url.js`
3. split `confirm-analysis.js`
4. only then consider hook extraction from `App.jsx`

---

## Checkpoint plan
### Checkpoint A
Quick-access notes complete

### Checkpoint B
`analyze-url.js` split with no schema behavior change

### Checkpoint C
`confirm-analysis.js` split with no dedup / merge behavior change

### Checkpoint D
`App.jsx` hook extraction only if reread cost is still high
