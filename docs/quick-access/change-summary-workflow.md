# Change Summary Workflow

**Purpose**: generate commit messages, PR descriptions, and work reports that reflect the whole session, not only the final repair cycle.

## Use this when
- the task had multiple phases
- the session was long
- context compaction may have occurred
- there were retries, redesigns, or follow-up fixes

## Read order
1. relevant quick-access note
2. `state/handoffs/latest.md`
3. recent `state/session-log/` entries
4. `state/plans/index.jsonl` and latest plan snapshot
5. current diff / changed files

## Summary construction order
1. original objective
2. major implementation phases
3. important changes in approach
4. final delivered outcome
5. remaining work or deferred items

## Output guidance
### Commit
- keep the subject concise
- mention earlier important work in the body if it materially shaped the result

### PR
- cover whole-session rationale, scope, validation, risks, and follow-ups
- do not describe only the last narrow fix

### Report
- group work by phase
- include issues discovered and how they were resolved
- show what changed from the original plan

## Anti-patterns
- writing from memory only after a long session
- describing only the final edit
- skipping backup artifacts when the session had multiple meaningful phases
