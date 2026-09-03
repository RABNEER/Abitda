"""
Explainability & Narrator Agent
Translates quantitative signals, portfolio Greeks gates, and trade events into plain-English reasoning.
Powers the live thought-stream on the Streamlit dashboard.
"""

from typing import Dict, Any, Optional
from google import genai
from config.settings import GEMINI_API_KEY

class NarratorAgent:
    def __init__(self, api_key: str = GEMINI_API_KEY):
        self.api_key = api_key
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                pass

    def narrate_event(self, event_type: str, context: Dict[str, Any]) -> str:
        """
        Produces an institutional-grade, plain-English summary of an agent decision or risk gate.
        """
        if self.client:
            try:
                prompt = (
                    f"You are the senior floor narrator for ThetaHawk, an autonomous options desk. "
                    f"Event Type: {event_type}. Context: {context}. "
                    f"Generate a crisp, confident 1-sentence explanation of this decision as an options desk head. "
                    f"No disclaimers, no filler."
                )
                res = self.client.models.generate_content(
                    model="gemini-3.6-flash",
                    contents=prompt
                )
                if res and res.text:
                    return res.text.strip()
            except Exception:
                pass

        # Robust fallbacks
        if event_type == "RISK_VETO":
            return f"VETO TRIGGERED: Order rejected because book exposure would breach portfolio limits ({context.get('reason')})."
        elif event_type == "REGIME_FLIP":
            return f"EMERGENCY EXIT: Environment shifted to EVENT_RISK; positions closed immediately to prevent tail-risk expansion."
        elif event_type == "SELF_SUSPENSION":
            return f"TRADING SUSPENDED: Realized win rate fell below theoretical threshold. Fiduciary lock engaged."
        elif event_type == "TRADE_EXECUTED":
            return f"ORDER DISPATCHED: {context.get('strategy_type')} on {context.get('symbol')} executed for ${context.get('total_credit'):.2f} credit."
        else:
            return f"Status updated for {context.get('symbol', 'Portfolio')}: {context.get('message', 'Normal operations.')}"
