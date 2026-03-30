# Handoff State

## Task
Architecture review + all 5 improvements implemented

## Completed
- [x] Architecture review: 5 risks + 5 improvements (ADR-001)
- [x] Optimistic update: submitted items appear immediately
- [x] iOS clipboard auto-detect: social URL detection on app focus
- [x] Geocoding: AI prompt broadened + Nominatim limit=3 with best-pick
- [x] Nearby mode: "I'm here" button with radius filter in MapSection
- [x] Offline: vite-plugin-pwa with SW, city data + map tile caching
- [x] URL queue: "稍後分析" saves URL, queue shown in panel
- [x] Quick-access notes updated
- [x] All tests pass (93/93)

## In Progress
- None

## Pending
- None for this iteration

## Decisions Made
- Optimistic update uses frontend preview data (no backend change)
- Nearby mode reuses existing geo.js haversineKm
- Offline via vite-plugin-pwa (auto SW, no manual SW)
- URL queue persisted in localStorage
- Geocoding: limit=3 + pick result closest to city center
- AI prompt: lowered coordinate threshold (fill when reasonably inferrable)

## Blockers
- None

## Needs Human Input
- No

## Files Touched
- docs/decisions/001-architecture-review.md (new)
- docs/quick-access/app-jsx.md (rewritten)
- docs/quick-access/ai-prompt-contract.md (updated coordinates rule)
- src/App.jsx (clipboard detect, nearby mode, URL queue, optimistic update)
- src/components/MapSection.jsx (nearby UI, optimistic badge, distance display)
- src/components/RoutePlannerSection.jsx (optimistic badge)
- src/components/UrlAnalyzerPanel.jsx (queue UI, "稍後分析" button)
- src/utils/geo.js (nearbyItems function)
- functions/api/analyze-url.js (broadened coordinate prompt)
- functions/api/confirm-analysis.js (Nominatim limit=3, city param, best-pick)
- vite.config.js (VitePWA plugin)
- package.json (vite-plugin-pwa devDep)
- state/handoffs/latest.md (updated)

## Next Best Step
- Manual testing on iPhone (clipboard detect, nearby mode, offline)
- Consider iOS Shortcut creation for deeper share integration
