from __future__ import annotations

import gzip
import json
from pathlib import Path
from typing import Dict, Iterator, List

from core.models.snapshots import MarketSnapshot


class BacktestReplayer:
    def __init__(self, path: str | Path, repeat: bool = False, batch_size: int = 1):
        self._path = Path(path)
        self._repeat = repeat
        self._batch_size = batch_size if batch_size > 0 else 1
        self._file = None

    def _open_file(self) -> None:
        if self._file is not None:
            try:
                self._file.close()
            except Exception:
                pass
        if self._path.suffix == ".gz":
            self._file = gzip.open(self._path, mode="rt", encoding="utf-8")
        else:
            self._file = self._path.open(mode="r", encoding="utf-8")

    def _line_iter(self) -> Iterator[str]:
        while True:
            if self._file is None:
                self._open_file()

            for line in self._file:  # type: ignore
                line = line.strip()
                if not line:
                    continue
                yield line

            if not self._repeat:
                break

            self._open_file()

    def next_batch(self) -> List[MarketSnapshot]:
        out: List[MarketSnapshot] = []
        if self._batch_size <= 0:
            return out

        if self._file is None and not self._path.exists():
            return out

        line_iter = self._line_iter()

        try:
            for _ in range(self._batch_size):
                line = next(line_iter)
                try:
                    d: Dict = json.loads(line)
                    snapshot = MarketSnapshot.from_dict(d)
                    out.append(snapshot)
                except Exception:
                    continue
        except StopIteration:
            pass

        return out
