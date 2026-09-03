"""
Regime Thresholds and Constants for ThetaHawk
Matches the specifications in docs/doc.md
"""

# IV Percentile Thresholds
IV_PCTL_RANGE_BOUND_MAX = 30.0   # < 30 -> Range-bound (Iron Condor)
IV_PCTL_TRENDING_MIN = 30.0      # 30-60 -> Trending (Directional Credit Spread)
IV_PCTL_TRENDING_MAX = 60.0
IV_PCTL_EVENT_RISK_MIN = 60.0    # > 60 -> Event-Risk (No entry or Vol hedge)

# VIX Absolute Levels
VIX_ELEVATED = 25.0
VIX_EXTREME = 32.0
VIX_INTRADAY_SPIKE_PCT = 0.12     # 12% intraday spike triggers emergency regime flip

# Regime Classification Labels
REGIME_RANGE_BOUND = "RANGE_BOUND"
REGIME_TRENDING = "TRENDING"
REGIME_EVENT_RISK = "EVENT_RISK"
