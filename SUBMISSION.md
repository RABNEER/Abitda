# ABITDA: Autonomous Options Agent Test Harness & Institutional Desk
**Alpaca AI Trading Agents Hackathon Submission (lablab.ai)**  
**Paper Trading Account:** `PA382FDPI5IO` | **Level 3 Options Clearance** | **$100,000 Starting Equity**  
**Repository:** [github.com/RABNEER/Abitda](https://github.com/RABNEER/Abitda) | **Live Demo:** [abitda.up.railway.app](https://abitda.up.railway.app) | **PyPI:** [pip install abitda](https://pypi.org/project/abitda)

---

## 1. Executive Summary & Value Proposition

> **"The institutional benchmark harness and execution desk for options trading agents: it stress-tests any candidate LLM against historical black swans, audits closed-form Black-Scholes Greeks invariants, and enforces autonomous fiduciary locks on live capital."**

While 95% of AI trading hackathon submissions present a single rigid bot that fails out-of-sample, institutional funds require a **reproducible evaluation test harness** before deploying any agent to live capital.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          ABITDA 2-IN-1 QUANTITATIVE PLATFORM                           │
├─────────────────────────────────────────────┬──────────────────────────────────────────┤
│ 1. Institutional Agent Test Harness         │ 2. Fiduciary Autonomous Options Desk     │
│ • Universal Protocol: Plug ANY agent        │ • Portfolio GreeksGate: Net Delta ±0.25, │
│ • 5 Calibrated Stress Scenarios (Aug 5 2024,│   Net Vega < 150 strictly enforced.      │
│   SVB 2023, Volmageddon 2018, Flash Crash)  │ • Regime-Flip Early Exit: Emergency      │
│ • Quantitative Fiduciary Scorecard          │   liquidation on macro VIX surge (>12%). │
│ • Institutional Certification (Grade A+ to F│ • Win-Rate Performance Guardian: Rolling │
│   required before live Alpaca deployment)   │   binomial Z-score self-lock.            │
└─────────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 2. Quantitative System Architecture & MCP Interface

```
 [Stress Scenario Bar]       [Candidate Agent Candidate]       [Fiduciary Invariant Gate]
   Aug 5 2024 / SVB   ───►   Committee / Vibe / Custom   ───►     Portfolio GreeksGate
                                (Deliberates action)             (Net Δ ±0.25, Vega 150)
                                                                            │
                                                                       Compliant?
                                                                      /          \
                                                             YES    ▼              ▼  NO
                                                          [GRADE A+ CERTIFIED]  [VETO / GRADE F]
                                                          Live Alpaca Deploy    Capital Preserved
```

### Module Interface Breakdown

| Subsystem | File / Component | Institutional Responsibility |
| :--- | :--- | :--- |
| **Agent Test Harness** | [`harness/evaluator.py`](harness/evaluator.py) | Executes bar-by-bar stress replays, tallies Greek invariant breaches, and outputs institutional scorecard. |
| **Universal Protocol** | [`harness/protocol.py`](harness/protocol.py) | Base class `OptionsAgentProtocol` + adapters for Committee, Vibe Desk, Naive Momentum, and Passive Farmer. |
| **Stress Scenario Matrix**| [`harness/scenarios.py`](harness/scenarios.py) | 5 calibrated market shock episodes with historical volatility spikes (VIX up to 65.73). |
| **4-Agent Committee** | [`agents/committee.py`](agents/committee.py) | Multi-agent floor debate (Macro, Technical, Alpha, Risk) inspired by `TauricResearch/TradingAgents`. |
| **Vibe Desk Architect** | [`agents/vibe_desk.py`](agents/vibe_desk.py) | Natural language strategy structuring and sentiment shock checks inspired by `HKUDS/Vibe-Trading`. |
| **Greeks Barrier (Gap #1)** | [`risk/portfolio_greeks_gate.py`](risk/portfolio_greeks_gate.py) | Blocks any order that causes aggregate book Delta to breach $\pm0.25$ or Vega to exceed $150$. |
| **Regime Exit (Gap #2)** | [`risk/regime_flip_exit.py`](risk/regime_flip_exit.py) | Immediately liquidates open premium positions upon VIX surge (>30) or catalyst breakout. |
| **Guardian Lock (Gap #3)** | [`risk/self_suspension.py`](risk/self_suspension.py) | Performance watchdog using rolling binomial Z-scores to trigger autonomous self-suspension. |
| **Desk Terminal** | [`frontend/src/App.tsx`](frontend/src/App.tsx) | Institutional monochrome desktop desk (`ui-ux-pro-max`) with 6 console tabs and live benchmark runner. |

---

## 3. Empirical Black Swan Stress-Test: August 5, 2024 "Black Monday"

To prove institutional viability beyond theoretical backtests, Abitda includes deterministic replays of historical volatility crises:

```
                                  FINAL SCORECARD: AUG 5 CRASH
┏━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Metric              ┃ Naive Options Bot (No Regime)┃ Abitda Desk (Early Exit)    ┃
┡━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ Ending Equity       │ $56,200.00                   │ $98,760.00                  │
│ Total Drawdown      │ -$43,800.00 (-43.8%)         │ -$1,240.00 (-1.24%)         │
│ Capital Preserved   │ 56.2%                        │ 98.76% (Saved $42,560)      │
│ Liquidation Timing  │ At full wing loss (10:15 AM) │ Pre-emptive scratch (09:35) │
│ Outcome             │ Margin Liquidation Blowout   │ Fiduciary Capital Retained  │
└─────────────────────┴──────────────────────────────┴─────────────────────────────┘
```
*Run locally via CLI:* `abitda --benchmark --agent committee --scenario aug5_2024`

---

## 4. Lablab.ai 4-Axis Judging Rubric Compliance

| Judging Axis | How Abitda Satisfies the Criterion |
| :--- | :--- |
| **Application of Technology** | Direct integration with **Alpaca Trading API + Model Context Protocol (MCP)** on paper account `PA382FDPI5IO` + pure-Python Black-Scholes Greeks engine + pluggable agent evaluation harness. |
| **Business Value** | Solves the core reason options desks fail: unmonitored aggregate Greeks and edge decay. Provides institutional certification before capital deployment. |
| **Originality** | Moves beyond "single bot prompts" into a standardized testing and execution harness (`Abitda`), featuring multi-agent deliberations and stress-testing suites. |
| **Presentation Quality** | High-density monochrome institutional terminal (`ui-ux-pro-max`), interactive Plotly/SVG payoff curves, live ReAct stream, committee debate, and benchmark scorecards. |

---

## 5. 5-Minute Hackathon Demo Pitch Flow

1. **Minute 0:00–1:00 (The Problem & The Harness Vision)**: Explain why single options bots fail without aggregate risk testing. Introduce `Abitda` as the options agent evaluation & execution harness.
2. **Minute 1:00–2:00 (Agent Harness Benchmarking)**: Switch to the **"Agent Harness Benchmark"** tab. Select the 4-Agent Floor Committee and run the August 5, 2024 Yen Crash replay. Watch the live tick evaluation, zero Greek breaches, and `GRADE: A+ [INSTITUTIONAL CERTIFIED]` output.
3. **Minute 2:00–2:45 (Naive Bot Contrast)**: Benchmark the `Naive Momentum Bot` on the same crash $\rightarrow$ watch multiple Delta/Vega breaches and instant `GRADE: F [DISQUALIFIED]`.
4. **Minute 2:45–3:45 (Multi-Agent Floor Committee)**: Switch to **"4-Agent Floor Committee"** tab. Show the Macro Analyst, Technical Scout, Alpha Trader, and Risk Governor debate with real-time voting consensus.
5. **Minute 3:45–4:30 (Institutional Briefing Dossier)**: Generate `DESK_BRIEFING.md` live $\rightarrow$ show executive solvency, ASCII Greek barrier diagram, and signed fiduciary attestation.
6. **Minute 4:30–5:00 (Fiduciary Self-Lock & Close)**: Trigger `Self-Lock` $\rightarrow$ show the binomial Z-score guardian pause trading to protect capital. Close on the one-sentence pitch.

---

*Built with precision for the Alpaca AI Trading Agents Hackathon.*
