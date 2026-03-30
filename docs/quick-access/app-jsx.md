# Quick-Access: src/App.jsx (554 lines)

## Purpose
Main frontend application shell — orchestrates state, data loading, and component composition.
Components, hooks, utils, and services have been extracted into separate modules.

## Section Map

| Lines | Section | Responsibility |
|-------|---------|---------------|
| 1-13 | Imports | Config, utils, services, hooks, components |
| 15-66 | State declarations | ~25 useState hooks grouped by concern |
| 67-74 | resetSubmitForm | Clear analysis form state |
| 76-91 | URL params effect | Web Share Target + route sharing restore |
| 93-108 | City index load | Fetch city index + sync meta |
| 110-121 | Global stats load | Fetch all.json for spot/event counts |
| 123-149 | City data load | Fetch city dataset, reset filters on city change |
| 151-168 | Analysis + route effects | Preview selection init, pending route apply |
| 170-226 | Derived state (useMemo) | Filtering, sorting, route building |
| 228-325 | Event handlers | Category toggle, drag-drop, save/load route, share, geolocation, sync |
| 327-415 | Analysis flow | handleAnalyzeUrl, handleConfirmAnalysis |
| 426-554 | JSX return | Layout shell, component composition |

## Extracted Modules

| Module | File | Responsibility |
|--------|------|---------------|
| Theme/config | `src/config/theme.js` | Colors, z-index, API paths, constants |
| Normalize | `src/utils/normalize.js` | City/spot/event/analysis normalization |
| Geo | `src/utils/geo.js` | Haversine, distance scoring, transport estimation |
| Format | `src/utils/format.js` | Date/event formatting |
| City API | `src/services/cityApi.js` | Fetch city index/dataset |
| Responsive | `src/hooks/useResponsiveColumns.js` | Mobile breakpoint detection |
| CitySection | `src/components/CitySection.jsx` | City grid + stats |
| MapSection | `src/components/MapSection.jsx` | Map + filters + item details |
| RoutePlanner | `src/components/RoutePlannerSection.jsx` | Route building + drag-drop |
| UrlAnalyzer | `src/components/UrlAnalyzerPanel.jsx` | URL input + analysis preview |
| WriteOverlay | `src/components/WriteOverlay.jsx` | Post-submit sync progress |
| SyncStatusBar | `src/components/SyncStatusBar.jsx` | Sync timestamp + refresh |

## Key State Groups
- **City**: cityIndex, selectedCitySlug, selectedContentMode
- **Data**: loadedSpots, loadedEvents, sources, globalStats
- **Filtering**: search, selectedCategories, baseArea, timeOfDay
- **Map**: activeItemId, visibleItemIds, mapViewTab
- **Route**: routeOrder, dragSourceId/dragOverId, savedRoutes, userLocation
- **Analysis**: submitUrl/Title/Type/CitySlug/Notes, analysisPreview, submitStatus, writeOverlay

## Common Edit Patterns
- Add spot/event field → `src/utils/normalize.js` normalizeSpot/normalizeEvent
- Change theme → `src/config/theme.js`
- Modify analysis flow → handleAnalyzeUrl/handleConfirmAnalysis (App.jsx L327-415)
- Route logic → `src/utils/geo.js` + routeItems useMemo (App.jsx L206-226)
- City aliases → `src/utils/citySlugMap.js`

## Fragile Areas
- Drag-drop: manual array splice in handleDrop (L256-267)
- State coupling: ~25 useState still in App.jsx (manageable but dense)
- WriteOverlay close triggers reloadKey → full city data refetch
