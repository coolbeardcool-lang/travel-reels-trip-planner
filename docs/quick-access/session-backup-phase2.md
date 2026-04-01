# Session Backup Phase 2 Implementation

This note records the actual minimal hook implementation added in Phase 2.

## Active settings file
- `.claude/settings.local.json`

## Hook mapping
- `UserPromptSubmit` → `log-user-prompt.py`
- `Stop` → `log-stop.py`
- `SubagentStop` → `log-agent-stop.py`
- `PreCompact` → `pre-compact-snapshot.py`
- `PreToolUse` on `Write|Edit|MultiEdit` → `save-plan-version.py`

## Why plan backup uses PreToolUse
To preserve the old `state/plans/current.md` before overwrite, the backup must happen before the write tool executes.
Using `PostToolUse` would be too late for old-content preservation.

## Shared helper
- `.claude/hooks/session_backup_common.py`

## Intended output locations
- `state/session-log/`
- `state/plans/archive/`
- `state/plans/index.jsonl`
- `state/compaction/`

## Scope note
This is the minimal working implementation.
If you later want fully shareable repo-wide behavior, migrate the same hook definitions from `.claude/settings.local.json` into `.claude/settings.json`.
