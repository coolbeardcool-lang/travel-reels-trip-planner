# Handoff State

## Task
Architecture review + improvements + bug fixes

## Completed
- [x] Architecture review: 5 risks + 5 improvements (ADR-001)
- [x] Optimistic update, iOS clipboard detect, nearby mode, offline PWA, URL queue
- [x] iOS Shortcut setup page + quick-access notes
- [x] Geocoding improvement: multi-strategy fallback in geocode-missing.mjs

## In Progress
- [ ] Analysis bug: OPENAI_API_KEY not set in Cloudflare Pages env vars (user action required)

## Pending / Staged (batch with future changes)
- [ ] Update skill definitions (output-schema missing "mixed", field name mismatches)
- [ ] Add ESLint with no-redeclare rule for src/ + functions/

## Known Data Issues
- **Seoul duplicate**: "牛火 韓牛燒烤" (id: 33224c5d-...8599) and "우화 홍대 한우 맛집 | 牛火" (id: 33224c5d-...8001) are the same restaurant from the same IG Reel. Needs dedup in Notion.
- **Seoul missing coords**: 4/5 spots at lat=0,lng=0. Improved geocode script should help on next run.

## Files Touched (this session)
- scripts/geocode-missing.mjs (multi-strategy geocoding, url type support, limit=3 best-pick)
- state/handoffs/latest.md (updated)

## Next Best Step
1. User: set `OPENAI_API_KEY` in Cloudflare Pages Settings → Environment Variables → Production
2. User: manually trigger `geocode-missing.yml` workflow OR wait for next scheduled run
3. User: dedup "牛火" entries in Notion Seoul
