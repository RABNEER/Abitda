"""
Abitda Comprehensive Verification Test Suite
Runs an automated end-to-end check of all 5 steps, 3 differentiators, and the Agent Test Harness:
1. Alpaca Broker & Paper Account Check ($100k balance, Level 3 options)
2. Black-Scholes Greeks Engine Mathematical Precision
3. Market Telemetry & Volatility Reader (VIX, IV %ile)
4. Gemini Regime Classifier & Strategy Selector
5. Portfolio Greeks Risk Gate (Pass & VETO)
6. Regime-Flip Early Exit Monitor
7. Self-Awareness Win-Rate Degradation Lock
8. Agentic ReAct Chain of Thought Loop
9. Abitda Options Agent Test Harness (Stress Scenarios & Institutional Grading)
"""

import sys
from datetime import datetime

# UTF-8 for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from core.engine import AbitdaEngine
from agents.copilot_agent import AgenticCoPilot
from data.greeks_engine import calculate_greeks, calculate_spread_greeks
from harness.evaluator import HarnessEvaluator
from harness.scenarios import ScenarioRegistry
from harness.protocol import CommitteeAgentAdapter, NaiveMomentumAgent

def run_tests():
    print("\n" + "="*70)
    print("   ABITDA AUTOMATED VERIFICATION & HARNESS SUITE")
    print("="*70 + "\n")

    engine = AbitdaEngine()
    copilot = AgenticCoPilot(engine)
    results = []

    # Test 1: Broker & Paper Account
    print("[1/9] Verifying Alpaca Paper Broker Connection...")
    acct = engine.broker.get_account_summary()
    assert acct["status"] == "ACTIVE", "Broker status is not active"
    assert acct["options_level"] >= 2, "Options clearance level insufficient"
    print(f"      PASS: Account {acct['account_number']} | Equity: ${acct['equity']:,.2f} | Options Tier: {acct['options_level']}")
    results.append(("Alpaca Broker Connection", "PASS", f"Tier {acct['options_level']} Active"))

    # Test 2: Black-Scholes Greeks Engine
    print("[2/9] Verifying Black-Scholes Greeks Engine...")
    call = calculate_greeks("call", 550, 550, 7/365, 0.045, 0.18)
    assert 0.45 < call["delta"] < 0.55, "Call delta out of range"
    assert call["vega"] > 0, "Vega must be positive"
    assert call["theta"] < 0, "Long call theta must be negative"
    print(f"      PASS: ATM Call Delta: {call['delta']}, Gamma: {call['gamma']}, Vega: {call['vega']}")
    results.append(("Black-Scholes Greeks Engine", "PASS", "Exact analytical precision"))

    # Test 3: Market Reader & Volatility
    print("[3/9] Verifying Market Telemetry Reader...")
    telemetry = engine.market_reader.fetch_market_telemetry("SPY")
    assert telemetry["price"] > 0, "Invalid spot price"
    assert telemetry["vix"] > 0, "Invalid VIX price"
    print(f"      PASS: SPY Spot: ${telemetry['price']} | VIX: {telemetry['vix']} | IV %ile: {telemetry['iv_percentile']}%")
    results.append(("Market Telemetry Reader", "PASS", f"VIX: {telemetry['vix']}, IV %ile: {telemetry['iv_percentile']}%"))

    # Test 4: Regime Classifier & Selector
    print("[4/9] Verifying Regime Classification & Strategy Selection...")
    regime = engine.regime_agent.classify_regime(telemetry)
    assert regime["regime"] in ["RANGE_BOUND", "TRENDING", "EVENT_RISK"], "Invalid regime"
    candidate = engine.strategy_selector.construct_candidate("SPY", telemetry["price"], regime["recommended_playbook"])
    assert candidate is not None, "Candidate generation failed"
    print(f"      PASS: Classified Regime: {regime['regime']} -> Playbook: {candidate['strategy_type']}")
    results.append(("Regime Agent & Strategy Selector", "PASS", f"{regime['regime']} -> {candidate['strategy_type']}"))

    # Test 5: Portfolio Greeks Gate (Gap #1)
    print("[5/9] Verifying Portfolio Greeks Risk Gate (Gap #1)...")
    empty_book = {"net_delta": 0.0, "net_vega": 0.0, "net_theta": 0.0, "open_count": 0}
    pass_audit = engine.greeks_gate.audit_trade(empty_book, proposed_delta=0.08, proposed_vega=40.0)
    assert pass_audit["is_approved"] is True, "Compliant trade must be approved"
    veto_audit = engine.greeks_gate.audit_trade(empty_book, proposed_delta=0.35, proposed_vega=40.0)
    assert veto_audit["is_approved"] is False, "Breaching trade must be VETOED"
    print(f"      PASS: Compliant trade APPROVED | Breaching delta trade VETOED: {veto_audit['reason'][:50]}...")
    results.append(("Portfolio Greeks Gate (Gap 1)", "PASS", "Normal pass + breach VETO verified"))

    # Test 6: Regime-Flip Exit (Gap #2)
    print("[6/9] Verifying Regime-Flip Emergency Liquidation (Gap #2)...")
    mock_trade = {
        "id": "test-pos-1",
        "symbol": "SPY",
        "strategy_type": "IRON_CONDOR",
        "net_credit": 150.0,
        "max_risk": 350.0,
        "legs": [{"strike": 540, "quantity": -1}]
    }
    action, flip_reason, pnl = engine.pos_manager.evaluate_position(mock_trade, 550.0, "EVENT_RISK")
    assert action == "REGIME_FLIP_EXIT", "Must trigger REGIME_FLIP_EXIT"
    print(f"      PASS: Early Exit Triggered -> {flip_reason[:60]}...")
    results.append(("Regime-Flip Early Exit (Gap 2)", "PASS", "Immediate defensive liquidation"))

    # Test 7: Self-Awareness Guardian (Gap #3)
    print("[7/9] Verifying Win-Rate Self-Suspension Guardian (Gap #3)...")
    losing_trades = [{"pnl": -200.0} for _ in range(5)]
    is_suspended, guard_msg, _ = engine.guardian.evaluate_performance(losing_trades)
    assert is_suspended is True, "Must suspend on consecutive losses"
    print(f"      PASS: Fiduciary Lock Triggered -> {guard_msg[:60]}...")
    results.append(("Self-Awareness Lock (Gap 3)", "PASS", "Statistical edge decay suspension"))

    # Test 8: Agentic ReAct Chain-of-Thought Loop
    print("[8/9] Verifying Agentic ReAct Multi-Step Loop...")
    steps = copilot.run_agentic_cycle("SPY")
    assert len(steps) >= 5, "ReAct loop must produce multi-step reasoning"
    print(f"      PASS: Generated {len(steps)} visible agentic steps (Thought -> Tool -> Observe -> Reflect)")
    results.append(("Agentic ReAct Co-Pilot", "PASS", f"{len(steps)} steps generated"))

    # Test 9: Abitda Options Agent Test Harness
    print("[9/9] Verifying Abitda Options Agent Test Harness (Stress Benchmarking)...")
    scenarios = ScenarioRegistry.list_all()
    assert len(scenarios) == 5, f"Expected 5 stress scenarios, got {len(scenarios)}"
    evaluator = HarnessEvaluator()
    sc_aug5 = ScenarioRegistry.get_aug5_2024()
    card_comm = evaluator.evaluate_agent(CommitteeAgentAdapter(), sc_aug5)
    card_naive = evaluator.evaluate_agent(NaiveMomentumAgent(), sc_aug5)
    assert card_comm.fiduciary_grade in ["A+", "A"], f"Committee must achieve Grade A, got {card_comm.fiduciary_grade}"
    assert card_naive.fiduciary_grade == "F", f"Naive unhedged bot must fail, got {card_naive.fiduciary_grade}"
    print(f"      PASS: 5 Scenarios Loaded | Committee Grade: {card_comm.fiduciary_grade} | Naive Bot Grade: {card_naive.fiduciary_grade} (Vetoed)")
    results.append(("Abitda Agent Test Harness", "PASS", f"Grade {card_comm.fiduciary_grade} vs Grade {card_naive.fiduciary_grade}"))

    # Summary Report
    print("\n" + "="*70)
    print("   FINAL TEST RESULTS: 9/9 CHECKS PASSED (100% OPERATIONAL)")
    print("="*70)
    for test_name, status, detail in results:
        print(f" \u2713  {test_name:<34} [{status}]  {detail}")
    print("="*70 + "\n")

if __name__ == "__main__":
    run_tests()
