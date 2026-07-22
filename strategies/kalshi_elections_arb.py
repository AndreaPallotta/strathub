import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from base_strategy import BaseStrategy

class KalshiElectionsArbStrategy(BaseStrategy):
    def __init__(self, params=None):
        super().__init__("kalshi_elections_arb", params)

    def on_tick(self, snapshot: dict) -> dict:
        min_spread = float(self.get_param("min_spread", 0.01))
        max_size = int(self.get_param("max_position_size", 10))

        ticker = snapshot.get("ticker", "")
        bid = float(snapshot.get("best_bid", 0.0))
        ask = float(snapshot.get("best_ask", 0.0))
        ref_implied = snapshot.get("ref_implied_yes")

        if ref_implied is not None:
            ref_implied = float(ref_implied)
            # Take Profit SELL signal when market bid price rises above reference implied
            if bid >= (ref_implied - 0.005):
                return {
                    "action": "SELL",
                    "ticker": ticker,
                    "size": max_size,
                    "price": bid,
                    "reason": f"Take Profit: Bid ({bid:.3f}) >= Ref Implied ({ref_implied:.3f})"
                }

            # BUY Entry signal when implied edge >= min_spread
            edge = ref_implied - ask
            if edge >= min_spread:
                return {
                    "action": "BUY",
                    "ticker": ticker,
                    "size": max_size,
                    "price": ask,
                    "reason": f"Elections Edge (+{edge:.3f}) >= Min Edge (+{min_spread:.3f})"
                }

        return None

strategy = KalshiElectionsArbStrategy()

def evaluate(snapshot, params=None):
    if params:
        strategy.set_params(params)
    return strategy.on_tick(snapshot)
