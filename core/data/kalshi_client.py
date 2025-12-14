from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import requests


@dataclass
class KalshiMarketQuote:
    ticker: str
    yes_price_cents: Optional[int]
    volume: Optional[int]
    raw: Dict[str, Any]


@dataclass
class KalshiOrderbook:
    ticker: str
    yes_bids: List[Tuple[int, int]]
    no_bids: List[Tuple[int, int]]
    raw: Dict[str, Any]


class KalshiClient:
    def __init__(self, base_http: str, timeout: float = 5.0) -> None:
        self.base_http = base_http.rstrip("/")
        self.timeout = timeout

    def get_markets(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        tickers: Optional[List[str]] = None,
        series_ticker: Optional[str] = None,
        event_ticker: Optional[str] = None,
    ) -> List[KalshiMarketQuote]:
        params: Dict[str, Any] = {
            "limit": limit,
        }
        if status:
            params["status"] = status
        if tickers:
            params["tickers"] = ",".join(tickers)
        if series_ticker:
            params["series_ticker"] = series_ticker
        if event_ticker:
            params["event_ticker"] = event_ticker

        url = f"{self.base_http}/trade-api/v2/markets"
        try:
            resp = requests.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return []

        markets = data.get("markets") or []
        out: List[KalshiMarketQuote] = []
        for m in markets:
            try:
                out.append(
                    KalshiMarketQuote(
                        ticker=m.get("ticker"),
                        yes_price_cents=m.get("yes_price"),
                        volume=m.get("volume"),
                        raw=m,
                    )
                )
            except Exception:
                continue

        return out

    def get_market(self, ticker: str) -> Optional[KalshiMarketQuote]:
        url = f"{self.base_http}/trade-api/v2/markets/{ticker}"
        try:
            resp = requests.get(url, timeout=self.timeout)
            resp.raise_for_status()
            m = resp.json().get("market") or {}
        except Exception:
            return None

        res_ticker = m.get("ticker")
        if not res_ticker:
            return None
        try:
            return KalshiMarketQuote(
                ticker=res_ticker,
                yes_price_cents=m.get("yes_price"),
                volume=m.get("volume"),
                raw=m,
            )
        except Exception:
            return None

    def get_orderbook(self, ticker: str) -> Optional[KalshiOrderbook]:
        url = f"{self.base_http}/trade-api/v2/markets/{ticker}/orderbook"
        try:
            resp = requests.get(url, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return None

        ob = data.get("orderbook") or {}
        yes = ob.get("yes") or []
        no = ob.get("no") or []

        yes_bids: List[Tuple[int, int]] = []
        no_bids: List[Tuple[int, int]] = []

        for b in yes:
            try:
                price_cents = int(b[0])
                qty = int(b[1])
                yes_bids.append((price_cents, qty))
            except Exception:
                continue

        for b in no:
            try:
                price_cents = int(b[0])
                qty = int(b[1])
                no_bids.append((price_cents, qty))
            except Exception:
                continue

        yes_bids.sort(key=lambda x: x[0], reverse=True)
        no_bids.sort(key=lambda x: x[0], reverse=True)

        return KalshiOrderbook(
            ticker=ticker,
            yes_bids=yes_bids,
            no_bids=no_bids,
            raw=data,
        )

    def get_yes_bid_ask(self, ticker: str) -> Tuple[Optional[float], Optional[float]]:
        ob = self.get_orderbook(ticker)
        if ob is None:
            return None, None

        yes_bid_cents = ob.yes_bids[0][0] if ob.yes_bids else None
        no_bid_cents = ob.no_bids[0][0] if ob.no_bids else None

        yes_bid = yes_bid_cents / 100.0 if yes_bid_cents is not None else None
        no_bid = no_bid_cents / 100.0 if no_bid_cents is not None else None

        yes_ask: Optional[float] = None
        if no_bid is not None:
            yes_ask = 1.0 - no_bid

        return yes_bid, yes_ask
