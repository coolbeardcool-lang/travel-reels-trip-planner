# Plan Snapshot Structure

This directory preserves plan history for long Claude Code sessions.
The goal is to avoid losing earlier planning context after multiple revisions or context compaction.

## Files
- `current.md`
  - latest working plan
- `archive/`
  - previous plan versions kept before overwrite
- `index.jsonl`
  - searchable metadata for archived revisions

## Expected behavior
- `current.md` may change during active work
- before replacing `current.md`, keep the old version in `archive/`
- append an index entry to `index.jsonl` whenever a prior plan version is archived
- keep archive entries compact and timestamped

## Suggested archive naming
- `YYYYMMDD-HHMMSS-<short-slug>.md`

## Suggested index fields
- `version_id`
- `ts`
- `reason`
- `status`
- `related_files`
- `session_id`

## When to archive a plan
Archive before overwriting `current.md` if:
- the implementation approach changed materially
- scope changed
- new constraints invalidated the old plan
- a failed attempt forced a new plan
- work is about to be compacted or paused

## What not to do
- do not keep only the latest plan when earlier versions explain important work
- do not overwrite plans without recording why the change happened
- do not turn plan files into long narrative journals

Keep plans short, structured, and diff-friendly.
