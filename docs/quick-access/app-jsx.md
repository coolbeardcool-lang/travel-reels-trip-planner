# Quick-Access: src/App.jsx (1394 lines)

## Purpose
Main frontend single-file application — contains ALL logic, state, UI components, API calls, and utilities.

## Section Map

| Lines | Section | Responsibility |
|-------|---------|---------------|
| 1-8 | Imports & API constants | BASE_URL, API paths, content modes, type options |
| 10-37 | Theme constants | COLORS, CATEGORY_THEME |
| 39-51 | normalizeCitySlugValue | City slug alias mapping (JP/TW/KR cities) |
| 53-60 | cityIndexPath, cityDataPaths | URL builders for data fetching |
| 62-83 | normalizeCity, normalizeSource | Normalize raw city/source objects |
| 85-89 | filterByCitySlug | Filter items by city |
| 92-160 | normalizeSpot, normalizeEvent, normalizeCityIndexPayload, normalizeCityPayload | Data normalization pipeline |
| 162-183 | fetchCityIndex, fetchCityIndexMeta, fetchCityDataset | Async data fetching |
| 185-213 | normalizeAnalysisPayload | Normalize API analysis response |
| 216-265 | distanceScore, haversineKm, estimateTransport, buildRecommendation, formatEventWindow, prettyAnalysisKind | Geo/route utilities |
| 267-325 | chipStyle, MetricCard, SectionCard, PrimaryButton, useResponsiveColumns | Shared UI components & hook |
| 327-393 | LeafletMap | Map component with dynamic Leaflet loading |
| 395-467 | SuccessView | Post-confirmation success display |
| 469-519 | App() state declarations | ~30 useState hooks |
| 523-606 | App() useEffect hooks | URL params, city index load, stats load, city data load, pending route |
| 608-659 | App() useMemo computations | Filtering, sorting, route building |
| 661-838 | App() event handlers | toggleCategory, drag&drop, save/load route, share, geolocation, sync, analyze, confirm |
| 860-1393 | App() JSX return | Main render tree |

## JSX Sections in Return

| Lines | UI Section |
|-------|-----------|
| 863-898 | Sync status bar (top-right fixed) |
| 902-1011 | Floating URL input + analysis preview panel |
| 1013-1096 | City entrance cards |
| 1098-1241 | Map section (search, filters, list+map, item details) |
| 1243-1390 | Route planner (drag-reorder, transport estimates, save/share) |

## Key State Groups
- **City selection**: cityIndex, selectedCitySlug, selectedContentMode
- **Data**: loadedSpots, loadedEvents, sources, globalStats
- **Filtering**: search, selectedCategories, baseArea, timeOfDay
- **Map interaction**: activeItemId, visibleItemIds, mapViewTab
- **Route planning**: routeOrder, dragSourceId/dragOverId, savedRoutes, userLocation
- **URL analysis flow**: submitUrl/Title/Type/CitySlug/Notes, analysisPreview, submitStatus, isAnalyzing, isConfirming, confirmResult, showSuccess

## Common Edit Patterns
- Adding a new field to spots/events → normalizeSpot/normalizeEvent (L92-140) + item card JSX
- Changing theme/colors → COLORS (L10-27) or CATEGORY_THEME (L29-37)
- Modifying analysis flow → handleAnalyzeUrl (L761-798), handleConfirmAnalysis (L800-838)
- Adjusting route logic → buildRecommendation (L243), routeItems useMemo (L639-659)
- Adding city aliases → normalizeCitySlugValue aliasMap (L43-49)

## Fragile Areas
- State coupling: ~30 useState in one component, many cross-dependent
- JSX deeply nested inline styles — easy to break layout
- Route drag&drop logic (L679-700) — manual array splice

## Recommended Split Targets
1. config/theme → COLORS, CATEGORY_THEME, constants
2. utils/normalize → all normalize* functions
3. utils/geo → haversineKm, distanceScore, estimateTransport, buildRecommendation
4. services/cityApi → fetch*, cityIndexPath, cityDataPaths, normalizeAnalysisPayload
5. components/ui → MetricCard, SectionCard, PrimaryButton, chipStyle
6. components/LeafletMap → as-is
7. components/SuccessView → as-is
8. hooks/useResponsiveColumns → as-is
9. components/SyncStatusBar, UrlAnalyzer, CityEntrance, MapSection, RoutePlanner → JSX sections
