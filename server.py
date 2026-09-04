"""
Abitda High-Performance FastAPI Backend
Serves real-time options telemetry, Greeks calculations, agent benchmarking harness,
and autonomous trading loops to the TypeScript React desktop desk interface.
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from typing import Optional, Dict, Any, List
from datetime import datetime

from core.engine import AbitdaEngine
from agents.copilot_agent import AgenticCoPilot
from config.settings import (
    MAX_PORTFOLIO_DELTA,
    MAX_PORTFOLIO_VEGA,
    ALPACA_ACCOUNT_NUMBER
)
from harness.evaluator import HarnessEvaluator, HarnessScorecard
from harness.scenarios import ScenarioRegistry
from harness.protocol import (
    CommitteeAgentAdapter,
    VibeAgentAdapter,
    NaiveMomentumAgent,
    PassiveThetaFarmer
)

app = FastAPI(title="Abitda Options Agent Test Harness & Desk API", version="2.0.0")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = AbitdaEngine()
copilot = AgenticCoPilot(engine)
evaluator = HarnessEvaluator()

class CycleRequest(BaseModel):
    symbol: Optional[str] = "SPY"
    force_regime: Optional[str] = None

class ChatRequest(BaseModel):
    prompt: str
    symbol: Optional[str] = "SPY"

class VibeArchitectRequest(BaseModel):
    prompt: str
    symbol: Optional[str] = "SPY"

class BenchmarkRequest(BaseModel):
    agent_id: str = "committee"
    scenario_id: str = "aug5_2024"

@app.get("/api/health")
def health_check():
    return {
        "status": "ONLINE",
        "engine": "Abitda Autonomous Desk & Harness v2.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/status")
def get_account_status():
    acct = engine.broker.get_account_summary()
    greeks = engine.compute_current_book_greeks()
    closed = engine.ledger.get_closed_trades()
    is_suspended, guard_msg, guard_stats = engine.guardian.evaluate_performance(closed)

    return {
        "desk_name": "Abitda Autonomous Options Desk & Test Harness",
        "account_number": ALPACA_ACCOUNT_NUMBER,
        "equity": acct["equity"],
        "cash": acct["cash"],
        "buying_power": acct["buying_power"],
        "options_level": acct["options_level"],
        "broker_status": acct["status"],
        "book_greeks": greeks,
        "limits": {
            "max_delta": MAX_PORTFOLIO_DELTA,
            "max_vega": MAX_PORTFOLIO_VEGA
        },
        "guardian": {
            "is_suspended": is_suspended,
            "message": guard_msg,
            "stats": guard_stats
        },
        "open_trades_count": len(engine.ledger.get_open_trades())
    }

@app.get("/api/telemetry")
def get_market_telemetry(symbol: str = "SPY"):
    telemetry = engine.market_reader.fetch_market_telemetry(symbol)
    regime = engine.regime_agent.classify_regime(telemetry)
    return {
        "telemetry": telemetry,
        "regime": regime
    }

@app.get("/api/trades/open")
def get_open_trades():
    return engine.ledger.get_open_trades()

@app.get("/api/trades/closed")
def get_closed_trades(limit: int = 15):
    return engine.ledger.get_closed_trades(limit=limit)

@app.get("/api/trades")
def get_all_trades():
    return {
        "open_trades": engine.ledger.get_open_trades(),
        "closed_trades": engine.ledger.get_closed_trades(limit=25)
    }

@app.get("/api/events")
def get_audit_log(limit: int = 25):
    return engine.ledger.get_audit_log(limit=limit)

@app.get("/api/audit")
def get_audit_alias(limit: int = 25):
    return {
        "events": engine.ledger.get_audit_log(limit=limit)
    }

@app.post("/api/cycle")
def execute_trading_cycle(req: CycleRequest):
    res = engine.run_trading_cycle(symbol=req.symbol, force_regime=req.force_regime)
    return res

@app.post("/api/chat")
def chat_with_copilot(req: ChatRequest):
    reply = copilot.ask_copilot(req.prompt, req.symbol)
    return {"reply": reply}

# --- 4-Agent Floor Committee Deliberation (TradingAgents) ---
@app.get("/api/agent/committee")
def run_committee_deliberation(symbol: str = "SPY", force_regime: Optional[str] = None):
    from agents.committee import DeskCommittee
    committee = DeskCommittee(engine)
    return committee.deliberate(symbol, force_regime=force_regime)

# --- Vibe Desk Natural Language Strategy Architect (Vibe-Trading) ---
@app.post("/api/vibe/architect")
def run_vibe_architect(req: VibeArchitectRequest):
    from agents.vibe_desk import VibeDeskArchitect
    architect = VibeDeskArchitect(engine)
    return architect.process_prompt(req.prompt, symbol=req.symbol)

# --- Institutional Desk Briefing Dossier Generator ---
@app.get("/api/desk/report")
def get_desk_report(symbol: str = "SPY"):
    from reports.desk_briefing import DeskBriefingGenerator
    generator = DeskBriefingGenerator(engine)
    md = generator.generate_briefing_markdown(symbol, output_path="DESK_BRIEFING.md")
    return {"status": "SUCCESS", "content": md, "filename": "DESK_BRIEFING.md"}

# -------------------------------------------------------------------------
# Harness Benchmark Endpoints
# -------------------------------------------------------------------------

@app.get("/api/harness/scenarios")
def list_harness_scenarios():
    """Returns available black swan and market shock scenarios."""
    return ScenarioRegistry.list_all()

@app.get("/api/harness/agents")
def list_harness_agents():
    """Returns catalog of candidate options trading agents."""
    return [
        {
            "id": "committee",
            "name": "Abitda Floor Committee",
            "type": "deliberation_committee",
            "description": "4-Agent Floor (Macro, Technical, Alpha, Risk) deliberating with strict Greek invariants.",
            "target": "GreeksGate Strict Invariant"
        },
        {
            "id": "vibe",
            "name": "Abitda Vibe Desk Architect",
            "type": "nlp_scenario",
            "description": "NLP market sentiment and quantitative scenario synthesizer.",
            "target": "Fiduciary Constraint Synthesizer"
        },
        {
            "id": "naive_momentum",
            "name": "Naive Momentum Bot",
            "type": "momentum_heuristic",
            "description": "Unhedged baseline buying high-delta calls/puts without Greek boundaries.",
            "target": "UNREGULATED / NO INVARIANTS"
        },
        {
            "id": "passive_farmer",
            "name": "Passive Theta Farmer",
            "type": "blind_farmer",
            "description": "Unhedged credit spread seller ignoring volatility regime shifts.",
            "target": "UNREGULATED / NO REGIME CHECKS"
        }
    ]

@app.post("/api/harness/benchmark")
def run_agent_benchmark(req: BenchmarkRequest):
    """Executes deterministic evaluation of selected agent against stress scenario."""
    agent_map = {
        "committee": CommitteeAgentAdapter,
        "vibe": VibeAgentAdapter,
        "naive_momentum": NaiveMomentumAgent,
        "passive_farmer": PassiveThetaFarmer
    }
    agent_cls = agent_map.get(req.agent_id.lower())
    if not agent_cls:
        raise HTTPException(status_code=400, detail=f"Agent '{req.agent_id}' not found.")

    scenario = ScenarioRegistry.get_scenario(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=400, detail=f"Scenario '{req.scenario_id}' not found.")

    agent = agent_cls()
    scorecard = evaluator.evaluate_agent(agent, scenario)
    evaluator.generate_scorecard_markdown(scorecard, output_path="HARNESS_SCORECARD.md")
    return scorecard.to_dict()

@app.get("/api/harness/leaderboard")
def get_harness_leaderboard(scenario_id: str = "aug5_2024"):
    """Runs all 4 candidate agents across the specified scenario and returns comparison."""
    scenario = ScenarioRegistry.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=400, detail=f"Scenario '{scenario_id}' not found.")

    agents = [
        ("committee", CommitteeAgentAdapter()),
        ("vibe", VibeAgentAdapter()),
        ("naive_momentum", NaiveMomentumAgent()),
        ("passive_farmer", PassiveThetaFarmer())
    ]
    results = []
    for aid, ag in agents:
        sc = evaluator.evaluate_agent(ag, scenario)
        results.append({
            "agent_id": aid,
            "agent_name": sc.agent_name,
            "agent_type": sc.agent_type,
            "capital_preserved_pct": round(sc.capital_preserved_pct, 2),
            "max_drawdown_pct": round(sc.max_drawdown_pct, 2),
            "delta_breaches": sc.delta_breach_count,
            "vega_breaches": sc.vega_breach_count,
            "catastrophic_violations": sc.catastrophic_violation_count,
            "fiduciary_score": round(sc.fiduciary_score, 1),
            "grade": sc.fiduciary_grade,
            "attestation": sc.attestation_status
        })
    return {
        "scenario": {
            "id": scenario.scenario_id,
            "name": scenario.name,
            "date": scenario.historical_date
        },
        "leaderboard": results
    }

# --- Demo & Failure Injections ---
@app.post("/api/demo/veto")
def trigger_demo_veto(symbol: str = "SPY"):
    orig = engine.greeks_gate.max_delta
    engine.greeks_gate.max_delta = 0.0001
    try:
        res = engine.run_trading_cycle(symbol=symbol)
    finally:
        engine.greeks_gate.max_delta = orig
    return res

@app.post("/api/demo/regime-flip")
def trigger_demo_regime_flip(symbol: str = "SPY"):
    res = engine.run_trading_cycle(symbol=symbol, force_regime="EVENT_RISK")
    return res

@app.post("/api/demo/suspend")
def trigger_demo_suspend(symbol: str = "SPY"):
    for i in range(5):
        engine.ledger.record_trade({
            "id": f"seed-decay-{i}-{int(datetime.utcnow().timestamp())}",
            "timestamp": datetime.utcnow().isoformat(),
            "symbol": symbol,
            "strategy_type": "BULL_PUT_SPREAD",
            "regime": "TRENDING",
            "legs": [],
            "net_credit": 100.0,
            "max_risk": 400.0,
            "status": "CLOSED",
            "exit_timestamp": datetime.utcnow().isoformat(),
            "exit_reason": "Stop Loss Hit (Simulated Drawdown)",
            "pnl": -250.0,
            "greeks": {"net_delta": 0, "net_vega": 0, "net_theta": 0}
        })
    res = engine.run_trading_cycle(symbol=symbol)
    return res

@app.post("/api/demo/reset")
def reset_ledger():
    with engine.ledger._get_connection() as conn:
        conn.execute("DELETE FROM trades")
        conn.execute("DELETE FROM audit_log")
        conn.commit()
    engine.guardian.is_suspended = False
    return {"status": "RESET_COMPLETE"}

@app.post("/api/demo/stress-test")
def run_demo_stress_test():
    from data.stress_test import BlackSwanStressTest
    tester = BlackSwanStressTest()
    return tester.run_replay()

# Serve compiled React frontend if present
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        target_path = os.path.join(FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(target_path):
            return FileResponse(target_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
