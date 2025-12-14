from __future__ import annotations

import importlib
import pkgutil
from typing import Dict, Type

from strategies.base import StrategyBase


def discover_strategies() -> Dict[str, Type[StrategyBase]]:
    import strategies

    registry: Dict[str, Type[StrategyBase]] = {}

    for finder, name, ispkg in pkgutil.iter_modules(
        strategies.__path__, strategies.__name__ + "."
    ):
        if name.endswith(".base"):
            continue

        module = importlib.import_module(name)

        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            try:
                if (
                    isinstance(attr, type)
                    and issubclass(attr, StrategyBase)
                    and attr is not StrategyBase
                ):
                    strategy_id = getattr(attr, "strategy_id", None)
                    if not strategy_id:
                        continue
                    if strategy_id in registry:
                        raise RuntimeError(
                            f"Duplicate strategy_id '{strategy_id}' found in {name}"
                        )
                    registry[strategy_id] = attr
            except TypeError:
                continue
    return registry
