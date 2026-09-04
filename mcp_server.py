"""
ABITDA: Official Model Context Protocol (MCP) Server
Exposes institutional options desk tools, Black-Scholes Greeks risk gates,
regime classification, agent benchmarking harness, and fiduciary self-suspension controls
to any MCP client (Claude Desktop, Cursor, Gemini CLI, or custom agent orchestrators).
"""

from typing import Dict, Any, List
import json
from mcp.server.fastmcp import FastMCP
from core.engine import AbitdaEngine
from data.stress_test import BlackSwanStressTest
from harness.evaluator import HarnessEvaluator
from harness.scenarios import ScenarioRegistry
from harness.protocol import CommitteeAgentAdapter, VibeAgentAdapter, NaiveMomentumAgent, PassiveThetaFarmer

# Initialize MCP Server
mcp = FastMCP("Abitda-Options-Harness")
engine = AbitdaEngine()

@mcp.tool()
def get_market_regime(symbol: str = "SPY") -> str:
    """
    Reads volatility clustering (VIX, 21-day realized volatility, IV percentile) 
    and classifies the current macro regime into RANGE_BOUND, TRENDING, or EVENT_RISK.
    """
    telemetry = engine.market_reader.fetch_market_telemetry(symbol)
    regime = engine.regime_agent.classify_regime(telemetry)
    return json.dumps({
        "symbol": symbol,
        "spot_price": telemetry["price"],
        "vix": telemetry["vix"],
        "vix_change_pct": telemetry["vix_change_pct"],
        "iv_percentile": telemetry["iv_percentile"],
        "trend": telemetry["trend"],
        "regime": regime["regime"],
        "confidence": regime["confidence"],
        "recommended_playbook": regime["recommended_playbook"],
        "plain_english_reasoning": regime["reasoning"]
    }, indent=2)

@mcp.tool()
def audit_portfolio_greeks(proposed_delta: float = 0.0, proposed_vega: float = 0.0) -> str:
    """
    Evaluates proposed options trade against aggregate book-level Greeks caps.
    Enforces Net Delta barrier (±0.25) and Net Vega barrier (150). Returns APPROVE or VETO.
    """
    current_book = engine.compute_current_book_greeks()
    audit_res = engine.greeks_gate.audit_trade(current_book, proposed_delta, proposed_vega)
    return json.dumps({
        "decision": "APPROVE" if audit_res["is_approved"] else "VETO",
        "reason": audit_res["reason"],
        "current_book_delta": current_book["net_delta"],
        "current_book_vega": current_book["net_vega"],
        "projected_delta": audit_res["projected_delta"],
        "projected_vega": audit_res["projected_vega"],
        "fiduciary_limits": {
            "max_delta": 0.25,
            "max_vega": 150.0
        }
    }, indent=2)

@mcp.tool()
def run_autonomous_cycle(symbol: str = "SPY") -> str:
    """
    Executes the full 5-step Abitda options loop:
    Regime detection -> Opportunity Scan -> Strategy Selection -> Greeks Gate -> Broker Execution.
    """
    cycle_res = engine.run_trading_cycle(symbol)
    return json.dumps({
        "status": cycle_res["status"],
        "regime": cycle_res.get("regime"),
        "trade": cycle_res.get("trade"),
        "log": cycle_res.get("cycle_log", [])
    }, indent=2)

@mcp.tool()
def get_guardian_status() -> str:
    """
    Queries Abitda's autonomous self-suspension guardian.
    Monitors rolling win rate and drawdown to ensure algorithmic capital preservation.
    """
    closed_trades = engine.ledger.get_closed_trades(limit=10)
    is_suspended, reason, stats = engine.guardian.evaluate_performance(closed_trades)
    return json.dumps({
        "is_trading_active": not is_suspended,
        "guardian_state": "SUSPENDED_CIRCUIT_BREAKER" if is_suspended else "NORMAL_OPERATING",
        "reason": reason,
        "rolling_win_rate": stats.get("realized_win_rate", stats.get("win_rate", 0.0)),
        "total_closed_trades": stats.get("total_trades", 0),
        "fiduciary_minimum_win_rate": 0.70
    }, indent=2)

@mcp.tool()
def replay_black_swan_event() -> str:
    """
    Replays the historical August 5, 2024 Yen Carry Trade Crash (VIX surged to 65.73).
    Compares a naive options bot (-43.8% account blowout) against Abitda's early regime-flip exit (-1.24% scratch).
    """
    tester = BlackSwanStressTest()
    res = tester.run_replay()
    return json.dumps(res, indent=2)

@mcp.tool()
def benchmark_agent_scenario(agent_type: str = "committee", scenario_id: str = "aug5_2024") -> str:
    """
    Benchmarks a candidate options trading agent against a calibrated market shock scenario.
    Agent options: 'committee', 'vibe', 'naive_momentum', 'passive_farmer'.
    Scenario options: 'aug5_2024', 'svb_march_2023', 'volmageddon_2018', 'flash_crash_intraday', 'calm_bull_grind'.
    Returns quantitative scorecard with Institutional Certification Grade (A+ to F).
    """
    agent_map = {
        "committee": CommitteeAgentAdapter,
        "vibe": VibeAgentAdapter,
        "naive_momentum": NaiveMomentumAgent,
        "passive_farmer": PassiveThetaFarmer
    }
    agent_cls = agent_map.get(agent_type.lower(), CommitteeAgentAdapter)
    agent = agent_cls()
    scenario = ScenarioRegistry.get_scenario(scenario_id)
    if not scenario:
        return json.dumps({"error": f"Scenario '{scenario_id}' not found."}, indent=2)
    
    evaluator = HarnessEvaluator()
    scorecard = evaluator.evaluate_agent(agent, scenario)
    return json.dumps(scorecard.to_dict(), indent=2)

@mcp.tool()
def ask_desk_quant(question: str) -> str:
    """
    Asks a question to the Abitda floor quant (powered by Google Gemini).
    Explains risk decisions, Greeks math, and strategy selection.
    """
    reply = engine.copilot.ask_copilot(question)
    return reply

def main():
    # Runs standard stdio MCP transport for Claude Desktop / Cursor / Gemini
    mcp.run(transport="stdio")

if __name__ == "__main__":
    main()
