# ADR-001: Architecture Review — Five Risks & Five Improvements

**Date**: 2026-03-30
**Status**: Accepted

## Context
Review based on Han's five core expectations:
1. Save travel info from social media (IG/FB/Threads)
2. Mobile-first (iPhone 17 Pro Max, iPad mini)
3. Share from social apps directly to this APP
4. Location-based nearby recommendations
5. Trip itinerary planning at destination

## Five Risks

| # | Risk | Level | Impact |
|---|------|-------|--------|
| 1 | **iOS no Web Share Target** — iPhone can't receive share intent from social apps | Critical | Core entry flow broken on Han's primary device |
| 2 | **No Service Worker** — No offline capability, blank page without network | High | Unusable during travel (subway, rural areas) |
| 3 | **Geocoding relies on Nominatim** — Free service, poor non-English name resolution | Medium | Inaccurate coordinates → wrong nearby recommendations |
| 4 | **AI analysis limited by URL metadata** — Reels/short videos have minimal OG data | Medium | Low confidence results, manual correction needed |
| 5 | **Sync delay (6hr + 90s)** — Notion→JSON via GitHub Actions | Medium | Submitted spots not visible immediately |

## Five Improvements

| # | Improvement | Approach | Cost |
|---|------------|----------|------|
| 1 | **iOS share entry** | Clipboard auto-detect on app focus + iOS Shortcut | Very low |
| 2 | **Geocoding quality** | Strengthen AI prompt for coordinates + optimize Nominatim query params | Low (no paid API) |
| 3 | **Nearby recommendations** | "I'm here" mode using existing geo.js + geolocation API | Low |
| 4 | **Offline capability** | vite-plugin-pwa (auto SW generation + cache strategy) | Low |
| 5 | **Input flow optimization** | URL queue (save now, analyze later) + batch confirm | Low |

## Priority Order (cost-adjusted)

1. Sync delay fix — **optimistic update** (frontend-only, immediate value for testing)
2. iOS clipboard detection (minimal code change, unblocks iPhone users)
3. Geocoding prompt enhancement (0 cost, improves coordinate accuracy)
4. Nearby recommendations (extends existing geo.js)
5. Offline via vite-plugin-pwa (one plugin add)

## Resolved: App.jsx Split
Previously identified as risk — **already completed**. App.jsx is now ~690 lines with components, hooks, utils, services properly separated. Size increase from 554 is due to new features (clipboard detection, nearby mode, URL queue, optimistic update). No further refactoring needed.

## Not Doing
- Redux/Zustand — current useState scale is manageable
- Native app wrapper — PWA + clipboard covers 80%
- Paid geocoding API — AI prompt + Nominatim optimization first
- User behavior learning — over-engineering at current stage
