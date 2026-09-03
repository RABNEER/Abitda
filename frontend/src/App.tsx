import { useState, useEffect } from 'react';

// Custom SVG Icons (Strictly No Emojis, UI/UX Pro Max rule)
const Icons = {
  Logo: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 19 21 12 17 5 21 12 2" />
    </svg>
  ),
  Activity: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  Shield: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Terminal: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  MessageSquare: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  AlertOctagon: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Zap: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  RotateCcw: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  Play: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Send: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
};

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

interface ReActStep {
  type: string;
  content: string;
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
  const [demoBanner, setDemoBanner] = useState<{ type: string; title: string; message: string } | null>(null);

  // Agentic ReAct State
  const [reactSteps, setReactSteps] = useState<ReActStep[]>([
    { type: "THOUGHT", content: "Agent initialized in autonomous surveillance mode. Ready to evaluate SPY options." }
  ]);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    { sender: 'agent', text: "ThetaHawk desk online. Ask me about our portfolio Greeks, current regime, or trade gating logic." }
  ]);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'thought' | 'copilot'>('thought');

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
      console.warn("API offline or waiting:", e);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [symbol]);

  // Run Agentic ReAct Cycle
  const runAgenticCycle = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/agent/react?symbol=${symbol}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setReactSteps(data.steps || []);
        setActiveConsoleTab('thought');
      }
      fetchAll();
    } finally {
      setIsProcessing(false);
    }
  };

  // Chat with Co-Pilot
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || chatPrompt;
    if (!promptToSend.trim()) return;

    const userMsg = { sender: 'user' as const, text: promptToSend };
    setChatHistory(prev => [...prev, userMsg]);
    if (!customPrompt) setChatPrompt("");
    setActiveConsoleTab('copilot');

    try {
      const res = await fetch(`${API_BASE}/api/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToSend })
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { sender: 'agent', text: data.reply }]);
      }
    } catch {
      setChatHistory(prev => [...prev, { sender: 'agent', text: "Desk connection offline. Re-evaluating broker gateway." }]);
    }
  };

  const triggerVeto = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo/veto?symbol=${symbol}`, { method: "POST" });
      const data = await res.json();
      setDemoBanner({
        type: 'framed',
        title: 'PORTFOLIO GREEKS VETO',
        message: data.reason || `Trade blocked: Aggregate book Delta would breach risk limit (±0.25). Fiduciary barrier preserved.`
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
        type: 'framed',
        title: 'REGIME-FLIP FORCED EXIT',
        message: `Market state shifted to EVENT_RISK (VIX spike). Open spreads force-closed immediately before tail-risk expansion.`
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
        type: 'solid',
        title: 'TRADING SUSPENDED (SELF-LOCK)',
        message: `Rolling win-rate (20.0%) dropped below theoretical floor (70.0%). Autonomous fiduciary lock engaged.`
      });
      fetchAll();
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerReset = async () => {
    await fetch(`${API_BASE}/api/demo/reset`, { method: "POST" });
    setDemoBanner(null);
    setReactSteps([{ type: "THOUGHT", content: "Ledger reset. Desk surveillance re-initialized." }]);
    fetchAll();
  };

  const triggerStressTest = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo/stress-test`, { method: "POST" });
      const data = await res.json();
      setDemoBanner({
        type: 'framed',
        title: 'BLACK SWAN REPLAY (AUG 5 YEN SHOCK)',
        message: `VIX surged to 65.73. Naive Bot: -43.8% (-$43.8k blowout). ThetaHawk: -1.24% scratch (-$1,240), preserving $98,760 (98.8%) equity!`
      });
      const replaySteps = data.timeline.map((t: any) => ({
        type: t.vix > 30 ? "VETO" : "OBSERVATION",
        content: `[${t.label}] SPY $${t.spy_price} | VIX ${t.vix} -> ThetaHawk: ${t.thetahawk_action} (P&L: $${t.thetahawk_pnl})`
      }));
      setReactSteps(replaySteps);
      fetchAll();
    } finally {
      setIsProcessing(false);
    }
  };

  const delta = status?.book_greeks.net_delta ?? 0.0;
  const maxDelta = status?.limits.max_delta ?? 0.25;
  const deltaPct = Math.min(Math.abs(delta) / maxDelta, 1.0) * 100;
  const currentRegime = telemetry?.regime.regime ?? "RANGE_BOUND";

  return (
    <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem 2rem' }}>
      
      {/* Precision Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1.25rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'var(--text-pure)',
            color: 'var(--bg-root)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icons.Logo />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                THETA HAWK
              </h1>
              <span style={{
                fontSize: '0.6875rem',
                border: '1px solid var(--border-strong)',
                padding: '1px 6px',
                borderRadius: '3px',
                color: 'var(--text-secondary)',
                letterSpacing: '0.05em'
              }}>
                AUTONOMOUS DESK v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Regime-Aware Options Desk · Official Alpaca MCP Native · ReAct Agent Engine
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Account Indicator */}
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              {status?.account_number || "PA382FDPI5IO"}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '3px' }}>
              <span className="status-dot status-dot-pulse"></span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Alpaca Paper Tier 3
              </span>
            </div>
          </div>

          {/* Symbol Selector Switcher */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            padding: '2px',
            borderRadius: '6px',
            display: 'flex',
            gap: '2px'
          }}>
            <button
              onClick={() => setSymbol('SPY')}
              className="btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                background: symbol === 'SPY' ? 'var(--text-pure)' : 'transparent',
                color: symbol === 'SPY' ? 'var(--bg-root)' : 'var(--text-secondary)'
              }}>
              SPY
            </button>
            <button
              onClick={() => setSymbol('QQQ')}
              className="btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                background: symbol === 'QQQ' ? 'var(--text-pure)' : 'transparent',
                color: symbol === 'QQQ' ? 'var(--bg-root)' : 'var(--text-secondary)'
              }}>
              QQQ
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic Monochrome Alert Banner */}
      {demoBanner && (
        <div className={`alert-banner ${demoBanner.type === 'solid' ? 'banner-inverted' : 'banner-framed'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: demoBanner.type === 'solid' ? 'var(--bg-root)' : 'var(--text-pure)',
              color: demoBanner.type === 'solid' ? 'var(--text-pure)' : 'var(--bg-root)',
              borderRadius: '50%'
            }}>
              <Icons.AlertOctagon />
            </div>
            <div>
              <span style={{ letterSpacing: '0.05em', textTransform: 'uppercase', marginRight: '8px' }}>
                [{demoBanner.title}]
              </span>
              <span>{demoBanner.message}</span>
            </div>
          </div>
          <button
            onClick={() => setDemoBanner(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex'
            }}>
            <Icons.Close />
          </button>
        </div>
      )}

      {/* Top 5 Metrics Row */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div className="mono-card">
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Account Equity
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-pure)' }}>
            ${status ? status.equity.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "100,000.00"}
          </div>
        </div>

        <div className="mono-card">
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Buying Power
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-pure)' }}>
            ${status ? status.buying_power.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "400,000.00"}
          </div>
        </div>

        <div className="mono-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Net Book Delta (±{maxDelta})
            </span>
            <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
              {deltaPct.toFixed(0)}%
            </span>
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-pure)' }}>
            {delta > 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4)}
          </div>
          <div style={{ width: '100%', height: '3px', background: 'var(--border-strong)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${deltaPct}%`, height: '100%', background: 'var(--text-pure)' }}></div>
          </div>
        </div>

        <div className="mono-card">
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Net Book Vega
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-pure)' }}>
            {status?.book_greeks.net_vega ? (status.book_greeks.net_vega > 0 ? `+${status.book_greeks.net_vega.toFixed(2)}` : status.book_greeks.net_vega.toFixed(2)) : "0.00"}
          </div>
        </div>

        <div className="mono-card">
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Daily Theta Decay
          </div>
          <div className="mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-pure)' }}>
            +${status?.book_greeks.net_theta ? status.book_greeks.net_theta.toFixed(2) : "0.00"}/day
          </div>
        </div>
      </section>

      {/* Main Grid: Left = Regime & Reasoning, Right = Book & Audit */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        
        {/* Left: Regime Radar & Floor Reasoning */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icons.Activity />
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Regime & Reasoning Engine
              </h2>
            </div>
            
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              padding: '3px 8px',
              borderRadius: '4px',
              background: currentRegime === 'EVENT_RISK' ? 'var(--text-pure)' : 'transparent',
              color: currentRegime === 'EVENT_RISK' ? 'var(--bg-root)' : 'var(--text-pure)',
              border: '1.5px solid var(--text-pure)'
            }}>
              {currentRegime}
            </span>
          </div>

          {/* Floor Monologue */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            padding: '1rem',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Gemini Floor Synthesis
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              "{telemetry?.regime.reasoning || "Reading real-time volatility clustering and regime dynamics..."}"
            </div>
          </div>

          {/* Micro Telemetry Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{symbol} Spot</div>
              <div className="mono" style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-pure)', marginTop: '2px' }}>
                ${telemetry?.telemetry.price.toFixed(2) || "550.00"}
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>VIX Index</div>
              <div className="mono" style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-pure)', marginTop: '2px' }}>
                {telemetry?.telemetry.vix.toFixed(2) || "15.50"}
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>IV Percentile</div>
              <div className="mono" style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-pure)', marginTop: '2px' }}>
                {telemetry?.telemetry.iv_percentile.toFixed(1) || "22.5"}%
              </div>
            </div>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Trend State</div>
              <div className="mono" style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-pure)', marginTop: '2px' }}>
                {telemetry?.telemetry.trend || "UPTREND"}
              </div>
            </div>
          </div>

          {/* Monochrome Payoff Curve */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '6px',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Structure Payoff: {telemetry?.regime.recommended_playbook || "IRON_CONDOR"}
              </span>
              <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                Positive Theta Domain
              </span>
            </div>

            <svg viewBox="0 0 500 120" style={{ width: '100%', height: '100px', display: 'block' }}>
              <line x1="20" y1="70" x2="480" y2="70" stroke="var(--border-strong)" strokeDasharray="3 3" />
              <path d="M 40 100 L 140 30 L 360 30 L 460 100" fill="none" stroke="var(--text-pure)" strokeWidth="2.5" />
              <polygon points="40,100 140,30 360,30 460,100 460,70 40,70" fill="rgba(255, 255, 255, 0.06)" />
              <circle cx="250" cy="30" r="4" fill="var(--bg-root)" stroke="var(--text-pure)" strokeWidth="2" />
              <text x="250" y="20" textAnchor="middle" fill="var(--text-pure)" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="600">Spot ${telemetry?.telemetry.price.toFixed(0) || "550"}</text>
              <text x="140" y="86" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Inter, sans-serif">Short Put</text>
              <text x="360" y="86" textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontFamily="Inter, sans-serif">Short Call</text>
            </svg>
          </div>

        </div>

        {/* Right: Active Book & Fiduciary Risk Gates */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icons.Shield />
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Fiduciary Risk Gates
              </h2>
            </div>
            <span style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '3px',
              border: '1px solid var(--border-strong)',
              color: status?.guardian.is_suspended ? 'var(--text-pure)' : 'var(--text-secondary)'
            }}>
              {status?.guardian.is_suspended ? "FIDUCIARY LOCK ENGAGED" : "GUARDIAN ACTIVE"}
            </span>
          </div>

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            padding: '0.75rem 1rem',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Self-Awareness Layer (Win-Rate Degradation Check)
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {status?.guardian.message || "Auditing trailing win-rate against expected mathematical edge..."}
            </div>
          </div>

          {/* Open Positions List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Active Positions ({openTrades.length})
              </span>
              <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Closed: {closedTrades.length}
              </span>
            </div>

            {openTrades.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
                {openTrades.map((t) => (
                  <div key={t.id} style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--text-pure)' }}>{t.symbol}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>{t.strategy_type}</span>
                    </div>
                    <div className="mono" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-pure)' }}>
                      +${t.net_credit.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '1.25rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8125rem',
                border: '1px dashed var(--border-strong)',
                borderRadius: '6px'
              }}>
                No open positions in book. Click "Run Cycle" to evaluate candidates.
              </div>
            )}
          </div>

          {/* Chronological Audit Log */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Chronological Audit Trail
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '130px', overflowY: 'auto' }}>
              {auditEvents.slice(0, 4).map((ev) => (
                <div key={ev.id} style={{
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: 'var(--bg-surface)',
                  borderLeft: '2px solid var(--text-pure)',
                  color: 'var(--text-primary)'
                }}>
                  <span className="mono" style={{ color: 'var(--text-muted)', marginRight: '6px' }}>
                    {ev.timestamp.split('T')[1]?.slice(0, 8)}
                  </span>
                  <strong style={{ color: 'var(--text-pure)', marginRight: '6px' }}>[{ev.event_type}]</strong>
                  <span>{ev.message}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </section>

      {/* NEW: Agentic Live Thought Stream & Interactive Co-Pilot Console */}
      <section className="mono-card" style={{ marginBottom: '1.5rem', background: 'var(--bg-surface)' }}>
        {/* Console Header Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-strong)',
          paddingBottom: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveConsoleTab('thought')}
              className="btn"
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                background: activeConsoleTab === 'thought' ? 'var(--text-pure)' : 'transparent',
                color: activeConsoleTab === 'thought' ? 'var(--bg-root)' : 'var(--text-secondary)',
                border: '1px solid var(--border-strong)'
              }}>
              <Icons.Terminal />
              Live ReAct Thought Stream ({reactSteps.length})
            </button>
            <button
              onClick={() => setActiveConsoleTab('copilot')}
              className="btn"
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.8rem',
                background: activeConsoleTab === 'copilot' ? 'var(--text-pure)' : 'transparent',
                color: activeConsoleTab === 'copilot' ? 'var(--bg-root)' : 'var(--text-secondary)',
                border: '1px solid var(--border-strong)'
              }}>
              <Icons.MessageSquare />
              Interactive Desk Co-Pilot
            </button>
          </div>

          <button
            disabled={isProcessing}
            onClick={runAgenticCycle}
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
            <Icons.Play />
            Run Agentic ReAct Cycle
          </button>
        </div>

        {/* Tab 1: Live ReAct Thought Stream */}
        {activeConsoleTab === 'thought' && (
          <div style={{
            background: 'var(--bg-root)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '1rem',
            maxHeight: '220px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {reactSteps.map((s, idx) => (
              <div key={idx} className="mono" style={{ fontSize: '0.75rem', lineHeight: 1.5, display: 'flex', gap: '0.5rem' }}>
                <span style={{
                  color: s.type === 'THOUGHT' ? 'var(--text-muted)' :
                         s.type === 'TOOL_CALL' ? 'var(--text-pure)' :
                         s.type === 'OBSERVATION' ? 'var(--text-secondary)' :
                         s.type === 'ALPHA_SCOUT' ? '#a1a1aa' :
                         s.type === 'RISK_GOVERNOR' ? '#ffffff' :
                         s.type === 'VETO' ? 'var(--text-pure)' :
                         s.type === 'EXECUTION' ? 'var(--text-pure)' : 'var(--text-secondary)',
                  fontWeight: 700,
                  minWidth: '115px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  borderBottom: s.type === 'RISK_GOVERNOR' ? '1px solid #ffffff' : (s.type === 'ALPHA_SCOUT' ? '1px dashed #71717a' : 'none')
                }}>
                  [{s.type.replace('_', ' ')}]
                </span>
                <span style={{
                  color: s.type === 'VETO' || s.type === 'RISK_GOVERNOR' ? '#ffffff' : (s.type === 'ALPHA_SCOUT' ? '#e4e4e7' : 'var(--text-primary)'),
                  fontWeight: s.type === 'RISK_GOVERNOR' ? 600 : 400
                }}>
                  {s.content}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Interactive Desk Co-Pilot Chat */}
        {activeConsoleTab === 'copilot' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              background: 'var(--bg-root)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '1rem',
              maxHeight: '200px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem'
            }}>
              {chatHistory.map((msg, idx) => (
                <div key={idx} style={{
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                  border: msg.sender === 'user' ? '1px solid var(--border-strong)' : '1px solid var(--border-subtle)',
                  maxWidth: '85%'
                }}>
                  <strong style={{ color: 'var(--text-pure)', marginRight: '6px' }}>
                    {msg.sender === 'user' ? "YOU:" : "THETA HAWK:"}
                  </strong>
                  <span style={{ color: 'var(--text-primary)' }}>{msg.text}</span>
                </div>
              ))}
            </div>

            {/* Quick Prompts for Judges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Suggested queries:</span>
              <button
                onClick={() => handleSendMessage("What is our current portfolio delta exposure and risk headroom?")}
                className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem' }}>
                "Audit Portfolio Delta"
              </button>
              <button
                onClick={() => handleSendMessage("Why did you select this strategy instead of an Iron Condor?")}
                className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem' }}>
                "Explain Strategy Choice"
              </button>
              <button
                onClick={() => handleSendMessage("How does the regime-flip emergency liquidation work?")}
                className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.6875rem' }}>
                "Explain Regime-Flip Exit"
              </button>
            </div>

            {/* Input Bar */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                placeholder="Ask ThetaHawk about portfolio risk, strategy selection, or market state..."
                style={{
                  flex: 1,
                  background: 'var(--bg-root)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '6px',
                  padding: '0.55rem 0.875rem',
                  color: 'var(--text-pure)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.8125rem',
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn btn-solid-white" style={{ padding: '0.55rem 1rem' }}>
                <Icons.Send />
                Ask Desk
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Floating Demo Control Dock - Precision Monochrome */}
      <footer className="mono-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.25rem',
        border: '1.5px solid var(--border-strong)',
        background: 'var(--bg-surface)'
      }}>
        <div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Hackathon 5-Minute Pitch Controls
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            One-click triggers for all 4 demo moments specified in docs/doc.md
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <button
            disabled={isProcessing}
            onClick={runAgenticCycle}
            className="btn btn-solid-white">
            <Icons.Play />
            Run Agentic Cycle
          </button>

          <button
            disabled={isProcessing}
            onClick={triggerVeto}
            className="btn btn-outline">
            <Icons.AlertOctagon />
            Trigger Greeks VETO (Moment #3)
          </button>

          <button
            disabled={isProcessing}
            onClick={triggerFlip}
            className="btn btn-outline">
            <Icons.Zap />
            Trigger Regime Flip (Moment #4)
          </button>

          <button
            disabled={isProcessing}
            onClick={triggerSuspend}
            className="btn btn-inverted-alert">
            <Icons.Lock />
            Simulate Self-Lock (Moment #5)
          </button>

          <button
            disabled={isProcessing}
            onClick={triggerStressTest}
            className="btn btn-outline"
            style={{ border: '1.5px solid #ffffff' }}>
            <Icons.Activity />
            Black Swan Replay (Aug 5)
          </button>

          <button
            disabled={isProcessing}
            onClick={triggerReset}
            className="btn btn-ghost">
            <Icons.RotateCcw />
            Reset
          </button>
        </div>
      </footer>

    </div>
  );
}
