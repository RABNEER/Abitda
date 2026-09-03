"""
THETA HAWK: Official Model Context Protocol (MCP) Server
Exposes institutional options desk tools, Black-Scholes Greeks risk gates,
regime classification, and fiduciary self-suspension controls to any MCP client
(Claude Desktop, Cursor, Gemini CLI, or custom agent orchestrators).
"""

from typing import Dict, Any, List
import json
from mcp.server.fastmcp import FastMCP
from core.engine import ThetaHawkEngine
from data.stress_test import BlackSwanStressTest

# Initialize MCP Server
mcp = FastMCP("ThetaHawk-Options-Desk")
engine = ThetaHawkEngine()

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
    Evaluates proposed options trade against aggregate book-level Greeks caps (Gap #1).
    Enforces Net Delta barrier (±0.25) and Net Vega barrier (150). Returns APPROVE or VETO.
    """
    current_book = engine.compute_current_book_greeks()
    proposed = {
        "net_delta": proposed_delta,
        "net_vega": proposed_vega,
        "net_theta": 0.0
    }
    approved, reason, projected = engine.greeks_gate.evaluate_new_trade(current_book, proposed)
    return json.dumps({
        "approved": approved,
        "decision": "APPROVED" if approved else "VETO",
        "reason": reason,
        "current_book_greeks": current_book,
        "projected_book_greeks": projected,
        "limits": {
            "max_portfolio_delta": 0.25,
            "max_portfolio_vega": 150.0
        }
    }, indent=2)

@mcp.tool()
def audit_fiduciary_guardian() -> str:
    """
    Audits closed trades using rolling binomial Z-scores to detect edge decay (Gap #3).
    Returns whether the desk is operating safely or locked in self-suspension.
    """
    closed = engine.ledger.get_closed_trades()
    suspended, message, stats = engine.guardian.evaluate_performance(closed)
    return json.dumps({
        "is_suspended": suspended,
        "status": "SUSPENDED" if suspended else "ACTIVE",
        "message": message,
        "stats": stats
    }, indent=2)

@mcp.tool()
def execute_options_trading_cycle(symbol: str = "SPY", force_regime: str = None) -> str:
    """
    Executes the full autonomous 5-step trader loop on Alpaca Paper Account PA382FDPI5IO:
    Regime Scan -> Candidate Selection -> Greeks Barrier -> Conviction Sizing -> Order Placement.
    """
    res = engine.run_trading_cycle(symbol=symbol, force_regime=force_regime)
    return json.dumps(res, indent=2)

@mcp.tool()
def run_black_swan_stress_test() -> str:
    """
    Replays the historical August 5, 2024 Yen Carry Trade Crash (VIX surged to 65.73).
    Compares a naive options bot (-43.8% account blowout) against ThetaHawk's early regime-flip exit (-1.24% scratch).
    """
    tester = BlackSwanStressTest()
    res = tester.run_replay()
    return json.dumps(res, indent=2)

@mcp.tool()
def ask_desk_quant(question: str) -> str:
    """
    Asks a question to the ThetaHawk floor quant (powered by Google Gemini).
    Explains risk decisions, Greeks math, and strategy selection.
    """
    reply = engine.copilot.ask_copilot(question)
    return reply

if __name__ == "__main__":
    # Runs standard stdio MCP transport for Claude Desktop / Cursor / Gemini
    mcp.run(transport="stdio")
