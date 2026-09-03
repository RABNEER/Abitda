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

def main():
    parser = argparse.ArgumentParser(description="THETA HAWK: Regime-Aware Options Desk")
    parser.add_argument("--once", action="store_true", help="Run a single trading cycle")
    parser.add_argument("--dashboard", action="store_true", help="Launch the Streamlit web dashboard")
    parser.add_argument("--symbol", type=str, default="SPY", help="Underlying symbol (SPY or QQQ)")
    parser.add_argument("--loop", action="store_true", help="Run autonomous loop every 60 seconds")

    args = parser.parse_args()
    print_banner()

    if args.dashboard:
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
