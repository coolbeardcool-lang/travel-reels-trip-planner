# Quick-Access: src/App.jsx (~690 lines)

## Purpose
Main frontend application shell — orchestrates state, data loading, and component composition.
Components, hooks, utils, and services are extracted into separate modules.

## Section Map

| Lines | Section | Responsibility |
|-------|---------|---------------|
| 1-13 | Imports | Config, utils, services, hooks, components |
| 15-72 | State declarations | ~30 useState hooks grouped by concern |
| 76-82 | resetSubmitForm | Clear analysis form state |
| 84-98 | URL params effect | Web Share Target + route sharing restore |
| 100-120 | Clipboard detection | iOS social URL detection on app focus |
| 123-137 | City index load | Fetch city index + sync meta |
| 140-150 | Global stats load | Fetch all.json for spot/event counts |
| 153-178 | City data load | Fetch city dataset, reset filters on city change |
| 181-197 | Analysis + route effects | Preview selection init, pending route apply |
| 199-262 | Derived state (useMemo) | Filtering, sorting, nearby, route building |
| 264-345 | Event handlers | Category toggle, drag-drop, save/load route, share, geolocation, sync |
| 349-375 | URL queue handlers | handleSaveToQueue, handleRemoveFromQueue, handleLoadFromQueue |
| 378-460 | Analysis flow | handleAnalyzeUrl, handleConfirmAnalysis + optimistic update |
| 520-689 | JSX return | Layout shell, component composition |

## Extracted Modules

| Module | File | Responsibility |
|--------|------|---------------|
| Theme/config | `src/config/theme.js` | Colors, z-index, API paths, constants |
| Normalize | `src/utils/normalize.js` | City/spot/event/analysis normalization |
| Geo | `src/utils/geo.js` | Haversine, distance scoring, transport, nearbyItems |
| Format | `src/utils/format.js` | Date/event formatting |
| City API | `src/services/cityApi.js` | Fetch city index/dataset |
| Responsive | `src/hooks/useResponsiveColumns.js` | Mobile breakpoint detection |
| CitySection | `src/components/CitySection.jsx` | City grid + stats |
| MapSection | `src/components/MapSection.jsx` | Map + filters + nearby mode + item details |
| RoutePlanner | `src/components/RoutePlannerSection.jsx` | Route building + drag-drop |
| UrlAnalyzer | `src/components/UrlAnalyzerPanel.jsx` | URL input + analysis preview + URL queue |
| WriteOverlay | `src/components/WriteOverlay.jsx` | Post-submit sync progress |
| SyncStatusBar | `src/components/SyncStatusBar.jsx` | Sync timestamp + refresh |

## Key State Groups
- **City**: cityIndex, selectedCitySlug, selectedContentMode
- **Data**: loadedSpots, loadedEvents, sources, globalStats
- **Filtering**: search, selectedCategories, baseArea, timeOfDay
- **Map**: activeItemId, visibleItemIds, mapViewTab
- **Nearby/Geolocation**: nearbyMode, nearbyRadius, userLocation, locating
- **Route**: routeOrder, dragSourceId/dragOverId, savedRoutes
- **Analysis**: submitUrl/Title/Type/CitySlug/Notes, analysisPreview, submitStatus, writeOverlay
- **iOS clipboard**: clipboardPrompt
- **URL queue**: urlQueue (localStorage persisted)

## Common Edit Patterns
- Add spot/event field -> `src/utils/normalize.js` normalizeSpot/normalizeEvent
- Change theme -> `src/config/theme.js`
- Modify analysis flow -> handleAnalyzeUrl/handleConfirmAnalysis (App.jsx L378-460)
- Route logic -> `src/utils/geo.js` + routeItems useMemo (App.jsx L240-260)
- City aliases -> `src/utils/citySlugMap.js`
- Nearby mode -> nearbyItems in `src/utils/geo.js`, nearbyMode state in App.jsx
- URL queue -> handleSaveToQueue/handleRemoveFromQueue (App.jsx L349-375)

## Fragile Areas
- Drag-drop: manual array splice in handleDrop (L290-300)
- State coupling: ~30 useState still in App.jsx (manageable but dense)
- WriteOverlay close triggers reloadKey -> full city data refetch
- Clipboard API requires HTTPS and user permission (silent fail on deny)
