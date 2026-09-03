import { useState, useEffect } from 'react';

interface AccountStatus {
  account_number: string;
  equity: number;
  cash: number;
  buying_power: number;
  options_level: number;
  broker_status: string;
  book_greeks: {
    net_delta: number;
    net_vega: number;
    net_theta: number;
    open_count: number;
  };
  limits: {
    max_delta: number;
    max_vega: number;
  };
  guardian: {
    is_suspended: boolean;
    message: string;
    stats: any;
  };
}

interface TelemetryData {
  telemetry: {
    symbol: string;
    price: number;
    vix: number;
    vix_change_pct: number;
    iv_percentile: number;
    trend: string;
    trend_slope: number;
    ma20: number;
    ma50: number;
  };
  regime: {
    regime: string;
    recommended_playbook: string;
    reasoning: string;
  };
}

interface Trade {
  id: string;
  timestamp: string;
  symbol: string;
  strategy_type: string;
  regime: string;
  net_credit: number;
  max_risk: number;
  status: string;
  exit_reason?: string;
  pnl?: number;
}

interface AuditEvent {
  id: number;
  timestamp: string;
  event_type: string;
  symbol: string;
  message: string;
}

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [symbol, setSymbol] = useState<'SPY' | 'QQQ'>('SPY');
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [demoBanner, setDemoBanner] = useState<{ type: string; message: string } | null>(null);

  // Poll state every 3 seconds
  const fetchAll = async () => {
    try {
      const [sRes, tRes, trRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/api/status`),
        fetch(`${API_BASE}/api/telemetry?symbol=${symbol}`),
        fetch(`${API_BASE}/api/trades`),
        fetch(`${API_BASE}/api/audit?limit=10`)
      ]);

      if (sRes.ok) setStatus(await sRes.json());
      if (tRes.ok) setTelemetry(await tRes.json());
      if (trRes.ok) {
        const d = await trRes.json();
        setOpenTrades(d.open_trades || []);
        setClosedTrades(d.closed_trades || []);
      }
      if (aRes.ok) {
        const d = await aRes.json();
        setAuditEvents(d.events || []);
      }
    } catch (e) {
      console.warn("API poll offline or waiting for backend:", e);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [symbol]);

  // Actions
  const runCycle = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol })
      });
      const data = await res.json();
      if (data.status === "EXECUTED") {
        setDemoBanner({ type: 'success', message: `ORDER EXECUTED: ${data.trade?.strategy_type} on ${symbol} filled on Alpaca MCP.` });
      }
      fetchAll();
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerVeto = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo/veto?symbol=${symbol}`, { method: "POST" });
      const data = await res.json();
      setDemoBanner({
        type: 'veto',
        message: data.reason || `[PORTFOLIO GREEKS VETO] Trade blocked: Aggregate Delta would breach book limit (±0.25).`
      });
      fetchAll();
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerFlip = async () => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/api/demo/regime-flip?symbol=${symbol}`, { method: "POST" });
      setDemoBanner({
        type: 'flip',
        message: `[REGIME-FLIP LIQUIDATION] VIX spike detected (EVENT_RISK). Open spreads force-closed immediately before volatility expansion.`
      });
      fetchAll();
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerSuspend = async () => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/api/demo/suspend?symbol=${symbol}`, { method: "POST" });
      setDemoBanner({
        type: 'suspend',
        message: `[TRADING SUSPENDED] Trailing win-rate (20.0%) fell below expected edge (70.0%). Autonomous fiduciary lock engaged.`
      });
      fetchAll();
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerReset = async () => {
    await fetch(`${API_BASE}/api/demo/reset`, { method: "POST" });
    setDemoBanner(null);
    fetchAll();
  };

  const delta = status?.book_greeks.net_delta ?? 0.0;
  const maxDelta = status?.limits.max_delta ?? 0.25;
  const deltaPct = Math.min(Math.abs(delta) / maxDelta, 1.0) * 100;

  const currentRegime = telemetry?.regime.regime ?? "RANGE_BOUND";
  const regimeColor = currentRegime === "RANGE_BOUND" ? "var(--emerald)" : currentRegime === "TRENDING" ? "var(--cyan)" : "var(--crimson)";

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* Top Navigation Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2.2rem' }}>🦅</div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              THETA HAWK
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Regime-Aware Options Desk · Official Alpaca MCP Native
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span className="mono" style={{ fontSize: '0.75rem', background: 'rgba(30, 41, 59, 0.8)', padding: '4px 8px', borderRadius: '4px', color: 'var(--cyan)' }}>
              Paper Acct: {status?.account_number || "PA382FDPI5IO"}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <span className="pulse-dot" style={{ backgroundColor: 'var(--emerald)' }}></span>
              <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', fontWeight: 600 }}>Alpaca MCP Connected (Tier 3)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setSymbol('SPY')}
              className={`btn ${symbol === 'SPY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              SPY
            </button>
            <button 
              onClick={() => setSymbol('QQQ')}
              className={`btn ${symbol === 'QQQ' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              QQQ
            </button>
          </div>
        </div>
      </header>

      {/* Demo Action Banner */}
      {demoBanner && (
        <div className="slide-down" style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 600,
          background: demoBanner.type === 'veto' ? 'linear-gradient(90deg, #7f1d1d, #450a0a)' :
                      demoBanner.type === 'flip' ? 'linear-gradient(90deg, #78350f, #451a03)' :
                      demoBanner.type === 'suspend' ? 'linear-gradient(90deg, #581c87, #3b0764)' :
                      'linear-gradient(90deg, #064e3b, #022c22)',
          border: `1px solid ${demoBanner.type === 'veto' ? 'var(--crimson)' : demoBanner.type === 'flip' ? 'var(--amber)' : demoBanner.type === 'suspend' ? 'var(--violet)' : 'var(--emerald)'}`
        }}>
          <div>{demoBanner.message}</div>
          <button onClick={() => setDemoBanner(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Portfolio Equity</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            ${status ? status.equity.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "100,000.00"}
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Buying Power</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            ${status ? status.buying_power.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "400,000.00"}
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Net Book Delta (±{maxDelta})</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: Math.abs(delta) > 0.20 ? 'var(--amber)' : 'var(--cyan)' }}>
            {delta > 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4)}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${deltaPct}%`, height: '100%', background: Math.abs(delta) > 0.20 ? 'var(--amber)' : 'var(--cyan)', transition: 'width 0.3s' }}></div>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Net Book Vega</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            {status?.book_greeks.net_vega ? (status.book_greeks.net_vega > 0 ? `+${status.book_greeks.net_vega.toFixed(2)}` : status.book_greeks.net_vega.toFixed(2)) : "0.00"}
          </div>
        </div>

        <div className="glass-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Daily Theta Generation</div>
          <div className="mono" style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--emerald)' }}>
            +${status?.book_greeks.net_theta ? status.book_greeks.net_theta.toFixed(2) : "0.00"}/day
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Regime & Strategy, Right = Greeks & Book */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Left: Regime Radar & AI Reasoning */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🌐 Market Regime & Reasoning Engine
            </h2>
            <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, color: regimeColor, border: `1px solid ${regimeColor}`, background: 'rgba(0,0,0,0.3)' }}>
              {currentRegime}
            </span>
          </div>

          <div style={{ background: 'rgba(10, 15, 28, 0.8)', borderLeft: `4px solid ${regimeColor}`, padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Gemini Senior Floor Reasoning
            </div>
            <div style={{ fontSize: '0.95rem', color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.5 }}>
              "{telemetry?.regime.reasoning || "Analyzing real-time market microstructure and volatility clustering..."}"
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{symbol} Spot</div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                ${telemetry?.telemetry.price.toFixed(2) || "550.00"}
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>VIX Index</div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: (telemetry?.telemetry.vix || 16) > 20 ? 'var(--amber)' : 'var(--text-primary)' }}>
                {telemetry?.telemetry.vix.toFixed(2) || "15.50"}
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>IV Percentile</div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {telemetry?.telemetry.iv_percentile.toFixed(1) || "22.5"}%
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trend Slope</div>
              <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cyan)' }}>
                {telemetry?.telemetry.trend || "UPTREND"}
              </div>
            </div>
          </div>

          {/* Payoff Curve Visualization */}
          <div style={{ background: 'rgba(8, 12, 22, 0.9)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Structure Payoff: {telemetry?.regime.recommended_playbook || "IRON_CONDOR"}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--emerald)' }}>Positive Theta Domain</span>
            </div>

            <svg viewBox="0 0 500 120" style={{ width: '100%', height: '100px' }}>
              {/* Zero line */}
              <line x1="20" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
              {/* Payoff plateau */}
              <path d="M 40 100 L 140 30 L 360 30 L 460 100" fill="none" stroke="var(--cyan)" strokeWidth="3" />
              {/* Fill area */}
              <polygon points="40,100 140,30 360,30 460,100 460,70 40,70" fill="rgba(56, 189, 248, 0.12)" />
              {/* Current Price Marker */}
              <circle cx="250" cy="30" r="5" fill="#ffffff" />
              <text x="250" y="20" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="sans-serif">Spot ${telemetry?.telemetry.price.toFixed(0) || "550"}</text>
              <text x="140" y="85" textAnchor="middle" fill="var(--text-muted)" fontSize="9">Short Put</text>
              <text x="360" y="85" textAnchor="middle" fill="var(--text-muted)" fontSize="9">Short Call</text>
            </svg>
          </div>

        </div>

        {/* Right: Active Book & Fiduciary Risk Gates */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              🛡️ Active Book & Fiduciary Gates
            </h2>
            <span style={{ fontSize: '0.75rem', color: status?.guardian.is_suspended ? 'var(--crimson)' : 'var(--emerald)', fontWeight: 600 }}>
              {status?.guardian.is_suspended ? "🔴 FIDUCIARY LOCK" : "🟢 ACTIVE"}
            </span>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Self-Awareness Guardian Status</div>
            <div style={{ fontSize: '0.85rem', color: status?.guardian.is_suspended ? '#fca5a5' : '#86efac' }}>
              {status?.guardian.message || "Auditing trailing win-rate against expected mathematical edge..."}
            </div>
          </div>

          {/* Open Positions List */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Active Options Positions ({openTrades.length})
            </div>
            {openTrades.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                {openTrades.map((t) => (
                  <div key={t.id} style={{ background: 'rgba(10, 15, 28, 0.9)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{t.symbol}</span> · <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.strategy_type}</span>
                    </div>
                    <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--emerald)' }}>
                      +${t.net_credit.toFixed(2)} credit
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                No active spreads open. Click "Run Autonomous Cycle" below to scan.
              </div>
            )}
          </div>

          {/* Closed Trades History Counter */}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Closed Audit Trades Recorded: <span className="mono" style={{ color: 'var(--text-primary)' }}>{closedTrades.length}</span>
          </div>

          {/* Live Chronological Audit Log */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Chronological Fiduciary Audit Trail
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
              {auditEvents.slice(0, 5).map((ev) => (
                <div key={ev.id} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(15, 23, 42, 0.7)', borderLeft: `3px solid ${ev.event_type.includes('VETO') ? 'var(--crimson)' : ev.event_type.includes('FLIP') ? 'var(--amber)' : ev.event_type.includes('SUSPEN') ? 'var(--violet)' : 'var(--cyan)'}` }}>
                  <span className="mono" style={{ color: 'var(--text-muted)' }}>{ev.timestamp.split('T')[1]?.slice(0, 8)}</span> <strong style={{ color: '#fff' }}>[{ev.event_type}]</strong> {ev.message}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* Floating Demo Control Dock */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(13, 20, 36, 0.95)', border: '1px solid var(--border-glow)' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>🎬 5-Minute Pitch Video Controls</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>One-click triggers for all hackathon demo moments</div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            disabled={isProcessing} 
            onClick={runCycle} 
            className="btn btn-primary">
            ▶️ Run Autonomous Cycle
          </button>
          <button 
            disabled={isProcessing} 
            onClick={triggerVeto} 
            className="btn btn-danger">
            🛑 Trigger Greeks VETO (Moment #3)
          </button>
          <button 
            disabled={isProcessing} 
            onClick={triggerFlip} 
            className="btn btn-warning">
            ⚡ Trigger Regime Flip (Moment #4)
          </button>
          <button 
            disabled={isProcessing} 
            onClick={triggerSuspend} 
            className="btn btn-violet">
            🔒 Simulate Self-Lock (Moment #5)
          </button>
          <button 
            disabled={isProcessing} 
            onClick={triggerReset} 
            className="btn btn-secondary">
            🔄 Reset Demo
          </button>
        </div>
      </div>

    </div>
  );
}
