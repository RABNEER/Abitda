import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the repository
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

def get_secret(key: str, default: str = "") -> str:
    val = os.getenv(key)
    if val:
        return val
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            return str(st.secrets[key])
    except Exception:
        pass
    return default

# Alpaca Credentials
ALPACA_API_KEY = get_secret("ALPACA_API_KEY", "")
ALPACA_SECRET_KEY = get_secret("ALPACA_SECRET_KEY", "")
ALPACA_PAPER = get_secret("ALPACA_PAPER", "true").lower() == "true"
ALPACA_BASE_URL = get_secret("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")
ALPACA_ACCOUNT_ID = get_secret("ALPACA_ACCOUNT_ID", "")
ALPACA_ACCOUNT_NUMBER = get_secret("ALPACA_ACCOUNT_NUMBER", "")

# LLM Provider Key
GEMINI_API_KEY = get_secret("GEMINI_API_KEY", "")

# Trading Configuration
DEFAULT_SYMBOLS = ["SPY", "QQQ"]
DATABASE_PATH = BASE_DIR / "abitda.sqlite3"
if not DATABASE_PATH.exists() and (BASE_DIR / "thetatrap.sqlite3").exists():
    DATABASE_PATH = BASE_DIR / "thetatrap.sqlite3"
LIVE_BROKER_EXECUTION = get_secret("LIVE_BROKER_EXECUTION", "false").lower() == "true"

# Portfolio Risk Caps
MAX_PORTFOLIO_DELTA = 0.25      # Max absolute aggregate book Delta
MAX_PORTFOLIO_VEGA = 150.0       # Max aggregate book Vega exposure ($ per 1% vol move)
MAX_CAPITAL_PER_TRADE_PCT = 0.05 # 5% of account equity max per trade
DAILY_DRAWDOWN_LIMIT_PCT = 0.03  # 3% daily account loss circuit breaker
STOP_LOSS_PCT = 0.50             # 50% max loss on spread premium collected
TAKE_PROFIT_PCT = 0.50           # 50% profit target of max credit
