"""
ThetaHawk Core Engine & Orchestrator
Executes the full 5-Step Trader Loop with fiduciary risk controls:
1. Regime Reader
2. Opportunity Scanner
3. Strategy Selector
4. Conviction Sizing + Portfolio Greeks Gate
5. Dynamic Position Management + Regime-Flip Exit + Win-Rate Guardian
"""

import json
from datetime import datetime
from typing import Dict, Any, List

from data.market_reader import MarketReader
from agents.regime_agent import RegimeAgent
from agents.strategy_selector import StrategySelector
from agents.narrator import NarratorAgent
from risk.portfolio_greeks_gate import PortfolioGreeksGate
from risk.hard_backstops import HardBackstops
from risk.self_suspension import PerformanceGuardian
from risk.sizing import ConvictionSizer
from risk.position_manager import PositionManager
from execution.alpaca_client import AlpacaExecutionEngine
from memory.trade_logger import TradeLedger
from agents.copilot_agent import AgenticCoPilot

class ThetaHawkEngine:
    def __init__(self):
        self.market_reader = MarketReader()
        self.regime_agent = RegimeAgent()
        self.strategy_selector = StrategySelector()
        self.narrator = NarratorAgent()
        self.greeks_gate = PortfolioGreeksGate()
        self.hard_backstops = HardBackstops()
        self.guardian = PerformanceGuardian()
        self.sizer = ConvictionSizer()
        self.pos_manager = PositionManager()
        self.broker = AlpacaExecutionEngine()
        self.ledger = TradeLedger()
        self.copilot = AgenticCoPilot(self)

        # Cached states
        self.baseline_equity = 100000.0

    def compute_current_book_greeks(self) -> Dict[str, float]:
        """Calculates current aggregate book Delta, Vega, and Theta from active trades."""
        open_trades = self.ledger.get_open_trades()
        total_delta = 0.0
        total_vega = 0.0
        total_theta = 0.0

        for t in open_trades:
            try:
                g = json.loads(t["greeks_json"]) if isinstance(t["greeks_json"], str) else t["greeks_json"]
                total_delta += g.get("net_delta", 0.0)
                total_vega += g.get("net_vega", 0.0)
                total_theta += g.get("net_theta", 0.0)
            except Exception:
                pass

        return {
            "net_delta": round(total_delta, 4),
            "net_vega": round(total_vega, 2),
            "net_theta": round(total_theta, 2),
            "open_count": len(open_trades)
        }

    def run_trading_cycle(self, symbol: str = "SPY", force_regime: str = None) -> Dict[str, Any]:
        """
        Runs one complete evaluation and execution cycle.
        """
        timestamp = datetime.utcnow().isoformat()
        cycle_log = []

        # 0. Account Metrics
        acct = self.broker.get_account_summary()
        current_equity = acct["equity"]

        # 1. Step 1: Read Market Telemetry & Classify Regime
        telemetry = self.market_reader.fetch_market_telemetry(symbol)
        regime_eval = self.regime_agent.classify_regime(telemetry)
        if force_regime:
            regime_eval["regime"] = force_regime
            regime_eval["recommended_playbook"] = "VOL_HEDGE" if force_regime == "EVENT_RISK" else regime_eval["recommended_playbook"]

        current_regime = regime_eval["regime"]
        playbook = regime_eval["recommended_playbook"]
        cycle_log.append(f"Step 1 [Regime]: {regime_eval['reasoning']}")

        # 2. Step 2 & Gap #2: Position Management & Regime-Flip Exit
        open_trades = self.ledger.get_open_trades()
        for t in open_trades:
            action, reason, est_pnl = self.pos_manager.evaluate_position(
                trade=t,
                current_underlying_price=telemetry["price"],
                current_regime=current_regime
            )
            if action in ("REGIME_FLIP_EXIT", "STOP_LOSS", "TAKE_PROFIT"):
                self.ledger.close_trade(t["id"], exit_reason=reason, pnl=est_pnl)
                event_type = "REGIME_FLIP" if action == "REGIME_FLIP_EXIT" else "TRADE_CLOSED"
                narration = self.narrator.narrate_event(event_type, {"symbol": symbol, "reason": reason})
                self.ledger.log_event(event_type, narration, symbol=symbol, details={"trade_id": t["id"], "pnl": est_pnl})
                cycle_log.append(f"Position Alert [{action}]: {reason} (P&L: ${est_pnl:+,.2f})")

        # 3. Gap #3: Self-Awareness Audit (Win-Rate Degradation)
        closed_trades = self.ledger.get_closed_trades()
        is_suspended, guard_msg, guard_stats = self.guardian.evaluate_performance(closed_trades)
        if is_suspended:
            narration = self.narrator.narrate_event("SELF_SUSPENSION", guard_stats)
            self.ledger.log_event("SELF_SUSPENSION", narration, details=guard_stats)
            cycle_log.append(f"Safety Gate [Guardian]: {guard_msg}")
            return {
                "status": "SUSPENDED",
                "reason": guard_msg,
                "regime": current_regime,
                "cycle_log": cycle_log,
                "telemetry": telemetry
            }

        # 4. Hard Backstops Check (Daily Drawdown)
        circuit_ok, circuit_msg = self.hard_backstops.check_daily_drawdown(self.baseline_equity, current_equity)
        if not circuit_ok:
            self.ledger.log_event("CIRCUIT_BREAKER", circuit_msg)
            cycle_log.append(f"Safety Gate [Backstop]: {circuit_msg}")
            return {
                "status": "HALTED",
                "reason": circuit_msg,
                "regime": current_regime,
                "cycle_log": cycle_log,
                "telemetry": telemetry
            }

        # If Regime is EVENT_RISK, do not open new premium-selling entries
        if current_regime == "EVENT_RISK":
            cycle_log.append("Step 3 [Strategy]: Event-Risk active. Sitting out new premium-selling trades.")
            return {
                "status": "IDLE_EVENT_RISK",
                "reason": "Tail-risk regime active. Preserving liquidity.",
                "regime": current_regime,
                "cycle_log": cycle_log,
                "telemetry": telemetry
            }

        # 5. Step 3: Strategy Selection & Candidate Construction
        candidate = self.strategy_selector.construct_candidate(
            symbol=symbol,
            underlying_price=telemetry["price"],
            playbook=playbook
        )
        cycle_log.append(f"Step 3 [Strategy Selected]: {candidate['strategy_type']} structured for ${candidate['estimated_credit_per_contract']} credit/contract.")

        # 6. Step 4 & Gap #1: Conviction Sizing + Portfolio Greeks Gate
        current_book_greeks = self.compute_current_book_greeks()
        contracts = self.sizer.calculate_size(
            candidate=candidate,
            telemetry=telemetry,
            current_book_greeks=current_book_greeks,
            account_equity=current_equity
        )

        # Scale candidate greeks by contract count
        proposed_greeks = {
            "net_delta": candidate["greeks"]["net_delta"] * contracts,
            "net_vega": candidate["greeks"]["net_vega"] * contracts,
            "net_theta": candidate["greeks"]["net_theta"] * contracts
        }

        approved, gate_reason, projected = self.greeks_gate.evaluate_new_trade(
            current_book_greeks=current_book_greeks,
            proposed_trade_greeks=proposed_greeks
        )

        if not approved:
            # DEMO MOMENT: Visible Rejection Logged
            narration = self.narrator.narrate_event("RISK_VETO", {"reason": gate_reason})
            self.ledger.log_event("RISK_VETO", narration, symbol=symbol, details={"projected": projected})
            cycle_log.append(f"Step 4 [Greeks Gate Veto]: {gate_reason}")
            return {
                "status": "REJECTED_GREEKS_LIMIT",
                "reason": gate_reason,
                "regime": current_regime,
                "projected_greeks": projected,
                "cycle_log": cycle_log,
                "telemetry": telemetry
            }

        cycle_log.append(f"Step 4 [Greeks Gate Passed]: {gate_reason}")

        # 7. Sizing Cap Verification
        total_risk = candidate["max_risk_per_contract"] * contracts
        sizing_ok, size_msg = self.hard_backstops.check_trade_sizing(total_risk, current_equity)
        if not sizing_ok:
            cycle_log.append(f"Step 4 [Sizing Veto]: {size_msg}")
            return {
                "status": "REJECTED_SIZING",
                "reason": size_msg,
                "regime": current_regime,
                "cycle_log": cycle_log,
                "telemetry": telemetry
            }

        # 8. Step 5: Execute Order via Alpaca Broker
        execution_receipt = self.broker.execute_spread(candidate, contracts)

        # Record trade in SQLite Ledger
        trade_record = {
            "id": candidate["id"],
            "timestamp": timestamp,
            "symbol": symbol,
            "strategy_type": candidate["strategy_type"],
            "regime": current_regime,
            "legs": candidate["legs"],
            "net_credit": candidate["estimated_credit_per_contract"] * contracts,
            "max_risk": total_risk,
            "status": "OPEN",
            "greeks": proposed_greeks
        }
        self.ledger.record_trade(trade_record)

        narration = self.narrator.narrate_event("TRADE_EXECUTED", {
            "strategy_type": candidate["strategy_type"],
            "symbol": symbol,
            "total_credit": trade_record["net_credit"]
        })
        self.ledger.log_event("ORDER_FILLED", narration, symbol=symbol, details=execution_receipt)
        cycle_log.append(f"Step 5 [Execution]: {narration}")

        return {
            "status": "EXECUTED",
            "trade": trade_record,
            "receipt": execution_receipt,
            "regime": current_regime,
            "cycle_log": cycle_log,
            "telemetry": telemetry
        }
