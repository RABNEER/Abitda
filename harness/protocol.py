"""
Abitda Options Agent Protocol
Standardized interface and baseline agent adapters for institutional options benchmarking.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import datetime

@dataclass
class AgentMetadata:
    name: str
    version: str
    agent_type: str  # "deliberation_committee", "nlp_scenario", "momentum_heuristic", "blind_farmer"
    description: str
    fiduciary_target: str = "Delta Neutral | Positive Theta | Vega Capped"
    author: str = "Abitda Ecosystem"

@dataclass
class ProposedAction:
    action_type: str  # "OPEN_SPREAD", "CLOSE_POSITION", "HOLD_CASH", "HEDGE_DELTA"
    strategy_name: str  # "BULL_PUT_SPREAD", "BEAR_CALL_SPREAD", "IRON_CONDOR", "LONG_CALL", "CASH"
    confidence: float
    target_delta: float
    target_vega: float
    target_theta: float
    contracts: int
    rationale: str
    legs: List[Dict[str, Any]] = field(default_factory=list)
    timestamp: str = field(default_factory=lambda: datetime.datetime.utcnow().isoformat())

class OptionsAgentProtocol(ABC):
    """Universal protocol for any candidate options trading agent tested under Abitda."""

    @abstractmethod
    def get_metadata(self) -> AgentMetadata:
        """Returns metadata about the agent architecture."""
        pass

    @abstractmethod
    def evaluate(self, market_state: Dict[str, Any]) -> ProposedAction:
        """
        Evaluates the current market state (price, IV, VIX, book Greeks, skew)
        and proposes an options trade or risk management action.
        """
        pass

# -------------------------------------------------------------------------
# Built-in Agent Adapters
# -------------------------------------------------------------------------

class CommitteeAgentAdapter(OptionsAgentProtocol):
    """Adapts Abitda's 4-Agent Floor Committee (TradingAgents architecture)."""

    def __init__(self, committee_instance=None):
        self._committee = committee_instance

    def _get_committee(self):
        if self._committee is None:
            from core.engine import AbitdaEngine
            from agents.committee import DeskCommittee
            engine = AbitdaEngine()
            self._committee = DeskCommittee(engine)
        return self._committee

    def get_metadata(self) -> AgentMetadata:
        return AgentMetadata(
            name="Abitda Floor Committee",
            version="2.0.0",
            agent_type="deliberation_committee",
            description="4-Agent Floor (Macro Analyst, Technical Scout, Alpha Trader, Risk Governor) deliberating with Greek invariants.",
            fiduciary_target="GreeksGate Strict Invariant"
        )

    def evaluate(self, market_state: Dict[str, Any]) -> ProposedAction:
        symbol = market_state.get("symbol", "SPY")
        vix = market_state.get("vix", 18.0)

        # In severe black swans (VIX > 35), floor immediately issues emergency hedge / close
        if vix >= 35.0:
            return ProposedAction(
                action_type="CLOSE_POSITION",
                strategy_name="EMERGENCY_DELEVERAGE",
                confidence=0.98,
                target_delta=0.0,
                target_vega=0.0,
                target_theta=0.0,
                contracts=0,
                rationale=f"Risk Governor veto: VIX {vix:.1f} breached crisis threshold (35.0). Liquidating short exposure to preserve equity.",
                legs=[]
            )

        try:
            committee = self._get_committee()
            deb = committee.deliberate(symbol)
            if not deb.get("is_approved", False):
                return ProposedAction(
                    action_type="HOLD_CASH",
                    strategy_name="CASH_PRESERVATION",
                    confidence=0.90,
                    target_delta=0.0,
                    target_vega=0.0,
                    target_theta=0.0,
                    contracts=0,
                    rationale=f"Committee rejected proposal: {deb.get('consensus', 'Risk veto')}",
                    legs=[]
                )

            structure = deb.get("structure", {})
            strat = structure.get("recommended_strategy", "IRON_CONDOR")
            contracts = deb.get("contracts", 1)

            return ProposedAction(
                action_type="OPEN_SPREAD",
                strategy_name=strat,
                confidence=0.88,
                target_delta=0.05,
                target_vega=25.0,
                target_theta=45.0,
                contracts=contracts,
                rationale=f"Committee approved {strat} ({contracts} cts). {deb.get('consensus', '')}",
                legs=structure.get("legs", [])
            )
        except Exception as e:
            # Fallback safe response
            return ProposedAction(
                action_type="HOLD_CASH",
                strategy_name="DEFENSIVE_HOLD",
                confidence=0.85,
                target_delta=0.0,
                target_vega=0.0,
                target_theta=0.0,
                contracts=0,
                rationale=f"Defensive fallback: {str(e)}"
            )

class VibeAgentAdapter(OptionsAgentProtocol):
    """Adapts Abitda's Vibe Desk NLP Scenario Architect."""

    def __init__(self, vibe_desk_instance=None):
        self._vibe = vibe_desk_instance

    def _get_vibe(self):
        if self._vibe is None:
            from core.engine import AbitdaEngine
            from agents.vibe_desk import VibeDeskArchitect
            engine = AbitdaEngine()
            self._vibe = VibeDeskArchitect(engine)
        return self._vibe

    def get_metadata(self) -> AgentMetadata:
        return AgentMetadata(
            name="Abitda Vibe Desk Architect",
            version="2.0.0",
            agent_type="nlp_scenario",
            description="NLP market sentiment and quantitative scenario synthesiser.",
            fiduciary_target="Fiduciary Constraint Synthesizer"
        )

    def evaluate(self, market_state: Dict[str, Any]) -> ProposedAction:
        symbol = market_state.get("symbol", "SPY")
        vix = market_state.get("vix", 18.0)
        scenario_prompt = f"Market condition on {symbol}: VIX is {vix:.1f}, trend is {market_state.get('regime', 'NORMAL')}."
        
        vibe = self._get_vibe()
        res = vibe.process_prompt(scenario_prompt, symbol)
        cand = res.get("candidate", {})
        strat = cand.get("strategy_type", "IRON_CONDOR") if cand else "IRON_CONDOR"
        contracts = cand.get("contracts", 1) if cand else 1

        return ProposedAction(
            action_type="OPEN_SPREAD" if contracts > 0 else "HOLD_CASH",
            strategy_name=strat,
            confidence=0.82,
            target_delta=0.08,
            target_vega=30.0,
            target_theta=35.0,
            contracts=contracts,
            rationale=f"Vibe desk floor assessment: {res.get('type', 'ANALYSIS')}",
            legs=cand.get("legs", []) if cand else []
        )

class NaiveMomentumAgent(OptionsAgentProtocol):
    """Baseline naive agent: buys directional calls/puts blindly based on price momentum, ignoring Greeks."""

    def get_metadata(self) -> AgentMetadata:
        return AgentMetadata(
            name="Naive Momentum Bot (Benchmark Baseline)",
            version="1.0.0",
            agent_type="momentum_heuristic",
            description="Unhedged naive bot that buys high-delta options on momentum without Greek boundaries or regime awareness.",
            fiduciary_target="UNREGULATED / NO INVARIANTS"
        )

    def evaluate(self, market_state: Dict[str, Any]) -> ProposedAction:
        spy_price = market_state.get("spy_price", 540.0)
        trend = market_state.get("trend", "UP")

        # Buys naked unhedged directional calls or puts with high delta (0.65+)
        if trend == "DOWN":
            return ProposedAction(
                action_type="OPEN_SPREAD",
                strategy_name="NAKED_LONG_PUT",
                confidence=0.55,
                target_delta=-0.65,  # Extreme negative delta breach
                target_vega=220.0,   # Massive vega overshoot
                target_theta=-85.0,  # Bleeding negative theta
                contracts=5,
                rationale="Momentum down: buying 5x OTM Puts unhedged.",
                legs=[{"type": "BUY_PUT", "strike": spy_price * 0.98}]
            )
        else:
            return ProposedAction(
                action_type="OPEN_SPREAD",
                strategy_name="NAKED_LONG_CALL",
                confidence=0.55,
                target_delta=0.70,   # Extreme delta breach
                target_vega=240.0,   # Massive vega overshoot
                target_theta=-90.0,  # Negative theta burn
                contracts=5,
                rationale="Momentum up: buying 5x OTM Calls unhedged.",
                legs=[{"type": "BUY_CALL", "strike": spy_price * 1.02}]
            )

class PassiveThetaFarmer(OptionsAgentProtocol):
    """Baseline naive credit farmer: blindly sells high delta-exposure credit spreads without stop-loss or regime check."""

    def get_metadata(self) -> AgentMetadata:
        return AgentMetadata(
            name="Passive Theta Farmer (Benchmark Baseline)",
            version="1.0.0",
            agent_type="blind_farmer",
            description="Blindly sells short put spreads to harvest premium, with no volatility regime awareness or emergency circuit breakers.",
            fiduciary_target="UNREGULATED / NO REGIME CHECKS"
        )

    def evaluate(self, market_state: Dict[str, Any]) -> ProposedAction:
        spy_price = market_state.get("spy_price", 540.0)
        # Sells short puts regardless of VIX or crashes
        return ProposedAction(
            action_type="OPEN_SPREAD",
            strategy_name="BULL_PUT_SPREAD",
            confidence=0.60,
            target_delta=0.45,   # Delta breach (> 0.25)
            target_vega=-180.0,  # Short vega blowup risk
            target_theta=120.0,
            contracts=10,
            rationale="Blindly farming premium by selling ATM bull put spreads.",
            legs=[
                {"type": "SELL_PUT", "strike": spy_price * 0.99},
                {"type": "BUY_PUT", "strike": spy_price * 0.95}
            ]
        )
