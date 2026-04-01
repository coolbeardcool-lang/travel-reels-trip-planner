# Session Log Directory

This directory is reserved for structured session history.

## Intended use
Store compact, queryable session events so long Claude Code conversations can still produce complete commit messages, PR descriptions, and reports after context compaction.

## Recommended format
JSONL, one event per line.

## Recommended fields
- `ts`
- `session_id`
- `event_type`
- `summary`
- `touched_files`
- `plan_ref`
- `next_step`

Keep entries concise.
Prefer structured events over raw transcript dumps.
