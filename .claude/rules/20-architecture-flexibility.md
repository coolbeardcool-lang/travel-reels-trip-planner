# Architecture Flexibility Rules

- Prefer config-driven behavior over hard-coded logic.
- Centralize constants, thresholds, provider mappings, and schedules.
- Isolate vendor-specific code behind adapters or service boundaries.
- Keep business rules separate from UI, transport, and framework glue.
- Prefer small composable modules over large multi-purpose files.
- When adding new behavior, design for the likely next variation.
- Any unavoidable hard-coded value should be documented and easy to replace.

## Cache and State Scope Documentation
When introducing cache, memoization, or in-memory state:
- document the valid scope
- document when it is not invalidated
- name any stale-read edge case explicitly, even if acceptable

Example:
```js
// Cache scope: per-request only.
// Stale-read: merge then re-query in same request may return pre-merge state.
```
