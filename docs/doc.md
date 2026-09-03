# THETA HAWK — Regime-Aware Options Desk Agent
**Alpaca AI Trading Agents Hackathon Submission**

> An agent that trades like a seasoned options desk: reads the environment, adapts its strategy, sizes by conviction, manages the whole book, and knows when to stop.

---

## 1. One-Sentence Pitch

> THETA HAWK is the only agent in this hackathon that knows when it's wrong — it monitors its own win rate, suspends itself when its edge degrades, and force-closes positions when the market regime changes underneath it.

---

## 2. Hackathon Requirements Checklist

| Requirement | How we meet it |
|---|---|
| Use Alpaca's Trading API + MCP server or CLI | Execution routed through Alpaca's official MCP server, not raw REST |
| Strategy must incorporate options trading | Iron condors, bull put / bear call credit spreads |
| Fresh dedicated Alpaca paper trading account | Created specifically for this submission |
| Working prototype accessible by URL | Streamlit dashboard, deployed |
| Pitch video ≤5 minutes, MP4 | See Section 8 (Demo Script) |
| Slide deck, PDF | Summarizes Sections 1, 3, 5, 8 |
| Public GitHub repo | All code, README, setup instructions |

**Judging rubric this design targets** (lablab.ai's 4-axis standard):
1. **Application of Technology** — real MCP execution + real options Greeks math, not just an LLM call
2. **Business Value** — solves the actual failure mode of naive trading bots: per-trade risk checks that ignore aggregate book exposure, and systems with no self-awareness of edge decay
3. **Originality** — differentiated from the verifier/council/journal pattern cluster common on the leaderboard
4. **Presentation Quality** — dashboard has 3 distinct, memorable visual "moments" (see Section 8)

---

## 3. Core Concept — The 5-Step Trader Loop

Most competing bots do step 3 only, with one hardcoded strategy. THETA HAWK does all 5, autonomously, and narrates every decision in plain English.

1. **Regime Reader** — reads VIX + IV percentile, classifies market state
2. **Opportunity Scanner** — ranks tickers by IV percentile, RSI extremity, catalyst proximity
3. **Strategy Selector** — picks the strategy that fits the regime, not a fixed one
4. **Conviction-Weighted Sizing** — position size scales with signal confidence AND remaining portfolio risk budget
5. **Dynamic Position Management** — stop-loss/take-profit, plus regime-flip forced exits and rolls

Plus a cross-cutting **Self-Awareness Layer** that can pause the whole system.

---

## 4. Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Broker / execution | `alpaca-py` (official SDK) + Alpaca MCP server | Required by hackathon rules; MCP satisfies "Application of Technology" axis directly |
| Options Greeks | `py_vollib` | Fast Black-Scholes delta/vega/theta/gamma; sufficient accuracy for paper trading, lightweight install |
| Technical indicators | `pandas-ta` | RSI, MACD, moving averages; pure-Python, no C build step like TA-Lib |
| Historical vol / IV percentile context | `yfinance` | Longer lookback window than Alpaca alone provides, for percentile ranking |
| Backtesting / sanity-check | `vectorbt` or `backtrader` | Validate regime → strategy branching behaves correctly before going live |
| Trade log / memory | `sqlite3` (Python stdlib) | Trade journal, rolling win-rate window; no need for a heavier DB |
| Reasoning / decision agent | Anthropic Claude API (direct calls per step) | Simpler to debug than a full agent framework for 5 discrete decision points |
| Scheduling | `APScheduler` | Periodic regime checks + position monitoring loop |
| Dashboard | `Streamlit` | Fastest path to a live-updating demo UI |
| Language | Python 3.11+ | — |

**Explicitly not used (and why):** QuantLib (overkill vs. py_vollib for this scope), LangChain/LangGraph (adds framework overhead without a payoff visible in the demo), TA-Lib (C dependency, harder install, pandas-ta covers the same indicators).

---

## 5. System Architecture

```
                        ┌─────────────────────┐
                        │   Scheduler (APS)    │
                        │  runs every N min    │
                        └──────────┬───────────┘
                                   │
                 ┌─────────────────▼──────────────────┐
                 │        1. REGIME READER              │
                 │  VIX level + IV percentile (SPY/QQQ) │
                 │  → bucket: range-bound / trending /  │
                 │             event-risk               │
                 └─────────────────┬──────────────────┘
                                   │
                 ┌─────────────────▼──────────────────┐
                 │      2. OPPORTUNITY SCANNER          │
                 │  Rank tickers: IV %ile, RSI, earnings│
                 │  / FOMC calendar proximity flag      │
                 └─────────────────┬──────────────────┘
                                   │
                 ┌─────────────────▼──────────────────┐
                 │      3. STRATEGY SELECTOR            │
                 │  range-bound  → iron condor          │
                 │  trending     → directional spread   │
                 │  event-risk   → no entry / hedge      │
                 └─────────────────┬──────────────────┘
                                   │
        ┌──────────────────────────▼───────────────────────────┐
        │        SELF-AWARENESS LAYER (cross-cutting gate)       │
        │  Rolling win-rate vs. expected → SUSPEND if degraded   │
        └──────────────────────────┬───────────────────────────┘
                                   │ (if not suspended)
                 ┌─────────────────▼──────────────────┐
                 │   4. CONVICTION-WEIGHTED SIZING      │
                 │  size = base × confidence ×          │
                 │         (1 − current_exposure/max)   │
                 │  ← reads PORTFOLIO GREEKS ENGINE      │
                 └─────────────────┬──────────────────┘
                                   │
                 ┌─────────────────▼──────────────────┐
                 │     PORTFOLIO GREEKS ENGINE          │
                 │  Aggregate delta/vega/theta across   │
                 │  ALL open positions (py_vollib)       │
                 │  → REJECT if trade breaches book cap │
                 └─────────────────┬──────────────────┘
                                   │ (approved)
                 ┌─────────────────▼──────────────────┐
                 │      EXECUTION (Alpaca MCP)          │
                 │  Place options order, paper account  │
                 └─────────────────┬──────────────────┘
                                   │
                 ┌─────────────────▼──────────────────┐
                 │   5. DYNAMIC POSITION MANAGEMENT     │
                 │  SL/TP + regime-flip forced exit      │
                 │  + roll logic if tested, not flipped  │
                 └─────────────────┬──────────────────┘
                                   │
                 ┌─────────────────▼──────────────────┐
                 │   TRADE LOG / MEMORY (sqlite3)       │
                 │  Every trade + every rejection logged│
                 │  → feeds win-rate monitor & sizing    │
                 └─────────────────┬──────────────────┘
                                   │
                 ┌─────────────────▼──────────────────┐
                 │      STREAMLIT DASHBOARD             │
                 │  Regime gauge · Greeks exposure bar  │
                 │  Trade/rejection feed · Win-rate chart│
                 └───────────────────────────────────────┘
```

---

## 6. Module Breakdown

| Module | File | Responsibility |
|---|---|---|
| `regime.py` | Regime Reader | Pull VIX + IV percentile, classify regime, output plain-English reasoning string |
| `scanner.py` | Opportunity Scanner | Rank watchlist tickers, flag earnings/FOMC windows |
| `strategy.py` | Strategy Selector | Map regime → strategy type, construct the specific contract legs |
| `greeks_engine.py` | Portfolio Greeks Engine | Compute per-position and aggregate portfolio Greeks via py_vollib; expose `check_exposure(new_trade)` → approve/reject/downsize |
| `sizing.py` | Conviction Sizing | Combine confidence score + exposure headroom into contract count |
| `execution.py` | Execution | Wraps Alpaca MCP calls: place order, fetch positions, fetch account state |
| `position_manager.py` | Dynamic Management | SL/TP checks, regime-flip exit trigger, roll logic |
| `memory.py` | Trade Log | sqlite3 read/write, rolling win-rate calculation |
| `guardian.py` | Self-Awareness Layer | Statistical check on win-rate vs. expected; sets global `TRADING_SUSPENDED` flag |
| `narrator.py` | Explainability | Takes structured decisions from any module, calls Claude to produce the plain-English log line |
| `dashboard.py` | Streamlit UI | Renders all live state |
| `scheduler.py` | Orchestration | APScheduler jobs tying the loop together |

---

## 7. Key Decision Logic (concrete thresholds)

**Regime buckets** (tune with backtest data before demo):
- IV percentile < 30 → **Range-bound** → Iron Condor
- IV percentile 30–60 + clear MA trend slope → **Trending** → Directional credit spread (bull put in uptrend, bear call in downtrend)
- IV percentile > 60 OR earnings/FOMC within 2 trading days OR VIX spike (>X% intraday move) → **Event-risk** → No new entries; existing positions tightened or hedged

**Portfolio Greeks gate:**
- Define max aggregate delta and max aggregate vega for the book (e.g., ±X delta, Y vega — set relative to paper account size)
- Before every new order: compute what aggregate exposure *would be* if the trade filled → reject or downsize if it breaches the cap
- Log every rejection with the specific breached limit

**Conviction sizing formula:**
```
size = base_contract_count × confidence_score × (1 − current_exposure / max_exposure)
```

**Win-rate self-suspension:**
- Maintain rolling window of last N closed trades
- Compare realized win rate to expected win rate (from strategy's theoretical edge) using a simple z-test / binomial check
- If realized falls significantly below expected → set `TRADING_SUSPENDED = True`, dashboard shows explicit banner, no new entries until manually reviewed

**Regime-flip exit:**
- If current regime state changes to Event-risk while a position is open → close that position immediately regardless of current P&L

---

## 8. Demo Script (for the ≤5 min pitch video)

1. **(30s)** State the problem: bots check risk per-trade and never look at the whole book; bots never know when their edge is gone
2. **(60s)** Show regime gauge live, flipping between states with strategy branch changing on screen
3. **(60s)** Trigger a trade that would breach portfolio exposure → show the **"REJECTED — would breach portfolio delta limit"** event live
4. **(60s)** Trigger a regime flip mid-trade → show forced early close event
5. **(45s)** Show win-rate monitor (seed/backtest run if needed) pausing itself with the **"Win rate degraded — trading paused pending review"** banner
6. **(15s)** Close on the one-sentence pitch (Section 1)

---

## 9. Build Order (suggested sequence, not a timeline)

1. Alpaca MCP connection + paper account wired up, place one manual test options order
2. Regime Reader (VIX/IV percentile pull + bucket logic)
3. Strategy Selector (contract construction for each of the 3 branches)
4. Portfolio Greeks Engine (this is the centerpiece — get it right)
5. Conviction sizing + execution wiring
6. Trade log (sqlite3) + dynamic position management (SL/TP, regime-flip exit)
7. Self-awareness layer (win-rate monitor)
8. Streamlit dashboard (all visual "moments" from Section 8)
9. Narrator module (plain-English explanations) layered in last, once the underlying decisions are real
10. Backtest sanity-check on regime branching before recording the demo

---

## 10. Open Risks / Things to Verify Before Submitting

- Confirm current lablab.ai submissions list directly (not just search-indexed) to make sure no one has shipped the portfolio-Greeks-gate or win-rate self-suspension idea since last checked
- Confirm Alpaca's options paper trading data (Greeks/IV) is actually available via API/MCP at the granularity needed — verify early, don't assume
- Confirm exact submission deadline time and required field formats on the hackathon page before final submission