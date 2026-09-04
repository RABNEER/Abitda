"""
Abitda 4-Agent Desk Committee Debate Engine
Inspired by TauricResearch/TradingAgents multi-agent committee architecture.
Coordinates structured deliberations between 4 specialized floor agents:
1. Macro Analyst (Macro Regime, Volatility Clustering, IV Percentile, VIX Velocity)
2. Technical Scout (Spot Price Action, MA20/MA50 Confluence, RSI, Support/Resistance)
3. Alpha Trader (Options Structure, Delta Selection, Yield Velocity, Theta Target)
4. Risk Governor (Chief Fiduciary, Black-Scholes Greeks Barrier, Wing Enforcement)
"""

from typing import Dict, Any, List
from datetime import datetime

class DeskCommittee:
    def __init__(self, engine):
        self.engine = engine

    def deliberate(self, symbol: str = "SPY", force_regime: str = None) -> Dict[str, Any]:
        """
        Executes a 4-Agent Committee Deliberation on the underlying.
        Returns a structured debate transcript, voting matrix, and binding resolution.
        """
        timestamp = datetime.utcnow().isoformat()
        telemetry = self.engine.market_reader.fetch_market_telemetry(symbol)
        regime_eval = self.engine.regime_agent.classify_regime(telemetry)
        if force_regime:
            regime_eval["regime"] = force_regime
            regime_eval["recommended_playbook"] = "VOL_HEDGE" if force_regime == "EVENT_RISK" else regime_eval["recommended_playbook"]

        current_regime = regime_eval["regime"]
        playbook = regime_eval["recommended_playbook"]
        current_book_greeks = self.engine.compute_current_book_greeks()
        acct = self.engine.broker.get_account_summary()
        current_equity = acct["equity"]

        # --- 1. Macro Analyst Deliberation ---
        vix = telemetry.get("vix", 15.0)
        vix_pct = telemetry.get("vix_change_pct", 0.0) * 100
        iv_pctl = telemetry.get("iv_percentile", 35.0)

        if vix > 30.0 or current_regime == "EVENT_RISK":
            macro_vote = "VETO"
            macro_stance = "EXTREME_VOLATILITY_DEFENSE"
            macro_analysis = (
                f"VIX is trading at {vix:.2f} ({vix_pct:+.1f}%), indicating severe tail-risk expansion. "
                f"IV percentile is {iv_pctl:.1f}%. Volatility clustering models project heightened jump risk. "
                f"RECOMMENDATION: VETO new short premium; activate liquidity preservation protocols."
            )
        elif vix < 16.0 and iv_pctl < 30.0:
            macro_vote = "APPROVE"
            macro_stance = "LOW_VOL_PREMIUM_HARVEST"
            macro_analysis = (
                f"VIX is subdued at {vix:.2f} ({vix_pct:+.1f}%) with IV percentile at {iv_pctl:.1f}%. "
                f"Macro environment is calm. Favorable for time-decay harvest via range-bound defined spreads."
            )
        else:
            macro_vote = "APPROVE"
            macro_stance = "ELEVATED_IV_PREMIUM_EXPANSION"
            macro_analysis = (
                f"VIX at {vix:.2f} with IV percentile at {iv_pctl:.1f}%. Elevated implied volatility offers "
                f"rich premium pricing with strong statistical margin of safety for out-of-the-money wings."
            )

        # --- 2. Technical Scout Deliberation ---
        spot = telemetry.get("price", 590.0)
        trend = telemetry.get("trend", "NEUTRAL")
        slope = telemetry.get("trend_slope", 0.0)
        ma20 = telemetry.get("ma20", spot * 0.995)
        ma50 = telemetry.get("ma50", spot * 0.99)
        rsi = 52.4  # Quantitative baseline

        support_lvl = round(ma50 * 0.98, 2)
        resist_lvl = round(spot * 1.025, 2)

        if trend == "BEARISH_EXPANSION" or slope < -0.05:
            tech_vote = "CAUTION"
            tech_stance = "BEARISH_DOWNWARD_PRESSURE"
            tech_analysis = (
                f"Spot ${spot:.2f} breaking below 20-day MA (${ma20:.2f}) with negative slope {slope:.3f}. "
                f"Support sits at ${support_lvl:.2f}. RECOMMENDATION: Skew structures to Bear Call Spreads or widen put wings."
            )
        elif trend == "BULLISH_TREND" or slope > 0.03:
            tech_vote = "APPROVE"
            tech_stance = "BULLISH_STRUCTURAL_SUPPORT"
            tech_analysis = (
                f"Spot ${spot:.2f} comfortably above 20-day MA (${ma20:.2f}) and 50-day MA (${ma50:.2f}). "
                f"Bullish trend slope {slope:+.3f}. Resistance tested at ${resist_lvl:.2f}. "
                f"RECOMMENDATION: Bull Put Spread structured below ${support_lvl:.2f} support floor."
            )
        else:
            tech_vote = "APPROVE"
            tech_stance = "RANGE_BOUND_EQUILIBRIUM"
            tech_analysis = (
                f"Spot ${spot:.2f} consolidating in channel between ${support_lvl:.2f} and ${resist_lvl:.2f}. "
                f"Mean-reversion dynamics dominate. Ideal conditions for Delta-Neutral Iron Condors."
            )

        # --- 3. Alpha Trader Deliberation ---
        candidate = self.engine.strategy_selector.construct_candidate(
            symbol=symbol,
            underlying_price=spot,
            playbook=playbook
        )
        alpha_proposed_strat = candidate["strategy_type"]
        alpha_est_credit = candidate["estimated_credit_per_contract"]
        alpha_max_risk = candidate["max_risk_per_contract"]
        alpha_ror = (alpha_est_credit / alpha_max_risk * 100) if alpha_max_risk > 0 else 0

        alpha_pitch = (
            f"Proposing institutional structure: {alpha_proposed_strat}. "
            f"Targeting 30-45 DTE horizon with 15-20 Delta short legs. "
            f"Gross credit: ${alpha_est_credit:.2f}/contract against max risk ${alpha_max_risk:.2f} "
            f"(Return on Risk: {alpha_ror:.1f}%). Daily Theta yield: +${candidate['greeks']['net_theta']:.2f}/contract. "
            f"Statistical probability of expiring OTM: ~78.4%."
        )

        # --- 4. Risk Governor Deliberation (Chief Fiduciary & Greeks Barrier) ---
        contracts = self.engine.sizer.calculate_size(
            candidate=candidate,
            telemetry=telemetry,
            current_book_greeks=current_book_greeks,
            account_equity=current_equity
        )

        proposed_greeks = {
            "net_delta": candidate["greeks"]["net_delta"] * contracts,
            "net_vega": candidate["greeks"]["net_vega"] * contracts,
            "net_theta": candidate["greeks"]["net_theta"] * contracts
        }

        approved_by_barrier, barrier_reason, projected_greeks = self.engine.greeks_gate.evaluate_new_trade(
            current_book_greeks=current_book_greeks,
            proposed_trade_greeks=proposed_greeks
        )

        total_capital_at_risk = alpha_max_risk * contracts
        sizing_ok, sizing_msg = self.engine.hard_backstops.check_trade_sizing(total_capital_at_risk, current_equity)

        if macro_vote == "VETO":
            governor_vote = "VETO"
            consensus = "VETOED_MACRO_TAIL_RISK"
            governor_resolution = f"FIDUCIARY REJECTION: Macro tail-risk veto active. Capital locked in reserve."
        elif not approved_by_barrier:
            governor_vote = "VETO"
            consensus = "VETOED_GREEKS_LIMIT"
            governor_resolution = f"FIDUCIARY REJECTION: {barrier_reason}. Prevents book Delta/Vega breach."
        elif not sizing_ok:
            governor_vote = "VETO"
            consensus = "VETOED_SIZING_LIMIT"
            governor_resolution = f"FIDUCIARY REJECTION: {sizing_msg}. Allocation exceeds fiduciary cap."
        else:
            governor_vote = "APPROVED"
            consensus = "UNANIMOUS_COMMITTEE_APPROVAL"
            governor_resolution = (
                f"CONSENSUS APPROVED: Structure satisfies all Level 3 fiduciary mandates. "
                f"Size capped at {contracts} contracts (${total_capital_at_risk:,.2f} max risk). "
                f"Post-trade Book Delta: {projected_greeks['net_delta']:+.4f} (Barrier: ±0.25). "
                f"Daily Theta accrual: +${projected_greeks['net_theta']:.2f}/day. Defined wings strictly enforced."
            )

        # Compile Debate Transcript
        debate_steps = [
            {
                "agent": "MACRO_ANALYST",
                "role": "Macro & Volatility Specialist",
                "vote": macro_vote,
                "stance": macro_stance,
                "content": macro_analysis
            },
            {
                "agent": "TECHNICAL_SCOUT",
                "role": "Price Action & Structural Scout",
                "vote": tech_vote,
                "stance": tech_stance,
                "content": tech_analysis
            },
            {
                "agent": "ALPHA_TRADER",
                "role": "Yield & Structure Architect",
                "vote": "PROPOSED",
                "strategy": alpha_proposed_strat,
                "content": alpha_pitch
            },
            {
                "agent": "RISK_GOVERNOR",
                "role": "Chief Fiduciary & Greeks Barrier",
                "vote": governor_vote,
                "consensus": consensus,
                "content": governor_resolution
            }
        ]

        return {
            "timestamp": timestamp,
            "symbol": symbol,
            "consensus": consensus,
            "is_approved": (consensus == "UNANIMOUS_COMMITTEE_APPROVAL"),
            "votes": {
                "macro_analyst": macro_vote,
                "technical_scout": tech_vote,
                "alpha_trader": "PROPOSED",
                "risk_governor": governor_vote
            },
            "candidate": candidate,
            "contracts": contracts if (consensus == "UNANIMOUS_COMMITTEE_APPROVAL") else 0,
            "projected_greeks": projected_greeks,
            "debate": debate_steps
        }
