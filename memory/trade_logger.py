"""
Trade Ledger & Memory Store (SQLite3)
Persists trades, rejections, portfolio snapshots, and audit trail.
Powers the self-awareness layer and real-time dashboard.
"""

import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from config.settings import DATABASE_PATH

class TradeLedger:
    def __init__(self, db_path: str = str(DATABASE_PATH)):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Table 1: Trades
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trades (
                    id TEXT PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    symbol TEXT NOT NULL,
                    strategy_type TEXT NOT NULL,
                    regime TEXT NOT NULL,
                    legs_json TEXT NOT NULL,
                    net_credit REAL NOT NULL,
                    max_risk REAL NOT NULL,
                    status TEXT NOT NULL, -- OPEN, CLOSED, EXPIRED, LIQUIDATED
                    exit_timestamp TEXT,
                    exit_reason TEXT,
                    pnl REAL DEFAULT 0.0,
                    pnl_pct REAL DEFAULT 0.0,
                    greeks_json TEXT NOT NULL
                )
            """)

            # Table 2: Audit & Rejections Log
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL, -- TRADE_PROPOSED, RISK_VETO, REGIME_FLIP, SELF_SUSPENSION, ORDER_FILLED
                    symbol TEXT,
                    message TEXT NOT NULL,
                    details_json TEXT
                )
            """)

            # Table 3: Portfolio Snapshots
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    equity REAL NOT NULL,
                    cash REAL NOT NULL,
                    net_delta REAL NOT NULL,
                    net_vega REAL NOT NULL,
                    net_theta REAL NOT NULL,
                    open_positions_count INTEGER NOT NULL,
                    regime TEXT NOT NULL
                )
            """)
            conn.commit()

    def record_trade(self, trade_data: Dict[str, Any]) -> str:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO trades (
                    id, timestamp, symbol, strategy_type, regime,
                    legs_json, net_credit, max_risk, status,
                    exit_timestamp, exit_reason, pnl, pnl_pct, greeks_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                trade_data["id"],
                trade_data.get("timestamp", datetime.utcnow().isoformat()),
                trade_data["symbol"],
                trade_data["strategy_type"],
                trade_data.get("regime", "UNKNOWN"),
                json.dumps(trade_data.get("legs", [])),
                trade_data.get("net_credit", 0.0),
                trade_data.get("max_risk", 0.0),
                trade_data.get("status", "OPEN"),
                trade_data.get("exit_timestamp"),
                trade_data.get("exit_reason"),
                trade_data.get("pnl", 0.0),
                trade_data.get("pnl_pct", 0.0),
                json.dumps(trade_data.get("greeks", {}))
            ))
            conn.commit()
            return trade_data["id"]

    def close_trade(self, trade_id: str, exit_reason: str, pnl: float) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                UPDATE trades
                SET status = 'CLOSED', exit_timestamp = ?, exit_reason = ?, pnl = ?
                WHERE id = ?
            """, (now, exit_reason, pnl, trade_id))
            conn.commit()
            return cursor.rowcount > 0

    def log_event(self, event_type: str, message: str, symbol: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO audit_log (timestamp, event_type, symbol, message, details_json)
                VALUES (?, ?, ?, ?, ?)
            """, (
                datetime.utcnow().isoformat(),
                event_type,
                symbol,
                message,
                json.dumps(details or {})
            ))
            conn.commit()

    def get_closed_trades(self, limit: int = 50) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trades WHERE status = 'CLOSED' ORDER BY exit_timestamp DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_open_trades(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trades WHERE status = 'OPEN' ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def get_recent_audit_events(self, limit: int = 25) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
