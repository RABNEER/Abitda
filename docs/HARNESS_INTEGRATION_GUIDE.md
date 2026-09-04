# Abitda Options Agent Test Harness — Integration & Developer Guide

`abitda` (`v2.0.0`) is a standardized **Autonomous Options Agent Test Harness and Institutional Benchmarking Arena** designed for quantitative developers, AI researchers, and hackathon participants.

This guide provides full instructions on how to integrate, test, and benchmark external AI agents (LangChain, AutoGen, CrewAI, OpenAI Assistants, Claude Desktop, or custom Python agents) against calibrated historical black swan market crashes.

---

## 1. Overview & Evaluation Philosophy

Most AI trading agents perform well during calm backtests, but experience catastrophic account blowouts during tail-risk events (volatility spikes, liquidity vacuums, sudden regime flips). 

The **Abitda Test Harness** subjects candidate agents to real-world historical market crashes bar-by-bar, intercepting and evaluating every proposed trade against institutional **Black-Scholes Greeks invariants**:
- **Delta Boundary Gate**: Net book Delta must remain within $|\Delta| \le 0.25$.
- **Vega Shock Cap**: Net book Vega must not exceed $150.0$ per 1% vol expansion.
- **Regime-Flip Early Exit**: Premium-selling strategies must defensively liquidate on `EVENT_RISK`.
- **Self-Awareness Lock**: Realized win-rate degradation below statistical threshold ($Z < -1.64$) triggers autonomous trading suspension.

At the conclusion of a shock replay, the harness awards an official **Fiduciary Grade** (`A+`, `A`, `B`, `C`, `D`, `F`) and outputs an audit scorecard.

---

## 2. The Core Protocol (`OptionsAgentProtocol`)

To plug any agent into the test harness, implement the `OptionsAgentProtocol` interface defined in [`harness/protocol.py`](file:///d:/Hackathons/Alpaca/harness/protocol.py):

```python
from abc import ABC, abstractmethod
from typing import Dict, Any
from pydantic import BaseModel

class AgentMetadata(BaseModel):
    name: str
    author: str
    architecture: str # e.g. "ReAct Multi-Agent", "LangChain GPT-4o", "Rules-Based"
    version: str

class ProposedAction(BaseModel):
    action: str # "OPEN_SPREAD", "CLOSE_POSITIONS", "HOLD_CASH"
    strategy_type: str # "IRON_CONDOR", "BULL_PUT_SPREAD", "BEAR_CALL_SPREAD", "NONE"
    legs: list # List of option legs (strike, type, expiry, qty)
    max_risk: float
    net_credit: float
    rationale: str

class OptionsAgentProtocol(ABC):
    @abstractmethod
    def get_metadata(self) -> AgentMetadata:
        """Return agent identification metadata."""
        pass

    @abstractmethod
    def propose_action(
        self,
        scenario_bar: Dict[str, Any],
        current_portfolio: Dict[str, Any]
    ) -> ProposedAction:
        """
        Invoked on every bar of a market shock scenario.
        Return candidate trade action or defensive hold.
        """
        pass
```

---

## 3. Input Telemetry Schema (`scenario_bar`)

On each bar of the simulation, your agent receives a `scenario_bar` dictionary:

| Field | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `bar_label` | `str` | Time or narrative event marker | `"Aug 5 10:15 Peak Panic"` |
| `spy_price` | `float` | Underlying spot price | `511.80` |
| `vix` | `float` | CBOE Volatility Index level | `65.7` |
| `iv_percentile`| `float`| 30-day implied volatility percentile (0-100%) | `99.8` |
| `regime` | `str` | Classified regime: `RANGE_BOUND`, `TRENDING`, `EVENT_RISK` | `"EVENT_RISK"` |
| `narrative` | `str` | Real-world historical context | `"Massive liquidation wave as Nikkei drops 12%"` |

You also receive `current_portfolio`:
```python
{
    "equity": 100000.0,
    "cash": 100000.0,
    "book_greeks": {
        "net_delta": 0.0,
        "net_vega": 0.0,
        "net_theta": 0.0
    },
    "open_positions_count": 0
}
```

---

## 4. Output Action Schema (`ProposedAction`)

Your agent returns a `ProposedAction` object:

### A. Defensive Stance / Hold Cash
```python
return ProposedAction(
    action="HOLD_CASH",
    strategy_type="NONE",
    legs=[],
    max_risk=0.0,
    net_credit=0.0,
    rationale="VIX is 65.7 (EVENT_RISK). Tail-risk prevents new short credit spreads."
)
```

### B. Emergency Position Liquidation
```python
return ProposedAction(
    action="CLOSE_POSITIONS",
    strategy_type="DEFENSIVE_EXIT",
    legs=[],
    max_risk=0.0,
    net_credit=0.0,
    rationale="Market regime flipped to EVENT_RISK. Closing open wings."
)
```

### C. Defined-Risk Option Spread
```python
return ProposedAction(
    action="OPEN_SPREAD",
    strategy_type="BULL_PUT_SPREAD",
    legs=[
        {"option_type": "put", "strike": 530.0, "tte_years": 14/365, "iv": 0.22, "quantity": -1}, # Short Put
        {"option_type": "put", "strike": 525.0, "tte_years": 14/365, "iv": 0.22, "quantity": 1}   # Long Put (Hedge)
    ],
    max_risk=350.0,
    net_credit=150.0,
    rationale="Trend is bullish with elevated IV. Selling out-of-the-money put spread."
)
```

---

## 5. The 5 Calibrated Historical Scenarios

| Scenario ID | Historical Event | Max VIX | Crash Characteristic | Key Challenge for Agent |
| :--- | :--- | :--- | :--- | :--- |
| `aug5_2024` | **August 5, 2024 Yen Carry Crash** | `65.7` | Violent opening panic followed by afternoon rebound | Must not sell naked premium at peak panic |
| `svb_march_2023` | **SVB Collapse & Regional Banking Panic** | `30.8` | 3-week bond market volatility & liquidity freeze | Must detect financial sector contagion |
| `volmageddon_2018`| **February 2018 Volmageddon** | `50.3` | +115% daily spike in VIX, XIV short-vol blowup | Tests short-volatility catastrophic risk |
| `flash_crash_intraday` | **Intraday Flash Crash Liquidity Vacuum** | `45.0` | 9% intraday collapse in under 20 minutes | Demands immediate regime-flip exit |
| `calm_bull_grind` | **Low-Volatility Grinding Bull Market** | `12.5` | Range-bound 2-month summer grind | Verifies consistent theta capture |

---

## 6. Full Code Example: Custom External Agent Integration

Here is a complete, runnable script demonstrating how to wrap a custom agent (or an LLM call) and benchmark it against Abitda:

```python
import abitda
from abitda import OptionsAgentProtocol, AgentMetadata, ProposedAction
from abitda import ScenarioRegistry, HarnessEvaluator

# Step 1: Define your custom agent adapter
class MyCustomOptionsAgent(OptionsAgentProtocol):
    def get_metadata(self) -> AgentMetadata:
        return AgentMetadata(
            name="AlphaShield AI",
            author="Quant Research Lab",
            architecture="Regime-Aware Delta Neutral Bot",
            version="1.0.0"
        )

    def propose_action(self, scenario_bar: dict, current_portfolio: dict) -> ProposedAction:
        vix = scenario_bar.get("vix", 15.0)
        regime = scenario_bar.get("regime", "RANGE_BOUND")
        spot = scenario_bar.get("spy_price", 550.0)

        # Fiduciary Rule: If market enters EVENT_RISK, never sell premium
        if regime == "EVENT_RISK" or vix > 30.0:
            return ProposedAction(
                action="HOLD_CASH",
                strategy_type="NONE",
                legs=[],
                max_risk=0.0,
                net_credit=0.0,
                rationale=f"VIX is {vix:.1f} (>30). Fiduciary rule prohibits premium selling."
            )

        # In calm/trending markets, propose a defined-risk spread
        return ProposedAction(
            action="OPEN_SPREAD",
            strategy_type="BULL_PUT_SPREAD",
            legs=[
                {"option_type": "put", "strike": spot - 10, "tte_years": 7/365, "iv": 0.18, "quantity": -1},
                {"option_type": "put", "strike": spot - 15, "tte_years": 7/365, "iv": 0.18, "quantity": 1}
            ],
            max_risk=350.0,
            net_credit=150.0,
            rationale="Normal regime. Harvesting theta with hedged wing."
        )

# Step 2: Run the Benchmark
if __name__ == "__main__":
    evaluator = HarnessEvaluator()
    agent = MyCustomOptionsAgent()
    scenario = ScenarioRegistry.get_scenario("aug5_2024")

    print(f"Benchmarking {agent.get_metadata().name} on {scenario.name}...")
    scorecard = evaluator.evaluate_agent(agent, scenario)

    # Step 3: Inspect Scorecard
    print(f"\n=======================================================")
    print(f"  INSTITUTIONAL GRADE: {scorecard.fiduciary_grade}")
    print(f"  Capital Preserved:   {scorecard.capital_preserved_pct:.2f}%")
    print(f"  Max Drawdown:        {scorecard.max_drawdown_pct:.2f}%")
    print(f"  Greeks Breaches:     {scorecard.delta_invariant_breaches + scorecard.vega_invariant_breaches}")
    print(f"  Regulatory Status:   {scorecard.regulatory_status}")
    print(f"=======================================================\n")

    # Step 4: Export Scorecard Markdown
    evaluator.generate_scorecard_markdown(scorecard, output_path="MY_AGENT_SCORECARD.md")
    print("Exported audit report to MY_AGENT_SCORECARD.md")
```

---

## 7. How to Benchmark via CLI, REST API, & MCP

### CLI
```bash
abitda --benchmark --agent committee --scenario volmageddon_2018
```

### REST API
```bash
curl -X POST http://127.0.0.1:8000/api/harness/benchmark \
  -H "Content-Type: application/json" \
  -d '{"agent_type": "committee", "scenario_id": "aug5_2024"}'
```

### Model Context Protocol (MCP)
Add Abitda to your Claude Desktop or Cursor configuration:
```json
{
  "mcpServers": {
    "abitda": {
      "command": "python",
      "args": ["-m", "mcp_server"]
    }
  }
}
```
Ask Claude:
> *"Benchmark candidate agent 'vibe' against scenario 'volmageddon_2018' and audit its Greek invariant breaches."*
