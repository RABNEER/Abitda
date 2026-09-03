import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the repository
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
load_dotenv(BASE_DIR / ".env")

# Alpaca Credentials
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY", "")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY", "")
ALPACA_PAPER = os.getenv("ALPACA_PAPER", "true").lower() == "true"
ALPACA_BASE_URL = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")
ALPACA_ACCOUNT_ID = os.getenv("ALPACA_ACCOUNT_ID", "")
ALPACA_ACCOUNT_NUMBER = os.getenv("ALPACA_ACCOUNT_NUMBER", "")

# LLM Provider Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Trading Configuration
DEFAULT_SYMBOLS = ["SPY", "QQQ"]
DATABASE_PATH = BASE_DIR / "thetatrap.sqlite3"

# Portfolio Risk Caps
MAX_PORTFOLIO_DELTA = 0.25      # Max absolute aggregate book Delta
MAX_PORTFOLIO_VEGA = 150.0       # Max aggregate book Vega exposure ($ per 1% vol move)
MAX_CAPITAL_PER_TRADE_PCT = 0.05 # 5% of account equity max per trade
DAILY_DRAWDOWN_LIMIT_PCT = 0.03  # 3% daily account loss circuit breaker
STOP_LOSS_PCT = 0.50             # 50% max loss on spread premium collected
TAKE_PROFIT_PCT = 0.50           # 50% profit target of max credit
