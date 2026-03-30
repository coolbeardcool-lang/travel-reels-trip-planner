# App Quick Access

**Source file**: `src/App.jsx`
**Purpose**: top-level UI orchestrator for city data loading, URL analysis flow, filtering, route planning, nearby mode, and optimistic update behavior.

## Main role
This file combines:
- top-level page composition
- multi-feature state orchestration
- data-loading effects
- analysis / confirm workflow control
- route planning interactions
- localStorage glue

## Major state groups
- dataset and city selection
- URL analysis workflow
- discovery / filtering
- route planning
- nearby / device integration

## Main side effects
- share-target query parsing
- clipboard check on focus
- city index load
- global stats load
- selected city dataset load
- selected analysis item initialization
- pending shared route application

## Existing decomposition
Rendering is already delegated to:
- `WriteOverlay`
- `SyncStatusBar`
- `UrlAnalyzerPanel`
- `CitySection`
- `MapSection`
- `RoutePlannerSection`

## Fragile areas
- optimistic updates can diverge from synced data until reload
- route planning depends on filtered and visible item interactions
- multiple localStorage-backed states increase debug surface
- unrelated edits can force large rereads because many workflows live together

## Best candidate future split points
- `useAnalysisWorkflow`
- `useCityDataset`
- `useRoutePlanner`
- `useClipboardImport`
- `useUrlQueue`

## Suggested read order next time
1. this quick-access file
2. state group relevant to the task
3. matching effect or handler block
4. child component props for that section
5. full file only if needed
