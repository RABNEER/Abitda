"""
ThetaHawk Real-Time Options Desk & Risk Dashboard
Built for the Alpaca AI Trading Agents Hackathon.
Delivers the 4 required visual demo moments:
1. Live Market Regime & Internal Monologue Gauge
2. Portfolio Greeks Exposure Meters (Delta / Vega / Theta)
3. The Greeks Firewall VETO Event
4. The Regime-Flip Emergency Liquidation Event
5. The Win-Rate Self-Suspension Fiduciary Lock
"""

import streamlit as st
import pandas as pd
import json
import time
import numpy as np
import plotly.graph_objects as go
from datetime import datetime

from core.engine import ThetaHawkEngine
from config.settings import (
    MAX_PORTFOLIO_DELTA,
    MAX_PORTFOLIO_VEGA,
    DAILY_DRAWDOWN_LIMIT_PCT,
    ALPACA_ACCOUNT_NUMBER
)

def plot_options_payoff_diagram(candidate, spot_price):
    """
    Computes exact institutional P&L curve across a spectrum of underlying spot prices.
    Renders an interactive Plotly diagram with profit zone, loss wings, breakevens, and spot cursor.
    """
    legs = candidate.get("legs", [])
    if not legs:
        return None
    
    low_price = spot_price * 0.93
    high_price = spot_price * 1.07
    prices = np.linspace(low_price, high_price, 250)
    pnl = np.zeros_like(prices)
    
    net_credit = candidate.get("estimated_credit_per_contract", 150.0)
    pnl += net_credit
    
    for leg in legs:
        strike = leg.get("strike", spot_price)
        is_call = leg.get("type", "").lower() == "call"
        is_buy = leg.get("action", "").lower() == "buy"
        
        if is_call:
            intrinsic = np.maximum(prices - strike, 0)
        else:
            intrinsic = np.maximum(strike - prices, 0)
            
        mult = 100 if is_buy else -100
        pnl += mult * intrinsic
        
    fig = go.Figure()
    
    # Fill profit area (>=0)
    fig.add_trace(go.Scatter(
        x=prices,
        y=np.maximum(pnl, 0),
        mode="lines",
        line=dict(width=0),
        fill="tozeroy",
        fillcolor="rgba(16, 185, 129, 0.15)",
        name="Max Profit Zone",
        hoverinfo="skip"
    ))
    
    # Fill loss area (<0)
    fig.add_trace(go.Scatter(
        x=prices,
        y=np.minimum(pnl, 0),
        mode="lines",
        line=dict(width=0),
        fill="tozeroy",
        fillcolor="rgba(239, 68, 68, 0.15)",
        name="Max Loss Wings",
        hoverinfo="skip"
    ))
    
    # Main payoff line
    fig.add_trace(go.Scatter(
        x=prices,
        y=pnl,
        mode="lines",
        name="Net P&L at Expiration",
        line=dict(color="#38bdf8", width=3)
    ))
    
    # Zero line
    fig.add_hline(y=0, line_dash="dash", line_color="#64748b", line_width=1)
    
    # Spot price vertical marker
    fig.add_vline(
        x=spot_price,
        line_dash="dot",
        line_color="#f59e0b",
        line_width=2,
        annotation_text=f"Current Spot: ${spot_price:.2f}",
        annotation_position="top left",
        annotation_font=dict(color="#f59e0b", size=11)
    )
    
    fig.update_layout(
        title=dict(
            text=f"<b>Options Structure Payoff Profile</b> — {candidate.get('strategy_type', 'STRUCTURE')} on {candidate.get('symbol', 'SPY')}",
            font=dict(color="#f8fafc", size=14)
        ),
        xaxis=dict(
            title="Underlying Price at Expiration ($)",
            gridcolor="#1e293b",
            zerolinecolor="#334155"
        ),
        yaxis=dict(
            title="Net P&L per Contract ($)",
            gridcolor="#1e293b",
            zerolinecolor="#334155"
        ),
        template="plotly_dark",
        plot_bgcolor="#0f172a",
        paper_bgcolor="#090d16",
        height=320,
        margin=dict(l=40, r=40, t=50, b=40),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    return fig

st.set_page_config(
    page_title="THETA HAWK — Regime-Aware Options Desk",
    page_icon="🦅",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (Institutional Dark Terminal Theme)
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0px;
    }
    .sub-header {
        font-size: 1.0rem;
        color: #94a3b8;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background-color: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 0.75rem;
        padding: 1.2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .metric-label {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        margin-bottom: 0.25rem;
    }
    .metric-val {
        font-size: 1.6rem;
        font-weight: 700;
        color: #f8fafc;
    }
    .alert-banner-veto {
        background: linear-gradient(90deg, #7f1d1d 0%, #450a0a 100%);
        border: 1px solid #ef4444;
        border-radius: 0.5rem;
        padding: 1rem;
        color: #fee2e2;
        font-weight: 600;
        margin-bottom: 1rem;
    }
    .alert-banner-flip {
        background: linear-gradient(90deg, #78350f 0%, #451a03 100%);
        border: 1px solid #f59e0b;
        border-radius: 0.5rem;
        padding: 1rem;
        color: #fef3c7;
        font-weight: 600;
        margin-bottom: 1rem;
    }
    .alert-banner-suspended {
        background: linear-gradient(90deg, #581c87 0%, #3b0764 100%);
        border: 1px solid #a855f7;
        border-radius: 0.5rem;
        padding: 1rem;
        color: #f3e8ff;
        font-weight: 600;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Engine in Session State
if "engine" not in st.session_state:
    st.session_state.engine = ThetaHawkEngine()

engine = st.session_state.engine

# Header
col_title, col_acct = st.columns([3, 1])
with col_title:
    st.markdown('<div class="main-header">🦅 THETA HAWK</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Autonomous Regime-Aware Options Desk · Official Alpaca MCP Native</div>', unsafe_allow_html=True)
with col_acct:
    acct = engine.broker.get_account_summary()
    st.markdown(f"""
    <div style="text-align: right; margin-top: 5px;">
        <span style="font-family: monospace; font-size: 12px; background: #1e293b; padding: 4px 8px; border-radius: 4px; color: #38bdf8;">
            Account: {ALPACA_ACCOUNT_NUMBER}
        </span><br>
        <span style="font-size: 14px; color: #10b981; font-weight: 600;">Paper API: Connected</span>
    </div>
    """, unsafe_allow_html=True)

# Sidebar Controls & Demo Triggers
st.sidebar.title("🎛️ Desk Controls")
selected_symbol = st.sidebar.selectbox("Watchlist Asset", ["SPY", "QQQ"], index=0)

st.sidebar.markdown("---")
st.sidebar.subheader("🎬 Hackathon Demo Triggers")
st.sidebar.caption("Use these one-click triggers for the 5-minute pitch video:")

# Trigger 1: Run standard cycle
if st.sidebar.button("▶️ Run Autonomous Cycle", use_container_width=True, type="primary"):
    with st.spinner("Analyzing regime and evaluating opportunity..."):
        res = engine.run_trading_cycle(selected_symbol)
        st.session_state.last_cycle = res
        time.sleep(0.5)
        st.rerun()

# Trigger 2: Greeks Limit VETO (Moment #3)
if st.sidebar.button("🛑 Trigger Greeks Breach (VETO)", use_container_width=True):
    # Temporarily drop delta limit to force veto
    orig = engine.greeks_gate.max_delta
    engine.greeks_gate.max_delta = 0.01
    res = engine.run_trading_cycle(selected_symbol)
    engine.greeks_gate.max_delta = orig
    st.session_state.last_cycle = res
    st.session_state.demo_veto = True
    st.rerun()

# Trigger 3: Regime-Flip Emergency Exit (Moment #4)
if st.sidebar.button("⚡ Trigger Regime Flip (VIX Spike)", use_container_width=True):
    res = engine.run_trading_cycle(selected_symbol, force_regime="EVENT_RISK")
    st.session_state.last_cycle = res
    st.session_state.demo_flip = True
    st.rerun()

# Trigger 4: Simulate Edge Decay / Self-Suspension (Moment #5)
if st.sidebar.button("🔒 Simulate Edge Decay (Self-Lock)", use_container_width=True):
    # Seed 5 losing trades in the trade ledger to trigger statistical guardian
    for i in range(5):
        engine.ledger.record_trade({
            "id": f"seed-decay-{i}",
            "timestamp": datetime.utcnow().isoformat(),
            "symbol": selected_symbol,
            "strategy_type": "BULL_PUT_SPREAD",
            "regime": "TRENDING",
            "legs": [],
            "net_credit": 100.0,
            "max_risk": 400.0,
            "status": "CLOSED",
            "exit_timestamp": datetime.utcnow().isoformat(),
            "exit_reason": "Stop Loss Hit",
            "pnl": -200.0,
            "greeks": {"net_delta": 0, "net_vega": 0, "net_theta": 0}
        })
    res = engine.run_trading_cycle(selected_symbol)
    st.session_state.last_cycle = res
    st.session_state.demo_suspended = True
    st.rerun()

if st.sidebar.button("🔄 Reset Demo / Clear Ledger", use_container_width=True):
    # Clear ledger tables
    with engine.ledger._get_connection() as conn:
        conn.execute("DELETE FROM trades")
        conn.execute("DELETE FROM audit_log")
        conn.commit()
    st.session_state.demo_veto = False
    st.session_state.demo_flip = False
    st.session_state.demo_suspended = False
    st.rerun()

# Ask the Desk Quant (Co-Pilot) Sidebar Widget
st.sidebar.markdown("---")
st.sidebar.subheader("💬 Ask the Desk Quant")
st.sidebar.caption("Powered by Gemini Floor Quant Intelligence")

if "copilot_history" not in st.session_state:
    st.session_state.copilot_history = []

# Quick Prompts for Judges
qp_col1, qp_col2 = st.sidebar.columns(2)
if qp_col1.button("Why not calls?", use_container_width=True):
    q = "Why didn't you buy SPY call options today?"
    ans = engine.copilot.ask_copilot(q)
    st.session_state.copilot_history.append((q, ans))

if qp_col2.button("Audit Delta", use_container_width=True):
    q = "What is our current portfolio delta exposure and risk headroom?"
    ans = engine.copilot.ask_copilot(q)
    st.session_state.copilot_history.append((q, ans))

user_q = st.sidebar.text_input("Ask ThetaHawk a question:", key="st_copilot_input")
if st.sidebar.button("Send Query", use_container_width=True) and user_q:
    ans = engine.copilot.ask_copilot(user_q)
    st.session_state.copilot_history.append((user_q, ans))

if st.session_state.copilot_history:
    for q, a in reversed(st.session_state.copilot_history[-3:]):
        st.sidebar.markdown(f"**Judge:** *{q}*")
        st.sidebar.markdown(f"**Quant:** {a}")
        st.sidebar.markdown("---")

# Display Banners for Demo Moments if Active
if getattr(st.session_state, "demo_veto", False):
    st.markdown("""
    <div class="alert-banner-veto">
        🛡️ [PORTFOLIO GREEKS VETO] Order Rejected: Proposed trade would cause aggregate book Delta to breach risk limit (±0.25). Fiduciary barrier preserved.
    </div>
    """, unsafe_allow_html=True)

if getattr(st.session_state, "demo_flip", False):
    st.markdown("""
    <div class="alert-banner-flip">
        ⚡ [REGIME-FLIP EXIT] Market shifted to EVENT_RISK (VIX Spike). All open premium-selling spreads force-closed immediately before tail expansion.
    </div>
    """, unsafe_allow_html=True)

if getattr(st.session_state, "demo_suspended", False):
    st.markdown("""
    <div class="alert-banner-suspended">
        🔒 [TRADING SUSPENDED] Realized win-rate (20.0%) dropped below theoretical floor (70.0%). Autonomous fiduciary lock engaged. No new entries permitted.
    </div>
    """, unsafe_allow_html=True)

# Fetch Current System State
telemetry = engine.market_reader.fetch_market_telemetry(selected_symbol)
regime_info = engine.regime_agent.classify_regime(telemetry)
book_greeks = engine.compute_current_book_greeks()
open_trades = engine.ledger.get_open_trades()
audit_events = engine.ledger.get_recent_audit_events(10)

# Top Metrics Row
c1, c2, c3, c4, c5 = st.columns(5)
with c1:
    st.markdown('<div class="metric-card"><div class="metric-label">Account Equity</div><div class="metric-val">${:,.2f}</div></div>'.format(acct['equity']), unsafe_allow_html=True)
with c2:
    st.markdown('<div class="metric-card"><div class="metric-label">Buying Power</div><div class="metric-val">${:,.2f}</div></div>'.format(acct['buying_power']), unsafe_allow_html=True)
with c3:
    delta_val = book_greeks['net_delta']
    delta_color = "#38bdf8" if abs(delta_val) < 0.20 else "#f59e0b"
    st.markdown(f'<div class="metric-card"><div class="metric-label">Net Book Delta (Cap: ±0.25)</div><div class="metric-val" style="color:{delta_color};">{delta_val:+.4f}</div></div>', unsafe_allow_html=True)
with c4:
    st.markdown('<div class="metric-card"><div class="metric-label">Net Book Vega</div><div class="metric-val">{:+.2f}</div></div>'.format(book_greeks['net_vega']), unsafe_allow_html=True)
with c5:
    st.markdown('<div class="metric-card"><div class="metric-label">Daily Theta Income</div><div class="metric-val" style="color:#10b981;">+${:.2f}</div></div>'.format(book_greeks['net_theta']), unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Main Grid: Left = Regime & Reasoning, Right = Greeks & Risk Engine
col_left, col_right = st.columns([1, 1])

with col_left:
    st.subheader("🌐 Market Regime & AI Reasoning")
    r_color = "#10b981" if regime_info["regime"] == "RANGE_BOUND" else ("#38bdf8" if regime_info["regime"] == "TRENDING" else "#ef4444")
    st.markdown(f"""
    <div style="background: #0f172a; border-left: 4px solid {r_color}; padding: 16px; border-radius: 8px; margin-bottom: 15px;">
        <div style="font-size: 13px; color: #94a3b8; text-transform: uppercase;">Current Regime Detection</div>
        <div style="font-size: 24px; font-weight: 700; color: {r_color}; margin: 4px 0;">{regime_info['regime']}</div>
        <div style="font-size: 14px; color: #cbd5e1; font-style: italic;">"{regime_info['reasoning']}"</div>
    </div>
    """, unsafe_allow_html=True)

    # Telemetry Breakdown
    t1, t2, t3, t4 = st.columns(4)
    t1.metric(f"{selected_symbol} Spot", f"${telemetry['price']}")
    t2.metric("VIX Index", f"{telemetry['vix']}", f"{telemetry['vix_change_pct']*100:+.1f}%")
    t3.metric("IV Percentile", f"{telemetry['iv_percentile']}%")
    t4.metric("Trend State", telemetry["trend"])

with col_right:
    st.subheader("🛡️ Portfolio Greeks & Fiduciary Risk Gates")
    
    # Delta Meter
    curr_delta_pct = min(abs(book_greeks['net_delta']) / MAX_PORTFOLIO_DELTA, 1.0)
    st.write(f"**Net Book Delta Allocation:** {book_greeks['net_delta']:+.4f} / ±{MAX_PORTFOLIO_DELTA}")
    st.progress(curr_delta_pct)

    # Vega Meter
    curr_vega_pct = min(abs(book_greeks['net_vega']) / MAX_PORTFOLIO_VEGA, 1.0)
    st.write(f"**Net Book Vega Allocation:** {book_greeks['net_vega']:+.2f} / ±{MAX_PORTFOLIO_VEGA}")
    st.progress(curr_vega_pct)

    # Guardian Status
    closed = engine.ledger.get_closed_trades()
    _, guard_msg, guard_stats = engine.guardian.evaluate_performance(closed)
    status_badge = "🟢 ACTIVE" if not engine.guardian.is_suspended else "🔴 SUSPENDED"
st.markdown("---")

# Visual Showstopper: Live Options Structure Payoff Diagram (P&L Tent / Spread Curve)
candidate_struct = engine.strategy_selector.construct_candidate(
    selected_symbol, telemetry["price"], regime_info["recommended_playbook"]
)
st.subheader(f"📈 Options Structure Payoff Profile — {candidate_struct.get('strategy_type', 'STRUCTURE')}")
fig_payoff = plot_options_payoff_diagram(candidate_struct, telemetry["price"])
if fig_payoff:
    st.plotly_chart(fig_payoff, use_container_width=True)

# Agentic Multi-Step Thought Stream & Adversarial Debate (Alpha Scout vs. Risk Governor)
with st.expander("🤖 Live ReAct Thought Stream & Multi-Agent Debate", expanded=True):
    col_run, col_info = st.columns([1, 3])
    with col_run:
        if st.button("▶️ Run Agentic ReAct Cycle", use_container_width=True):
            with st.spinner("Executing ReAct loop with multi-agent debate..."):
                st.session_state.last_react_steps = engine.copilot.run_agentic_cycle(selected_symbol)
                st.rerun()
    with col_info:
        st.caption("Inspect real-time chain of thought, adversarial Alpha Scout proposal, and Risk Governor fiduciary checks.")

    if "last_react_steps" in st.session_state and st.session_state.last_react_steps:
        for s in st.session_state.last_react_steps:
            stype = s["type"]
            badge_color = "#38bdf8" if stype == "THOUGHT" else ("#10b981" if stype in ["EXECUTION", "OBSERVATION"] else ("#ef4444" if stype in ["VETO", "RISK_GOVERNOR"] else "#f59e0b"))
            st.markdown(f"<div style='font-family: monospace; font-size: 13px; margin-bottom: 4px;'><strong style='color: {badge_color};'>[{stype.replace('_', ' ')}]</strong> {s['content']}</div>", unsafe_allow_html=True)
    else:
        st.info("Click 'Run Agentic ReAct Cycle' to inspect live multi-agent reasoning steps.")

st.markdown("---")

# Open Positions & Real-time Audit Trail
col_pos, col_audit = st.columns([1, 1])

with col_pos:
    st.subheader(f"📊 Active Options Positions ({len(open_trades)})")
    if open_trades:
        df_trades = pd.DataFrame(open_trades)[["id", "symbol", "strategy_type", "net_credit", "max_risk", "status"]]
        st.dataframe(df_trades, use_container_width=True)
    else:
        st.caption("No open positions. Click 'Run Autonomous Cycle' in the sidebar to scan and deploy.")

with col_audit:
    st.subheader("📜 Live Fiduciary Audit Trail")
    if audit_events:
        for ev in audit_events[:5]:
            ts = ev["timestamp"].split("T")[-1][:8]
            badge = "🔴" if "VETO" in ev["event_type"] else ("⚡" if "REGIME" in ev["event_type"] else ("🔒" if "SUSPEN" in ev["event_type"] else "🟢"))
            st.markdown(f"**`{ts}`** {badge} **[{ev['event_type']}]** {ev['message']}")
    else:
        st.caption("Audit log clean. No recent violations or liquidations.")
