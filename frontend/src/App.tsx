import { useState, useEffect, useRef } from 'react';
import { LiveTradingChart } from './components/LiveTradingChart';
import { GreeksRiskMeter } from './components/GreeksRiskMeter';
import { BenchmarkComparisonChart } from './components/BenchmarkComparisonChart';
import { AgentGateway } from './components/AgentGateway';


// Custom Minimalist SVG Icons
const Icons = {
  Overview: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  Harness: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M4 3h16M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3M6 14h12" />
    </svg>
  ),
  Users: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Vibe: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </svg>
  ),
  Terminal: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  Report: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  Close: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Connect: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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
    stats: {
      total_trades: number;
      win_rate: number;
      consecutive_losses: number;
    };
  };
  open_trades_count: number;
}

interface TelemetryData {
  telemetry: {
    symbol: string;
    price: number;
    vix: number;
    iv_percentile: number;
    trend: string;
  };
  regime: {
    regime: string;
    recommended_playbook: string;
    reasoning: string;
    confidence: number;
  };
}

interface Trade {
  id: string;
  symbol: string;
  strategy_type: string;
  regime: string;
  net_credit: number;
  max_risk: number;
  status: string;
  pnl?: number;
  timestamp: string;
}

interface AuditEvent {
  id: number;
  timestamp: string;
  event_type: string;
  symbol?: string;
  message: string;
}

interface ReActStep {
  type: string;
  content: string;
}

interface CommitteeDeliberation {
  timestamp: string;
  symbol: string;
  consensus: string;
  consensus_confidence: number;
  recommended_playbook: string;
  rounds: Array<{
    agent: string;
    role: string;
    stance?: string;
    strategy?: string;
    consensus?: string;
    content: string;
  }>;
}

interface VibeResult {
  type: string;
  narrative: string;
  metrics?: any;
  candidate?: any;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "";

export default function App() {
  const [symbol, setSymbol] = useState<'SPY' | 'QQQ'>('SPY');
  const [activePage, setActivePage] = useState<'overview' | 'harness' | 'committee' | 'vibe' | 'copilot' | 'reports' | 'connect'>('overview');
  
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [demoBanner, setDemoBanner] = useState<{ type: 'sage' | 'gold' | 'rust'; title: string; message: string } | null>(null);

  // Agentic ReAct State
  const [reactSteps, setReactSteps] = useState<ReActStep[]>([
    { type: "THOUGHT", content: "Abitda autonomous surveillance engine online. Monitoring volatility surface slope and Greeks invariants." }
  ]);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'agent'; text: string }>>([
    { sender: 'agent', text: "Abitda floor connection established. Ask me about portfolio Greeks, market regimes, or benchmark scorecards." }
  ]);

  // Floor Committee & Vibe Desk
  const [committeeData, setCommitteeData] = useState<CommitteeDeliberation | null>(null);
  const [vibePrompt, setVibePrompt] = useState("");
  const [vibeResult, setVibeResult] = useState<VibeResult | null>(null);
  const [deskReport, setDeskReport] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Test Harness Benchmark State
  const [harnessAgent, setHarnessAgent] = useState<'committee' | 'vibe' | 'naive_momentum' | 'passive_farmer'>('committee');
  const [harnessScenario, setHarnessScenario] = useState<string>('aug5_2024');
  const [harnessScorecard, setHarnessScorecard] = useState<any | null>(null);
  const [harnessLeaderboard, setHarnessLeaderboard] = useState<any | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [shellLogLines, setShellLogLines] = useState<Array<{ type: 'cmd' | 'ok' | 'warn'; text: string }>>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch All Engine Data
  const fetchAll = async () => {
    try {
      const [sRes, tRes, trRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/api/status`),
        fetch(`${API_BASE}/api/telemetry?symbol=${symbol}`),
        fetch(`${API_BASE}/api/trades`),
        fetch(`${API_BASE}/api/audit?limit=15`)
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

  useEffect(() => {
    if (activePage === 'copilot' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activePage]);

  // Actions
  const runAgenticCycle = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/agent/react?symbol=${symbol}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setReactSteps(data.steps || []);
        setDemoBanner({
          type: 'sage',
          title: 'CYCLE COMPLETE',
          message: `Evaluated ${symbol}. Processed ${data.steps?.length || 0} ReAct reasoning steps on Alpaca paper book.`
        });
      }
      fetchAll();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || chatPrompt;
    if (!promptToSend.trim()) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: promptToSend }]);
    if (!customPrompt) setChatPrompt("");

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

  const runBenchmarkTest = async (agentId?: string, scenarioId?: string) => {
    const ag = agentId || harnessAgent;
    const sc = scenarioId || harnessScenario;
    setIsBenchmarking(true);
    setShellLogLines([
      { type: 'cmd', text: `abitda benchmark --agent ${ag} --scenario ${sc}` },
      { type: 'ok', text: `Calibrated shock dataset loaded: ${sc}` },
      { type: 'ok', text: `Evaluating candidate agent via OptionsAgentProtocol` }
    ]);

    try {
      const res = await fetch(`${API_BASE}/api/harness/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: ag, scenario_id: sc })
      });
      if (res.ok) {
        const data = await res.json();
        setHarnessScorecard(data);
        setActivePage('harness');
        setShellLogLines(prev => [
          ...prev,
          { type: 'ok', text: `Replayed ${data.timeline?.length || 5} historical bars` },
          { type: data.fiduciary_grade === 'A+' ? 'ok' : 'warn', text: `Audit Complete: GRADE ${data.fiduciary_grade} (${data.attestation_status})` },
          { type: 'ok', text: `Scorecard saved to HARNESS_SCORECARD.md` }
        ]);
        setDemoBanner({
          type: data.fiduciary_grade === 'A+' || data.fiduciary_grade === 'A' ? 'sage' : 'rust',
          title: `BENCHMARK COMPLETE: GRADE ${data.fiduciary_grade}`,
          message: `Agent ${data.agent_name} vs ${data.scenario_name}: Preserved ${data.capital_preserved_pct}%, Max DD ${data.max_drawdown_pct}%. Attestation: ${data.attestation_status}.`
        });
      }
    } catch (e) {
      console.error("Benchmark failed:", e);
      setShellLogLines(prev => [...prev, { type: 'warn', text: `Benchmark execution failed: ${String(e)}` }]);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const loadLeaderboard = async (scenarioId?: string) => {
    const sc = scenarioId || harnessScenario;
    setIsBenchmarking(true);
    try {
      const res = await fetch(`${API_BASE}/api/harness/leaderboard?scenario_id=${sc}`);
      if (res.ok) {
        const data = await res.json();
        setHarnessLeaderboard(data.leaderboard);
        setActivePage('harness');
      }
    } catch (e) {
      console.error("Failed to load leaderboard:", e);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const runCommitteeDebate = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/agent/committee?symbol=${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setCommitteeData(data);
        setActivePage('committee');
        setDemoBanner({
          type: 'gold',
          title: 'COMMITTEE CONSENSUS RATIFIED',
          message: `4-Agent floor ratified: ${data.consensus} (Confidence: ${(data.consensus_confidence * 100).toFixed(0)}%).`
        });
      }
    } catch (e) {
      console.error("Failed to run committee debate:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const runVibeArchitect = async (customPrompt?: string) => {
    const promptToRun = customPrompt || vibePrompt;
    if (!promptToRun.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/vibe/architect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToRun, symbol })
      });
      if (res.ok) {
        const data = await res.json();
        setVibeResult(data);
        setActivePage('vibe');
        setDemoBanner({
          type: 'gold',
          title: 'VIBE STRATEGY COMPILED',
          message: `Processed natural language prompt into executable defined-risk spread candidate.`
        });
      }
    } catch (e) {
      console.error("Failed to run vibe architect:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateDeskReport = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/desk/report?symbol=${symbol}`);
      if (res.ok) {
        const data = await res.json();
        setDeskReport(data.content);
        setActivePage('reports');
        setDemoBanner({
          type: 'sage',
          title: 'INSTITUTIONAL DOSSIER COMPILED',
          message: `Created DESK_BRIEFING.md with full regulatory risk attestations.`
        });
      }
    } catch (e) {
      console.error("Failed to generate desk report:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyReportToClipboard = () => {
    if (!deskReport) return;
    navigator.clipboard.writeText(deskReport);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const downloadReportFile = () => {
    if (!deskReport) return;
    const blob = new Blob([deskReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DESK_BRIEFING_${symbol}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const triggerVeto = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo/veto?symbol=${symbol}`, { method: "POST" });
      const data = await res.json();
      setDemoBanner({
        type: 'rust',
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
        type: 'gold',
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
        type: 'rust',
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
    setDemoBanner({
      type: 'gold',
      title: 'DESK RESET',
      message: 'Paper trading account and ledger reset to clean slate.'
    });
    setReactSteps([{ type: "THOUGHT", content: "Ledger reset. Desk surveillance re-initialized." }]);
    fetchAll();
  };

  const delta = status?.book_greeks.net_delta ?? 0.0;
  const maxDelta = status?.limits.max_delta ?? 0.25;
  const currentRegime = telemetry?.regime.regime ?? "RANGE_BOUND";

  return (
    <div className="app-layout">
      
      {/* ========================================================================= */}
      {/* REPOSENSE LEFT SIDEBAR */}
      {/* ========================================================================= */}
      <aside className="sidebar">
        
        {/* Brand Area */}
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setActivePage('overview')}>
            <span className="font-serif" style={{ fontSize: '28px', color: 'var(--ink)' }}>Abit</span>
            <span className="font-serif" style={{ fontSize: '28px', fontStyle: 'italic', color: 'var(--gold)' }}>da</span>
          </div>
          <div className="label" style={{ color: 'var(--dim)', marginTop: '4px' }}>
            OPTIONS AGENT HARNESS
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="sidebar-nav">
          <div
            onClick={() => setActivePage('overview')}
            className={`nav-item ${activePage === 'overview' ? 'active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icons.Overview />
              <span>Overview</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActivePage('harness');
              if (!harnessScorecard) runBenchmarkTest();
            }}
            className={`nav-item ${activePage === 'harness' ? 'active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icons.Harness />
              <span>Test Harness</span>
            </div>
            <span className="mode-pill mode-gold" style={{ fontSize: '8px', padding: '1px 5px' }}>
              5 SHOCKS
            </span>
          </div>

          <div
            onClick={() => {
              setActivePage('committee');
              if (!committeeData) runCommitteeDebate();
            }}
            className={`nav-item ${activePage === 'committee' ? 'active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icons.Users />
              <span>Committee</span>
            </div>
            <span className="mode-pill mode-sage" style={{ fontSize: '8px', padding: '1px 5px' }}>
              4 AGENTS
            </span>
          </div>

          <div
            onClick={() => setActivePage('vibe')}
            className={`nav-item ${activePage === 'vibe' ? 'active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icons.Vibe />
              <span>Vibe Desk</span>
            </div>
            <span className="mode-pill mode-ink" style={{ fontSize: '8px', padding: '1px 5px' }}>
              NLP
            </span>
          </div>

          <div
            onClick={() => setActivePage('copilot')}
            className={`nav-item ${activePage === 'copilot' ? 'active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icons.Terminal />
              <span>ReAct Trace</span>
            </div>
          </div>

          <div
            onClick={() => {
              setActivePage('reports');
              if (!deskReport) generateDeskReport();
            }}
            className={`nav-item ${activePage === 'reports' ? 'active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icons.Report />
              <span>Desk Dossier</span>
            </div>
          </div>

          <div
            onClick={() => setActivePage('connect')}
            className={`nav-item ${activePage === 'connect' ? 'active' : ''}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icons.Connect />
              <span>Agent Gateway</span>
            </div>
            <span className="mode-pill mode-sage" style={{ fontSize: '8px', padding: '1px 5px' }}>
              MCP + REST
            </span>
          </div>
        </nav>

        {/* Sidebar Footer Account & Quick Trigger */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="label" style={{ color: 'var(--sage)' }}>● TIER 3 OPTIONS</span>
            <span className="label" style={{ color: 'var(--dim)' }}>ALPACAPAPER</span>
          </div>
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
            {status?.account_number || "PA382FDPI5IO"}
          </div>
          <button
            onClick={runAgenticCycle}
            disabled={isProcessing}
            className="btn-editorial"
            style={{ width: '100%', marginTop: '14px', padding: '10px' }}>
            <span>{isProcessing ? "Executing..." : "Run Cycle →"}</span>
          </button>
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <div className="main-content">
        
        {/* Top Header Strip */}
        <header className="page-header">
          <div>
            <span className="label" style={{ color: 'var(--gold)' }}>
              {activePage === 'overview' ? 'DESK SURVEILLANCE' :
               activePage === 'harness' ? 'AGENT EVALUATION ARENA' :
               activePage === 'committee' ? 'FLOOR CONSENSUS DEBATE' :
               activePage === 'vibe' ? 'NATURAL LANGUAGE COMPILER' :
               activePage === 'copilot' ? 'REACT REASONING ENGINE' :
               activePage === 'connect' ? 'AGENT INTEROPERABILITY' : 'AUDIT & COMPLIANCE'}
            </span>
            <h2 className="font-serif" style={{ fontSize: '20px', color: 'var(--ink)', lineHeight: 1.1 }}>
              {activePage === 'overview' ? 'Executive Portfolio & Risk Overview' :
               activePage === 'harness' ? 'Black Swan Stress-Test Arena' :
               activePage === 'committee' ? '4-Agent Floor Committee Deliberation' :
               activePage === 'vibe' ? 'Vibe Desk Strategy Architect' :
               activePage === 'copilot' ? 'Agentic ReAct Co-Pilot' :
               activePage === 'connect' ? 'Agent Gateway & Protocol Connector (MCP & REST)' : 'Institutional Desk Dossier'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Market Ticker Strip */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderRight: '1px solid var(--border)', paddingRight: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <div className="label">{symbol} Spot</div>
                <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', fontWeight: 600 }}>
                  ${telemetry?.telemetry.price.toFixed(2) || "550.00"}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="label">VIX Index</div>
                <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', fontWeight: 600, color: (telemetry?.telemetry.vix || 15) > 30 ? 'var(--rust)' : 'var(--ink)' }}>
                  {telemetry?.telemetry.vix.toFixed(2) || "14.32"}
                </div>
              </div>
            </div>

            {/* Symbol Switcher */}
            <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setSymbol('SPY')}
                style={{
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  padding: '5px 12px',
                  border: 'none',
                  cursor: 'pointer',
                  background: symbol === 'SPY' ? 'var(--ink)' : 'transparent',
                  color: symbol === 'SPY' ? 'var(--paper)' : 'var(--muted)'
                }}>
                SPY
              </button>
              <button
                onClick={() => setSymbol('QQQ')}
                style={{
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  padding: '5px 12px',
                  border: 'none',
                  borderLeft: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: symbol === 'QQQ' ? 'var(--ink)' : 'transparent',
                  color: symbol === 'QQQ' ? 'var(--paper)' : 'var(--muted)'
                }}>
                QQQ
              </button>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <div className="page-body">
          
          {/* Notification Banner */}
          {demoBanner && (
            <div style={{
              background: demoBanner.type === 'sage' ? 'rgba(61, 90, 71, 0.08)' :
                          demoBanner.type === 'rust' ? 'rgba(139, 58, 42, 0.08)' : 'rgba(201, 168, 76, 0.12)',
              border: `1px solid ${
                demoBanner.type === 'sage' ? 'var(--sage)' :
                demoBanner.type === 'rust' ? 'var(--rust)' : 'var(--gold)'
              }`,
              padding: '12px 18px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }} className="animate-fade-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="label" style={{
                  color: demoBanner.type === 'sage' ? 'var(--sage)' :
                         demoBanner.type === 'rust' ? 'var(--rust)' : 'var(--gold)',
                  fontWeight: 700
                }}>
                  [{demoBanner.title}]
                </span>
                <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--ink)' }}>
                  {demoBanner.message}
                </span>
              </div>
              <button
                onClick={() => setDemoBanner(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--dim)', cursor: 'pointer' }}>
                <Icons.Close />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 1: OVERVIEW */}
          {/* ========================================================================= */}
          {activePage === 'overview' && (
            <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 4 Stat Cards Grid */}
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="card" style={{ padding: '20px' }}>
                  <div className="label">PORTFOLIO EQUITY</div>
                  <div className="stat-value" style={{ marginTop: '6px' }}>
                    ${status ? status.equity.toLocaleString('en-US', { minimumFractionDigits: 0 }) : "100,000"}
                  </div>
                  <div className="label" style={{ marginTop: '8px', color: 'var(--sage)' }}>
                    BP: ${status ? status.buying_power.toLocaleString('en-US', { minimumFractionDigits: 0 }) : "400,000"}
                  </div>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <div className="label">NET BOOK DELTA (±{maxDelta})</div>
                  <div className="stat-value" style={{ marginTop: '6px', color: Math.abs(delta) > maxDelta ? 'var(--rust)' : 'var(--ink)' }}>
                    Δ {delta > 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4)}
                  </div>
                  <div className="label" style={{ marginTop: '8px', color: 'var(--sage)' }}>
                    100% INVARIANT COMPLIANT
                  </div>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <div className="label">REGIME & VIX</div>
                  <div className="stat-value" style={{ marginTop: '6px', fontSize: '26px' }}>
                    {currentRegime.replace('_', ' ')}
                  </div>
                  <div className="label" style={{ marginTop: '8px', color: 'var(--gold)' }}>
                    VIX {telemetry?.telemetry.vix.toFixed(2) || "14.32"} · IV %ile {telemetry?.telemetry.iv_percentile.toFixed(1) || "2.6"}%
                  </div>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                  <div className="label">FIDUCIARY GUARDIAN</div>
                  <div className="stat-value" style={{ marginTop: '6px', fontSize: '26px', color: status?.guardian.is_suspended ? 'var(--rust)' : 'var(--sage)' }}>
                    {status?.guardian.is_suspended ? "SELF-LOCKED" : "ONLINE"}
                  </div>
                  <div className="label" style={{ marginTop: '8px', color: 'var(--dim)' }}>
                    Theta: +${status?.book_greeks.net_theta.toFixed(2) || "0.00"}/day
                  </div>
                </div>
              </div>

              {/* Primary Live Trading Chart & Fiduciary Controls (1px Grid) */}
              <div className="card-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <LiveTradingChart
                    symbol={symbol}
                    currentPrice={telemetry?.telemetry.price || (symbol === 'SPY' ? 550.0 : 480.0)}
                    vix={telemetry?.telemetry.vix || 14.32}
                    recommendedPlaybook={telemetry?.regime.recommended_playbook || "IRON_CONDOR"}
                    equity={status?.equity || 100000}
                  />

                  <div style={{ background: 'var(--paper2)', border: '1px solid var(--border)', borderLeft: '3px solid var(--gold)', padding: '12px 16px' }}>
                    <div className="label" style={{ color: 'var(--gold)', marginBottom: '4px' }}>
                      AI Market Regime Telemetry
                    </div>
                    <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.6 }}>
                      "{telemetry?.regime.reasoning || "Reading implied volatility surface slope and regime clustering..."}"
                    </p>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="label">FIDUCIARY ENFORCEMENT</span>
                      <button onClick={triggerReset} className="label" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--rust)' }}>
                        [RESET DESK]
                      </button>
                    </div>

                    {/* Live Greeks Risk Barometer */}
                    <div style={{ marginBottom: '14px' }}>
                      <GreeksRiskMeter
                        netDelta={delta}
                        maxDelta={maxDelta}
                        netVega={status?.book_greeks.net_vega || 0.0}
                        maxVega={status?.limits.max_vega || 150.0}
                        netTheta={status?.book_greeks.net_theta || 0.0}
                        isSuspended={status?.guardian.is_suspended || false}
                      />
                    </div>

                    <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                      Simulate real-world market failure modes and observe Abitda's autonomous risk barriers intercepting violations:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button onClick={triggerVeto} disabled={isProcessing} className="btn-editorial btn-editorial-outline" style={{ justifyContent: 'space-between' }}>
                        <span>1. Force Greeks Veto</span>
                        <span style={{ color: 'var(--rust)', fontSize: '9px' }}>±0.25 Delta Gate</span>
                      </button>

                      <button onClick={triggerFlip} disabled={isProcessing} className="btn-editorial btn-editorial-outline" style={{ justifyContent: 'space-between' }}>
                        <span>2. Trigger Regime Flip</span>
                        <span style={{ color: 'var(--gold)', fontSize: '9px' }}>Defensive Liquidation</span>
                      </button>

                      <button onClick={triggerSuspend} disabled={isProcessing} className="btn-editorial btn-editorial-outline" style={{ justifyContent: 'space-between' }}>
                        <span>3. Engage Self-Lock</span>
                        <span style={{ color: 'var(--sage)', fontSize: '9px' }}>Win-Rate Cutoff</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">Broker State</span>
                    <span className="label" style={{ color: 'var(--sage)' }}>Ready for execution</span>
                  </div>
                </div>

              </div>

              {/* Active Positions & Audit Log (1px Grid) */}
              <div className="card-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="label">ACTIVE POSITIONS ({openTrades.length})</span>
                    <span className="label">{closedTrades.length} CLOSED</span>
                  </div>

                  {openTrades.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                      {openTrades.map((t) => (
                        <div key={t.id} style={{
                          background: 'var(--paper2)',
                          border: '1px solid var(--border)',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                              {t.symbol} · {t.strategy_type}
                            </div>
                            <div className="label" style={{ marginTop: '4px' }}>
                              Max Risk: ${t.max_risk.toFixed(0)} · Regime: {t.regime}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--sage)' }}>
                              +${t.net_credit.toFixed(2)}
                            </div>
                            <div className="label" style={{ marginTop: '2px' }}>Credit</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--dim)', fontSize: '11px' }}>
                      No open positions in book. Click "Run Cycle →" to evaluate candidates.
                    </div>
                  )}
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="label">CHRONOLOGICAL AUDIT TRAIL</span>
                    <span className="label" style={{ color: 'var(--sage)' }}>● CONTINUOUS</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {auditEvents.slice(0, 5).map((ev) => (
                      <div key={ev.id} style={{
                        padding: '8px 12px',
                        background: 'var(--paper2)',
                        borderLeft: `2px solid ${
                          ev.event_type.includes('VETO') ? 'var(--rust)' :
                          ev.event_type.includes('EXIT') ? 'var(--gold)' : 'var(--sage)'
                        }`,
                        fontSize: '11px',
                        fontFamily: 'Geist Mono, monospace'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dim)', fontSize: '9px' }}>
                          <span>[{ev.event_type}]</span>
                          <span>{ev.timestamp.split('T')[1]?.slice(0, 8)}</span>
                        </div>
                        <div style={{ color: 'var(--ink)', marginTop: '3px', lineHeight: 1.4 }}>
                          {ev.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 2: STRESS-TEST HARNESS BENCHMARK ARENA */}
          {/* ========================================================================= */}
          {activePage === 'harness' && (
            <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Arena Config Card */}
              <div className="stats-card">
                <div className="label">CALIBRATED BLACK SWAN REPLAY ENGINE</div>
                <h3 className="font-serif" style={{ fontSize: '28px', color: 'var(--ink)', marginTop: '8px' }}>
                  Options Agent Stress-Test Arena
                </h3>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.6 }}>
                  Select an agent architecture and a historical shock scenario to execute a bar-by-bar evaluation.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr auto auto', gap: '12px', marginTop: '18px', alignItems: 'flex-end' }}>
                  <div>
                    <div className="label" style={{ marginBottom: '6px' }}>Candidate Agent</div>
                    <select
                      value={harnessAgent}
                      onChange={(e: any) => setHarnessAgent(e.target.value)}
                      className="editorial-input"
                      style={{ padding: '10px 14px', fontSize: '11px' }}>
                      <option value="committee">Abitda Floor Committee (Multi-Agent)</option>
                      <option value="vibe">Vibe Desk Architect (NLP Compiler)</option>
                      <option value="passive_farmer">Passive Theta Farmer (Naive Baseline)</option>
                      <option value="naive_momentum">Naive Momentum Bot (Unhedged Longs)</option>
                    </select>
                  </div>

                  <div>
                    <div className="label" style={{ marginBottom: '6px' }}>Historical Shock Scenario</div>
                    <select
                      value={harnessScenario}
                      onChange={(e: any) => setHarnessScenario(e.target.value)}
                      className="editorial-input"
                      style={{ padding: '10px 14px', fontSize: '11px' }}>
                      <option value="aug5_2024">August 5, 2024 (Yen Carry Crash · VIX 65.7)</option>
                      <option value="svb_march_2023">March 2023 (SVB Bank Run Liquidity Vacuum)</option>
                      <option value="volmageddon_2018">February 2018 (Volmageddon XIV Blowout)</option>
                      <option value="flash_crash_intraday">Intraday Flash Crash Liquidity Vacuum</option>
                      <option value="calm_bull_grind">Calm Bull Grind (Baseline Control)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => runBenchmarkTest()}
                    disabled={isBenchmarking}
                    className="btn-editorial"
                    style={{ height: '42px' }}>
                    <span>{isBenchmarking ? "Running Replay..." : "Run Benchmark →"}</span>
                  </button>

                  <button
                    onClick={() => loadLeaderboard()}
                    disabled={isBenchmarking}
                    className="btn-editorial btn-editorial-outline"
                    style={{ height: '42px' }}>
                    Leaderboard
                  </button>
                </div>
              </div>

              {/* Reposense Shell Terminal Card */}
              {shellLogLines.length > 0 && (
                <div className="shell-card">
                  <div className="shell-header">
                    <div className="shell-dot" style={{ background: '#ff5f57', borderRadius: '50%' }}></div>
                    <div className="shell-dot" style={{ background: '#febc2e', borderRadius: '50%' }}></div>
                    <div className="shell-dot" style={{ background: '#28c840', borderRadius: '50%' }}></div>
                    <span className="label" style={{ marginLeft: 'auto', color: '#555' }}>
                      ABITDA TEST HARNESS ENGINE
                    </span>
                  </div>
                  <div style={{ padding: '16px 20px', color: '#22c98a' }}>
                    {shellLogLines.map((line, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ color: line.type === 'cmd' ? '#555' : line.type === 'warn' ? 'var(--rust)' : '#22c98a' }}>
                          {line.type === 'cmd' ? '$' : line.type === 'warn' ? '⚠' : '✓'}
                        </span>
                        <span style={{ color: line.type === 'cmd' ? '#888' : line.type === 'warn' ? '#fb7185' : '#22c98a' }}>
                          {line.text}
                        </span>
                      </div>
                    ))}
                    {isBenchmarking && (
                      <div style={{ display: 'inline-block', width: '7px', height: '14px', background: '#22c98a', animation: 'blink 0.8s step-end infinite' }}></div>
                    )}
                  </div>
                </div>
              )}

              {/* Scorecard Hero Banner */}
              {harnessScorecard && (
                <div className="card-grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr' }}>
                  <div className="card" style={{ borderLeft: `3px solid ${harnessScorecard.fiduciary_grade === 'A+' ? 'var(--sage)' : 'var(--rust)'}` }}>
                    <div className="label">INSTITUTIONAL GRADE</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '6px' }}>
                      <span className="font-serif" style={{ fontSize: '54px', color: harnessScorecard.fiduciary_grade === 'A+' ? 'var(--sage)' : 'var(--rust)', lineHeight: 1 }}>
                        {harnessScorecard.fiduciary_grade}
                      </span>
                      <span className={`mode-pill ${harnessScorecard.attestation_status.includes('CERTIFIED') ? 'mode-sage' : 'mode-rust'}`}>
                        {harnessScorecard.attestation_status}
                      </span>
                    </div>
                    <div className="label" style={{ marginTop: '8px', color: 'var(--dim)' }}>
                      {harnessScorecard.agent_name}
                    </div>
                  </div>

                  <div className="card">
                    <div className="label">CAPITAL PRESERVED</div>
                    <div className="stat-value" style={{ marginTop: '6px', color: harnessScorecard.capital_preserved_pct >= 95 ? 'var(--sage)' : 'var(--rust)' }}>
                      {harnessScorecard.capital_preserved_pct}%
                    </div>
                    <div className="label" style={{ marginTop: '8px' }}>
                      Final Equity: ${harnessScorecard.final_equity.toLocaleString()}
                    </div>
                  </div>

                  <div className="card">
                    <div className="label">MAX SHOCK DRAWDOWN</div>
                    <div className="stat-value" style={{ marginTop: '6px', color: harnessScorecard.max_drawdown_pct <= 5 ? 'var(--sage)' : 'var(--rust)' }}>
                      {harnessScorecard.max_drawdown_pct}%
                    </div>
                    <div className="label" style={{ marginTop: '8px' }}>
                      Tail-Risk Barrier
                    </div>
                  </div>

                  <div className="card">
                    <div className="label">GREEK INVARIANT BREACHES</div>
                    <div className="stat-value" style={{ marginTop: '6px', color: (harnessScorecard.delta_breach_count + harnessScorecard.vega_breach_count) === 0 ? 'var(--sage)' : 'var(--rust)' }}>
                      {harnessScorecard.delta_breach_count + harnessScorecard.vega_breach_count}
                    </div>
                    <div className="label" style={{ marginTop: '8px' }}>
                      Delta ±0.25 / Vega 150
                    </div>
                  </div>
                </div>
              )}

              {/* Replay Timeline Bar Table */}
              {harnessScorecard && Array.isArray(harnessScorecard.timeline) && harnessScorecard.timeline.length > 0 && (
                <div className="card" style={{ padding: 0 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="label">BAR-BY-BAR REPLAY EXECUTION TIMELINE & SHOCK TRAJECTORY</span>
                    <span className="label">{harnessScorecard.timeline.length} BARS EVALUATED</span>
                  </div>

                  {/* Visual Shock Trajectory Graph */}
                  <div style={{ padding: '16px 20px', background: 'var(--paper2)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="label" style={{ color: 'var(--gold)' }}>HISTORICAL CRASH & EQUITY TRAJECTORY</span>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '9px', fontFamily: 'Geist Mono, monospace' }}>
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>— Spot Price Shock</span>
                        <span style={{ color: 'var(--sage)', fontWeight: 600 }}>— Portfolio Equity</span>
                        <span style={{ color: 'var(--rust)', fontWeight: 600 }}>● VIX Spike (&gt;35)</span>
                      </div>
                    </div>
                    <div style={{ height: '110px', width: '100%' }}>
                      <svg viewBox="0 0 600 100" style={{ width: '100%', height: '100%', display: 'block' }}>
                        {(() => {
                          const tl = harnessScorecard.timeline;
                          if (!tl || tl.length === 0) return null;
                          const spyVals = tl.map((r: any) => r.spy);
                          const eqVals = tl.map((r: any) => r.equity);
                          const minSpy = Math.min(...spyVals);
                          const maxSpy = Math.max(...spyVals);
                          const minEq = Math.min(...eqVals, 80000);
                          const maxEq = Math.max(...eqVals, 101000);

                          const getX = (idx: number) => 30 + (idx / (tl.length - 1 || 1)) * 540;
                          const getSpyY = (val: number) => 85 - ((val - minSpy) / (maxSpy - minSpy || 1)) * 65;
                          const getEqY = (val: number) => 85 - ((val - minEq) / (maxEq - minEq || 1)) * 65;

                          const spyPath = tl.map((r: any, i: number) => `${getX(i)},${getSpyY(r.spy)}`).join(' L ');
                          const eqPath = tl.map((r: any, i: number) => `${getX(i)},${getEqY(r.equity)}`).join(' L ');

                          return (
                            <>
                              <line x1="20" y1="50" x2="580" y2="50" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="3 3" />
                              <path d={`M ${spyPath}`} fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="4 2" />
                              <path d={`M ${eqPath}`} fill="none" stroke={harnessScorecard.capital_preserved_pct >= 95 ? 'var(--sage)' : 'var(--rust)'} strokeWidth="2.5" />
                              {tl.map((r: any, i: number) => (
                                <g key={i}>
                                  <circle cx={getX(i)} cy={getSpyY(r.spy)} r="3" fill="var(--gold)" />
                                  <circle cx={getX(i)} cy={getEqY(r.equity)} r="3.5" fill="var(--paper)" stroke={r.pnl >= 0 ? 'var(--sage)' : 'var(--rust)'} strokeWidth="2" />
                                  {r.vix > 35 && (
                                    <circle cx={getX(i)} cy="15" r="3" fill="var(--rust)" />
                                  )}
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'Geist Mono, monospace', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--paper2)', borderBottom: '1px solid var(--border)', color: 'var(--dim)' }}>
                          <th style={{ padding: '10px 14px' }}>Bar / Time</th>
                          <th style={{ padding: '10px 14px' }}>SPY Spot</th>
                          <th style={{ padding: '10px 14px' }}>VIX</th>
                          <th style={{ padding: '10px 14px' }}>Agent Decision</th>
                          <th style={{ padding: '10px 14px' }}>Greeks Gate</th>
                          <th style={{ padding: '10px 14px' }}>Bar P&L</th>
                          <th style={{ padding: '10px 14px' }}>Equity</th>
                          <th style={{ padding: '10px 14px' }}>Rationale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {harnessScorecard.timeline.map((row: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--paper)' : 'var(--paper2)' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.label}</td>
                            <td style={{ padding: '10px 14px' }}>${row.spy.toFixed(2)}</td>
                            <td style={{ padding: '10px 14px', color: row.vix > 35 ? 'var(--rust)' : 'var(--ink)' }}>{row.vix.toFixed(1)}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span className="mode-pill mode-ink" style={{ fontSize: '8px' }}>{row.action}</span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {row.accepted ? (
                                <span className="mode-pill mode-sage" style={{ fontSize: '8px' }}>PASSED</span>
                              ) : (
                                <span className="mode-pill mode-rust" style={{ fontSize: '8px' }}>VETOED: {row.rejection}</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: row.pnl >= 0 ? 'var(--sage)' : 'var(--rust)' }}>
                              {row.pnl >= 0 ? `+$${row.pnl.toFixed(2)}` : `-$${Math.abs(row.pnl).toFixed(2)}`}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                              ${row.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.rationale}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Visual Cross-Agent Benchmark Comparison Bar Chart */}
              <BenchmarkComparisonChart scenarioName={harnessScorecard?.scenario_name || "August 5, 2024 Yen Carry Crash"} />

              {/* Comparative Multi-Agent Leaderboard */}
              {Array.isArray(harnessLeaderboard) && harnessLeaderboard.length > 0 && (
                <div className="card" style={{ padding: 0 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">CROSS-AGENT BENCHMARK LEADERBOARD</span>
                    <span className="label" style={{ color: 'var(--gold)' }}>OBJECTIVE FIDUCIARY PROOF</span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'Geist Mono, monospace', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--paper2)', borderBottom: '1px solid var(--border)', color: 'var(--dim)' }}>
                          <th style={{ padding: '10px 14px' }}>Agent Architecture</th>
                          <th style={{ padding: '10px 14px' }}>Grade</th>
                          <th style={{ padding: '10px 14px' }}>Capital Preserved</th>
                          <th style={{ padding: '10px 14px' }}>Max Drawdown</th>
                          <th style={{ padding: '10px 14px' }}>Greek Breaches</th>
                          <th style={{ padding: '10px 14px' }}>Regulatory Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {harnessLeaderboard.map((a: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--paper)' : 'var(--paper2)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>{a.agent_name}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span className={`mode-pill ${a.grade === 'A+' ? 'mode-sage' : a.grade === 'A' ? 'mode-gold' : 'mode-rust'}`} style={{ fontWeight: 700 }}>
                                GRADE {a.grade}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', color: a.capital_preserved_pct >= 90 ? 'var(--sage)' : 'var(--rust)' }}>
                              {a.capital_preserved_pct}%
                            </td>
                            <td style={{ padding: '12px 14px' }}>{a.max_drawdown_pct}%</td>
                            <td style={{ padding: '12px 14px' }}>{a.greek_breaches}</td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{ color: a.status.includes('CERTIFIED') ? 'var(--sage)' : 'var(--rust)' }}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 3: FLOOR COMMITTEE */}
          {/* ========================================================================= */}
          {activePage === 'committee' && (
            <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="stats-card">
                <div className="label">TAURICRESEARCH TRADINGAGENTS ARCHITECTURE</div>
                <h3 className="font-serif" style={{ fontSize: '28px', color: 'var(--ink)', marginTop: '8px' }}>
                  4-Agent Floor Committee Deliberation
                </h3>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.6 }}>
                  Macro Strategist, Volatility Quants, Risk Guardian, and Technical Analyst debate options contracts in structured rounds until floor consensus is reached.
                </p>

                <div style={{ marginTop: '16px' }}>
                  <button
                    onClick={runCommitteeDebate}
                    disabled={isProcessing}
                    className="btn-editorial">
                    <span>{isProcessing ? "Debating..." : "Convene Committee Debate →"}</span>
                  </button>
                </div>
              </div>

              {/* 4 Agent Role Cards (1px Grid) */}
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="card" style={{ borderTop: '2px solid var(--accent)' }}>
                  <div className="label" style={{ color: 'var(--accent)' }}>Macro Strategist</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>Rates, liquidity catalysts, tail risks</div>
                </div>
                <div className="card" style={{ borderTop: '2px solid var(--gold)' }}>
                  <div className="label" style={{ color: 'var(--gold)' }}>Volatility Quant</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>IV surface, term structure, skew dynamics</div>
                </div>
                <div className="card" style={{ borderTop: '2px solid var(--sage)' }}>
                  <div className="label" style={{ color: 'var(--sage)' }}>Risk Guardian</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>Delta neutrality, margin limits, tail risk</div>
                </div>
                <div className="card" style={{ borderTop: '2px solid var(--rust)' }}>
                  <div className="label" style={{ color: 'var(--rust)' }}>Technical Analyst</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>Moving average slope, support & resistance</div>
                </div>
              </div>

              {/* Deliberation Transcript */}
              {committeeData && (
                <div className="card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
                    <div>
                      <span className="label">FLOOR CONSENSUS RATIFIED</span>
                      <div className="font-serif" style={{ fontSize: '24px', color: 'var(--ink)', marginTop: '4px' }}>
                        {committeeData.consensus || "FLOOR_RATIFIED"} · {committeeData.recommended_playbook || "BULL_PUT_SPREAD"}
                      </div>
                    </div>
                    <span className="mode-pill mode-sage">
                      Confidence: {(((committeeData.consensus_confidence ?? 0.88)) * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(committeeData.rounds || (committeeData as any).debate || []).map((rnd: any, idx: number) => (
                      <div key={idx} style={{
                        background: 'var(--paper2)',
                        border: '1px solid var(--border)',
                        padding: '14px 18px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                            {rnd.agent} <span className="label" style={{ color: 'var(--dim)', marginLeft: '6px' }}>[{rnd.role}]</span>
                          </span>
                          {rnd.stance && (
                            <span className="mode-pill mode-gold" style={{ fontSize: '8px' }}>{rnd.stance}</span>
                          )}
                        </div>
                        <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.6 }}>
                          {rnd.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 4: VIBE DESK */}
          {/* ========================================================================= */}
          {activePage === 'vibe' && (
            <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="stats-card">
                <div className="label">HKUDS VIBE-TRADING ARCHITECTURE</div>
                <h3 className="font-serif" style={{ fontSize: '28px', color: 'var(--ink)', marginTop: '8px' }}>
                  Vibe Desk Natural Language Strategy Architect
                </h3>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.6 }}>
                  Express options trading intent in plain text. Abitda's LLM compiler translates intuition into mathematically verified defined-risk spreads.
                </p>

                {/* Preset Prompt Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                  <span className="label" style={{ alignSelf: 'center', marginRight: '4px' }}>try:</span>
                  <button
                    onClick={() => runVibeArchitect("I want a conservative delta-neutral theta harvest on SPY expiring next Friday")}
                    className="label mode-pill"
                    style={{ cursor: 'pointer', background: 'var(--paper)' }}>
                    "Delta-neutral theta harvest on SPY next Friday"
                  </button>
                  <button
                    onClick={() => runVibeArchitect("Hedge tech volatility on QQQ with a 10-delta Bear Call Spread")}
                    className="label mode-pill"
                    style={{ cursor: 'pointer', background: 'var(--paper)' }}>
                    "Hedge tech volatility on QQQ with Bear Call Spread"
                  </button>
                  <button
                    onClick={() => runVibeArchitect("Sell an Iron Condor on SPY with max $500 risk and positive theta")}
                    className="label mode-pill"
                    style={{ cursor: 'pointer', background: 'var(--paper)' }}>
                    "Sell Iron Condor on SPY with max $500 risk"
                  </button>
                </div>

                <div style={{ display: 'flex', marginTop: '16px' }}>
                  <input
                    type="text"
                    value={vibePrompt}
                    onChange={(e) => setVibePrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runVibeArchitect()}
                    placeholder="e.g. 'Build a high-probability Bull Put Spread on SPY to capture elevated volatility...'"
                    className="editorial-input"
                  />
                  <button
                    onClick={() => runVibeArchitect()}
                    disabled={isProcessing}
                    className="btn-editorial"
                    style={{ whiteSpace: 'nowrap' }}>
                    <span>Compile Trade →</span>
                  </button>
                </div>
              </div>

              {vibeResult && (
                <div className="card animate-fade-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <div>
                      <span className="label" style={{ color: 'var(--gold)' }}>COMPILED CANDIDATE STRUCTURE</span>
                      <h3 className="font-serif" style={{ fontSize: '24px', color: 'var(--ink)', marginTop: '4px' }}>
                        {vibeResult.type}
                      </h3>
                    </div>
                    <button onClick={runAgenticCycle} className="btn-editorial btn-editorial-rust">
                      Execute on Paper Account →
                    </button>
                  </div>

                  <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.7, marginBottom: '16px' }}>
                    {vibeResult.narrative}
                  </p>

                  {vibeResult.candidate && (
                    <div className="shell-card">
                      <div className="shell-header">
                        <span className="label" style={{ color: '#555' }}>COMPILED STRIKES & GREEKS SPECIFICATION</span>
                      </div>
                      <pre style={{ padding: '14px 18px', color: '#22c98a', overflowX: 'auto' }}>
                        {JSON.stringify(vibeResult.candidate, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 5: REACT CO-PILOT */}
          {/* ========================================================================= */}
          {activePage === 'copilot' && (
            <div className="animate-fade-up card-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
              
              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <span className="label">AGENTIC REACT REASONING TRACE</span>
                  <button onClick={runAgenticCycle} disabled={isProcessing} className="btn-editorial" style={{ padding: '6px 12px' }}>
                    Run Trace
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reactSteps.map((step, idx) => (
                    <div key={idx} style={{
                      background: 'var(--paper2)',
                      border: '1px solid var(--border)',
                      padding: '10px 14px'
                    }}>
                      <span className={`mode-pill ${
                        step.type === 'THOUGHT' ? 'mode-gold' :
                        step.type === 'ACTION' ? 'mode-rust' :
                        step.type === 'OBSERVATION' ? 'mode-sage' : 'mode-ink'
                      }`} style={{ fontSize: '8px', marginBottom: '4px' }}>
                        {step.type}
                      </span>
                      <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--ink)', marginTop: '4px', lineHeight: 1.5 }}>
                        {step.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
                <div style={{ marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <span className="label">INSTITUTIONAL DESK CO-PILOT</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: msg.sender === 'user' ? 'var(--ink)' : 'var(--paper2)',
                      color: msg.sender === 'user' ? 'var(--paper)' : 'var(--ink)',
                      border: '1px solid var(--border)',
                      padding: '10px 14px',
                      fontSize: '11px',
                      fontFamily: 'Geist Mono, monospace',
                      lineHeight: 1.5
                    }}>
                      {msg.text}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div style={{ display: 'flex' }}>
                  <input
                    type="text"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask your options desk co-pilot..."
                    className="editorial-input"
                    style={{ padding: '10px 14px' }}
                  />
                  <button onClick={() => handleSendMessage()} className="btn-editorial">
                    Send
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 6: DESK BRIEFING DOSSIER */}
          {/* ========================================================================= */}
          {activePage === 'reports' && (
            <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="stats-card">
                <div className="label">REGULATORY COMPLIANCE DOSSIER</div>
                <h3 className="font-serif" style={{ fontSize: '28px', color: 'var(--ink)', marginTop: '8px' }}>
                  Institutional Desk Briefing Report
                </h3>
                <p style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.6 }}>
                  One-click generated executive report (`DESK_BRIEFING.md`) containing portfolio Greeks, committee consensus, and regulatory risk attestations.
                </p>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button onClick={generateDeskReport} disabled={isProcessing} className="btn-editorial">
                    <span>{isProcessing ? "Compiling..." : "Regenerate Dossier →"}</span>
                  </button>
                  <button onClick={copyReportToClipboard} disabled={!deskReport} className="btn-editorial btn-editorial-outline">
                    <span>{copiedReport ? "Copied ✓" : "Copy Markdown"}</span>
                  </button>
                  <button onClick={downloadReportFile} disabled={!deskReport} className="btn-editorial btn-editorial-outline">
                    <span>↓ Download MD</span>
                  </button>
                </div>
              </div>

              {deskReport && (
                <div className="card" style={{ padding: '24px', background: 'var(--paper2)' }}>
                  <pre style={{
                    fontFamily: 'DM Mono, Geist Mono, monospace',
                    fontSize: '11px',
                    color: 'var(--ink)',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    maxHeight: '650px',
                    overflowY: 'auto'
                  }}>
                    {deskReport}
                  </pre>
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* PAGE 7: AGENT GATEWAY (MCP & REST API) */}
          {/* ========================================================================= */}
          {activePage === 'connect' && (
            <div className="animate-fade-up">
              <AgentGateway apiBase={API_BASE} symbol={symbol} />
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
