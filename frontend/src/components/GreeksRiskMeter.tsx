import React from 'react';

interface GreeksRiskMeterProps {
  netDelta: number;
  maxDelta: number;
  netVega: number;
  maxVega: number;
  netTheta: number;
  isSuspended: boolean;
}

export const GreeksRiskMeter: React.FC<GreeksRiskMeterProps> = ({
  netDelta,
  maxDelta = 0.25,
  netVega,
  maxVega = 150.0,
  netTheta,
  isSuspended
}) => {
  // Delta calculation: range -0.30 to +0.30, centered at 0 (50%)
  const deltaPct = Math.min(Math.max(((netDelta + maxDelta * 1.2) / (maxDelta * 2.4)) * 100, 0), 100);
  const deltaBreach = Math.abs(netDelta) > maxDelta;

  // Vega calculation: range 0 to 180, limit at 150
  const vegaPct = Math.min(Math.max((Math.abs(netVega) / (maxVega * 1.2)) * 100, 0), 100);
  const vegaBreach = Math.abs(netVega) > maxVega;

  return (
    <div style={{
      background: 'var(--paper2)',
      border: '1px solid var(--border)',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label" style={{ color: 'var(--ink)', fontWeight: 700 }}>
          FIDUCIARY GREEKS RISK BAROMETER
        </span>
        <span className={`mode-pill ${deltaBreach || vegaBreach || isSuspended ? 'mode-rust' : 'mode-sage'}`} style={{ fontSize: '8px' }}>
          {deltaBreach || vegaBreach ? 'VETO BREACH' : isSuspended ? 'SELF-LOCKED' : 'INVARIANTS NORMAL'}
        </span>
      </div>

      {/* DELTA GAUGE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'Geist Mono, monospace', marginBottom: '4px' }}>
          <span style={{ color: 'var(--dim)' }}>
            PORTFOLIO DELTA (Δ) <span style={{ color: deltaBreach ? 'var(--rust)' : 'var(--ink)', fontWeight: 700 }}>{netDelta > 0 ? `+${netDelta.toFixed(4)}` : netDelta.toFixed(4)}</span>
          </span>
          <span style={{ color: 'var(--dim)', fontSize: '9px' }}>LIMIT: ±{maxDelta.toFixed(2)}</span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div style={{ position: 'relative', height: '8px', background: 'rgba(0,0,0,0.06)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Safe center zone marker */}
          <div style={{
            position: 'absolute',
            left: '15%',
            width: '70%',
            height: '100%',
            background: 'rgba(61, 90, 71, 0.15)'
          }} />
          {/* Left/Right Veto zones */}
          <div style={{ position: 'absolute', left: '0', width: '15%', height: '100%', background: 'rgba(139, 58, 42, 0.2)' }} />
          <div style={{ position: 'absolute', right: '0', width: '15%', height: '100%', background: 'rgba(139, 58, 42, 0.2)' }} />

          {/* Active Delta Indicator Line */}
          <div style={{
            position: 'absolute',
            left: `${deltaPct}%`,
            top: 0,
            width: '3px',
            height: '100%',
            background: deltaBreach ? 'var(--rust)' : 'var(--ink)',
            boxShadow: deltaBreach ? '0 0 6px var(--rust)' : 'none',
            transform: 'translateX(-50%)',
            transition: 'all 0.3s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5px', fontFamily: 'Geist Mono, monospace', color: 'var(--dim)', marginTop: '2px' }}>
          <span>-0.30 (SHORT VETO)</span>
          <span>0.00 (DELTA NEUTRAL)</span>
          <span>+0.30 (LONG VETO)</span>
        </div>
      </div>

      {/* VEGA GAUGE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'Geist Mono, monospace', marginBottom: '4px' }}>
          <span style={{ color: 'var(--dim)' }}>
            PORTFOLIO VEGA (V) <span style={{ color: vegaBreach ? 'var(--rust)' : 'var(--ink)', fontWeight: 700 }}>{netVega.toFixed(1)}</span>
          </span>
          <span style={{ color: 'var(--dim)', fontSize: '9px' }}>LIMIT: {maxVega.toFixed(0)}</span>
        </div>

        <div style={{ position: 'relative', height: '8px', background: 'rgba(0,0,0,0.06)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* Safe zone */}
          <div style={{
            position: 'absolute',
            left: 0,
            width: `${(maxVega / (maxVega * 1.2)) * 100}%`,
            height: '100%',
            background: 'rgba(61, 90, 71, 0.15)'
          }} />
          {/* Veto threshold */}
          <div style={{
            position: 'absolute',
            right: 0,
            width: `${(1 - maxVega / (maxVega * 1.2)) * 100}%`,
            height: '100%',
            background: 'rgba(139, 58, 42, 0.2)'
          }} />

          {/* Active Vega Fill */}
          <div style={{
            width: `${vegaPct}%`,
            height: '100%',
            background: vegaBreach ? 'var(--rust)' : 'var(--gold)',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5px', fontFamily: 'Geist Mono, monospace', color: 'var(--dim)', marginTop: '2px' }}>
          <span>0.0 VEGA</span>
          <span style={{ color: 'var(--gold)' }}>SAFE EXPOSURE</span>
          <span style={{ color: 'var(--rust)' }}>150.0 HARD CAP</span>
        </div>
      </div>

      {/* DAILY THETA BADGE */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 10px',
        background: 'var(--paper)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--sage)', fontSize: '10px' }}>⏳</span>
          <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '9.5px', color: 'var(--ink)' }}>
            Net Daily Time Decay (Theta)
          </span>
        </div>
        <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', fontWeight: 700, color: 'var(--sage)' }}>
          +${netTheta.toFixed(2)}/day
        </span>
      </div>

    </div>
  );
};
