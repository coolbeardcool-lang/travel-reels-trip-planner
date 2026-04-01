#!/usr/bin/env python3
from session_backup_common import compaction_dir, ensure_state_dirs, handoff_path, last_session_events, load_text_if_exists, now_stamp, now_utc_iso, project_root, read_stdin_json, session_log_path, truncate, write_markdown, append_jsonl

payload = read_stdin_json()
root = project_root(payload)
ensure_state_dirs(root)
trigger = str(payload.get("trigger") or "unknown")
session = str(payload.get("session_id") or "unknown-session")
plan_text = load_text_if_exists(root / "state" / "plans" / "current.md", limit=2000)
handoff_text = load_text_if_exists(handoff_path(root), limit=2000)
recent = last_session_events(root, payload, limit=10)
recent_lines = []
for item in recent:
    ts = item.get("ts") or ""
    ev = item.get("event_type") or "event"
    summary = truncate(item.get("summary"), 180)
    recent_lines.append(f"- {ts} [{ev}] {summary}")
if not recent_lines:
    recent_lines.append("- (no prior session events recorded)")
content = f"# Pre-Compact Snapshot\n\n- ts: {now_utc_iso()}\n- session_id: {session}\n- trigger: {trigger}\n- transcript_path: {payload.get('transcript_path') or ''}\n\n## Custom Instructions\n{truncate(payload.get('custom_instructions'), 1200) or '(none)'}\n\n## Current Plan\n{plan_text or '(missing)'}\n\n## Latest Handoff\n{handoff_text or '(missing)'}\n\n## Recent Session Events\n" + "\n".join(recent_lines) + "\n"
filename = f"{session}-{now_stamp()}-{trigger}.md"
out_path = compaction_dir(root) / filename
write_markdown(out_path, content)
append_jsonl(session_log_path(root, payload), {
    "ts": now_utc_iso(),
    "session_id": payload.get("session_id"),
    "event_type": "pre_compact",
    "summary": f"saved compaction snapshot: state/compaction/{filename}",
    "touched_files": [f"state/compaction/{filename}"],
    "plan_ref": "state/plans/current.md",
    "next_step": None,
    "trigger": trigger,
})
