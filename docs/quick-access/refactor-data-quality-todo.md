# Refactor + Data Quality To-Do

## Goal
Finish the current low-token refactor wave, then shift into data-quality stabilization so future syncs stop reintroducing the same issues.

---

## Phase 1 — Validation and checkpointing
- [ ] Run build / smoke validation after refactors
- [ ] Manually verify: city load, analyze flow, confirm flow, route save/load
- [ ] Refresh quick-access / handoff if behavior changes are found

## Phase 2 — Data quality guardrails
- [x] Add `docs/quick-access/data-quality-rules.md`
- [x] Add `scripts/check-data-quality.mjs`
- [x] Add `npm run check:data-quality`
- [x] Fix city index mismatch for cities already present in `public/data/all.json`
- [ ] Run the checker and review the first issue list

## Phase 3 — First-pass data cleanup
- [ ] Flatten nested `relatedCityIds`
- [ ] Normalize `cityHints` / `relatedCityIds` to slug values
- [ ] Review duplicate sources grouped by `url + title`
- [ ] Review relation fields that mix IDs and display names
- [ ] Review areas that still use English admin tokens like `Mapo-gu`
- [ ] Review high-value spots/events that still have `lat/lng = 0`

## Phase 4 — Optional second-wave refactor
- [ ] Split `confirm-analysis.js` further (`ensureCityExists`, upserts, relation update)
- [ ] Extract `useNearbyMode`
- [ ] Re-evaluate whether `App.jsx` still needs further hook extraction

---

## Current recommendation
Do not continue broad structural refactors until the data checker is in place and the first issue list has been reviewed.
