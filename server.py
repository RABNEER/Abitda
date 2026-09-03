"""
ThetaHawk High-Performance FastAPI Backend
Serves real-time options telemetry, Greeks calculations, and autonomous trading loops
to the TypeScript React desktop desk interface.
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

from core.engine import ThetaHawkEngine
from agents.copilot_agent import AgenticCoPilot
from config.settings import (
    MAX_PORTFOLIO_DELTA,
    MAX_PORTFOLIO_VEGA,
    ALPACA_ACCOUNT_NUMBER
)

app = FastAPI(title="ThetaHawk Options Desk API", version="1.0.0")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = ThetaHawkEngine()
copilot = AgenticCoPilot(engine)

class CycleRequest(BaseModel):
    symbol: Optional[str] = "SPY"
    force_regime: Optional[str] = None

class ChatRequest(BaseModel):
    prompt: str

@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "engine": "ThetaHawk v1.0", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/status")
def get_account_status():
    acct = engine.broker.get_account_summary()
    greeks = engine.compute_current_book_greeks()
    closed = engine.ledger.get_closed_trades()
    is_suspended, guard_msg, guard_stats = engine.guardian.evaluate_performance(closed)

    return {
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
        }
    }

@app.get("/api/telemetry")
def get_telemetry(symbol: str = Query("SPY")):
    telemetry = engine.market_reader.fetch_market_telemetry(symbol)
    regime = engine.regime_agent.classify_regime(telemetry)
    return {
        "telemetry": telemetry,
        "regime": regime
    }

@app.get("/api/trades")
def get_trades():
    open_trades = engine.ledger.get_open_trades()
    closed_trades = engine.ledger.get_closed_trades(limit=20)
    return {
        "open_trades": open_trades,
        "closed_trades": closed_trades
    }

@app.get("/api/audit")
def get_audit(limit: int = 20):
    events = engine.ledger.get_recent_audit_events(limit=limit)
    return {"events": events}

@app.post("/api/cycle")
def execute_cycle(req: CycleRequest):
    res = engine.run_trading_cycle(symbol=req.symbol, force_regime=req.force_regime)
    return res

# --- Agentic ReAct & Co-Pilot Endpoints ---

@app.post("/api/agent/react")
def run_agentic_react_cycle(symbol: str = Query("SPY")):
    """Runs a visible, structured ReAct chain of thought for the terminal."""
    steps = copilot.run_agentic_cycle(symbol=symbol)
    return {"symbol": symbol, "steps": steps}

@app.post("/api/agent/chat")
def chat_with_copilot(req: ChatRequest):
    """Direct Q&A with the ThetaHawk autonomous desk quant."""
    reply = copilot.ask_copilot(req.prompt)
    return {"reply": reply, "timestamp": datetime.utcnow().isoformat()}

# --- Hackathon Demo Endpoints ---

@app.post("/api/demo/veto")
def trigger_demo_veto(symbol: str = "SPY"):
    orig = engine.greeks_gate.max_delta
    try:
        engine.greeks_gate.max_delta = 0.005
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
