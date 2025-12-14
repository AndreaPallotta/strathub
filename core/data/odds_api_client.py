from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests


@dataclass
class OddsEvent:
    sport_key: str
    event_id: str
    home_team: str
    away_team: str
    commence_time: datetime
    implied_home: Optional[float]
    implied_away: Optional[float]
    raw: Dict[str, Any]


def _american_to_prob(odds: float) -> Optional[float]:
    try:
        parsed_odds = float(odds)
    except Exception:
        return None

    if parsed_odds > 0:
        return 100.0 / (parsed_odds + 100.0)
    if parsed_odds < 0:
        return -parsed_odds / (-parsed_odds + 100.0)
    return None


class OddsApiClient:
    def __init__(
        self,
        base_http: str,
        api_key: str,
        sports_keys: List[str],
        region: str,
        markets: str,
        odds_format: str,
        timeout: float = 5.0,
    ):
        self.base_http = base_http.rstrip("/")
        self.api_key = api_key
        self.sports_keys = sports_keys
        self.region = region
        self.markets = markets
        self.odds_format = odds_format
        self.timeout = timeout

    def fetch_odds(self) -> List[OddsEvent]:
        events: List[OddsEvent] = []

        for sport_key in self.sports_keys:
            url = f"{self.base_http}/sports/{sport_key}/odds"
            params = {
                "apiKey": self.api_key,
                "regions": self.region,
                "markets": self.markets,
                "oddsFormat": self.odds_format,
            }

            try:
                resp = requests.get(url, params=params, timeout=self.timeout)
                resp.raise_for_status()
                data = resp.json()
            except Exception:
                continue

            if not isinstance(data, list):
                continue

            for ev in data:
                try:
                    event_id = ev.get("id")
                    home_team = ev.get("home_team")
                    away_team = ev.get("away_team")
                    commence_raw = ev.get("commence_time")
                    sport_key_ev = ev.get("sport_key", sport_key)

                    if not event_id or not home_team or not away_team:
                        continue

                    commence_time = (
                        datetime.fromisoformat(commence_raw.replace("Z", "+00:00"))
                        if isinstance(commence_raw, str)
                        else datetime.utcnow()
                    )

                    bookmakers = ev.get("bookmakers") or []
                    if not bookmakers:
                        implied_home = implied_away = None
                    else:
                        implied_home, implied_away = self._extract_implied_probs(
                            home_team, away_team, bookmakers
                        )

                    events.append(
                        OddsEvent(
                            sport_key=sport_key_ev,
                            event_id=event_id,
                            home_team=home_team,
                            away_team=away_team,
                            commence_time=commence_time,
                            implied_home=implied_home,
                            implied_away=implied_away,
                            raw=ev,
                        )
                    )
                except Exception:
                    continue
        return events

    def _extract_implied_probs(
        self,
        home_team: str,
        away_team: str,
        bookmakers: List[Dict[str, Any]],
    ) -> tuple[Optional[float], Optional[float]]:
        for bm in bookmakers:
            markets = bm.get("markets") or []
            for m in markets:
                if m.get("key") != "h2h":
                    continue
                outcomes = m.get("outcomes") or []
                if len(outcomes) < 2:
                    continue

                implied_home = implied_away = None
                for o in outcomes:
                    name = o.get("name")
                    price = o.get("price")
                    p = _american_to_prob(price)
                    if name == home_team:
                        implied_home = p
                    elif name == away_team:
                        implied_away = p

                if implied_home is not None or implied_away is not None:
                    return implied_home, implied_away

        return None, None
