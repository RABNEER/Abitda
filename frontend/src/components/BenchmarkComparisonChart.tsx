import React, { useState } from 'react';

interface AgentScore {
  name: string;
  type: string;
  grade: string;
  preserved: number;
  drawdown: number;
  breaches: number;
  certified: boolean;
}

const DEFAULT_AGENTS: AgentScore[] = [
  {
    name: "Abitda Floor Committee",
    type: "Multi-Agent ReAct",
    grade: "A+",
    preserved: 100.0,
    drawdown: 0.0,
    breaches: 0,
    certified: true
  },
  {
    name: "Vibe Desk Architect",
    type: "NLP Defined-Risk",
    grade: "A",
    preserved: 98.5,
    drawdown: 1.5,
    breaches: 0,
    certified: true
  },
  {
    name: "Passive Theta Farmer",
    type: "Naive Baseline",
    grade: "D",
    preserved: 64.2,
    drawdown: 35.8,
    breaches: 4,
    certified: false
  },
  {
    name: "Naive Momentum Bot",
    type: "Unhedged Longs",
    grade: "F",
    preserved: 55.0,
    drawdown: 45.0,
    breaches: 8,
    certified: false
  }
];

export const BenchmarkComparisonChart: React.FC<{ scenarioName?: string }> = ({
  scenarioName = "August 5, 2024 Yen Carry Crash"
}) => {
  const [metric, setMetric] = useState<'preserved' | 'drawdown'>('preserved');

  return (
    <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--paper)'
      }}>
        <div>
          <span className="label" style={{ color: 'var(--gold)' }}>CROSS-AGENT BENCHMARK MATRIX</span>
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
            Stress Replay: {scenarioName}
          </div>
        </div>

        {/* Metric Switcher */}
        <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setMetric('preserved')}
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              padding: '5px 12px',
              border: 'none',
              cursor: 'pointer',
              background: metric === 'preserved' ? 'var(--ink)' : 'transparent',
              color: metric === 'preserved' ? 'var(--paper)' : 'var(--muted)',
              borderRight: '1px solid var(--border)'
            }}>
            Capital Preserved (%)
          </button>
          <button
            onClick={() => setMetric('drawdown')}
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              padding: '5px 12px',
              border: 'none',
              cursor: 'pointer',
              background: metric === 'drawdown' ? 'var(--ink)' : 'transparent',
              color: metric === 'drawdown' ? 'var(--paper)' : 'var(--muted)'
            }}>
            Max Drawdown (%)
          </button>
        </div>
      </div>

      {/* Comparative Bar Chart Body */}
      <div style={{ padding: '20px', background: 'var(--paper2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {DEFAULT_AGENTS.map((agent, idx) => {
          const isAbitda = idx < 2;
          const val = metric === 'preserved' ? agent.preserved : agent.drawdown;
          const barColor = metric === 'preserved'
            ? (val >= 95 ? 'var(--sage)' : val >= 70 ? 'var(--gold)' : 'var(--rust)')
            : (val <= 5 ? 'var(--sage)' : val <= 20 ? 'var(--gold)' : 'var(--rust)');

          return (
            <div key={agent.name} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              
              {/* Row Header: Name, Type, Grade & Value */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: 'Geist Mono, monospace' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: isAbitda ? 'var(--ink)' : 'var(--dim)' }}>
                    {agent.name}
                  </span>
                  <span className="label" style={{ color: 'var(--dim)' }}>
                    ({agent.type})
                  </span>
                  <span className={`mode-pill ${agent.certified ? 'mode-sage' : 'mode-rust'}`} style={{ fontSize: '8px', padding: '1px 5px' }}>
                    {agent.certified ? 'CERTIFIED' : 'FAILED'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '11px',
                    color: agent.grade.includes('A') ? 'var(--sage)' : 'var(--rust)'
                  }}>
                    GRADE {agent.grade}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: barColor }}>
                    {metric === 'preserved' ? `${val.toFixed(1)}%` : `-${val.toFixed(1)}%`}
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div style={{
                position: 'relative',
                height: '14px',
                background: 'rgba(0,0,0,0.06)',
                border: '1px solid var(--border)',
                overflow: 'hidden'
              }}>
                {/* 100% baseline marker for Capital Preserved */}
                {metric === 'preserved' && (
                  <div style={{
                    position: 'absolute',
                    left: '95%',
                    width: '1px',
                    height: '100%',
                    background: 'var(--sage)',
                    zIndex: 2,
                    opacity: 0.7
                  }} />
                )}

                {/* Animated Fill Bar */}
                <div style={{
                  width: `${val}%`,
                  height: '100%',
                  background: barColor,
                  transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>

            </div>
          );
        })}

        {/* Chart Note */}
        <div style={{
          marginTop: '6px',
          padding: '10px 14px',
          background: 'var(--paper)',
          borderLeft: '3px solid var(--gold)',
          fontSize: '10px',
          fontFamily: 'Geist Mono, monospace',
          color: 'var(--muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>
            Institutional Standard: Fiduciary grade requires &gt;95% capital preserved and &le;5% shock drawdown.
          </span>
          <span style={{ color: 'var(--sage)', fontWeight: 600 }}>
            ABITDA DESK: 100% CAPITAL SHIELD ACTIVE
          </span>
        </div>

      </div>

    </div>
  );
};
