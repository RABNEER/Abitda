"""
ABITDA: Autonomous Options Agent Test Harness & Institutional Trading Desk
Main CLI & Service Entrypoint for Alpaca AI Trading Agents Hackathon
"""

import sys
import os
import argparse
import subprocess
import time

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from core.engine import AbitdaEngine
from config.settings import ALPACA_ACCOUNT_NUMBER

console = Console(force_terminal=True, legacy_windows=False)

def print_banner():
    banner_text = f"""[bold cyan]
===================================================================
   ABITDA -- AUTONOMOUS OPTIONS AGENT HARNESS & TRADING DESK
   Institutional Agent Benchmark & Fiduciary Execution Engine
===================================================================
[/bold cyan]
[bold green]Engine: Regime-Adaptive Defined-Risk Credit Spreads & Stress Harness[/bold green]
[yellow]Paper Account: [bold]{ALPACA_ACCOUNT_NUMBER}[/bold] | Starting Balance: [bold]$100,000.00[/bold][/yellow]
"""
    console.print(Panel(banner_text, border_style="cyan"))

def run_once(symbol: str = "SPY"):
    engine = AbitdaEngine()
    console.print(f"[bold yellow]>> Executing 5-Step Trader Loop on {symbol}...[/bold yellow]")
    res = engine.run_trading_cycle(symbol)

    table = Table(title=f"Abitda Cycle Results ({symbol})", border_style="cyan")
    table.add_column("Step", style="bold white", width=25)
    table.add_column("Details", style="green")

    for line in res.get("cycle_log", []):
        parts = line.split(":", 1)
        step = parts[0] if len(parts) > 1 else "Log"
        desc = parts[1] if len(parts) > 1 else line
        table.add_row(step, desc.strip())

    console.print(table)
    console.print(f"[bold magenta]Final Cycle Status: {res.get('status')}[/bold magenta]\n")

def run_dashboard():
    console.print("[bold green]Launching Streamlit Desk Dashboard on http://localhost:8501...[/bold green]")
    subprocess.run(["streamlit", "run", "ui/dashboard.py"])

def run_benchmark(agent_type: str = "committee", scenario_id: str = "aug5_2024"):
    from harness.evaluator import HarnessEvaluator
    from harness.scenarios import ScenarioRegistry
    from harness.protocol import CommitteeAgentAdapter, VibeAgentAdapter, NaiveMomentumAgent, PassiveThetaFarmer

    agent_map = {
        "committee": CommitteeAgentAdapter,
        "vibe": VibeAgentAdapter,
        "naive_momentum": NaiveMomentumAgent,
        "passive_farmer": PassiveThetaFarmer
    }
    agent_cls = agent_map.get(agent_type.lower(), CommitteeAgentAdapter)
    agent = agent_cls()
    scenario = ScenarioRegistry.get_scenario(scenario_id)

    if not scenario:
        console.print(f"[bold red]Scenario '{scenario_id}' not found! Available: aug5_2024, svb_march_2023, volmageddon_2018, flash_crash_intraday, calm_bull_grind[/bold red]")
        return

    console.print(f"\n[bold cyan]>> RUNNING ABITDA HARNESS BENCHMARK: Agent '{agent.get_metadata().name}' vs '{scenario.name}'[/bold cyan]\n")

    evaluator = HarnessEvaluator()
    scorecard = evaluator.evaluate_agent(agent, scenario)
    evaluator.generate_scorecard_markdown(scorecard, output_path="HARNESS_SCORECARD.md")

    # Table 1: Timeline
    table = Table(title=f"Replay Timeline: {scenario.name}", border_style="cyan")
    table.add_column("Bar / Time", style="bold white", width=20)
    table.add_column("SPY / VIX", style="yellow", width=18)
    table.add_column("Decision", style="white", width=18)
    table.add_column("Greeks Gate", style="cyan", width=22)
    table.add_column("Bar P&L", style="green", width=14)
    table.add_column("Equity", style="bold white", width=14)

    for b in scorecard.bar_results:
        pnl_color = "green" if b.bar_pnl >= 0 else "red"
        gate_color = "bold green" if b.fiduciary_accepted else "bold red"
        gate_text = "PASSED" if b.fiduciary_accepted else "VETOED"
        table.add_row(
            b.bar_label,
            f"${b.spy_price:.2f} | {b.vix:.1f}",
            f"{b.agent_action} ({b.strategy_name})",
            f"[{gate_color}]{gate_text}[/{gate_color}]",
            f"[{pnl_color}]${b.bar_pnl:+,.2f}[/{pnl_color}]",
            f"${b.portfolio_equity:,.2f}"
        )

    console.print(table)

    # Table 2: Scorecard
    grade_color = "bold green" if scorecard.fiduciary_grade in ["A+", "A"] else "bold yellow" if scorecard.fiduciary_grade == "B" else "bold red"
    score_table = Table(title=f"Abitda Institutional Scorecard: [{grade_color}]GRADE {scorecard.fiduciary_grade}[/{grade_color}]", border_style="green")
    score_table.add_column("Benchmark Invariant", style="bold white")
    score_table.add_column("Score / Reading", style="cyan")
    score_table.add_column("Regulatory Status", style="bold white")

    score_table.add_row("Final Portfolio Equity", f"${scorecard.final_equity:,.2f}", "PASS" if scorecard.final_equity >= 90000 else "FAIL")
    score_table.add_row("Capital Preserved", f"{scorecard.capital_preserved_pct:.2f}%", "EXEMPLARY" if scorecard.capital_preserved_pct >= 95 else "COMPLIANT")
    score_table.add_row("Max Drawdown", f"{scorecard.max_drawdown_pct:.2f}%", "CIRCUIT SAFE" if scorecard.max_drawdown_pct <= 5.0 else "UNACCEPTABLE")
    score_table.add_row("Delta / Vega Invariant Breaches", f"{scorecard.delta_breach_count + scorecard.vega_breach_count}", "CLEAN (0)" if (scorecard.delta_breach_count + scorecard.vega_breach_count) == 0 else "BREACH")
    score_table.add_row("Catastrophic Risk Patterns", f"{scorecard.catastrophic_violation_count}", "ZERO TOLERANCE")
    score_table.add_row("Fiduciary Score", f"{scorecard.fiduciary_score:.1f} / 100", f"[{grade_color}]{scorecard.attestation_status}[/{grade_color}]")

    console.print(score_table)
    console.print(f"[bold cyan]Full Audit Dossier saved to disk: [bold white]HARNESS_SCORECARD.md[/bold white][/bold cyan]\n")

def run_stress_test():
    from data.stress_test import BlackSwanStressTest
    tester = BlackSwanStressTest()
    res = tester.run_replay()

    console.print(f"\n[bold red]>> HISTORICAL BLACK SWAN STRESS-TEST: {res['event_name'].upper()}[/bold red]")
    console.print(f"[dim]Starting Portfolio Equity: ${res['starting_equity']:,.2f}[/dim]\n")

    table = Table(title="Historical Timeline Comparison: Naive Bot vs. Abitda", border_style="red")
    table.add_column("Time & Market State", style="bold white", width=26)
    table.add_column("Naive Options Bot (No Regime Check)", style="red", width=38)
    table.add_column("Abitda Desk (Regime-Flip Guard)", style="cyan", width=38)

    for tick in res["timeline"]:
        market_state = f"{tick['label']}\nSPY: ${tick['spy_price']} | VIX: {tick['vix']}"
        naive_desc = f"{tick['naive_action']}\nP&L: [bold red]${tick['naive_pnl']:,.2f}[/bold red]"
        hawk_desc = f"{tick['thetahawk_action']}\nP&L: [bold green]${tick['thetahawk_pnl']:,.2f}[/bold green]"
        table.add_row(market_state, naive_desc, hawk_desc)

    console.print(table)

    comp = res["comparison"]
    score_table = Table(title="Final Black Swan Scorecard", border_style="green")
    score_table.add_column("Metric", style="bold white")
    score_table.add_column("Naive Bot", style="red")
    score_table.add_column("Abitda Desk", style="bold green")

    score_table.add_row("Final Equity", f"${comp['naive_bot']['final_equity']:,.2f}", f"${comp['abitda']['final_equity']:,.2f}")
    score_table.add_row("Total Loss", f"${comp['naive_bot']['total_loss']:,.2f}", f"${comp['abitda']['total_loss']:,.2f}")
    score_table.add_row("Account Drawdown", f"{comp['naive_bot']['drawdown_pct']:.1f}%", f"{comp['abitda']['drawdown_pct']:.2f}%")
    score_table.add_row("Capital Preserved", "56.2%", f"{comp['abitda']['capital_preserved_pct']:.2f}%")
    score_table.add_row("Outcome", comp['naive_bot']['outcome'], comp['abitda']['outcome'])

    console.print(score_table)
    console.print(f"\n[italic yellow]{res['institutional_summary']}[/italic yellow]\n")

def run_committee(symbol: str = "SPY"):
    engine = AbitdaEngine()
    from agents.committee import DeskCommittee
    committee = DeskCommittee(engine)
    console.print(f"\n[bold cyan]>> CONVENING 4-AGENT FLOOR COMMITTEE DEBATE ({symbol})[/bold cyan]\n")
    res = committee.deliberate(symbol)

    table = Table(title=f"Abitda Desk Committee Deliberation: {symbol}", border_style="cyan")
    table.add_column("Agent & Role", style="bold white", width=26)
    table.add_column("Vote", style="bold yellow", width=12)
    table.add_column("Stance / Deliberation", style="green")

    for d in res["debate"]:
        table.add_row(f"{d['agent']}\n({d['role']})", d["vote"], d["content"])

    console.print(table)
    status_color = "bold green" if res["is_approved"] else "bold red"
    console.print(f"[{status_color}]Consensus Resolution: {res['consensus']} | Allocated Contracts: {res['contracts']}[/{status_color}]\n")

def run_report(symbol: str = "SPY"):
    engine = AbitdaEngine()
    from reports.desk_briefing import DeskBriefingGenerator
    generator = DeskBriefingGenerator(engine)
    console.print(f"\n[bold green]>> Generating Institutional Options Desk Briefing for {symbol}...[/bold green]")
    path = generator.generate_briefing_markdown(symbol, output_path="DESK_BRIEFING.md")
    console.print(f"[bold cyan]Desk Briefing Artifact Successfully Generated: [bold white]DESK_BRIEFING.md[/bold white][/bold cyan]")
    console.print("[dim]Summary: Account Solvency, Macro Regime, Portfolio Greeks Barrier, Committee Debate, and Black Swan Replay exported.[/dim]\n")

def run_test_suite():
    import test_suite
    console.print("\n[bold green]>> Executing Abitda 9-Point Verification Suite...[/bold green]")
    test_suite.run_tests()

def main():
    parser = argparse.ArgumentParser(description="ABITDA: Autonomous Options Agent Test Harness & Trading Desk")
    parser.add_argument("--once", action="store_true", help="Run a single trading cycle")
    parser.add_argument("--test", action="store_true", help="Run the 9-point end-to-end verification suite")
    parser.add_argument("--dashboard", action="store_true", help="Launch the Streamlit web dashboard")
    parser.add_argument("--benchmark", action="store_true", help="Run Agent Stress-Test Benchmark on market shocks")
    parser.add_argument("--agent", type=str, default="committee", help="Agent candidate for benchmark (committee, vibe, naive_momentum, passive_farmer)")
    parser.add_argument("--scenario", type=str, default="aug5_2024", help="Scenario to replay (aug5_2024, svb_march_2023, volmageddon_2018, flash_crash_intraday, calm_bull_grind)")
    parser.add_argument("--replay", action="store_true", help="Run Black Swan Historical Stress-Test replay")
    parser.add_argument("--committee", action="store_true", help="Convene the 4-Agent Desk Committee Debate")
    parser.add_argument("--report", action="store_true", help="Generate institutional DESK_BRIEFING.md briefing artifact")
    parser.add_argument("--symbol", type=str, default="SPY", help="Underlying symbol (SPY or QQQ)")
    parser.add_argument("--loop", action="store_true", help="Run autonomous loop every 60 seconds")

    args = parser.parse_args()
    print_banner()

    if args.test:
        run_test_suite()
    elif args.benchmark:
        run_benchmark(args.agent, args.scenario)
    elif args.replay:
        run_stress_test()
    elif args.committee:
        run_committee(args.symbol)
    elif args.report:
        run_report(args.symbol)
    elif args.dashboard:
        run_dashboard()
    elif args.loop:
        console.print("[bold green]Starting autonomous periodic loop (every 60s). Press Ctrl+C to stop.[/bold green]")
        while True:
            run_once(args.symbol)
            time.sleep(60)
    else:
        run_once(args.symbol)

if __name__ == "__main__":
    main()
