from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from core.models.snapshots import MarketSnapshot
from strategies.base import StrategyAction


@dataclass
class SimulatedFill:
    strategy_id: str
    kalshi_ticker: str
    action_type: str
    side: str | None
    size: int | None
    price: float | None
    reason: str | None
    meta: Dict[str, Any]


@dataclass
class Position:
    size: int = 0
    avg_price: float = 0.0
    realized_pnl: float = 0.0


class ExecutionSimulator:
    def __init__(self, config: Dict[str, Any]) -> None:
        self.config = config

        self.contract_per_trade: int = int(self.config.get("contract_per_trade", 1))
        self.max_exposure_usd: float = float(self.config.get("max_exposure_usd", 0.0))
        self.slippage_buy: float = float(self.config.get("slippage_buy", 0.0))
        self.slippage_sell: float = float(self.config.get("slippage_sell", 0.0))

        self._positions: Dict[Tuple[str, str], Position] = {}
        self._strategy_exposure: Dict[str, float] = {}
        self._marks: Dict[Tuple[str, str], float] = {}

    def simulate_actions(
        self, strategy_id: str, actions: List[StrategyAction], snapshot: MarketSnapshot
    ) -> List[SimulatedFill]:
        fills: List[SimulatedFill] = []

        if not actions:
            return fills

        for action in actions:
            size = int(action.size or self.contract_per_trade)
            if size <= 0:
                continue

            if action.kalshi_ticker != snapshot.kalshi_ticker:
                continue

            fill = self._simulate_single_action(strategy_id, action, size, snapshot)
            if fill is not None:
                fills.append(fill)

        return fills

    def get_strategy_state(self, strategy_id: str) -> Dict[str, Any]:
        positions: Dict[str, Dict[str, Any]] = {}
        realized_pnl_total = 0.0
        unrealized_pnl_total = 0.0

        for (sid, ticker), pos in self._positions.items():
            if sid != strategy_id:
                continue

            key = (sid, ticker)
            mark = self._marks.get(key, pos.avg_price)

            unrealized_pnl = pos.size * (mark - pos.avg_price)

            positions[ticker] = {
                "size": pos.size,
                "avg_price": pos.avg_price,
                "realized_pnl": pos.realized_pnl,
                "mark": mark,
                "unrealized_pnl": unrealized_pnl,
            }

            realized_pnl_total += pos.realized_pnl
            unrealized_pnl_total += unrealized_pnl

        exposure = self._get_exposure(strategy_id)
        return {
            "strategy_id": strategy_id,
            "state": {
                "positions": positions,
                "exposure": exposure,
                "realized_pnl": realized_pnl_total,
                "unrealized_pnl": unrealized_pnl_total,
            },
        }

    def update_mark(self, strategy_id: str, snapshot: MarketSnapshot) -> None:
        ticker = snapshot.kalshi_ticker
        if not ticker:
            return

        key = (strategy_id, ticker)
        pos = self._positions.get(key)
        if not pos or pos.size == 0:
            return

        mid = snapshot.kalshi_yes_mid
        bid = snapshot.kalshi_yes_bid
        ask = snapshot.kalshi_yes_ask

        mark: Optional[float] = None
        if mid is not None:
            mark = mid
        elif bid is not None and ask is not None:
            mark = 0.5 * (bid + ask)
        elif bid is not None:
            mark = bid
        elif ask is not None:
            mark = ask

        if mark is None:
            return

        mark = max(0.0, min(1.0, mark))
        self._marks[key] = mark

    def _get_position(self, strategy_id: str, ticker: str) -> Position:
        key = (strategy_id, ticker)
        pos = self._positions.get(key)
        if pos is None:
            pos = Position()
            self._positions[key] = pos
        return pos

    def _get_exposure(self, strategy_id: str) -> float:
        return float(self._strategy_exposure.get(strategy_id, 0.0))

    def _set_exposure(self, strategy_id: str, value: float) -> None:
        self._strategy_exposure[strategy_id] = float(value)

    def _simulate_single_action(
        self,
        strategy_id: str,
        action: StrategyAction,
        size: int,
        snapshot: MarketSnapshot,
    ) -> Optional[SimulatedFill]:
        ticker = action.kalshi_ticker
        pos = self._get_position(strategy_id, ticker)
        pre_size = pos.size
        pre_exposure = self._get_exposure(strategy_id)

        side = action.side
        if side not in ("BUY", "SELL"):
            return None

        price = self._compute_fill_price(side, snapshot)
        if price is None:
            return None

        if side == "SELL" and size > pos.size:
            size = pos.size
            if size <= 0:
                return None

        if side == "BUY" and self.max_exposure_usd > 0.0:
            notional = size * price
            projected_exposure = pre_exposure + notional
            if projected_exposure > self.max_exposure_usd:
                return SimulatedFill(
                    strategy_id=strategy_id,
                    kalshi_ticker=ticker,
                    action_type=action.type,
                    side=side,
                    size=0,
                    price=None,
                    reason=action.reason,
                    meta={
                        "rejected": True,
                        "rejected_reason": "max_exposure_exceeded",
                        "pre_exposure": pre_exposure,
                        "max_exposure_usd": self.max_exposure_usd,
                    },
                )

        if side == "BUY":
            pos = self._apply_buy(pos, size, price)
            post_exposure = pre_exposure + size * price
        else:
            realized_delta, new_size = self._apply_sell(pos, size, price)
            pos.size = new_size
            pos.realized_pnl += realized_delta
            post_exposure = max(pre_exposure - size * pos.avg_price, 0.0)

        self._set_exposure(strategy_id, post_exposure)

        return SimulatedFill(
            strategy_id=strategy_id,
            kalshi_ticker=ticker,
            action_type=action.type,
            side=side,
            size=size,
            price=price,
            reason=action.reason,
            meta={
                "pre_size": pre_size,
                "post_size": pos.size,
                "pre_exposure": pre_exposure,
                "post_exposure": post_exposure,
                "realized_pnl": pos.realized_pnl,
            },
        )

    def _compute_fill_price(
        self,
        side: str,
        snapshot: MarketSnapshot,
    ) -> Optional[float]:
        mid = snapshot.kalshi_yes_mid
        bid = snapshot.kalshi_yes_bid
        ask = snapshot.kalshi_yes_ask

        if side == "BUY":
            base = ask if ask is not None else mid
            if base is None:
                return None
            price = base + self.slippage_buy
        else:
            base = bid if bid is not None else mid
            if base is None:
                return None
            price = base - self.slippage_sell

        return max(0.0, min(1.0, price))

    def _apply_buy(self, pos: Position, size: int, price: float) -> Position:
        total_size = pos.size + size
        if total_size <= 0:
            pos.size = 0
            pos.avg_price = 0.0
            return pos

        new_notional = pos.size * pos.avg_price + size * price
        pos.size = total_size
        pos.avg_price = new_notional / total_size
        return pos

    def _apply_sell(self, pos: Position, size: int, price: float) -> tuple[float, int]:
        if size <= 0 or pos.size <= 0:
            return 0.0, pos.size

        close_size = min(size, pos.size)
        realized = close_size * (price - pos.avg_price)
        new_size = pos.size - close_size

        if new_size == 0:
            pos.avg_price = 0.0

        return realized, new_size
