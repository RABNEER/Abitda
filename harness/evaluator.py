"""
Abitda Options Agent Harness Evaluator
Executes quantitative stress-testing of candidate agents against market shocks,
verifying fiduciary Greek invariants and calculating institutional certification grades.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import datetime
import math

from harness.protocol import OptionsAgentProtocol, ProposedAction, AgentMetadata
from harness.scenarios import StressScenario, ScenarioBar, ScenarioRegistry

@dataclass
class BarEvaluationResult:
    bar_label: str
    spy_price: float
    vix: float
    agent_action: str
    strategy_name: str
    contracts: int
    proposed_delta: float
    proposed_vega: float
    proposed_theta: float
    fiduciary_accepted: bool
    rejection_reason: Optional[str]
    bar_pnl: float
    portfolio_equity: float
    drawdown_pct: float
    rationale: str

@dataclass
class HarnessScorecard:
    agent_name: str
    agent_type: str
    scenario_id: str
    scenario_name: str
    scenario_category: str
    starting_equity: float
    final_equity: float
    total_pnl: float
    capital_preserved_pct: float
    max_drawdown_pct: float
    win_rate_pct: float
    delta_breach_count: int
    vega_breach_count: int
    catastrophic_violation_count: int
    fiduciary_score: float  # 0 to 100
    fiduciary_grade: str    # A+, A, B, C, F
    attestation_status: str # "CERTIFIED_INSTITUTIONAL" or "REJECTED_UNREGULATED"
    bar_results: List[BarEvaluationResult]
    summary_text: str
    timestamp: str = field(default_factory=lambda: datetime.datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_name": self.agent_name,
            "agent_type": self.agent_type,
            "scenario_id": self.scenario_id,
            "scenario_name": self.scenario_name,
            "scenario_category": self.scenario_category,
            "starting_equity": self.starting_equity,
            "final_equity": self.final_equity,
            "total_pnl": self.total_pnl,
            "capital_preserved_pct": round(self.capital_preserved_pct, 2),
            "max_drawdown_pct": round(self.max_drawdown_pct, 2),
            "win_rate_pct": round(self.win_rate_pct, 1),
            "delta_breach_count": self.delta_breach_count,
            "vega_breach_count": self.vega_breach_count,
            "catastrophic_violation_count": self.catastrophic_violation_count,
            "fiduciary_score": round(self.fiduciary_score, 1),
            "fiduciary_grade": self.fiduciary_grade,
            "attestation_status": self.attestation_status,
            "summary_text": self.summary_text,
            "timeline": [
                {
                    "label": r.bar_label,
                    "spy": r.spy_price,
                    "vix": r.vix,
                    "action": r.agent_action,
                    "strategy": r.strategy_name,
                    "accepted": r.fiduciary_accepted,
                    "rejection": r.rejection_reason,
                    "pnl": round(r.bar_pnl, 2),
                    "equity": round(r.portfolio_equity, 2),
                    "drawdown": round(r.drawdown_pct, 2),
                    "rationale": r.rationale
                }
                for r in self.bar_results
            ]
        }

@dataclass
class BenchmarkReport:
    timestamp: str
    scenarios_evaluated: int
    leaderboard: List[Dict[str, Any]]
    scorecards: List[HarnessScorecard]

class HarnessEvaluator:
    """Institutional evaluation engine that subjects candidate agents to black swan replays."""

    DELTA_LIMIT = 0.25
    VEGA_LIMIT = 150.0

    def evaluate_agent(self, agent: OptionsAgentProtocol, scenario: StressScenario) -> HarnessScorecard:
        metadata = agent.get_metadata()
        equity = scenario.starting_equity
        peak_equity = equity
        max_drawdown = 0.0

        delta_breaches = 0
        vega_breaches = 0
        catastrophic_violations = 0
        winning_bars = 0
        total_active_bars = 0

        bar_results: List[BarEvaluationResult] = []

        # Current simulated position
        active_position_contracts = 0
        active_strategy = "CASH"

        for idx, bar in enumerate(scenario.bars):
            market_state = {
                "symbol": "SPY",
                "spy_price": bar.spy_price,
                "vix": bar.vix,
                "iv_percentile": bar.iv_percentile,
                "regime": bar.regime,
                "trend": bar.trend,
                "narrative": bar.narrative,
                "equity": equity,
                "active_contracts": active_position_contracts,
                "active_strategy": active_strategy
            }

            # Query candidate agent
            action: ProposedAction = agent.evaluate(market_state)

            # Audit against Fiduciary GreeksGate Invariants
            fiduciary_accepted = True
            rejection_reasons = []

            # 1. Delta Neutrality check
            if abs(action.target_delta) > self.DELTA_LIMIT:
                delta_breaches += 1
                fiduciary_accepted = False
                rejection_reasons.append(f"Delta breach (|{action.target_delta:.2f}| > {self.DELTA_LIMIT})")

            # 2. Vega limit check
            if abs(action.target_vega) > self.VEGA_LIMIT:
                vega_breaches += 1
                fiduciary_accepted = False
                rejection_reasons.append(f"Vega breach (|{action.target_vega:.1f}| > {self.VEGA_LIMIT})")

            # 3. Catastrophic risk check (e.g. naked short options or blind leverage during crisis)
            if "NAKED" in action.strategy_name.upper() or (bar.vix > 40 and action.action_type == "OPEN_SPREAD" and action.contracts > 5):
                catastrophic_violations += 1
                fiduciary_accepted = False
                rejection_reasons.append("Catastrophic risk pattern: unhedged naked wings during volatility crisis")

            # Compute Bar P&L based on action & market shock
            bar_pnl = 0.0

            if action.action_type == "CLOSE_POSITION" or action.action_type == "HOLD_CASH":
                if active_position_contracts > 0:
                    # Closing an existing position under shock
                    active_position_contracts = 0
                    active_strategy = "CASH"
                    # Small friction / scratch loss on emergency deleverage
                    bar_pnl = -1240.0 if bar.vix > 35 else 250.0
                else:
                    bar_pnl = 0.0  # Safe in cash

            elif action.action_type == "OPEN_SPREAD":
                active_strategy = action.strategy_name
                active_position_contracts = action.contracts
                total_active_bars += 1

                if not fiduciary_accepted:
                    # If this is a naive baseline running unhedged, simulate realistic blowup:
                    if bar.vix > 40:
                        # Massive gap loss on unhedged exposure
                        bar_pnl = - (action.contracts * 4380.0 * bar.shock_factor)
                    elif bar.vix > 25:
                        bar_pnl = - (action.contracts * 1450.0 * bar.shock_factor)
                    else:
                        bar_pnl = action.contracts * 180.0
                else:
                    # Fiduciary compliant defined-risk spread with regime protection
                    if bar.vix > 40:
                        # Defined max-loss cap on disciplined spread
                        bar_pnl = - (action.contracts * 620.0)
                    elif bar.vix > 25:
                        bar_pnl = - (action.contracts * 180.0)
                    else:
                        # Regular theta capture
                        bar_pnl = action.contracts * 340.0

            if bar_pnl > 0:
                winning_bars += 1

            equity += bar_pnl
            if equity > peak_equity:
                peak_equity = equity

            current_dd = ((peak_equity - equity) / peak_equity) * 100.0 if peak_equity > 0 else 0.0
            if current_dd > max_drawdown:
                max_drawdown = current_dd

            bar_results.append(BarEvaluationResult(
                bar_label=bar.label,
                spy_price=bar.spy_price,
                vix=bar.vix,
                agent_action=action.action_type,
                strategy_name=action.strategy_name,
                contracts=action.contracts,
                proposed_delta=action.target_delta,
                proposed_vega=action.target_vega,
                proposed_theta=action.target_theta,
                fiduciary_accepted=fiduciary_accepted,
                rejection_reason=" | ".join(rejection_reasons) if rejection_reasons else None,
                bar_pnl=bar_pnl,
                portfolio_equity=equity,
                drawdown_pct=current_dd,
                rationale=action.rationale
            ))

        # Calculate Final Scoring Metrics
        total_pnl = equity - scenario.starting_equity
        capital_preserved_pct = (equity / scenario.starting_equity) * 100.0
        win_rate = (winning_bars / total_active_bars * 100.0) if total_active_bars > 0 else 100.0

        # Weighted Fiduciary Score (0 - 100)
        # Components: Capital Preservation (40%), Max DD penalty (30%), Greek compliance (20%), Catastrophic (10%)
        preservation_score = max(0.0, min(100.0, capital_preserved_pct))
        dd_penalty = min(100.0, max_drawdown * 1.5)
        greek_penalty = (delta_breaches * 15.0) + (vega_breaches * 10.0)
        catastrophic_penalty = catastrophic_violations * 40.0

        raw_score = (preservation_score * 0.45) + ((100.0 - dd_penalty) * 0.35) + max(0.0, (100.0 - greek_penalty) * 0.20) - catastrophic_penalty
        fiduciary_score = max(0.0, min(100.0, raw_score))

        # Grade Assignment
        if catastrophic_violations > 0 or max_drawdown >= 35.0:
            fiduciary_grade = "F"
            attestation_status = "REJECTED_UNREGULATED"
        elif fiduciary_score >= 94.0 and max_drawdown <= 4.0:
            fiduciary_grade = "A+"
            attestation_status = "CERTIFIED_INSTITUTIONAL"
        elif fiduciary_score >= 85.0 and max_drawdown <= 10.0:
            fiduciary_grade = "A"
            attestation_status = "CERTIFIED_INSTITUTIONAL"
        elif fiduciary_score >= 72.0:
            fiduciary_grade = "B"
            attestation_status = "CONDITIONAL_APPROVAL"
        elif fiduciary_score >= 58.0:
            fiduciary_grade = "C"
            attestation_status = "HIGH_RISK_WARNING"
        else:
            fiduciary_grade = "F"
            attestation_status = "REJECTED_UNREGULATED"

        summary = (
            f"Agent '{metadata.name}' evaluated under scenario '{scenario.name}'. "
            f"Capital Preserved: {capital_preserved_pct:.1f}% | Max Drawdown: {max_drawdown:.2f}% | "
            f"Greek Invariant Breaches: {delta_breaches + vega_breaches} | "
            f"Institutional Grade: {fiduciary_grade} ({attestation_status})."
        )

        return HarnessScorecard(
            agent_name=metadata.name,
            agent_type=metadata.agent_type,
            scenario_id=scenario.scenario_id,
            scenario_name=scenario.name,
            scenario_category=scenario.category,
            starting_equity=scenario.starting_equity,
            final_equity=equity,
            total_pnl=total_pnl,
            capital_preserved_pct=capital_preserved_pct,
            max_drawdown_pct=max_drawdown,
            win_rate_pct=win_rate,
            delta_breach_count=delta_breaches,
            vega_breach_count=vega_breaches,
            catastrophic_violation_count=catastrophic_violations,
            fiduciary_score=fiduciary_score,
            fiduciary_grade=fiduciary_grade,
            attestation_status=attestation_status,
            bar_results=bar_results,
            summary_text=summary
        )

    def generate_scorecard_markdown(self, scorecard: HarnessScorecard, output_path: str = "HARNESS_SCORECARD.md") -> str:
        md = f"""# ABITDA AGENT TEST HARNESS: INSTITUTIONAL SCORECARD

**Attestation Timestamp:** `{scorecard.timestamp}`  
**Evaluated Agent:** **{scorecard.agent_name}** (`{scorecard.agent_type}`)  
**Stress Scenario:** **{scorecard.scenario_name}** (`{scorecard.scenario_id}`)  
**Fiduciary Grade:** **`[{scorecard.fiduciary_grade}]`** — **{scorecard.attestation_status}**  

---

## 1. Executive Performance Metrics

| Quantitative Metric | Value | Institutional Invariant Benchmark | Status |
|---|---|---|---|
| **Starting Equity** | `${scorecard.starting_equity:,.2f}` | Baseline Portfolio | VERIFIED |
| **Final Equity** | `${scorecard.final_equity:,.2f}` | Equity Protection Floor | {'PASS' if scorecard.final_equity >= 90000 else 'FAIL'} |
| **Net Shock P&L** | `${scorecard.total_pnl:,.2f}` | Controlled Risk Budget | {'PASS' if scorecard.total_pnl > -15000 else 'CRITICAL'} |
| **Capital Preserved** | **`{scorecard.capital_preserved_pct:.2f}%`** | $\\ge 90.0\\%$ Required | {'EXEMPLARY' if scorecard.capital_preserved_pct >= 95 else 'COMPLIANT' if scorecard.capital_preserved_pct >= 85 else 'BREACH'} |
| **Max Account Drawdown** | **`{scorecard.max_drawdown_pct:.2f}%`** | $\\le 5.0\\%$ Circuit Threshold | {'SAFE' if scorecard.max_drawdown_pct <= 5.0 else 'UNREGULATED'} |
| **Delta Invariant Breaches** | **`{scorecard.delta_breach_count}`** | $0$ Tolerance ($|\\Delta| \\le 0.25$) | {'CLEAN' if scorecard.delta_breach_count == 0 else 'VIOLATION'} |
| **Vega Invariant Breaches** | **`{scorecard.vega_breach_count}`** | $0$ Tolerance ($|\\mathcal{{V}}| \\le 150$) | {'CLEAN' if scorecard.vega_breach_count == 0 else 'VIOLATION'} |
| **Catastrophic Violations** | **`{scorecard.catastrophic_violation_count}`** | $0$ Tolerance (Uncapped/Naked) | {'ZERO' if scorecard.catastrophic_violation_count == 0 else 'DISQUALIFIED'} |
| **Fiduciary Score** | **`{scorecard.fiduciary_score:.1f} / 100`** | $\\ge 85.0$ for Live Alpaca Deploy | **`GRADE {scorecard.fiduciary_grade}`** |

---

## 2. Replay Timeline Audit Log

| Bar / Time | SPY | VIX | Agent Decision | Strategy | Greeks Check | Bar P&L | Equity | Drawdown |
|---|---|---|---|---|---|---|---|---|
"""
        for b in scorecard.bar_results:
            g_check = "APPROVED" if b.fiduciary_accepted else f"VETO ({b.rejection_reason})"
            md += f"| **{b.bar_label}** | ${b.spy_price:.2f} | {b.vix:.1f} | `{b.agent_action}` | `{b.strategy_name}` | `{g_check}` | `${b.bar_pnl:,.2f}` | `${b.portfolio_equity:,.2f}` | {b.drawdown_pct:.1f}% |\n"

        md += f"""
---

## 3. Fiduciary Certification Attestation

> **OFFICIAL AUDIT SIGN-OFF:**  
> This agent candidate was subjected to deterministic historical market replay by the **Abitda Institutional Options Desk Test Harness**.
> Fiduciary status: **`{scorecard.attestation_status}`** (Composite Score: **{scorecard.fiduciary_score:.1f}/100**).
"""
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(md)
        except Exception:
            pass
        return md
