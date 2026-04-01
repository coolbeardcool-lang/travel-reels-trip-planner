# Session Backup Workflow

**Purpose**: preserve enough structured history from long Claude Code sessions so commit messages, PR descriptions, and work reports remain complete even after context compaction.

---

## Why this exists
Long sessions often involve:
- initial planning
- multiple implementation rounds
- failed tests and fixes
- changed approach after new findings
- context compaction before the work is finally summarized

Without backup artifacts, late-session summaries tend to describe only the latest edits.

---

## Canonical artifact locations
- `state/session-log/`
  - structured event log per session
  - recommended format: JSONL
- `state/plans/current.md`
  - latest working plan
- `state/plans/archive/`
  - older plan revisions kept before overwrite
- `state/plans/index.jsonl`
  - searchable index of plan revisions
- `state/compaction/`
  - compact-before snapshots when configured
- `state/handoffs/latest.md`
  - latest resumable checkpoint

---

## Recommended record shape
### Session log entry
Recommended fields:
- `ts`
- `session_id`
- `event_type`
- `summary`
- `touched_files`
- `plan_ref`
- `next_step`

Keep entries short and queryable.
Do not dump full transcripts unless there is a clear reason.

### Plan index entry
Recommended fields:
- `version_id`
- `ts`
- `reason`
- `status`
- `related_files`

---

## Preferred hook roles
When hook automation is added, prefer this order:
1. `PreCompact`
   - write a compact-before snapshot
2. `Stop`
   - append a structured session event
3. `SubagentStop`
   - append subagent result summaries
4. `UserPromptSubmit`
   - append lightweight prompt-level history only when useful
5. `PostToolUse`
   - back up old plan version before overwriting `state/plans/current.md`

---

## Read order before generating summaries
Before writing a commit message, PR description, or report:
1. relevant quick-access note
2. `state/handoffs/latest.md`
3. recent `state/session-log/` entries
4. `state/plans/index.jsonl` and latest plan snapshot
5. current diff / changed files

This avoids over-weighting only the final repair cycle.

---

## What not to do
- do not rely only on current in-memory context for long sessions
- do not overwrite plan history silently
- do not store giant transcript dumps by default
- do not generate PR / report text from only the latest change if the task had multiple meaningful phases

---

## Phase boundary guidance
Use or refresh backup artifacts when:
- a plan changes materially
- a checkpoint completes
- a major bug fix changes the approach
- context compaction is likely soon
- work pauses before commit / PR creation
