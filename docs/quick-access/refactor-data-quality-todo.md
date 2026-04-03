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
- [x] Review the first issue list and write down cleanup priorities

## Phase 3 — First-pass data cleanup
- [x] Add `scripts/clean-data-phase3.mjs`
- [x] Define semantic source merge rules (not raw string concatenation)
- [x] Define relation normalization rules (flatten + slug + ID resolution)
- [ ] Apply cleaned `public/data/all.json` output
- [ ] Run `npm run check:data-quality` after cleanup output is applied
- [ ] Review remaining `zero-coordinates`

## Phase 4 — Optional second-wave refactor
- [ ] Split `confirm-analysis.js` further (`ensureCityExists`, upserts, relation update)
- [ ] Extract `useNearbyMode`
- [ ] Re-evaluate whether `App.jsx` still needs further hook extraction

---

## Current recommendation
Do not continue broad structural refactors until:
1. Phase 3 cleanup has been applied to `public/data/all.json`
2. `npm run check:data-quality` has been run on the cleaned output
3. build / smoke validation has been completed in an executable environment
