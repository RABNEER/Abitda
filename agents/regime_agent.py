"""
Regime Reader & Synthesis Agent
Uses LLM (Gemini) with deterministic backstops to classify market state.
Produces structured regime data and plain-English internal monologue.
"""

from typing import Dict, Any
from google import genai
from config.settings import GEMINI_API_KEY
from config.regime_thresholds import (
    REGIME_RANGE_BOUND,
    REGIME_TRENDING,
    REGIME_EVENT_RISK,
    IV_PCTL_RANGE_BOUND_MAX,
    IV_PCTL_EVENT_RISK_MIN,
    VIX_ELEVATED,
    VIX_INTRADAY_SPIKE_PCT
)

class RegimeAgent:
    def __init__(self, api_key: str = GEMINI_API_KEY):
        self.api_key = api_key
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"GenAI Client initialization error: {e}")

    def classify_regime(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classifies market regime into RANGE_BOUND, TRENDING, or EVENT_RISK.
        Combines deterministic rules with LLM synthesis.
        """
        iv_pctl = telemetry.get("iv_percentile", 25.0)
        vix = telemetry.get("vix", 16.0)
        vix_change = telemetry.get("vix_change_pct", 0.0)
        trend = telemetry.get("trend", "NEUTRAL")
        symbol = telemetry.get("symbol", "SPY")

        # 1. Deterministic Rule Check
        if iv_pctl > IV_PCTL_EVENT_RISK_MIN or vix > VIX_ELEVATED or vix_change > VIX_INTRADAY_SPIKE_PCT:
            deterministic_regime = REGIME_EVENT_RISK
            recommended_playbook = "NO_NEW_ENTRIES / VOL_HEDGE"
        elif iv_pctl < IV_PCTL_RANGE_BOUND_MAX and trend == "NEUTRAL":
            deterministic_regime = REGIME_RANGE_BOUND
            recommended_playbook = "IRON_CONDOR"
        elif trend in ("UPTREND", "DOWNTREND"):
            deterministic_regime = REGIME_TRENDING
            recommended_playbook = "BULL_PUT_SPREAD" if trend == "UPTREND" else "BEAR_CALL_SPREAD"
        else:
            deterministic_regime = REGIME_RANGE_BOUND
            recommended_playbook = "IRON_CONDOR"

        # 2. LLM Synthesis for Internal Monologue (Explainability)
        reasoning = self._generate_reasoning(telemetry, deterministic_regime, recommended_playbook)

        return {
            "regime": deterministic_regime,
            "recommended_playbook": recommended_playbook,
            "reasoning": reasoning,
            "telemetry": telemetry
        }

    def _generate_reasoning(self, telemetry: Dict[str, Any], regime: str, playbook: str) -> str:
        """Generates clear, trader-like plain-English explanation."""
        if self.client:
            try:
                prompt = (
                    f"You are the Chief Risk Officer and Head of Options at ThetaHawk Capital. "
                    f"Given this market telemetry for {telemetry.get('symbol')}: "
                    f"Price: ${telemetry.get('price')}, VIX: {telemetry.get('vix')} (change: {telemetry.get('vix_change_pct')*100:+.1f}%), "
                    f"IV Percentile: {telemetry.get('iv_percentile')}%, Trend: {telemetry.get('trend')}. "
                    f"The deterministic regime is {regime}, and the strategy playbook is {playbook}. "
                    f"Write a concise, professional 1-2 sentence market debrief explaining why this regime fits the strategy. "
                    f"Format as: 'Regime: [Name] | [Rationale]'."
                )
                response = self.client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=prompt
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                # Silently fall back to deterministic template if API fails
                pass

        # Clean fallback template
        if regime == REGIME_RANGE_BOUND:
            return (
                f"Regime: Range-Bound (IV %ile: {telemetry.get('iv_percentile')}%, VIX: {telemetry.get('vix')}). "
                f"Low volatility clustering favors theta-decay collection via symmetric Iron Condors."
            )
        elif regime == REGIME_TRENDING:
            return (
                f"Regime: Trending ({telemetry.get('trend')}, IV %ile: {telemetry.get('iv_percentile')}%). "
                f"Directional momentum supports selling high-probability out-of-the-money credit spreads."
            )
        else:
            return (
                f"Regime: Event-Risk (VIX: {telemetry.get('vix')}, IV %ile: {telemetry.get('iv_percentile')}%). "
                f"Elevated tail-risk detected. All premium-selling entries suspended; defensive hedging active."
            )
