# Session Backup Policy

Long Claude Code sessions may compact context and lose earlier plan history.
To preserve full-task traceability for commit messages, PR descriptions, and reports,
this project treats session backup artifacts as first-class continuation inputs.

## Policy
- Prefer structured session backups over relying on current in-memory context alone
- Before writing a commit summary, PR description, or work report, consult available backup artifacts first
- Preserve plan revisions instead of overwriting planning history silently
- Prefer compact, queryable backup records over full transcript dumps

## Canonical backup artifacts
- `state/session-log/` for structured session events
- `state/plans/` for current plan, archived plan revisions, and plan index
- `state/compaction/` for compact-before snapshots when configured
- `state/handoffs/latest.md` for the latest resumable handoff

## Generation rule
When producing commit / PR / report text for substantial work, use this read order:
1. relevant quick-access note
2. latest handoff
3. session-log entries
4. plan index and latest plan snapshot
5. current diff / changed files

Do not describe only the latest narrow edit if earlier work in the same session materially shaped the result.

## Scope note
This file defines policy only.
Detailed storage format, hook behavior, and operational workflow belong in:
- `docs/quick-access/session-backup-workflow.md`
- `state/plans/README.md`
