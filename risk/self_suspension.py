"""
Self-Awareness & Win-Rate Guardian (Gap #3)
Audits the agent's historical performance over a rolling window.
If the realized win-rate drops significantly below the strategy's theoretical edge,
automatically triggers a safety suspension and displays an alert.
"""

from typing import List, Dict, Any, Tuple
import math

class PerformanceGuardian:
    def __init__(
        self,
        min_sample_size: int = 5,
        expected_win_rate: float = 0.70, # 70% expected win rate for out-of-the-money credit spreads
        z_score_threshold: float = -1.64 # 90% confidence one-tailed threshold
    ):
        self.min_sample_size = min_sample_size
        self.expected_win_rate = expected_win_rate
        self.z_score_threshold = z_score_threshold
        self.is_suspended = False
        self.suspension_reason = ""

    def evaluate_performance(self, closed_trades: List[Dict[str, Any]]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Audits closed trades. Returns:
            (is_suspended: bool, status_message: str, stats: dict)
        """
        total_trades = len(closed_trades)
        if total_trades < self.min_sample_size:
            self.is_suspended = False
            self.suspension_reason = ""
            msg = f"Insufficient trade history for statistical audit ({total_trades}/{self.min_sample_size}). Trading active."
            return False, msg, {
                "total_trades": total_trades,
                "wins": sum(1 for t in closed_trades if t.get("pnl", 0) > 0),
                "win_rate": 0.0,
                "z_score": 0.0
            }

        wins = sum(1 for t in closed_trades if t.get("pnl", 0) > 0)
        realized_win_rate = wins / total_trades

        # Binomial test / Z-score approximation
        # SE = sqrt( p * (1 - p) / n )
        p = self.expected_win_rate
        std_err = math.sqrt(p * (1.0 - p) / total_trades)
        z_score = (realized_win_rate - p) / std_err if std_err > 0 else 0.0

        stats = {
            "total_trades": total_trades,
            "wins": wins,
            "losses": total_trades - wins,
            "realized_win_rate": round(realized_win_rate, 4),
            "expected_win_rate": round(self.expected_win_rate, 4),
            "z_score": round(z_score, 2)
        }

        if z_score < self.z_score_threshold or (total_trades >= 5 and realized_win_rate < 0.40):
            self.is_suspended = True
            self.suspension_reason = (
                f"TRADING SUSPENDED — Win-rate degradation detected. "
                f"Realized win rate: {realized_win_rate*100:.1f}% vs Expected: {p*100:.1f}% "
                f"(Z-score: {z_score:.2f}). Trading paused pending review."
            )
            return True, self.suspension_reason, stats

        self.is_suspended = False
        self.suspension_reason = ""
        msg = (
            f"PERFORMANCE HEALTHY — Realized Win Rate: {realized_win_rate*100:.1f}% "
            f"(Expected: {p*100:.1f}%, Z-score: {z_score:.2f}). Trading permitted."
        )
        return False, msg, stats
