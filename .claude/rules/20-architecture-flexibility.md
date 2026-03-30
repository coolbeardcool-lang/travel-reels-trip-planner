# Architecture Flexibility Rules

- Prefer config-driven behavior over hard-coded logic.
- Centralize constants, thresholds, provider mappings, and schedules.
- Isolate vendor-specific code behind adapters or service boundaries.
- Keep business rules separate from UI, transport, and framework glue.
- Prefer small composable modules over a single large multi-purpose file.
- When adding new behavior, design for the likely next variation.
- Any unavoidable hard-coded value should be documented and easy to replace.

## Cache and State Scope Documentation
When introducing any cache, memoization, or in-memory state:
- Document the cache's valid scope (per-request / per-session / module-level)
- Document when it is NOT invalidated (e.g. stale-after-write within same request)
- If a stale-read edge case exists, name it explicitly even if it doesn't break correctness

Example comment pattern:
```
// Cache scope: per-request only (new Map() per onRequestPost call).
// Stale-read: if same record is merged and re-queried in the same request,
// cache returns pre-merge state. Acceptable: merge is additive, not overwriting.
```

## AI Prompt Quality Contracts
Quality rules enforced through AI prompts (language requirements, thumbnail rules, area naming rules, etc.)
must also be documented in `docs/quick-access/ai-prompt-contract.md`.

Rationale: prompt rules live in one endpoint file today. If a second AI endpoint is added, those rules
will be silently omitted unless there is a canonical reference. The quick-access doc is that reference.

When updating AI prompt rules, always update `docs/quick-access/ai-prompt-contract.md` in the same commit.