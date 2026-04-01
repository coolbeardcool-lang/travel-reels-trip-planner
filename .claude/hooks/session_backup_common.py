#!/usr/bin/env python3
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path


def now_utc_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def now_stamp():
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def read_stdin_json():
    import sys
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {"_raw_stdin": raw}


def project_root(payload):
    env_root = os.environ.get("CLAUDE_PROJECT_DIR")
    if env_root:
        return Path(env_root).resolve()
    cwd = payload.get("cwd")
    if cwd:
        return Path(str(cwd)).resolve()
    return Path.cwd().resolve()


def ensure_state_dirs(root):
    for rel in ["state/session-log", "state/plans/archive", "state/compaction"]:
        (root / rel).mkdir(parents=True, exist_ok=True)


def sanitize_filename(value):
    keep = []
    for ch in str(value or ""):
        if ch.isalnum() or ch in ("-", "_", "."):
            keep.append(ch)
        else:
            keep.append("-")
    collapsed = "".join(keep).strip("-")
    return collapsed[:120] or "item"


def session_id(payload):
    value = str(payload.get("session_id") or "unknown-session").strip()
    return sanitize_filename(value) or "unknown-session"


def truncate(value, limit=500):
    text = str(value or "").replace("\r", " ").replace("\n", " ").strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def append_jsonl(path, entry):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def session_log_path(root, payload):
    return root / "state" / "session-log" / f"{session_id(payload)}.jsonl"


def current_plan_path(root):
    return root / "state" / "plans" / "current.md"


def plan_archive_dir(root):
    return root / "state" / "plans" / "archive"


def plan_index_path(root):
    return root / "state" / "plans" / "index.jsonl"


def handoff_path(root):
    return root / "state" / "handoffs" / "latest.md"


def compaction_dir(root):
    return root / "state" / "compaction"


def load_text_if_exists(path, limit=4000):
    if not path.exists() or not path.is_file():
        return ""
    try:
        return path.read_text(encoding="utf-8")[:limit]
    except Exception:
        return ""


def last_session_events(root, payload, limit=12):
    path = session_log_path(root, payload)
    if not path.exists():
        return []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()[-limit:]
        out = []
        for line in lines:
            try:
                item = json.loads(line)
                if isinstance(item, dict):
                    out.append(item)
            except Exception:
                continue
        return out
    except Exception:
        return []


def path_targets_from_payload(payload):
    candidates = []

    def walk(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key in {"file_path", "path", "filePath"} and isinstance(value, str):
                    candidates.append(value)
                walk(value)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(payload.get("tool_input", {}))
    walk(payload.get("tool_response", {}))
    return candidates


def path_matches_current_plan(root, payload):
    target = current_plan_path(root).resolve()
    for raw in path_targets_from_payload(payload):
        try:
            if Path(raw).resolve() == target:
                return True
        except Exception:
            continue
    return False


def derive_plan_slug(content):
    for line in content.splitlines():
        text = line.strip().lstrip("#").strip()
        if text:
            return sanitize_filename(text.lower().replace(" ", "-"))[:40]
    return "plan"


def archive_current_plan(root, payload, reason):
    ensure_state_dirs(root)
    current = current_plan_path(root)
    if not current.exists() or not current.is_file():
        return None
    content = load_text_if_exists(current, limit=200000)
    version_id = f"{now_stamp()}-{derive_plan_slug(content)}.md"
    archive_path = plan_archive_dir(root) / version_id
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(current, archive_path)
    append_jsonl(plan_index_path(root), {
        "version_id": version_id,
        "ts": now_utc_iso(),
        "reason": reason,
        "status": "archived",
        "related_files": ["state/plans/current.md"],
        "session_id": session_id(payload),
    })
    return version_id


def write_markdown(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
