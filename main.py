"""
THETA HAWK: The Regime-Aware Options Desk
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

from core.engine import ThetaHawkEngine
from config.settings import ALPACA_ACCOUNT_NUMBER

console = Console(force_terminal=True, legacy_windows=False)

def print_banner():
    banner_text = f"""[bold cyan]
===================================================================
   THETA HAWK -- REGIME-AWARE OPTIONS DESK AGENT
   Autonomous Options Alpha Desk with Fiduciary Greeks Risk Gating
===================================================================
[/bold cyan]
[bold green]Strategy: Regime-Adaptive Defined-Risk Credit Spreads & Condors[/bold green]
[yellow]Paper Account: [bold]{ALPACA_ACCOUNT_NUMBER}[/bold] | Starting Balance: [bold]$100,000.00[/bold][/yellow]
"""
    console.print(Panel(banner_text, border_style="cyan"))

def run_once(symbol: str = "SPY"):
    engine = ThetaHawkEngine()
    console.print(f"[bold yellow]>> Executing 5-Step Trader Loop on {symbol}...[/bold yellow]")
    res = engine.run_trading_cycle(symbol)

    table = Table(title=f"Cycle Results ({symbol})", border_style="cyan")
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

def run_stress_test():
    from data.stress_test import BlackSwanStressTest
    tester = BlackSwanStressTest()
    res = tester.run_replay()

    console.print(f"\n[bold red]>> HISTORICAL BLACK SWAN STRESS-TEST: {res['event_name'].upper()}[/bold red]")
    console.print(f"[dim]Starting Portfolio Equity: ${res['starting_equity']:,.2f}[/dim]\n")

    table = Table(title="Historical Timeline Comparison: Naive Bot vs. ThetaHawk", border_style="red")
    table.add_column("Time & Market State", style="bold white", width=26)
    table.add_column("Naive Options Bot (No Regime Check)", style="red", width=38)
    table.add_column("ThetaHawk (Regime-Flip Guard)", style="cyan", width=38)

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
    score_table.add_column("ThetaHawk Desk", style="bold green")

    score_table.add_row("Final Equity", f"${comp['naive_bot']['final_equity']:,.2f}", f"${comp['thetahawk']['final_equity']:,.2f}")
    score_table.add_row("Total Loss", f"${comp['naive_bot']['total_loss']:,.2f}", f"${comp['thetahawk']['total_loss']:,.2f}")
    score_table.add_row("Account Drawdown", f"{comp['naive_bot']['drawdown_pct']:.1f}%", f"{comp['thetahawk']['drawdown_pct']:.2f}%")
    score_table.add_row("Capital Preserved", "56.2%", f"{comp['thetahawk']['capital_preserved_pct']:.2f}%")
    score_table.add_row("Outcome", comp['naive_bot']['outcome'], comp['thetahawk']['outcome'])

    console.print(score_table)
    console.print(f"\n[italic yellow]{res['institutional_summary']}[/italic yellow]\n")

def main():
    parser = argparse.ArgumentParser(description="THETA HAWK: Regime-Aware Options Desk")
    parser.add_argument("--once", action="store_true", help="Run a single trading cycle")
    parser.add_argument("--dashboard", action="store_true", help="Launch the Streamlit web dashboard")
    parser.add_argument("--replay", action="store_true", help="Run Black Swan Historical Stress-Test replay")
    parser.add_argument("--symbol", type=str, default="SPY", help="Underlying symbol (SPY or QQQ)")
    parser.add_argument("--loop", action="store_true", help="Run autonomous loop every 60 seconds")

    args = parser.parse_args()
    print_banner()

    if args.replay:
        run_stress_test()
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
