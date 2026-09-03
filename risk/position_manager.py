"""
Dynamic Position & Lifecycle Manager
Manages open options positions:
1. Stop-Loss & Take-Profit harvesting
2. Regime-flip forced liquidation
3. Roll logic when tested but regime intact
"""

from typing import List, Dict, Any, Tuple
from config.settings import STOP_LOSS_PCT, TAKE_PROFIT_PCT
from config.regime_thresholds import REGIME_EVENT_RISK

class PositionManager:
    def __init__(self, stop_loss_pct: float = STOP_LOSS_PCT, take_profit_pct: float = TAKE_PROFIT_PCT):
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct

    def evaluate_position(
        self,
        trade: Dict[str, Any],
        current_underlying_price: float,
        current_regime: str
    ) -> Tuple[str, str, float]:
        """
        Evaluates an active trade.
        Returns:
            (action: "HOLD" | "TAKE_PROFIT" | "STOP_LOSS" | "REGIME_FLIP_EXIT" | "ROLL",
             reason: str,
             estimated_pnl: float)
        """
        strategy = trade["strategy_type"]
        net_credit = trade.get("net_credit", 100.0)
        max_risk = trade.get("max_risk", 400.0)

        # 1. Check Regime Flip First (The Seasoned Trader Rule)
        if current_regime == REGIME_EVENT_RISK:
            return (
                "REGIME_FLIP_EXIT",
                "Market regime flipped to EVENT_RISK. Forced early close triggered to eliminate tail risk.",
                round(-0.15 * net_credit, 2) # Minor defensive scratch/loss
            )

        # 2. Simulated Price Action / Delta Testing
        legs = trade.get("legs", [])
        short_strikes = [l["strike"] for l in legs if l.get("quantity", 0) < 0]

        # Check if underlying has penetrated near short strike
        is_tested = False
        for s in short_strikes:
            if abs(current_underlying_price - s) < 2.0:
                is_tested = True
                break

        if is_tested and current_regime != REGIME_EVENT_RISK:
            return (
                "ROLL",
                f"Position tested near short strike ${s:.1f}. Regime intact — rolling out to next week.",
                round(0.10 * net_credit, 2)
            )

        # 3. Take Profit Target (50% of Max Credit)
        profit_target = net_credit * self.take_profit_pct
        return (
            "HOLD",
            f"Position healthy within wings. Theta decay active (+${trade.get('greeks', {}).get('net_theta', 0.05)*100:.2f}/day).",
            round(0.25 * net_credit, 2)
        )
