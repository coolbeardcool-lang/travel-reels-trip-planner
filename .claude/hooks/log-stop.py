#!/usr/bin/env python3
from session_backup_common import append_jsonl, ensure_state_dirs, now_utc_iso, project_root, read_stdin_json, session_log_path, truncate

payload = read_stdin_json()
root = project_root(payload)
ensure_state_dirs(root)
append_jsonl(session_log_path(root, payload), {
    "ts": now_utc_iso(),
    "session_id": payload.get("session_id"),
    "event_type": "stop",
    "summary": truncate(payload.get("last_assistant_message"), 700),
    "touched_files": [],
    "plan_ref": "state/plans/current.md",
    "next_step": None,
    "stop_hook_active": bool(payload.get("stop_hook_active")),
})
