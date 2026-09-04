import React, { useState } from 'react';

interface AgentGatewayProps {
  apiBase: string;
  symbol: string;
}

export const AgentGateway: React.FC<AgentGatewayProps> = ({ apiBase, symbol }) => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'rest' | 'pypi' | 'frameworks'>('mcp');
  const [targetUrl, setTargetUrl] = useState<string>(
    apiBase || (window.location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : window.location.origin)
  );
  const [pingStatus, setPingStatus] = useState<{
    loading: boolean;
    success?: boolean;
    latencyMs?: number;
    statusText?: string;
    payload?: any;
    isHtmlNotice?: boolean;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // REST Playground State
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/telemetry');
  const [endpointParam, setEndpointParam] = useState<string>(symbol);
  const [requestBody, setRequestBody] = useState<string>(JSON.stringify({ symbol: "SPY", force_regime: null }, null, 2));
  const [isRunningRequest, setIsRunningRequest] = useState(false);
  const [apiResponse, setApiResponse] = useState<any | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePing = async () => {
    setPingStatus({ loading: true });
    const start = performance.now();
    try {
      const pingEndpoint = `${targetUrl.replace(/\/$/, '')}/api/health`;
      const res = await fetch(pingEndpoint, { method: 'GET' });
      const latencyMs = Math.round(performance.now() - start);
      const contentType = res.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const json = await res.json();
        setPingStatus({
          loading: false,
          success: true,
          latencyMs,
          statusText: `HTTP ${res.status} OK`,
          payload: json,
          isHtmlNotice: false
        });
      } else {
        const text = await res.text();
        // HTML returned (e.g. Railway SPA static fallback)
        setPingStatus({
          loading: false,
          success: false,
          latencyMs,
          statusText: `HTTP ${res.status} (SPA Fallback HTML)`,
          payload: text.slice(0, 300) + '...',
          isHtmlNotice: true
        });
      }
    } catch (e: any) {
      const latencyMs = Math.round(performance.now() - start);
      setPingStatus({
        loading: false,
        success: false,
        latencyMs,
        statusText: `Connection Failed: ${e.message || 'Network Error'}`,
        payload: { error: e.message || 'Ensure backend server is running and CORS is enabled' },
        isHtmlNotice: false
      });
    }
  };

  const handleRunPlaygroundRequest = async () => {
    setIsRunningRequest(true);
    setApiResponse(null);
    try {
      const url = `${targetUrl.replace(/\/$/, '')}${selectedEndpoint}${selectedEndpoint === '/api/telemetry' ? `?symbol=${endpointParam}` : ''}`;
      const isPost = selectedEndpoint.startsWith('/api/cycle') || 
                     selectedEndpoint.startsWith('/api/vibe/architect') || 
                     selectedEndpoint.startsWith('/api/harness/benchmark') ||
                     selectedEndpoint.startsWith('/api/agent/react');
      
      const res = await fetch(url, {
        method: isPost ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: isPost ? requestBody : undefined
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setApiResponse({ status: res.status, ok: res.ok, data });
      } else {
        const text = await res.text();
        setApiResponse({ status: res.status, ok: res.ok, rawText: text.slice(0, 500) });
      }
    } catch (e: any) {
      setApiResponse({ status: 500, ok: false, error: e.message });
    } finally {
      setIsRunningRequest(false);
    }
  };

  const claudeConfig = JSON.stringify({
    "mcpServers": {
      "abitda-options-harness": {
        "command": "python",
        "args": ["-m", "mcp_server"],
        "env": {
          "APCA_API_KEY_ID": "YOUR_ALPACA_KEY",
          "APCA_API_SECRET_KEY": "YOUR_ALPACA_SECRET",
          "APCA_API_BASE_URL": "https://paper-api.alpaca.markets"
        }
      }
    }
  }, null, 2);

  const cursorConfig = JSON.stringify({
    "mcpServers": {
      "abitda-harness": {
        "command": "abitda-mcp",
        "env": {}
      }
    }
  }, null, 2);

  const pythonSnippet = `import requests

BASE_URL = "${targetUrl.replace(/\/$/, '')}"

# 1. Fetch live market telemetry and regime classification
telemetry = requests.get(f"{BASE_URL}/api/telemetry?symbol=SPY").json()
print("Regime:", telemetry["regime"]["regime"])
print("IV Percentile:", telemetry["telemetry"]["iv_percentile"])

# 2. Benchmark your agent against Black Swan shock (August 5, 2024 Yen Unwind)
benchmark = requests.post(f"{BASE_URL}/api/harness/benchmark", json={
    "agent_id": "committee",
    "scenario_id": "aug5_2024"
}).json()
print("Certification Grade:", benchmark["scorecard"]["certification_grade"])
print("Max Drawdown:", benchmark["scorecard"]["max_drawdown_pct"], "%")

# 3. Compile natural language market thesis into defined-risk options spread
spread = requests.post(f"{BASE_URL}/api/vibe/architect", json={
    "prompt": "Elevated volatility on tech earnings, expect high IV crush but rangebound SPY",
    "symbol": "SPY"
}).json()
print("Compiled Playbook:", spread["candidate"]["strategy_type"])
`;

  const curlSnippet = `# 1. Ping Health
curl -X GET "${targetUrl.replace(/\/$/, '')}/api/health"

# 2. Query Account Status & Live Book Greeks (Delta, Vega, Theta)
curl -X GET "${targetUrl.replace(/\/$/, '')}/api/status"

# 3. Market Telemetry & Volatility Regime
curl -X GET "${targetUrl.replace(/\/$/, '')}/api/telemetry?symbol=SPY"

# 4. Trigger 4-Agent Floor Committee Deliberation
curl -X GET "${targetUrl.replace(/\/$/, '')}/api/agent/committee?symbol=SPY"

# 5. Execute 11-Step ReAct Autonomous Trading Cycle
curl -X POST "${targetUrl.replace(/\/$/, '')}/api/agent/react?symbol=SPY" \\
  -H "Content-Type: application/json"
`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Editorial Header Banner */}
      <div className="card" style={{ padding: '24px', background: 'var(--paper)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="label" style={{ color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: '6px' }}>
              PROTOCOL INTEROPERABILITY & AGENT GATEWAY
            </div>
            <h1 className="font-serif" style={{ fontSize: '28px', color: 'var(--ink)', margin: 0, fontWeight: 400 }}>
              Connect External AI Agents to the Abitda Harness
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--dim)', maxWidth: '640px', lineHeight: 1.6 }}>
              Abitda exposes dual institutional interfaces: an ultra-low latency <strong>FastAPI REST Engine</strong> and an official <strong>Model Context Protocol (FastMCP)</strong> server. Any autonomous agent—from Claude Desktop to Cursor, LangChain swarms, and custom Python quant bots—can query real-time Greeks, inspect regimes, trigger Black Swan stress benchmarks, and execute risk-gated paper trades.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ padding: '6px 12px', border: '1px solid var(--border)', background: '#fff', fontSize: '10px', fontFamily: 'Geist Mono, monospace' }}>
              <span style={{ color: 'var(--dim)' }}>PROTOCOL: </span>
              <strong style={{ color: 'var(--gold)' }}>FastMCP 1.2</strong>
            </div>
            <div style={{ padding: '6px 12px', border: '1px solid var(--border)', background: '#fff', fontSize: '10px', fontFamily: 'Geist Mono, monospace' }}>
              <span style={{ color: 'var(--dim)' }}>REST API: </span>
              <strong style={{ color: 'var(--sage)' }}>FastAPI v2.0</strong>
            </div>
            <div style={{ padding: '6px 12px', border: '1px solid var(--border)', background: '#fff', fontSize: '10px', fontFamily: 'Geist Mono, monospace' }}>
              <span style={{ color: 'var(--dim)' }}>PYPI: </span>
              <strong style={{ color: 'var(--ink)' }}>pip install abitda</strong>
            </div>
          </div>
        </div>

        {/* Live Target Endpoint Barometer */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="label" style={{ minWidth: '100px', color: 'var(--ink)' }}>TARGET ENDPOINT:</span>
          
          <div style={{ flex: 1, minWidth: '280px', display: 'flex', border: '1px solid var(--border)', background: '#fff' }}>
            <input 
              type="text" 
              value={targetUrl} 
              onChange={e => setTargetUrl(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                padding: '8px 12px',
                fontFamily: 'Geist Mono, monospace',
                fontSize: '11px',
                outline: 'none',
                background: 'transparent'
              }}
              placeholder="https://abitda-production.up.railway.app or http://127.0.0.1:8000"
            />
            <button 
              onClick={() => setTargetUrl('https://abitda-production.up.railway.app')}
              className="btn btn-ghost"
              style={{ border: 'none', borderLeft: '1px solid var(--border)', fontSize: '9px', padding: '0 8px', borderRadius: 0 }}
              title="Set to Railway Live URL"
            >
              Railway Live
            </button>
            <button 
              onClick={() => setTargetUrl('http://127.0.0.1:8000')}
              className="btn btn-ghost"
              style={{ border: 'none', borderLeft: '1px solid var(--border)', fontSize: '9px', padding: '0 8px', borderRadius: 0 }}
              title="Set to Local Uvicorn"
            >
              Localhost:8000
            </button>
          </div>

          <button 
            onClick={handlePing} 
            disabled={pingStatus?.loading}
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '8px 16px', gap: '6px' }}
          >
            {pingStatus?.loading ? 'Probing...' : '⚡ Ping Endpoint'}
          </button>
        </div>

        {/* Live Ping Diagnostics Result */}
        {pingStatus && (
          <div style={{
            marginTop: '12px',
            padding: '12px 16px',
            background: pingStatus.success ? 'rgba(61, 90, 71, 0.05)' : pingStatus.isHtmlNotice ? 'rgba(201, 168, 76, 0.08)' : 'rgba(139, 58, 42, 0.08)',
            border: `1px solid ${pingStatus.success ? 'var(--sage)' : pingStatus.isHtmlNotice ? 'var(--gold)' : 'var(--rust)'}`,
            fontSize: '11px',
            fontFamily: 'Geist Mono, monospace',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: pingStatus.success ? 'var(--sage)' : pingStatus.isHtmlNotice ? 'var(--gold)' : 'var(--rust)',
                  display: 'inline-block'
                }} />
                <strong>{pingStatus.statusText}</strong>
              </div>
              <span style={{ color: 'var(--dim)' }}>Latency: {pingStatus.latencyMs} ms</span>
            </div>

            {pingStatus.isHtmlNotice && (
              <div style={{ color: 'var(--ink)', fontSize: '10.5px', marginTop: '4px', lineHeight: 1.4 }}>
                <strong>Railway Deployment Note:</strong> This endpoint is currently routed to Railway's static web edge (<code>railway-hikari</code>), which serves the React dashboard SPA. To route live REST calls directly to Python FastAPI, point this gateway to the Uvicorn container or run <code>python server.py</code> locally.
              </div>
            )}

            {pingStatus.payload && (
              <pre style={{ margin: '4px 0 0 0', padding: '6px', background: '#fff', border: '1px solid var(--border)', fontSize: '10px', overflowX: 'auto' }}>
                {typeof pingStatus.payload === 'object' ? JSON.stringify(pingStatus.payload, null, 2) : pingStatus.payload}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '4px' }}>
        {[
          { id: 'mcp', label: 'Model Context Protocol (MCP)', badge: 'FastMCP' },
          { id: 'rest', label: 'REST API & Interactive Playground', badge: 'FastAPI' },
          { id: 'pypi', label: 'Python SDK (pip install abitda)', badge: 'v2.0.0' },
          { id: 'frameworks', label: 'Agent Swarms (LangChain / CrewAI)', badge: 'SDK' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className="btn btn-ghost"
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--ink)' : '2px solid transparent',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: '11px',
              fontFamily: 'Geist Mono, monospace',
              color: activeTab === tab.id ? 'var(--ink)' : 'var(--dim)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderRadius: 0
            }}
          >
            {tab.label}
            <span style={{
              fontSize: '8px',
              padding: '1px 4px',
              background: activeTab === tab.id ? 'var(--ink)' : 'var(--border)',
              color: activeTab === tab.id ? '#fff' : 'var(--dim)'
            }}>
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MODEL CONTEXT PROTOCOL (MCP) */}
      {/* ========================================================================= */}
      {activeTab === 'mcp' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          
          {/* Claude Desktop & Cursor Integration */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="label" style={{ color: 'var(--gold)' }}>CLAUDE DESKTOP INTEGRATION</div>
                <h3 className="font-serif" style={{ fontSize: '18px', margin: '4px 0 0 0', fontWeight: 400 }}>
                  claude_desktop_config.json
                </h3>
              </div>
              <button 
                onClick={() => copyToClipboard(claudeConfig, 'claude')}
                className="btn btn-ghost"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                {copiedKey === 'claude' ? '✓ Copied' : 'Copy JSON'}
              </button>
            </div>
            
            <p style={{ fontSize: '11px', color: 'var(--dim)', margin: 0 }}>
              Add Abitda to Claude Desktop to let Claude directly monitor volatility regimes, evaluate Black-Scholes Greeks, audit options risk, and run backtests.
            </p>

            <div style={{ position: 'relative' }}>
              <pre style={{
                background: '#0a0a0a',
                color: '#f5f2eb',
                padding: '14px',
                fontSize: '10.5px',
                fontFamily: 'Geist Mono, monospace',
                overflowX: 'auto',
                border: '1px solid #222',
                margin: 0
              }}>
                {claudeConfig}
              </pre>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="label" style={{ color: 'var(--ink)' }}>CURSOR IDE CONFIGURATION</span>
                <button 
                  onClick={() => copyToClipboard(cursorConfig, 'cursor')}
                  className="btn btn-ghost"
                  style={{ fontSize: '9px', padding: '2px 6px' }}
                >
                  {copiedKey === 'cursor' ? '✓ Copied' : 'Copy Cursor Config'}
                </button>
              </div>
              <pre style={{
                background: '#faf8f5',
                padding: '10px',
                fontSize: '10px',
                fontFamily: 'Geist Mono, monospace',
                border: '1px solid var(--border)',
                margin: 0
              }}>
                {cursorConfig}
              </pre>
            </div>
          </div>

          {/* Exposed MCP Tools Catalog */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div className="label" style={{ color: 'var(--sage)' }}>EXPOSED MCP TOOLS</div>
              <h3 className="font-serif" style={{ fontSize: '18px', margin: '4px 0 0 0', fontWeight: 400 }}>
                Autonomous Tools Registered in FastMCP
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {[
                {
                  name: 'get_market_regime(symbol="SPY")',
                  desc: 'Classifies current market state into RANGE_BOUND, TRENDING, or EVENT_RISK using VIX, 21d realized vol, and IV percentile.',
                  tag: 'TELEMETRY'
                },
                {
                  name: 'audit_portfolio_greeks(proposed_delta, proposed_vega)',
                  desc: 'Fiduciary risk gate. Enforces strict aggregate book caps: Net Delta (±0.25) and Net Vega (150). Returns APPROVE or VETO.',
                  tag: 'RISK GATE'
                },
                {
                  name: 'benchmark_agent_scenario(agent_type, scenario_id)',
                  desc: 'Executes Black Swan stress replay (Aug 5 2024, Volmageddon 2018, COVID Crash, SVB Failure). Returns quantitative scorecard with Grade A+ to F.',
                  tag: 'HARNESS'
                },
                {
                  name: 'run_autonomous_cycle(symbol="SPY")',
                  desc: 'Executes the full 5-step institutional trading cycle on Alpaca paper broker: scan, playbook, Greeks gate, order execution.',
                  tag: 'TRADING'
                },
                {
                  name: 'get_guardian_status()',
                  desc: 'Surveils rolling 10-trade win rate against the 70.0% theoretical fiduciary floor. Triggers autonomous circuit breaker if breached.',
                  tag: 'FIDUCIARY'
                },
                {
                  name: 'replay_black_swan_event()',
                  desc: 'Replays the Aug 5 2024 Yen Carry crash. Contrasts naive strategy (-43.8% drawdown) with Abitda regime-flip exit (-1.24% scratch).',
                  tag: 'SIMULATION'
                },
                {
                  name: 'ask_desk_quant(question)',
                  desc: 'Queries Gemini floor quant for plain-English options rationale, volatility smile analysis, and capital allocation advice.',
                  tag: 'COPILOT'
                }
              ].map((tool, i) => (
                <div key={i} style={{ padding: '10px 12px', border: '1px solid var(--border)', background: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
                      {tool.name}
                    </span>
                    <span style={{ fontSize: '8px', padding: '1px 5px', border: '1px solid var(--border)', color: 'var(--dim)' }}>
                      {tool.tag}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--dim)', lineHeight: 1.4 }}>
                    {tool.desc}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ background: '#faf8f5', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '10.5px', color: 'var(--dim)' }}>
              <strong>CLI Direct Launch:</strong> Run <code>python mcp_server.py</code> to start the stdio server directly from any terminal or agent orchestrator.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REST API & PLAYGROUND */}
      {/* ========================================================================= */}
      {activeTab === 'rest' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
          
          {/* Interactive Playground Controller */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--sage)' }}>LIVE REST API PLAYGROUND</div>
              <h3 className="font-serif" style={{ fontSize: '18px', margin: '4px 0 0 0', fontWeight: 400 }}>
                Test Abitda Endpoints Live in Browser
              </h3>
            </div>

            {/* Endpoint Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="label" style={{ color: 'var(--ink)' }}>CHOOSE ENDPOINT:</span>
              <select 
                value={selectedEndpoint} 
                onChange={e => {
                  setSelectedEndpoint(e.target.value);
                  if (e.target.value === '/api/harness/benchmark') {
                    setRequestBody(JSON.stringify({ agent_id: "committee", scenario_id: "aug5_2024" }, null, 2));
                  } else if (e.target.value === '/api/vibe/architect') {
                    setRequestBody(JSON.stringify({ prompt: "Elevated volatility on tech earnings, expect high IV crush but rangebound SPY", symbol: "SPY" }, null, 2));
                  } else if (e.target.value === '/api/cycle') {
                    setRequestBody(JSON.stringify({ symbol: "SPY", force_regime: null }, null, 2));
                  }
                }}
                style={{
                  padding: '8px 10px',
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: '11px',
                  border: '1px solid var(--border)',
                  background: '#fff',
                  outline: 'none'
                }}
              >
                <option value="/api/health">GET /api/health (Service status & timestamp)</option>
                <option value="/api/status">GET /api/status (Live account & aggregate book Greeks)</option>
                <option value="/api/telemetry">GET /api/telemetry (Spot, VIX, IV percentile, regime)</option>
                <option value="/api/trades">GET /api/trades (Open & closed ledger)</option>
                <option value="/api/events">GET /api/events (Audit event stream)</option>
                <option value="/api/agent/committee">GET /api/agent/committee (4-Agent Floor Committee)</option>
                <option value="/api/harness/benchmark">POST /api/harness/benchmark (Black Swan stress test)</option>
                <option value="/api/vibe/architect">POST /api/vibe/architect (Natural language strategy compiler)</option>
                <option value="/api/agent/react">POST /api/agent/react (11-step ReAct trading loop)</option>
              </select>
            </div>

            {/* Params / Body Inputs */}
            {selectedEndpoint === '/api/telemetry' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="label" style={{ color: 'var(--ink)' }}>SYMBOL QUERY PARAM:</span>
                <input 
                  type="text" 
                  value={endpointParam} 
                  onChange={e => setEndpointParam(e.target.value.toUpperCase())}
                  style={{
                    padding: '8px 10px',
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: '11px',
                    border: '1px solid var(--border)',
                    outline: 'none'
                  }}
                  placeholder="SPY or QQQ"
                />
              </div>
            )}

            {(selectedEndpoint.startsWith('/api/harness/benchmark') || 
              selectedEndpoint.startsWith('/api/vibe/architect') || 
              selectedEndpoint.startsWith('/api/cycle')) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="label" style={{ color: 'var(--ink)' }}>JSON REQUEST BODY:</span>
                <textarea 
                  rows={5}
                  value={requestBody} 
                  onChange={e => setRequestBody(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: '10.5px',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}

            <button 
              onClick={handleRunPlaygroundRequest}
              disabled={isRunningRequest}
              className="btn btn-primary"
              style={{ padding: '10px 16px', fontSize: '11px', gap: '6px' }}
            >
              {isRunningRequest ? 'Sending Request...' : '▶ Execute Live Request'}
            </button>

            {/* Live Response Panel */}
            {apiResponse && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="label" style={{ color: apiResponse.ok ? 'var(--sage)' : 'var(--rust)' }}>
                    RESPONSE (HTTP {apiResponse.status})
                  </span>
                  <button 
                    onClick={() => copyToClipboard(JSON.stringify(apiResponse.data || apiResponse.rawText, null, 2), 'resp')}
                    className="btn btn-ghost"
                    style={{ fontSize: '9px', padding: '2px 6px' }}
                  >
                    {copiedKey === 'resp' ? '✓ Copied' : 'Copy Response'}
                  </button>
                </div>
                <pre style={{
                  background: '#0a0a0a',
                  color: apiResponse.ok ? '#4ade80' : '#f87171',
                  padding: '12px',
                  fontSize: '10px',
                  fontFamily: 'Geist Mono, monospace',
                  overflowX: 'auto',
                  maxHeight: '260px',
                  border: '1px solid #222',
                  margin: 0
                }}>
                  {apiResponse.data ? JSON.stringify(apiResponse.data, null, 2) : (apiResponse.rawText || apiResponse.error)}
                </pre>
              </div>
            )}
          </div>

          {/* cURL & Code Snippets */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="label" style={{ color: 'var(--ink)' }}>REST COMMAND REFERENCE</div>
                <h3 className="font-serif" style={{ fontSize: '18px', margin: '4px 0 0 0', fontWeight: 400 }}>
                  Ready-to-Run cURL Commands
                </h3>
              </div>
              <button 
                onClick={() => copyToClipboard(curlSnippet, 'curl')}
                className="btn btn-ghost"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                {copiedKey === 'curl' ? '✓ Copied' : 'Copy cURL'}
              </button>
            </div>

            <pre style={{
              background: '#0a0a0a',
              color: '#f5f2eb',
              padding: '14px',
              fontSize: '10.5px',
              fontFamily: 'Geist Mono, monospace',
              overflowX: 'auto',
              border: '1px solid #222',
              margin: 0,
              maxHeight: '280px'
            }}>
              {curlSnippet}
            </pre>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="label" style={{ color: 'var(--gold)' }}>PYTHON REQUESTS SNIPPET</span>
                <button 
                  onClick={() => copyToClipboard(pythonSnippet, 'python')}
                  className="btn btn-ghost"
                  style={{ fontSize: '9px', padding: '2px 6px' }}
                >
                  {copiedKey === 'python' ? '✓ Copied' : 'Copy Python'}
                </button>
              </div>
              <pre style={{
                background: '#faf8f5',
                padding: '12px',
                fontSize: '10px',
                fontFamily: 'Geist Mono, monospace',
                border: '1px solid var(--border)',
                margin: 0,
                maxHeight: '220px',
                overflowX: 'auto'
              }}>
                {pythonSnippet}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PYPI SDK INTEGRATION */}
      {/* ========================================================================= */}
      {activeTab === 'pypi' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div className="label" style={{ color: 'var(--gold)' }}>OFFICIAL PYPI PACKAGE</div>
              <h3 className="font-serif" style={{ fontSize: '20px', margin: '4px 0 0 0', fontWeight: 400 }}>
                Install Directly into Any Python Environment
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: '#0a0a0a', border: '1px solid #222', padding: '10px 14px' }}>
              <code style={{ color: '#c9a84c', fontFamily: 'Geist Mono, monospace', fontSize: '13px', flex: 1 }}>
                pip install abitda
              </code>
              <button 
                onClick={() => copyToClipboard('pip install abitda', 'pip')}
                className="btn btn-ghost"
                style={{ color: '#fff', fontSize: '10px', padding: '4px 8px', border: '1px solid #444' }}
              >
                {copiedKey === 'pip' ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <p style={{ fontSize: '11.5px', color: 'var(--dim)', margin: 0, lineHeight: 1.5 }}>
              The <code>abitda</code> package contains the complete autonomous harness, Black-Scholes Greeks calculators, market shock scenarios, and agent committee debate engine without requiring a web browser.
            </p>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <span className="label" style={{ color: 'var(--ink)' }}>AVAILABLE PACKAGE SUBMODULES:</span>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px', fontSize: '11px', color: 'var(--dim)', lineHeight: 1.7 }}>
                <li><code>abitda.harness</code>: <code>HarnessEvaluator</code>, <code>ScenarioRegistry</code>, <code>AgentScorecard</code></li>
                <li><code>abitda.agents</code>: <code>DeskCommittee</code>, <code>VibeStrategyArchitect</code>, <code>AgenticCoPilot</code></li>
                <li><code>abitda.core</code>: <code>AbitdaEngine</code>, <code>MarketReader</code>, <code>GreeksGate</code>, <code>ExecutionEngine</code></li>
                <li><code>abitda.risk</code>: <code>GuardianCircuitBreaker</code>, <code>BlackScholesGreeks</code></li>
              </ul>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="label" style={{ color: 'var(--sage)' }}>IN-PROCESS AGENT HARNESS TESTING</div>
                <h3 className="font-serif" style={{ fontSize: '18px', margin: '4px 0 0 0', fontWeight: 400 }}>
                  Evaluate Custom Candidate Agents
                </h3>
              </div>
              <button 
                onClick={() => copyToClipboard(`from abitda.harness.evaluator import HarnessEvaluator
from abitda.harness.scenarios import ScenarioRegistry

evaluator = HarnessEvaluator()
scenario = ScenarioRegistry.get_scenario("aug5_2024")

class MyCustomAgent:
    name = "MyDeepSeekQuant"
    def evaluate_market(self, bar, open_trades, cash):
        # Your custom logic here
        return []

scorecard = evaluator.evaluate_agent(MyCustomAgent(), scenario)
print(f"Drawdown: {scorecard.max_drawdown_pct}% | Grade: {scorecard.certification_grade}")
`, 'harness_code')}
                className="btn btn-ghost"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                {copiedKey === 'harness_code' ? '✓ Copied' : 'Copy Code'}
              </button>
            </div>

            <pre style={{
              background: '#0a0a0a',
              color: '#f5f2eb',
              padding: '14px',
              fontSize: '10px',
              fontFamily: 'Geist Mono, monospace',
              overflowX: 'auto',
              border: '1px solid #222',
              margin: 0
            }}>
{`from abitda.harness.evaluator import HarnessEvaluator
from abitda.harness.scenarios import ScenarioRegistry

evaluator = HarnessEvaluator()
scenario = ScenarioRegistry.get_scenario("aug5_2024")

# Benchmark your custom LLM or RL agent
class MyCustomAgent:
    name = "MyDeepSeekQuant"
    def evaluate_market(self, bar, open_trades, cash):
        # Custom regime and options leg logic
        return []

scorecard = evaluator.evaluate_agent(MyCustomAgent(), scenario)
print("Grade:", scorecard.certification_grade)
print("Max Drawdown:", scorecard.max_drawdown_pct, "%")`}
            </pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AGENT FRAMEWORKS (LANGCHAIN / CREWAI / OPENAI) */}
      {/* ========================================================================= */}
      {activeTab === 'frameworks' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          
          {/* LangChain Tool Definition */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="label" style={{ color: 'var(--ink)' }}>LANGCHAIN / LANGGRAPH TOOL</div>
                <h3 className="font-serif" style={{ fontSize: '18px', margin: '4px 0 0 0', fontWeight: 400 }}>
                  LangChain @tool Integration
                </h3>
              </div>
              <button 
                onClick={() => copyToClipboard(`from langchain.tools import tool
import requests

@tool
def check_abitda_regime(symbol: str = "SPY") -> dict:
    """Queries Abitda options engine to get real-time spot, VIX, IV percentile, and classified regime."""
    res = requests.get(f"${targetUrl.replace(/\/$/, '')}/api/telemetry?symbol={symbol}")
    return res.json()

@tool
def audit_trade_greeks(proposed_delta: float, proposed_vega: float) -> dict:
    """Evaluates proposed trade against Net Delta (±0.25) and Net Vega (150) fiduciary barriers."""
    res = requests.post(f"${targetUrl.replace(/\/$/, '')}/api/demo/veto")
    return res.json()
`, 'langchain')}
                className="btn btn-ghost"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                {copiedKey === 'langchain' ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <pre style={{
              background: '#0a0a0a',
              color: '#f5f2eb',
              padding: '12px',
              fontSize: '10px',
              fontFamily: 'Geist Mono, monospace',
              overflowX: 'auto',
              border: '1px solid #222',
              margin: 0
            }}>
{`from langchain.tools import tool
import requests

@tool
def check_abitda_regime(symbol: str = "SPY") -> dict:
    """Queries Abitda options engine to get real-time spot, VIX, and regime."""
    res = requests.get(f"${targetUrl.replace(/\/$/, '')}/api/telemetry?symbol={symbol}")
    return res.json()

@tool
def audit_trade_greeks(delta: float, vega: float) -> dict:
    """Evaluates proposed trade against aggregate book Greeks limits."""
    res = requests.get(f"${targetUrl.replace(/\/$/, '')}/api/status")
    return res.json()`}
            </pre>
          </div>

          {/* OpenAI Function Calling Schema */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="label" style={{ color: 'var(--gold)' }}>OPENAI FUNCTION CALLING</div>
                <h3 className="font-serif" style={{ fontSize: '18px', margin: '4px 0 0 0', fontWeight: 400 }}>
                  Tools Schema for GPT-4o / Claude
                </h3>
              </div>
              <button 
                onClick={() => copyToClipboard(`[
  {
    "type": "function",
    "function": {
      "name": "get_market_telemetry",
      "description": "Fetches live spot price, VIX, IV percentile, and volatility regime from Abitda options harness.",
      "parameters": {
        "type": "object",
        "properties": {
          "symbol": { "type": "string", "description": "Ticker symbol e.g. SPY or QQQ" }
        },
        "required": ["symbol"]
      }
    }
  }
]`, 'openai')}
                className="btn btn-ghost"
                style={{ fontSize: '10px', padding: '4px 8px' }}
              >
                {copiedKey === 'openai' ? '✓ Copied' : 'Copy'}
              </button>
            </div>

            <pre style={{
              background: '#0a0a0a',
              color: '#f5f2eb',
              padding: '12px',
              fontSize: '10px',
              fontFamily: 'Geist Mono, monospace',
              overflowX: 'auto',
              border: '1px solid #222',
              margin: 0
            }}>
{`[
  {
    "type": "function",
    "function": {
      "name": "get_market_telemetry",
      "description": "Fetches live spot price, VIX, and volatility regime from Abitda options harness.",
      "parameters": {
        "type": "object",
        "properties": {
          "symbol": { "type": "string", "description": "Ticker symbol e.g. SPY or QQQ" }
        },
        "required": ["symbol"]
      }
    }
  }
]`}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
};
