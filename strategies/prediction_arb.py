import sys
import os

# Add strategies directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from base_strategy import BaseStrategy

class QuantitativePredictionArbStrategy(BaseStrategy):
    def __init__(self, params=None):
        super().__init__("prediction_arb", params)

    def on_tick(self, snapshot: dict) -> dict:
        min_spread = float(self.get_param("min_spread", 0.02))
        max_size = int(self.get_param("max_position_size", 10))

        ticker = snapshot.get("ticker", "")
        bid = float(snapshot.get("best_bid", 0.0))
        ask = float(snapshot.get("best_ask", 0.0))
        ref_implied = snapshot.get("ref_implied_yes")

        # 1. Arbitrage Edge Evaluation: Reference Implied vs Market Ask
        if ref_implied is not None:
            ref_implied = float(ref_implied)
            edge = ref_implied - ask
            if edge >= min_spread:
                return {
                    "action": "BUY",
                    "ticker": ticker,
                    "size": max_size,
                    "price": ask,
                    "reason": f"Implied Arbitrage Edge (+{edge:.3f}) >= Min Threshold (+{min_spread:.3f})"
                }

        # 2. Spread Compression Arbitrage
        if ask > 0 and (ask - bid) >= min_spread:
            return {
                "action": "BUY",
                "ticker": ticker,
                "size": max_size,
                "price": ask,
                "reason": f"Spread ({ask - bid:.3f}) >= Min Threshold ({min_spread:.3f})"
            }

        return None

# Instantiation entrypoint
strategy = QuantitativePredictionArbStrategy()

def evaluate(snapshot, params=None):
    if params:
        strategy.set_params(params)
    return strategy.on_tick(snapshot)
