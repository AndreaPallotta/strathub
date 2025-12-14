from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class MarketSnapshot:
    snapshot_id: str
    as_of: datetime

    sport_key: str
    event_id: str
    kalshi_ticker: str

    yes_outcome: str
    no_outcome: str

    kalshi_yes_bid: Optional[float] = None
    kalshi_yes_ask: Optional[float] = None

    ref_source: Optional[str] = None
    ref_implied_yes: Optional[float] = None
    ref_raw: Dict[str, Any] = field(default_factory=dict)

    meta: Dict[str, Any] = field(default_factory=dict)

    @property
    def kalshi_yes_mid(self) -> Optional[float]:
        if self.kalshi_yes_bid is None or self.kalshi_yes_ask is None:
            return None
        return 0.5 * (self.kalshi_yes_bid + self.kalshi_yes_ask)

    @property
    def kalshi_no_ask(self) -> Optional[float]:
        if self.kalshi_yes_ask is None:
            return None
        return 1.0 - self.kalshi_yes_ask

    @property
    def kalshi_no_bid(self) -> Optional[float]:
        if self.kalshi_yes_bid is None:
            return None
        return 1.0 - self.kalshi_yes_bid

    @property
    def kalshi_no_mid(self) -> Optional[float]:
        mid_yes = self.kalshi_yes_mid
        if mid_yes is None:
            return None
        return 1.0 - mid_yes

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["as_of"] = self.as_of.isoformat()
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "MarketSnapshot":
        d = dict(d)
        as_of_raw = d.get("as_of")
        if isinstance(as_of_raw, str):
            d["as_of"] = datetime.fromisoformat(as_of_raw)
        return cls(**d)
