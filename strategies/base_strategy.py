import json
import os

class BaseStrategy:
    """
    Base class for all StratHub 2.0 Python strategies.
    Provides parameter management, signal building, and market tick parsing.
    """
    def __init__(self, strategy_id: str, params: dict = None):
        self.strategy_id = strategy_id
        self.params = params or {}

    def set_params(self, params: dict):
        """Update strategy parameters dynamically at runtime."""
        if isinstance(params, dict):
            self.params.update(params)

    def get_param(self, key: str, default=None):
        """Retrieve a specific parameter value."""
        return self.params.get(key, default)

    def on_tick(self, snapshot: dict) -> dict:
        """
        Invoked on every live or backtest market tick.
        Must return a strategy action dict or None.
        """
        raise NotImplementedError("Strategy must implement on_tick(snapshot)")
