"""
Regime-Flip Early Exit Monitor (Gap #2)
Monitors active open positions against prevailing market regime.
If market regime shifts to EVENT_RISK (e.g. VIX spike, sudden volatility expansion),
triggers an immediate defensive liquidation of open spreads to prevent catastrophic losses.
"""

from typing import Dict, Any, List, Tuple
from config.regime_thresholds import REGIME_EVENT_RISK

class RegimeFlipMonitor:
    def __init__(self):
        pass

    def evaluate_open_positions(
        self,
        current_regime: str,
        open_positions: List[Dict[str, Any]],
        regime_details: Dict[str, Any]
    ) -> List[Tuple[str, str]]:
        """
        Checks each open position to determine if a regime flip requires immediate forced liquidation.
        Returns a list of tuples: [(position_id, liquidation_reason)]
        """
        actions = []
        if current_regime == REGIME_EVENT_RISK:
            vix_val = regime_details.get("vix", 0.0)
            reason = (
                f"REGIME-FLIP EMERGENCY EXIT — Market regime flipped to EVENT_RISK (VIX: {vix_val:.2f}). "
                f"Defensive exit triggered to avoid tail-risk expansion."
            )
            for pos in open_positions:
                # Premium-selling strategies (credit spreads / iron condors) must close on event risk
                strat = pos.get("strategy_type", "")
                if strat in ("IRON_CONDOR", "BULL_PUT_SPREAD", "BEAR_CALL_SPREAD"):
                    actions.append((pos.get("id", "unknown"), reason))

        return actions
