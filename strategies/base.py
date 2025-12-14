from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Protocol

from core.models.snapshots import MarketSnapshot


class StrategyLogger(Protocol):
    def debug(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None: ...
    def info(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None: ...
    def warning(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None: ...
    def error(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None: ...
    def exception(
        self, message: str, extra: Optional[Dict[str, Any]] = None
    ) -> None: ...


@dataclass
class StrategyAction:
    """
    A generic instruction from a strategy to the execution layer.

    Fields used by ExecutionSimulator:
      - type: semantic label ("OPEN_LONG", "CLOSE_LONG", etc.)
      - kalshi_ticker: which market to act on
      - side: "BUY" or "SELL" (None means no-op)
      - size: number of contracts (None = use simulator default contract_per_trade)
      - reason: free-text explanation for logs
      - meta: extra fields (ignored by simulator, but included in events if needed)
    """

    type: str
    kalshi_ticker: str
    side: Optional[str] = None  # "BUY" or "SELL"
    size: Optional[int] = None
    reason: Optional[str] = None
    meta: Dict[str, Any] = field(default_factory=dict)


class StrategyBase:
    """
    Base class for all StratHub strategies.

    Responsibilities:
      - Holds strategy_id, config, logger
      - Provides lifecycle hooks (on_start, on_stop)
      - Defines on_market_snapshot(), which must be overridden by subclasses
      - Optional control hook handle_control_message() for UI/WS commands
    """

    def __init__(
        self,
        strategy_id: str,
        config: Dict[str, Any],
        logger: StrategyLogger,
    ) -> None:
        self.strategy_id: str = strategy_id
        self.config: Dict[str, Any] = config
        self.logger: StrategyLogger = logger

    def on_start(self) -> None:
        """
        Called once when the engine enables this strategy.
        Subclasses can override to initialize internal state.
        """
        self.logger.info("Strategy started", extra={"strategy_id": self.strategy_id})

    def on_stop(self) -> None:
        """
        Called once when the engine disables this strategy or on shutdown.
        Subclasses can override for cleanup.
        """
        self.logger.info("Strategy stopped", extra={"strategy_id": self.strategy_id})

    def on_market_snapshot(self, snapshot: MarketSnapshot) -> List[StrategyAction]:
        """
        Main processing hook.

        The engine calls this for every snapshot that passes routing filters
        for this strategy. Subclasses should inspect the snapshot and return
        zero or more StrategyAction objects.

        Default implementation: no-op.
        """
        return []

    def handle_control_message(self, command: Dict[str, Any]) -> None:
        """
        Called when the UI / WS layer sends a control message for this strategy.

        Example command:
          {
            "type": "set_params",
            "params": { "min_edge_enter": 0.12 }
          }

        Default implementation: no-op.
        Subclasses may override to handle runtime parameter changes, etc.
        """
        cmd_type = command.get("type")
        self.logger.info(
            "Received control command (ignored by base)",
            extra={"strategy_id": self.strategy_id, "command_type": cmd_type},
        )

    def _log(
        self,
        level: str,
        message: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Convenience helper: ensures strategy_id is always attached.
        """
        payload = {"strategy_id": self.strategy_id}
        if extra:
            payload.update(extra)

        if level == "DEBUG":
            self.logger.debug(message, extra=payload)
        elif level == "INFO":
            self.logger.info(message, extra=payload)
        elif level == "WARNING":
            self.logger.warning(message, extra=payload)
        elif level == "ERROR":
            self.logger.error(message, extra=payload)
        else:
            self.logger.info(message, extra=payload)
            self.logger.info(message, extra=payload)
