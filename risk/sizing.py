"""
Conviction-Weighted Position Sizer
Implements the formula from docs/doc.md:
size = base_contract_count * confidence_score * (1 - current_exposure / max_exposure)
Dynamically sizes contracts based on signal conviction and remaining portfolio risk budget.
"""

from typing import Dict, Any

class ConvictionSizer:
    def __init__(self, base_contract_count: int = 2, max_exposure_delta: float = 0.25):
        self.base_contract_count = base_contract_count
        self.max_exposure_delta = max_exposure_delta

    def calculate_size(
        self,
        candidate: Dict[str, Any],
        telemetry: Dict[str, Any],
        current_book_greeks: Dict[str, float],
        account_equity: float
    ) -> int:
        """
        Calculates optimal number of contracts to trade.
        """
        # 1. Confidence score based on regime clarity and volatility extremity
        iv_pctl = telemetry.get("iv_percentile", 25.0)
        # Closer to sweet spots yields higher confidence
        if iv_pctl < 20.0 or iv_pctl > 50.0:
            confidence = 0.90
        elif iv_pctl < 35.0:
            confidence = 0.75
        else:
            confidence = 0.60

        # 2. Portfolio headroom calculation
        curr_delta = abs(current_book_greeks.get("net_delta", 0.0))
        headroom = max(1.0 - (curr_delta / self.max_exposure_delta), 0.1)

        # 3. Apply formula
        raw_size = self.base_contract_count * confidence * headroom
        calculated_contracts = max(int(round(raw_size)), 1)

        # 4. Check capital cap: maximum 5% of account equity per trade
        max_risk_per_contract = candidate.get("max_risk_per_contract", 500.0)
        max_allowed_capital = account_equity * 0.05
        max_contracts_by_capital = max(int(max_allowed_capital / max_risk_per_contract), 1)

        final_contracts = min(calculated_contracts, max_contracts_by_capital)
        return final_contracts
