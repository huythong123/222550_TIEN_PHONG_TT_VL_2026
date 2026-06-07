import json
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4

RENDER_ROOT = Path("storage/renders")


def _safe_user_id(user_id: Any) -> str:
    raw = str(user_id or "anonymous")
    return "".join(ch if ch.isalnum() or ch in ("_", "-") else "_" for ch in raw)


def _user_root(user_id: Any) -> Path:
    return RENDER_ROOT / f"user_{_safe_user_id(user_id)}"


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []

    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def _run_dirs_for_user(user_id: Any) -> list[Path]:
    user_root = _user_root(user_id)
    if not user_root.exists():
        return []
    return sorted({path.parent for path in user_root.rglob("events.jsonl") if path.is_file()})


def _find_run_dir(user_id: Any, run_id: str) -> Optional[Path]:
    for run_dir in _run_dirs_for_user(user_id):
        if run_dir.name == run_id:
            return run_dir
    return None


def _rewrite_user_history(user_id: Any) -> None:
    user_root = _user_root(user_id)
    history_path = user_root / "history.jsonl"

    events: list[dict[str, Any]] = []
    for run_dir in _run_dirs_for_user(user_id):
        events.extend(_read_jsonl(run_dir / "events.jsonl"))

    if not events:
        if history_path.exists():
            history_path.unlink()
        return

    history_path.parent.mkdir(parents=True, exist_ok=True)
    with history_path.open("w", encoding="utf-8") as f:
        for event in events:
            f.write(json.dumps(event, ensure_ascii=False) + "\n")


def list_user_run_logs(user_id: Any) -> list[dict[str, Any]]:
    runs: list[dict[str, Any]] = []
    for run_dir in _run_dirs_for_user(user_id):
        events = _read_jsonl(run_dir / "events.jsonl")
        if not events:
            continue

        first_event = events[0]
        last_event = events[-1]
        step_names = []
        for event in events:
            step_name = event.get("step")
            if step_name and step_name not in step_names:
                step_names.append(step_name)

        runs.append(
            {
                "run_id": run_dir.name,
                "date": run_dir.parent.name,
                "event_count": len(events),
                "first_timestamp": first_event.get("timestamp"),
                "last_timestamp": last_event.get("timestamp"),
                "steps": step_names,
            }
        )

    runs.sort(key=lambda item: item.get("last_timestamp") or "", reverse=True)
    return runs


def get_user_run_log(user_id: Any, run_id: str) -> Optional[dict[str, Any]]:
    run_dir = _find_run_dir(user_id, run_id)
    if not run_dir:
        return None

    events = _read_jsonl(run_dir / "events.jsonl")
    if not events:
        return {
            "run_id": run_id,
            "date": run_dir.parent.name,
            "event_count": 0,
            "first_timestamp": None,
            "last_timestamp": None,
            "steps": [],
            "events": [],
        }

    step_names = []
    for event in events:
        step_name = event.get("step")
        if step_name and step_name not in step_names:
            step_names.append(step_name)

    return {
        "run_id": run_id,
        "date": run_dir.parent.name,
        "event_count": len(events),
        "first_timestamp": events[0].get("timestamp"),
        "last_timestamp": events[-1].get("timestamp"),
        "steps": step_names,
        "events": events,
    }


def delete_user_run_log(user_id: Any, run_id: str) -> bool:
    run_dir = _find_run_dir(user_id, run_id)
    if not run_dir:
        return False

    shutil.rmtree(run_dir)
    _rewrite_user_history(user_id)
    return True


def create_or_get_run(user_id: Any, run_id: Optional[str] = None) -> tuple[str, Path]:
    user_part = _safe_user_id(user_id)
    if not run_id:
        run_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid4().hex[:8]

    day_part = datetime.now().strftime("%Y-%m-%d")
    run_dir = RENDER_ROOT / f"user_{user_part}" / day_part / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_id, run_dir


def ensure_step_dir(run_dir: Path, step_name: str) -> Path:
    step_dir = run_dir / step_name
    step_dir.mkdir(parents=True, exist_ok=True)
    return step_dir


def append_run_log(user_id: Any, run_id: str, step: str, data: dict[str, Any]) -> None:
    user_part = _safe_user_id(user_id)
    _, run_dir = create_or_get_run(user_part, run_id)

    event = {
        "timestamp": datetime.now().isoformat(),
        "user_id": str(user_id),
        "run_id": run_id,
        "step": step,
        "data": data,
    }

    run_log_path = run_dir / "events.jsonl"
    with run_log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")

    user_history = RENDER_ROOT / f"user_{user_part}" / "history.jsonl"
    user_history.parent.mkdir(parents=True, exist_ok=True)
    with user_history.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")
