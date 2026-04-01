#!/usr/bin/env python3
from session_backup_common import append_jsonl, archive_current_plan, ensure_state_dirs, now_utc_iso, path_matches_current_plan, project_root, read_stdin_json, session_log_path

payload = read_stdin_json()
root = project_root(payload)
ensure_state_dirs(root)
if not path_matches_current_plan(root, payload):
    raise SystemExit(0)
version_id = archive_current_plan(root, payload, f"save prior plan before {payload.get('tool_name')}")
if version_id:
    append_jsonl(session_log_path(root, payload), {
        "ts": now_utc_iso(),
        "session_id": payload.get("session_id"),
        "event_type": "plan_version_saved",
        "summary": f"saved prior plan version: state/plans/archive/{version_id}",
        "touched_files": ["state/plans/current.md", f"state/plans/archive/{version_id}", "state/plans/index.jsonl"],
        "plan_ref": "state/plans/current.md",
        "next_step": None,
        "tool_name": payload.get("tool_name"),
    })
