from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class EventType(str, Enum):
    PNL_UPDATE = "pnl_update"
    STRATEGY_SNAPSHOT = "strategy_snapshot"
    STRATEGY_STATUS = "strategy_status"
    POSITIONS_SNAPSHOT = "positions_snapshot"
    POSITION_UPDATE = "position_update"
    TRADE = "trade"
    BACKTEST_STATUS = "backtest_status"
    LOG = "log"
    METRICS = "metrics"

    PRICE_SNAPSHOT = "price_snapshot"
    SIGNAL = "signal"


@dataclass
class BaseEvent:
    type: EventType
    ts: datetime
    data: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["ts"] = self.ts.isoformat()
        d["type"] = self.type.value
        return d

    def to_wire(self) -> Dict[str, Any]:
        payload = dict(self.data)
        payload["type"] = self.type.value
        return payload

    @classmethod
    def now(cls, event_type: EventType, data: Dict[str, Any]) -> "BaseEvent":
        return cls(type=event_type, ts=datetime.now(timezone.utc), data=data)


def _now_and_epoch_ms() -> tuple[datetime, int]:
    ts = datetime.now(timezone.utc)
    return ts, int(ts.timestamp() * 1000)


def make_log_event(
    level: str, message: str, extra: Optional[Dict[str, Any]] = None
) -> BaseEvent:
    ts, epoch_ms = _now_and_epoch_ms()
    lvl = str(level).lower()
    if lvl in ("error", "critical", "fatal"):
        ui_level = "error"
    elif lvl in ("warn", "warning"):
        ui_level = "warn"
    else:
        ui_level = "info"
    payload: Dict[str, Any] = {
        "message": message,
        "level": ui_level,
        "timestamp": epoch_ms,
    }
    if extra:
        payload.update(extra)
    return BaseEvent(type=EventType.LOG, ts=ts, data=payload)


def make_price_snapshot_event(
    snapshot_id: str, kalshi_ticker: str, extra: Optional[Dict[str, Any]] = None
) -> BaseEvent:
    payload: Dict[str, Any] = {
        "snapshot_id": snapshot_id,
        "kalshi_ticker": kalshi_ticker,
    }
    if extra:
        payload.update(extra)
    return BaseEvent.now(EventType.PRICE_SNAPSHOT, payload)


def make_signal_event(
    strategy_id: str,
    snapshot_id: str,
    signal_type: str,
    reason: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> BaseEvent:
    payload: Dict[str, Any] = {
        "strategy_id": strategy_id,
        "snapshot_id": snapshot_id,
        "signal_type": signal_type,
    }
    if reason:
        payload["reason"] = reason
    if extra:
        payload.update(extra)
    return BaseEvent.now(EventType.SIGNAL, payload)


def make_execution_event(
    strategy_id: str,
    kalshi_ticker: str,
    action_type: str,
    side: Optional[str] = None,
    size: Optional[int] = None,
    price: Optional[float] = None,
    reason: Optional[str] = None,
    extra: Optional[Dict[str, Any]] = None,
) -> BaseEvent:
    ts, epoch_ms = _now_and_epoch_ms()
    if side not in ("BUY", "SELL"):
        trade_side = None
    else:
        trade_side = "buy" if side == "BUY" else "sell"

    trade: Dict[str, Any] = {
        "id": f"{strategy_id}:{kalshi_ticker}:{epoch_ms}:{action_type}",
        "strategy_id": strategy_id,
        "instrument": kalshi_ticker,
        "ts": epoch_ms,
        "side": trade_side,
        "size": int(size or 0),
        "price": float(price) if price is not None else 0.0,
    }

    if extra:
        pnl_delta = extra.get("realized_pnl_delta") or extra.get("realized_pnl")
        if pnl_delta is not None:
            trade["pnl"] = float(pnl_delta)

    payload: Dict[str, Any] = {
        "trade": trade,
    }
    if reason is not None:
        payload["reason"] = reason
    if extra:
        for k, v in extra.items():
            if k not in ("realized_pnl_delta", "realized_pnl", "trade"):
                payload.setdefault(k, v)

    return BaseEvent(type=EventType.TRADE, ts=ts, data=payload)


def make_state_update_events(
    strategy_id: str,
    state: Dict[str, Any],
    extra: Optional[Dict[str, Any]] = None,
) -> List[BaseEvent]:
    ts, epoch_ms = _now_and_epoch_ms()
    positions_dict: Dict[str, Dict[str, Any]] = state.get("positions") or {}
    realized = float(state.get("realized_pnl") or 0.0)
    unrealized = float(state.get("unrealized_pnl") or 0.0)
    total_pnl = realized + unrealized

    pnl_payload: Dict[str, Any] = {
        "timestamp": epoch_ms,
        "pnl": total_pnl,
        "strategy_id": strategy_id,
    }
    if extra:
        pnl_payload.update(extra)
    pnl_event = BaseEvent(
        type=EventType.PNL_UPDATE,
        ts=ts,
        data=pnl_payload,
    )

    positions: List[Dict[str, Any]] = []
    for instrument, pos in positions_dict.items():
        positions.append(
            {
                "instrument": instrument,
                "size": int(pos.get("size", 0)),
                "avg_price": float(pos.get("avg_price", 0.0)),
                "unrealized_pnl": float(pos.get("unrealized_pnl", 0.0)),
                "strategy_id": strategy_id,
            }
        )

    pos_event = BaseEvent(
        type=EventType.POSITIONS_SNAPSHOT,
        ts=ts,
        data={"positions": positions},
    )
    return [pnl_event, pos_event]


def make_strategy_snapshot_event(
    strategies: List[Dict[str, Any]],
) -> BaseEvent:
    ts, _ = _now_and_epoch_ms()
    payload: Dict[str, Any] = {
        "strategies": strategies,
    }
    return BaseEvent(type=EventType.STRATEGY_SNAPSHOT, ts=ts, data=payload)


def make_strategy_status_event(
    strategy_id: str,
    enabled: bool,
    name: Optional[str] = None,
) -> BaseEvent:
    ts, _ = _now_and_epoch_ms()
    payload: Dict[str, Any] = {
        "strategy_id": strategy_id,
        "enabled": enabled,
    }
    if name is not None:
        payload["name"] = name
    return BaseEvent(type=EventType.STRATEGY_STATUS, ts=ts, data=payload)


def make_metrics_event(
    cpu: float = 0.0,
    mem_gb: Optional[float] = None,
) -> BaseEvent:
    ts, epoch_ms = _now_and_epoch_ms()
    payload: Dict[str, Any] = {
        "timestamp": epoch_ms,
        "cpu": float(cpu),
    }
    if mem_gb is not None:
        payload["mem_gb"] = float(mem_gb)
    return BaseEvent(type=EventType.METRICS, ts=ts, data=payload)


def make_backtest_status_event(
    backtest_id: str,
    strategy_id: str,
    status: str,
    started_at: Optional[int] = None,
    finished_at: Optional[int] = None,
    error: Optional[str] = None,
) -> BaseEvent:
    ts, _ = _now_and_epoch_ms()
    backtest: Dict[str, Any] = {
        "id": backtest_id,
        "strategy_id": strategy_id,
        "status": status,
    }
    if started_at is not None:
        backtest["started_at"] = started_at
    if finished_at is not None:
        backtest["finished_at"] = finished_at
    if error is not None:
        backtest["error"] = error
    payload: Dict[str, Any] = {
        "backtest": backtest,
    }
    return BaseEvent(type=EventType.BACKTEST_STATUS, ts=ts, data=payload)


def make_position_update_event(
    strategy_id: str,
    position: Dict[str, Any],
    extra: Optional[Dict[str, Any]] = None,
) -> BaseEvent:
    payload: Dict[str, Any] = {
        "position": {
            "instrument": position.get("instrument"),
            "size": int(position.get("size", 0)),
            "avg_price": float(position.get("avg_price", 0.0)),
            **(
                {"unrealized_pnl": float(position.get("unrealized_pnl", 0.0))}
                if position.get("unrealized_pnl") is not None
                else {}
            ),
            "strategy_id": strategy_id,
        },
    }
    if extra:
        payload.update(extra)
    return BaseEvent.now(EventType.POSITION_UPDATE, payload)
