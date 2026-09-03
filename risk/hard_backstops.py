"""
Hard Backstops & Circuit Breakers
Enforced strictly at the code level.
Cannot be bypassed or reasoned around by the LLM.
"""

from typing import Tuple
from config.settings import MAX_CAPITAL_PER_TRADE_PCT, DAILY_DRAWDOWN_LIMIT_PCT

class HardBackstops:
    def __init__(
        self,
        max_trade_pct: float = MAX_CAPITAL_PER_TRADE_PCT,
        daily_loss_pct: float = DAILY_DRAWDOWN_LIMIT_PCT
    ):
        self.max_trade_pct = max_trade_pct
        self.daily_loss_pct = daily_loss_pct

    def check_trade_sizing(self, trade_capital_required: float, current_equity: float) -> Tuple[bool, str]:
        """
        Ensures a single trade does not risk more than max_trade_pct (e.g. 5%) of account equity.
        """
        max_allowed = current_equity * self.max_trade_pct
        if trade_capital_required > max_allowed:
            return False, (
                f"REJECTED: Sizing exceeds hard backstop. "
                f"Trade Risk: ${trade_capital_required:,.2f} > Max Permitted: ${max_allowed:,.2f} ({self.max_trade_pct*100:.1f}%)"
            )
        return True, f"Approved: Trade risk ${trade_capital_required:,.2f} is within {self.max_trade_pct*100:.1f}% equity cap."

    def check_daily_drawdown(self, starting_daily_equity: float, current_equity: float) -> Tuple[bool, str]:
        """
        Emergency circuit breaker: if account equity drops by daily_loss_pct (e.g. 3%),
        halt all trading activity immediately.
        """
        if starting_daily_equity <= 0:
            return True, "Baseline equity not set."

        drawdown_pct = (starting_daily_equity - current_equity) / starting_daily_equity
        if drawdown_pct >= self.daily_loss_pct:
            return False, (
                f"CIRCUIT BREAKER TRIGGERED: Account drawdown ({drawdown_pct*100:.2f}%) "
                f"breached daily maximum limit ({self.daily_loss_pct*100:.1f}%). All trading halted."
            )
        return True, f"Drawdown healthy: {drawdown_pct*100:.2f}% (Limit: {self.daily_loss_pct*100:.1f}%)"
