# PR and Handoff Rules

- Every substantial change must leave a compact trace for future continuation.
- Use `.claude/templates/PR_TEMPLATE.md` for PR summaries.
- Update `state/handoffs/latest.md` when work stops midstream or when nearing limits.
- Keep handoff notes factual, short, and action-oriented.
- Record unresolved questions separately from completed work.

## Checkpoint Trigger
Write or refresh the handoff whenever:
- a phase completes
- the task is paused
- context budget appears at risk
- the next step depends on a human decision

## Merge Conflict Resolution Protocol
Never silently resolve a merge conflict. For each conflicted file:
1. state which version you intend to keep
2. state why
3. state what is lost by not taking the other version
4. wait for user confirmation if the choice involves data loss or ambiguity
