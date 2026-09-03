# THETA HAWK: The Regime-Aware Options Desk
**Alpaca AI Trading Agents Hackathon Submission (lablab.ai)**  
**Paper Trading Account:** `PA382FDPI5IO` | **Level 3 Options Clearance** | **$100,000 Starting Equity**  
**Repository:** [github.com/RABNEER/ThetaHawk](https://github.com/RABNEER/ThetaHawk)

---

## 1. Executive Summary & Value Proposition

> **"The only agent in this hackathon with institutional self-awareness: it manages the entire book's Greeks, force-closes positions when the volatility regime changes mid-trade, and autonomously locks trading when its statistical edge degrades."**

While 95% of AI trading submissions trade single-leg options in isolation or hook simple moving-average prompts to an LLM, institutional options desks face three catastrophic failure modes that naive bots completely ignore:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE 3 INSTITUTIONAL OPTIONS GAPS SOLVED                         │
├────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ 1. Greek Concentration     │ 2. Mid-Trade Regime Flips   │ 3. Silent Edge Decay        │
│ Naive: Checks risk trade-  │ Naive: Passively holds open │ Naive: Trades through losing│
│ by-trade. 5 "safe" short   │ spreads until price stop or │ streaks until the account   │
│ puts create catastrophic   │ expiration is breached.     │ reaches zero.               │
│ negative Vega.             │                             │                             │
│ THETA HAWK: Calculates Net │ THETA HAWK: Continuously    │ THETA HAWK: Runs rolling    │
│ Book Delta (±0.25) & Vega  │ senses macro VIX shocks and │ binomial Z-score tests.     │
│ (150) before order dispatch│ force-liquidates mid-trade  │ Autonomously locks trading  │
│ and VETOES breaches.       │ before gamma explodes.      │ on statistical edge loss.   │
└────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

---

## 2. Quantitative System Architecture & MCP Interface

```
 [Macro Telemetry]                [AI Floor Quant]               [Institutional Defense]
   VIX / IV %ile / SPY   ───►    Gemini 2.5 Flash ReAct   ───►     Portfolio Greeks Gate
                               (Alpha Scout vs Risk Gov)           (Net Δ ±0.25, Net Vega 150)
                                                                            │
                                                                       Approved?
                                                                      /          \
                                                             YES    ▼              ▼  NO
                                                          [Alpaca MCP]        [VETO BARRIER]
                                                          Order Execute       Order Blocked
                                                          (Paper Tier 3)      Capital Safe
```

### Module Interface Breakdown

| Subsystem | File / Component | Institutional Responsibility |
| :--- | :--- | :--- |
| **Broker Execution** | [`execution/alpaca_client.py`](execution/alpaca_client.py) | Executes multi-leg options orders via Alpaca Trading API & Model Context Protocol (MCP). |
| **Native MCP Server** | [`mcp_server.py`](mcp_server.py) | FastMCP server exposing 6 floor quant tools over stdio to Claude Desktop, Cursor, and Gemini. |
| **Greeks Engine** | [`data/greeks_engine.py`](data/greeks_engine.py) | Analytical Black-Scholes engine ($\Delta, \Gamma, \mathcal{V}, \Theta$) with zero compiled C-dependencies. |
| **Macro Regime Agent** | [`agents/regime_agent.py`](agents/regime_agent.py) | Dynamically classifies market state: `RANGE_BOUND` (Condor), `TRENDING` (Spread), `EVENT_RISK` (Hedge). |
| **Adversarial ReAct** | [`agents/copilot_agent.py`](agents/copilot_agent.py) | Multi-step ReAct loop featuring `[ALPHA SCOUT]` momentum proposal vs `[RISK GOVERNOR]` fiduciary veto. |
| **Greeks Barrier (Gap #1)** | [`risk/portfolio_greeks_gate.py`](risk/portfolio_greeks_gate.py) | Blocks any order that would cause aggregate book Delta to breach $\pm0.25$ or Vega to exceed $150$. |
| **Regime Exit (Gap #2)** | [`risk/regime_flip_exit.py`](risk/regime_flip_exit.py) | Immediately liquidates open premium positions upon VIX surge (>30) or catalyst breakout. |
| **Guardian Lock (Gap #3)** | [`risk/self_suspension.py`](risk/self_suspension.py) | Performance watchdog using rolling binomial Z-scores to trigger autonomous self-suspension. |
| **Desk Terminal** | [`frontend/src/App.tsx`](frontend/src/App.tsx) | Institutional monochrome desktop desk (`ui-ux-pro-max`), SVG payoff curve, ReAct console & pitch dock. |

---

## 3. Empirical Black Swan Stress-Test: August 5, 2024 "Black Monday"

To prove institutional viability beyond static backtests, Theta Hawk includes a deterministic replay of the **August 5, 2024 Yen Carry Trade Crash** (where VIX surged intraday from 23.4 to 65.73):

```
                                  FINAL SCORECARD: AUG 5 CRASH
┏━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Metric              ┃ Naive Options Bot (No Regime)┃ THETA HAWK Desk (Early Exit)┃
┡━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Ending Equity       │ $56,200.00                   │ $98,760.00                  │
│ Total Drawdown      │ -$43,800.00 (-43.8%)         │ -$1,240.00 (-1.24%)         │
│ Capital Preserved   │ 56.2%                        │ 98.76% (Saved $42,560)      │
│ Liquidation Timing  │ At full wing loss (10:15 AM) │ Pre-emptive scratch (09:35) │
│ Outcome             │ Margin Liquidation Blowout   │ Fiduciary Capital Retained  │
└─────────────────────┴──────────────────────────────┴─────────────────────────────┘
```
*Run locally via:* `python main.py --replay`

---

## 4. Lablab.ai 4-Axis Judging Rubric Compliance

| Judging Axis | How THETA HAWK Satisfies the Criterion |
| :--- | :--- |
| **Application of Technology** | Direct integration with **Alpaca Trading API + Model Context Protocol (MCP)** on paper account `PA382FDPI5IO` + pure-Python Black-Scholes Greeks engine + Google Gemini ReAct loop. |
| **Business Value** | Solves the core reason options funds fail: aggregate Greek concentration and edge decay. Protects institutional capital through mathematical fences rather than hopeful prompts. |
| **Originality** | Differentiated from the common "LLM Council / Chatbot" pattern. Features true autonomous self-suspension, mid-trade regime-flip exits, and an adversarial ReAct internal debate. |
| **Presentation Quality** | High-density monochrome institutional terminal (`ui-ux-pro-max`), interactive Plotly/SVG payoff curves, live ReAct trace stream, and 1-click pitch demo triggers. |

---

## 5. 5-Minute Hackathon Demo Pitch Flow

1. **Minute 0:00–1:00 (The Problem & Connection)**: Introduce paper account `PA382FDPI5IO` ($100k equity, Level 3 options) and explain why retail bots blow up by ignoring book Greeks.
2. **Minute 1:00–2:00 (Live ReAct Loop & Payoff Diagram)**: Run `Run Agentic Cycle` to show the visible ReAct stream: `[ALPHA SCOUT]` proposes naked options $\rightarrow$ `[RISK GOVERNOR]` forces defined-risk spread $\rightarrow$ SVG Payoff curve renders.
3. **Minute 2:00–3:00 (Moment #3 — Greeks Barrier VETO)**: Click `Trigger Greeks VETO` $\rightarrow$ watch the autonomous gate reject the order for exceeding $\pm0.25$ Delta.
4. **Minute 3:00–4:00 (Moment #4 — Regime-Flip Early Exit)**: Click `Trigger Regime Flip` $\rightarrow$ watch open spreads force-liquidated mid-trade upon VIX spike.
5. **Minute 4:00–4:45 (Moment #5 — Fiduciary Self-Lock)**: Click `Simulate Self-Lock` $\rightarrow$ show the binomial Z-score guardian suspend trading due to edge degradation.
6. **Minute 4:45–5:00 (Floor Quant Q&A & Close)**: Ask the Co-Pilot *"Why didn't you buy naked calls today?"* and close on the one-sentence pitch.
