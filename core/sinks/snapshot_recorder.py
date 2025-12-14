from __future__ import annotations

import gzip
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from core.models.events import BaseEvent, EventType


class SnapshotRecorderSink:
    def __init__(self, file_path: str) -> None:
        self.file_path = self._format_dated_file(Path(file_path))
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = gzip.open(self.file_path, mode="at", encoding="utf-8")

    def _format_dated_file(self, path: Path):
        date_str = datetime.now().strftime("%Y%m%d")
        stem = path.stem
        ext = path.suffix or ".ndjson"

        base = stem if ext == ".ndjson" else f"{stem}{ext}"
        dated_name = f"{base}.{date_str}.ndjson.gz"

        return path.parent / dated_name

    def handle(self, event: BaseEvent) -> None:
        if event.type != EventType.PRICE_SNAPSHOT:
            return

        data: Dict[str, Any] = event.data or {}
        snapshot = data.get("snapshot")
        if not isinstance(snapshot, dict):
            return

        line = json.dumps(snapshot, separators=(",", ":"))
        try:
            self._fh.write(line + "\n")
            self._fh.flush()
        except Exception:
            pass

    def close(self) -> None:
        try:
            self._fh.close()
        except Exception:
            pass
