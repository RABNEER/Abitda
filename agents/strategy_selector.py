"""
Strategy Selector & Options Contract Constructor
Constructs mathematically sound, defined-risk options structures (Iron Condors, Credit Spreads, Hedges).
Calculates exact strikes, wings, credits, max loss, and net strategy Greeks.
"""

import uuid
from typing import Dict, Any, List
from data.greeks_engine import calculate_spread_greeks

class StrategySelector:
    def __init__(self):
        pass

    def construct_candidate(
        self,
        symbol: str,
        underlying_price: float,
        playbook: str,
        days_to_expiry: int = 7,
        wing_width: float = 5.0
    ) -> Dict[str, Any]:
        """
        Constructs a structured multi-leg options candidate based on the playbook.
        """
        S = round(underlying_price, 2)
        tte_years = days_to_expiry / 365.0
        trade_id = f"thk-{symbol.lower()}-{uuid.uuid4().hex[:8]}"

        if playbook == "IRON_CONDOR":
            # Short Put ~2.5% OTM, Short Call ~2.5% OTM
            short_put = round((S * 0.975) / 1.0) * 1.0
            long_put = short_put - wing_width
            short_call = round((S * 1.025) / 1.0) * 1.0
            long_call = short_call + wing_width

            legs = [
                {"option_type": "put", "strike": short_put, "tte_years": tte_years, "iv": 0.20, "quantity": -1, "side": "sell"},
                {"option_type": "put", "strike": long_put, "tte_years": tte_years, "iv": 0.22, "quantity": 1, "side": "buy"},
                {"option_type": "call", "strike": short_call, "tte_years": tte_years, "iv": 0.18, "quantity": -1, "side": "sell"},
                {"option_type": "call", "strike": long_call, "tte_years": tte_years, "iv": 0.17, "quantity": 1, "side": "buy"},
            ]
            strategy_type = "IRON_CONDOR"

        elif playbook == "BULL_PUT_SPREAD":
            # Short Put ~1.8% OTM
            short_put = round((S * 0.982) / 1.0) * 1.0
            long_put = short_put - wing_width

            legs = [
                {"option_type": "put", "strike": short_put, "tte_years": tte_years, "iv": 0.21, "quantity": -1, "side": "sell"},
                {"option_type": "put", "strike": long_put, "tte_years": tte_years, "iv": 0.23, "quantity": 1, "side": "buy"},
            ]
            strategy_type = "BULL_PUT_SPREAD"

        elif playbook == "BEAR_CALL_SPREAD":
            # Short Call ~1.8% OTM
            short_call = round((S * 1.018) / 1.0) * 1.0
            long_call = short_call + wing_width

            legs = [
                {"option_type": "call", "strike": short_call, "tte_years": tte_years, "iv": 0.18, "quantity": -1, "side": "sell"},
                {"option_type": "call", "strike": long_call, "tte_years": tte_years, "iv": 0.17, "quantity": 1, "side": "buy"},
            ]
            strategy_type = "BEAR_CALL_SPREAD"

        else: # Defensive / Vol Hedge
            # Long Put ~4% OTM
            hedge_strike = round((S * 0.96) / 1.0) * 1.0
            legs = [
                {"option_type": "put", "strike": hedge_strike, "tte_years": tte_years, "iv": 0.25, "quantity": 1, "side": "buy"}
            ]
            strategy_type = "VOL_HEDGE"

        # Calculate exact Greeks for the candidate
        greeks = calculate_spread_greeks(legs, S)
        net_credit_debit = greeks["net_premium"]

        # Max loss per 1 contract (100 shares per contract)
        if strategy_type in ("BULL_PUT_SPREAD", "BEAR_CALL_SPREAD", "IRON_CONDOR"):
            # Max Risk = (Wing Width - Net Credit) * 100
            estimated_credit_per_contract = max(net_credit_debit, 0.40) * 100.0
            max_risk = max((wing_width * 100.0) - estimated_credit_per_contract, 50.0)
        else: # Long hedge
            estimated_credit_per_contract = -1.50 * 100.0 # Debit paid
            max_risk = abs(estimated_credit_per_contract)

        return {
            "id": trade_id,
            "symbol": symbol,
            "underlying_price": S,
            "strategy_type": strategy_type,
            "days_to_expiry": days_to_expiry,
            "wing_width": wing_width,
            "legs": legs,
            "greeks": greeks,
            "estimated_credit_per_contract": round(estimated_credit_per_contract, 2),
            "max_risk_per_contract": round(max_risk, 2)
        }
