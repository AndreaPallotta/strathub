from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from core.models.events import BaseEvent


class FileSink:
    def __init__(
        self, log_dir: str | Path, base_filename: str, rotate_daily: bool = True
    ):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.base_filename = base_filename
        self.rotate_daily = rotate_daily
        self._current_path: Optional[Path] = None
        self._current_date: Optional[str] = None

    def _get_log_path(self) -> Path:
        if not self.rotate_daily:
            return self.log_dir / f"{self.base_filename}.log"

        today = datetime.now(timezone.utc).strftime("%Y%m%d")
        if self._current_date != today or self._current_path is None:
            self._current_date = today
            self._current_path = self.log_dir / f"{self.base_filename}.{today}.log"
        return self._current_path

    def handle(self, event: BaseEvent) -> None:
        path = self._get_log_path()
        line = json.dumps(event.to_dict(), separators=(",", ":"))
        with path.open("a", encoding="utf-8") as file:
            file.write(line + "\n")
