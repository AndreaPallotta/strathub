from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from core.models.snapshots import MarketSnapshot
from strategies.base import StrategyAction, StrategyBase


@dataclass
class MarketState:
    status: str = "flat"  # "flat" or "long"
    trades: int = 0  # how many times we've entered this market
    last_edge: float = 0.0
    cooldown_until: Optional[datetime] = None


class ArbExampleStrategy(StrategyBase):
    """
    Simple arbitrage-style strategy:

    - Uses external implied probability (ref_implied_yes) from Odds API
    - Uses Kalshi YES mid price (kalshi_yes_mid) as market implied prob
    - Edge = ref_implied_yes - market_mid
        * If edge >= min_edge_enter -> BUY YES (open long)
        * If edge <= min_edge_exit  -> SELL YES (close long)
    - No shorting: we only ever go from flat -> long -> flat.
    """
    
    strategy_id = "arb_example"

    def __init__(self, strategy_id: str, config: Dict[str, Any], logger: Any) -> None:
        super().__init__(strategy_id=strategy_id, config=config, logger=logger)

        sig_cfg = config.get("signals") or {}
        self.min_edge_enter: float = float(sig_cfg.get("min_edge_enter", 0.10))
        self.min_edge_exit: float = float(sig_cfg.get("min_edge_exit", 0.05))

        risk_cfg = config.get("risk") or {}
        self.cool_down_seconds: int = int(risk_cfg.get("cool_down_seconds", 0))
        # 0 = unlimited entries per market
        self.max_trades_per_market: int = int(risk_cfg.get("max_trades_per_market", 0))

        self._markets: Dict[str, MarketState] = {}


    def on_start(self) -> None:
        self.logger.info(
            "ArbExampleStrategy started",
            extra={
                "min_edge_enter": self.min_edge_enter,
                "min_edge_exit": self.min_edge_exit,
                "cool_down_seconds": self.cool_down_seconds,
                "max_trades_per_market": self.max_trades_per_market,
            },
        )

    def on_market_snapshot(self, snapshot: MarketSnapshot) -> List[StrategyAction]:
        ticker = snapshot.kalshi_ticker
        if not ticker:
            return []

        implied = snapshot.ref_implied_yes
        mid = (
            snapshot.kalshi_yes_mid
            if getattr(snapshot, "kalshi_yes_mid", None) is not None
            else self._fallback_mid(snapshot)
        )

        if implied is None or mid is None:
            return []

        edge = float(implied) - float(mid)

        m_state = self._markets.get(ticker)
        if m_state is None:
            m_state = MarketState()
            self._markets[ticker] = m_state

        now = datetime.now(timezone.utc)

        # Cooldown check
        if m_state.cooldown_until is not None and now < m_state.cooldown_until:
            m_state.last_edge = edge
            return []

        actions: List[StrategyAction] = []
        status = m_state.status
        trades = m_state.trades

        self.logger.debug(
            "Arb evaluation",
            extra={
                "ticker": ticker,
                "implied": implied,
                "market_mid": mid,
                "edge": edge,
                "status": status,
                "trades": trades,
            },
        )

        if status == "flat":
            # Enter: external says YES is underpriced enough
            if edge >= self.min_edge_enter and self._can_enter_more(trades):
                actions.append(
                    StrategyAction(
                        type="OPEN_LONG",
                        kalshi_ticker=ticker,
                        side="BUY",
                        size=None,  # use simulator's contract_per_trade
                        reason=f"edge_enter={edge:.4f}",
                    )
                )
                m_state.status = "long"
                m_state.trades += 1

                self.logger.info(
                    "Opening long",
                    extra={
                        "ticker": ticker,
                        "edge": edge,
                        "implied": implied,
                        "market_mid": mid,
                        "trades": m_state.trades,
                    },
                )

        elif status == "long":
            # Exit: edge decayed below threshold
            if edge <= self.min_edge_exit:
                actions.append(
                    StrategyAction(
                        type="CLOSE_LONG",
                        kalshi_ticker=ticker,
                        side="SELL",
                        size=None,  # close as much as simulator allows
                        reason=f"edge_exit={edge:.4f}",
                    )
                )
                m_state.status = "flat"

                if self.cool_down_seconds > 0:
                    m_state.cooldown_until = now + timedelta(
                        seconds=self.cool_down_seconds
                    )

                self.logger.info(
                    "Closing long",
                    extra={
                        "ticker": ticker,
                        "edge": edge,
                        "implied": implied,
                        "market_mid": mid,
                        "cooldown_until": (
                            m_state.cooldown_until.isoformat()
                            if m_state.cooldown_until
                            else None
                        ),
                    },
                )

        m_state.last_edge = edge
        return actions

    def _can_enter_more(self, trades: int) -> bool:
        if self.max_trades_per_market <= 0:
            return True
        return trades < self.max_trades_per_market

    def _fallback_mid(self, snapshot: MarketSnapshot) -> Optional[float]:
        bid = snapshot.kalshi_yes_bid
        ask = snapshot.kalshi_yes_ask

        if bid is not None and ask is not None:
            return 0.5 * (bid + ask)
        if bid is not None:
            return bid
        if ask is not None:
            return ask
        return None
