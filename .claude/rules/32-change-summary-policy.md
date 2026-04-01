# Change Summary Policy

When generating a commit message, PR description, or work report for substantial work,
do not rely only on the current in-memory conversation state.

## Required behavior
- Prefer whole-session summaries over end-of-session-only summaries
- Read backup artifacts before writing a final change summary
- Distinguish between:
  - original objective
  - major implementation phases
  - fixes after failed tests or unexpected behavior
  - final outcome
- Preserve material earlier work even if the final diff is narrower

## Read order
1. relevant quick-access note
2. `state/handoffs/latest.md`
3. recent `state/session-log/` entries
4. `state/plans/index.jsonl` and latest plan snapshot
5. current diff / changed files

## Minimum coverage
A good change summary should capture:
- what the task started as
- what changed during execution
- what was finally delivered
- what remains unresolved or deferred

## Anti-pattern
Do not generate a commit / PR / report that only describes the last repair cycle if earlier phases materially shaped the result.
