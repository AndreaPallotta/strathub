from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ..models.snapshots import MarketSnapshot
from .kalshi_client import KalshiClient
from .odds_api_client import OddsApiClient


class LiveSnapshotBuilder:

    def __init__(self, config: Dict[str, Any]) -> None:
        sources_cfg = config.get("sources", {}) or {}
        odds_cfg = sources_cfg.get("odds", {}) or {}

        self._odds_client: Optional[OddsApiClient] = None
        api_key = odds_cfg.get("api_key")
        base_http = odds_cfg.get("base_http")
        sports_keys = odds_cfg.get("sports_keys") or []
        region = odds_cfg.get("metadata", {}).get("region", "us")
        markets = odds_cfg.get("metadata", {}).get("markets", "h2h")
        odds_format = odds_cfg.get("metadata", {}).get("oddsFormat", "american")

        if api_key and base_http and sports_keys:
            self._odds_client = OddsApiClient(
                base_http=base_http,
                api_key=api_key,
                sports_keys=sports_keys,
                region=region,
                markets=markets,
                odds_format=odds_format,
            )

        kalshi_cfg = config.get("kalshi", {}) or {}
        kalshi_base_http = kalshi_cfg.get("base_http")
        self._kalshi_client: Optional[KalshiClient] = None
        if kalshi_base_http:
            self._kalshi_client = KalshiClient(base_http=kalshi_base_http)

        self._event_ticker_map: Dict[str, str] = (
            kalshi_cfg.get("event_ticker_map", {}) or {}
        )

    def build_snapshots(self) -> List[MarketSnapshot]:
        snapshots: List[MarketSnapshot] = []

        if self._odds_client is None:
            return snapshots

        odds_events = self._odds_client.fetch_odds()
        now = datetime.now(timezone.utc)

        for i, ev in enumerate(odds_events, start=1):
            snapshot_id = f"live-{ev.event_id}-{i}"

            yes_outcome = "HOME_WIN"
            no_outcome = "NOT_HOME_WIN"

            kalshi_ticker = self._event_ticker_map.get(
                ev.event_id, f"{ev.sport_key}.{ev.event_id}.YES"
            )

            kalshi_yes_bid: Optional[float] = None
            kalshi_yes_ask: Optional[float] = None

            if kalshi_ticker and self._kalshi_client is not None:
                try:
                    yes_bid, yes_ask = self._kalshi_client.get_yes_bid_ask(
                        kalshi_ticker
                    )
                    kalshi_yes_bid = yes_bid
                    kalshi_yes_ask = yes_ask
                except Exception:
                    kalshi_yes_bid = None
                    kalshi_yes_ask = None

            meta = {
                "home_team": ev.home_team,
                "away_team": ev.away_team,
                "commence_time": ev.commence_time.isoformat(),
            }

            snapshot = MarketSnapshot(
                snapshot_id=snapshot_id,
                as_of=now,
                sport_key=ev.sport_key,
                event_id=ev.event_id,
                kalshi_ticker=kalshi_ticker,
                yes_outcome=yes_outcome,
                no_outcome=no_outcome,
                kalshi_yes_bid=kalshi_yes_bid,
                kalshi_yes_ask=kalshi_yes_ask,
                ref_source="odds_api",
                ref_implied_yes=ev.implied_home,
                ref_raw=ev.raw,
                meta=meta,
            )

            snapshots.append(snapshot)

        return snapshots
