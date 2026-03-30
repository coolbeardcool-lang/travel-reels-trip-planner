# PR and Handoff Rules

- Every substantial change must leave a compact trace for future continuation.
- Update PR summary content using `.claude/templates/PR_TEMPLATE.md`.
- Update `state/handoffs/latest.md` when work stops midstream or when nearing limits.
- Keep handoff notes factual, short, and action-oriented.
- Record unresolved questions separately from completed work.
- Update quick-access notes when module structure, entrypoints, dependencies, or fragile areas change.

## Merge Conflict Resolution Protocol
Never silently resolve a merge conflict. For each conflicted file:
1. State which version you intend to keep (HEAD / theirs / manual merge)
2. State the reason (e.g. "taking main because it has a fresher Notion sync")
3. State what is lost by not taking the other version
4. Wait for user confirmation if the choice involves data loss or ambiguity

Resolving a conflict without explanation is equivalent to making a product decision without consent.