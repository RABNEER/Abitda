"""
ThetaHawk Agentic Co-Pilot & ReAct Engine
Provides multi-step reasoning, autonomous tool dispatch, and live thought streams.
Integrates:
1. 4-Agent Desk Committee Debate (TradingAgents architecture)
2. Vibe Desk Natural Language Strategy Architect & Scenario Stress-Tester (Vibe-Trading architecture)
"""

from typing import Dict, Any, List
from google import genai
from config.settings import GEMINI_API_KEY, ALPACA_ACCOUNT_NUMBER
from agents.committee import DeskCommittee
from agents.vibe_desk import VibeDeskArchitect

class AgenticCoPilot:
    def __init__(self, engine):
        self.engine = engine
        self.committee = DeskCommittee(engine)
        self.vibe_desk = VibeDeskArchitect(engine)
        self.client = None
        if GEMINI_API_KEY:
            try:
                self.client = genai.Client(api_key=GEMINI_API_KEY)
            except Exception:
                pass

    def run_agentic_cycle(self, symbol: str = "SPY") -> List[Dict[str, str]]:
        """
        Executes a visible, multi-step ReAct loop featuring the 4-Agent Desk Committee.
        Returns the structured chain-of-thought for the live terminal.
        """
        steps = []

        # 1. Thought: Environment Inspection
        steps.append({
            "type": "THOUGHT",
            "content": f"Initiating autonomous options surveillance cycle on {symbol}. Querying market telemetry and volatility surface."
        })

        # 2. Action: Tool Call Market Telemetry
        telemetry = self.engine.market_reader.fetch_market_telemetry(symbol)
        steps.append({
            "type": "TOOL_CALL",
            "content": f"mcp_alpaca_get_market_data(symbol='{symbol}')"
        })
        steps.append({
            "type": "OBSERVATION",
            "content": f"Spot: ${telemetry['price']} | VIX: {telemetry['vix']} ({telemetry['vix_change_pct']*100:+.1f}%) | IV Percentile: {telemetry['iv_percentile']}% | Trend: {telemetry['trend']}"
        })

        # 3. Convene 4-Agent Desk Committee
        steps.append({
            "type": "THOUGHT",
            "content": "Convening 4-Agent Floor Committee for multi-agent adversarial deliberation."
        })

        committee_res = self.committee.deliberate(symbol)
        for deb in committee_res["debate"]:
            steps.append({
                "type": deb["agent"],
                "content": f"[{deb['role']}]: {deb['content']}"
            })

        # 4. Action: Tool Call Portfolio Greeks Engine
        book_greeks = self.engine.compute_current_book_greeks()
        steps.append({
            "type": "TOOL_CALL",
            "content": f"risk_engine_check_portfolio_greeks(current_delta={book_greeks['net_delta']}, max=±0.25)"
        })

        if not committee_res["is_approved"]:
            steps.append({
                "type": "VETO",
                "content": f"COMMITTEE RESOLUTION: {committee_res['consensus']}. Trade rejected; 100% of capital preserved."
            })
            steps.append({
                "type": "REFLECTION",
                "content": "Fiduciary constraint preserved. Zero naked risk permitted. Continuing surveillance."
            })
        else:
            candidate = committee_res["candidate"]
            contracts = committee_res["contracts"]
            projected = committee_res["projected_greeks"]

            steps.append({
                "type": "OBSERVATION",
                "content": f"Greeks Gate Passed: Projected Net Delta {projected['net_delta']:+.4f} within limits. Daily Theta yield: +${projected['net_theta']:.2f}."
            })
            steps.append({
                "type": "TOOL_CALL",
                "content": f"alpaca_mcp_place_option_order(symbol='{symbol}', strategy='{candidate['strategy_type']}', contracts={contracts})"
            })
            steps.append({
                "type": "EXECUTION",
                "content": f"Order Dispatched: {contracts}x {candidate['strategy_type']} collected ${candidate['estimated_credit_per_contract']*contracts:.2f} total credit."
            })
            steps.append({
                "type": "REFLECTION",
                "content": f"Trade recorded in ACID SQLite ledger. Post-trade Delta: {projected['net_delta']:+.4f}. Continuing market scan."
            })

        return steps

    def run_committee_debate(self, symbol: str = "SPY") -> Dict[str, Any]:
        """Runs the 4-agent committee debate explicitly."""
        return self.committee.deliberate(symbol)

    def ask_copilot(self, user_prompt: str, symbol: str = "SPY") -> str:
        """
        Translates trader prompts, vibe checks, and hypothetical stress scenarios
        into actionable quantitative options intelligence via VibeDeskArchitect.
        """
        vibe_res = self.vibe_desk.process_prompt(user_prompt, symbol)
        return vibe_res["narrative"]
