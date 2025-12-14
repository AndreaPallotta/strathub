from pathlib import Path
from typing import Any, Dict

import yaml


class Config:
    def __init__(self, raw: Dict[str, Any]):
        self._raw = raw

    @property
    def raw(self) -> Dict[str, Any]:
        return self._raw

    def get(self, path: str, default: Any = None) -> Any:
        parts = path.split(".")
        curr = self._raw
        for part in parts:
            if not isinstance(curr, dict) or part not in curr:
                return default
            curr = curr[part]
        return curr


def load_config(path: str | Path = "config/strathub.yaml") -> Config:
    path = Path(path)
    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file)
    return Config(data or {})


def load_strategy_config(
    strategy_id: str, base_dir: str | Path = "config/strategies"
) -> Dict[str, Any]:
    base_dir = Path(base_dir)
    path = base_dir / f"{strategy_id}.yaml"
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file)
    return data or {}
