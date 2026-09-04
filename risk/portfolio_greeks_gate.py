"""
Portfolio Greeks Engine & Gatekeeper (Gap #1)
Monitors and enforces aggregate book-level Greeks across all open positions.
Rejects or downsizes any new trade that would cause total book exposure to breach limits.
"""

from typing import Dict, Any, List, Tuple
from config.settings import MAX_PORTFOLIO_DELTA, MAX_PORTFOLIO_VEGA

class PortfolioGreeksGate:
    def __init__(self, max_delta: float = MAX_PORTFOLIO_DELTA, max_vega: float = MAX_PORTFOLIO_VEGA):
        self.max_delta = max_delta
        self.max_vega = max_vega

    def evaluate_new_trade(
        self,
        current_book_greeks: Dict[str, float],
        proposed_trade_greeks: Dict[str, float]
    ) -> Tuple[bool, str, Dict[str, float]]:
        """
        Evaluates whether proposed trade would breach the portfolio Greeks limits.
        Returns:
            (approved: bool, reason: str, projected_book_greeks: dict)
        """
        curr_delta = current_book_greeks.get("net_delta", 0.0)
        curr_vega = current_book_greeks.get("net_vega", 0.0)
        curr_theta = current_book_greeks.get("net_theta", 0.0)

        prop_delta = proposed_trade_greeks.get("net_delta", 0.0)
        prop_vega = proposed_trade_greeks.get("net_vega", 0.0)
        prop_theta = proposed_trade_greeks.get("net_theta", 0.0)

        projected_delta = round(curr_delta + prop_delta, 4)
        projected_vega = round(curr_vega + prop_vega, 4)
        projected_theta = round(curr_theta + prop_theta, 4)

        projected = {
            "net_delta": projected_delta,
            "net_vega": projected_vega,
            "net_theta": projected_theta
        }

        # Check Delta limit
        if abs(projected_delta) > self.max_delta:
            reason = (
                f"REJECTED — Proposed trade would breach portfolio Delta limit. "
                f"Projected Net Delta: {projected_delta:+.4f} (Max Allowed: ±{self.max_delta})"
            )
            return False, reason, projected

        # Check Vega limit
        if abs(projected_vega) > self.max_vega:
            reason = (
                f"REJECTED — Proposed trade would breach portfolio Vega limit. "
                f"Projected Net Vega: {projected_vega:+.2f} (Max Allowed: ±{self.max_vega})"
            )
            return False, reason, projected

        reason = (
            f"APPROVED — Trade satisfies portfolio risk constraints. "
            f"Projected Delta: {projected_delta:+.4f}, Projected Vega: {projected_vega:+.2f}, "
            f"Net Daily Theta: +${projected_theta:.2f}"
        )
        return True, reason, projected

    def audit_trade(self, current_book_greeks: Dict[str, float], proposed_delta: float, proposed_vega: float) -> Dict[str, Any]:
        """Convenience method returning structured audit decision."""
        approved, reason, projected = self.evaluate_new_trade(
            current_book_greeks,
            {"net_delta": proposed_delta, "net_vega": proposed_vega, "net_theta": 0.0}
        )
        return {
            "is_approved": approved,
            "reason": reason,
            "projected_delta": projected["net_delta"],
            "projected_vega": projected["net_vega"]
        }

