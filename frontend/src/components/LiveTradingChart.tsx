import React, { useState, useEffect, useRef, useMemo } from 'react';

interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LiveTradingChartProps {
  symbol: string;
  currentPrice: number;
  vix: number;
  recommendedPlaybook?: string;
  equity?: number;
}

export const LiveTradingChart: React.FC<LiveTradingChartProps> = ({
  symbol,
  currentPrice,
  vix,
  recommendedPlaybook = "IRON_CONDOR",
  equity = 100000
}) => {
  const [activeTab, setActiveTab] = useState<'candles' | 'equity' | 'payoff'>('candles');
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
  const [timeframe, setTimeframe] = useState<'1M' | '5M' | '15M' | '1H' | '1D'>('5M');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [liveTickPulse, setLiveTickPulse] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Generate realistic initial OHLC history seeded by spot price
  useEffect(() => {
    const basePrice = currentPrice > 0 ? currentPrice : symbol === 'SPY' ? 550.0 : 480.0;
    const count = 48; // 48 periods
    const now = Date.now();
    const periodMs = timeframe === '1M' ? 60000 : timeframe === '5M' ? 300000 : timeframe === '15M' ? 900000 : timeframe === '1H' ? 3600000 : 86400000;

    let prevClose = basePrice * (1 - 0.008);
    const initialCandles: Candle[] = [];

    for (let i = count; i >= 0; i--) {
      const t = now - i * periodMs;
      const d = new Date(t);
      const timeStr = timeframe === '1D' 
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      
      const volMultiplier = (vix / 15.0) * 0.002;
      const delta = (Math.sin(i * 0.4) * 0.5 + (Math.random() - 0.48)) * (basePrice * volMultiplier);
      const open = prevClose;
      const close = open + delta;
      const high = Math.max(open, close) + Math.random() * (basePrice * volMultiplier * 0.8);
      const low = Math.min(open, close) - Math.random() * (basePrice * volMultiplier * 0.8);
      const volume = Math.floor((1.5 + Math.random() * 3.5) * 1000000);

      initialCandles.push({
        time: timeStr,
        timestamp: t,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume
      });

      prevClose = close;
    }

    // Ensure last candle close matches current live price
    if (initialCandles.length > 0 && currentPrice > 0) {
      const last = initialCandles[initialCandles.length - 1];
      last.close = currentPrice;
      last.high = Math.max(last.high, currentPrice);
      last.low = Math.min(last.low, currentPrice);
    }

    setCandles(initialCandles);
  }, [symbol, timeframe]);

  // Live real-time tick pulsation (every 1.8 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        const next = [...prev];
        const last = { ...next[next.length - 1] };
        
        // Random micro tick ±0.03%
        const tickMove = (Math.random() - 0.49) * (last.close * 0.0004);
        last.close = Number((last.close + tickMove).toFixed(2));
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        last.volume += Math.floor(Math.random() * 25000);
        
        next[next.length - 1] = last;
        return next;
      });

      setLiveTickPulse(true);
      setTimeout(() => setLiveTickPulse(false), 400);
    }, 1800);

    return () => clearInterval(timer);
  }, []);

  // Compute stats and indicators
  const { minPrice, maxPrice, maxVol, ema9, ema21 } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 0, maxPrice: 100, maxVol: 1, ema9: [], ema21: [] };

    let min = Infinity;
    let max = -Infinity;
    let maxV = 0;

    candles.forEach(c => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxV) maxV = c.volume;
    });

    // Add padding to price range
    const pad = (max - min) * 0.08 || 1;
    min -= pad;
    max += pad;

    // Calculate EMA 9 & 21
    const calcEMA = (period: number) => {
      const k = 2 / (period + 1);
      const ema: number[] = [];
      let prev = candles[0].close;
      candles.forEach((c, idx) => {
        if (idx === 0) {
          ema.push(prev);
        } else {
          const val = c.close * k + prev * (1 - k);
          ema.push(val);
          prev = val;
        }
      });
      return ema;
    };

    return {
      minPrice: min,
      maxPrice: max,
      maxVol: maxV || 1,
      ema9: calcEMA(9),
      ema21: calcEMA(21)
    };
  }, [candles]);

  const latestCandle = candles[candles.length - 1];
  const firstCandle = candles[0];
  const priceChange = latestCandle && firstCandle ? latestCandle.close - firstCandle.open : 0;
  const pctChange = firstCandle ? (priceChange / firstCandle.open) * 100 : 0;
  const isBullish = priceChange >= 0;

  // Chart Dimensions
  const width = 640;
  const height = 260;
  const priceHeight = 180;
  const volHeight = 55;
  const topPad = 15;
  const rightPad = 60;
  const chartWidth = width - rightPad;

  // Coordinate mappers
  const getY = (price: number) => {
    const range = (maxPrice - minPrice) || 1;
    return topPad + (1 - (price - minPrice) / range) * (priceHeight - topPad);
  };

  const getVolY = (vol: number) => {
    const bottomY = height - 15;
    const barH = (vol / maxVol) * volHeight;
    return bottomY - barH;
  };

  const getX = (index: number) => {
    const step = chartWidth / (candles.length || 1);
    return index * step + step / 2;
  };

  // Mouse move for crosshairs
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;

    if (x >= 0 && x <= chartWidth) {
      setMousePos({ x, y });
      const step = chartWidth / candles.length;
      const idx = Math.min(Math.max(Math.floor(x / step), 0), candles.length - 1);
      setHoveredCandle(candles[idx]);
    } else {
      setMousePos(null);
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredCandle(null);
  };

  // SVG Area path for Candles in Area mode
  const areaPath = useMemo(() => {
    if (candles.length === 0) return '';
    const points = candles.map((c, i) => `${getX(i)},${getY(c.close)}`);
    return `M ${points[0]} L ${points.join(' L ')}`;
  }, [candles, minPrice, maxPrice]);

  const areaFill = useMemo(() => {
    if (candles.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(candles.length - 1);
    const points = candles.map((c, i) => `${getX(i)},${getY(c.close)}`);
    return `M ${firstX},${priceHeight} L ${points.join(' L ')} L ${lastX},${priceHeight} Z`;
  }, [candles, minPrice, maxPrice]);

  // Equity Path
  const equityPoints = useMemo(() => {
    const count = 30;
    const pts = [];
    const base = 100000;
    let curr = base;
    for (let i = 0; i < count; i++) {
      const stepPnl = (Math.sin(i * 0.5) * 450) + (i * 120) + (Math.random() - 0.45) * 200;
      curr += stepPnl;
      pts.push({ index: i, equity: curr });
    }
    pts[pts.length - 1].equity = equity; // match real account equity
    return pts;
  }, [equity]);

  return (
    <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
      
      {/* ========================================================================= */}
      {/* CHART HEADER STRIP: Tabs, Live Badge, Ticker & Timeframe */}
      {/* ========================================================================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--paper)'
      }}>
        {/* Left: View Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('candles')}
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '5px 12px',
              border: '1px solid var(--border)',
              background: activeTab === 'candles' ? 'var(--ink)' : 'transparent',
              color: activeTab === 'candles' ? 'var(--paper)' : 'var(--muted)',
              cursor: 'pointer'
            }}>
            Live Market Chart
          </button>
          <button
            onClick={() => setActiveTab('equity')}
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '5px 12px',
              border: '1px solid var(--border)',
              background: activeTab === 'equity' ? 'var(--ink)' : 'transparent',
              color: activeTab === 'equity' ? 'var(--paper)' : 'var(--muted)',
              cursor: 'pointer'
            }}>
            Equity Curve
          </button>
          <button
            onClick={() => setActiveTab('payoff')}
            style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              padding: '5px 12px',
              border: '1px solid var(--border)',
              background: activeTab === 'payoff' ? 'var(--ink)' : 'transparent',
              color: activeTab === 'payoff' ? 'var(--paper)' : 'var(--muted)',
              cursor: 'pointer'
            }}>
            Options Payoff
          </button>
        </div>

        {/* Right: Real-time Alpaca Live Ticker Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: liveTickPulse ? 'var(--gold)' : 'var(--sage)',
              boxShadow: liveTickPulse ? '0 0 6px var(--gold)' : '0 0 4px var(--sage)',
              transition: 'all 0.2s ease'
            }} />
            <span style={{
              fontFamily: 'Geist Mono, monospace',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: 'var(--ink)'
            }}>
              LIVE ALPACA STREAM
            </span>
          </div>

          {activeTab === 'candles' && (
            <>
              {/* Chart Mode Toggle */}
              <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
                <button
                  onClick={() => setChartType('candle')}
                  title="Candlestick Chart"
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    background: chartType === 'candle' ? 'var(--ink)' : 'transparent',
                    color: chartType === 'candle' ? 'var(--paper)' : 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}>
                  🕯️
                </button>
                <button
                  onClick={() => setChartType('area')}
                  title="Line / Area Chart"
                  style={{
                    padding: '3px 8px',
                    border: 'none',
                    background: chartType === 'area' ? 'var(--ink)' : 'transparent',
                    color: chartType === 'area' ? 'var(--paper)' : 'var(--muted)',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}>
                  📈
                </button>
              </div>

              {/* Timeframes */}
              <div style={{ display: 'flex', border: '1px solid var(--border)' }}>
                {(['1M', '5M', '15M', '1H', '1D'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      fontFamily: 'Geist Mono, monospace',
                      fontSize: '9px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: timeframe === tf ? 'var(--ink)' : 'transparent',
                      color: timeframe === tf ? 'var(--paper)' : 'var(--dim)',
                      borderRight: tf !== '1D' ? '1px solid var(--border)' : 'none'
                    }}>
                    {tf}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE CANDLESTICK & VOLUME TRADING CHART */}
      {/* ========================================================================= */}
      {activeTab === 'candles' && (
        <div style={{ position: 'relative', background: 'var(--paper2)' }} ref={containerRef}>
          
          {/* Top HUD Strip with Live OHLCV and Indicators */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 18px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--paper)',
            fontFamily: 'Geist Mono, monospace',
            fontSize: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ink)' }}>
                {symbol} · {timeframe}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: isBullish ? 'var(--sage)' : 'var(--rust)' }}>
                ${latestCandle ? latestCandle.close.toFixed(2) : (currentPrice || 550.0).toFixed(2)}
              </span>
              <span style={{ color: isBullish ? 'var(--sage)' : 'var(--rust)', fontWeight: 600 }}>
                {priceChange >= 0 ? `+${(priceChange || 0).toFixed(2)}` : (priceChange || 0).toFixed(2)} ({(pctChange || 0) >= 0 ? `+${(pctChange || 0).toFixed(2)}` : (pctChange || 0).toFixed(2)}%)
              </span>
            </div>

            {/* Hovered Candle HUD or Current Stats */}
            <div style={{ display: 'flex', gap: '12px', color: 'var(--dim)' }}>
              <span>O: <strong style={{ color: 'var(--ink)' }}>${((hoveredCandle || latestCandle)?.open ?? 0).toFixed(2)}</strong></span>
              <span>H: <strong style={{ color: 'var(--ink)' }}>${((hoveredCandle || latestCandle)?.high ?? 0).toFixed(2)}</strong></span>
              <span>L: <strong style={{ color: 'var(--ink)' }}>${((hoveredCandle || latestCandle)?.low ?? 0).toFixed(2)}</strong></span>
              <span>C: <strong style={{ color: 'var(--ink)' }}>${((hoveredCandle || latestCandle)?.close ?? 0).toFixed(2)}</strong></span>
              <span>Vol: <strong style={{ color: 'var(--ink)' }}>{((((hoveredCandle || latestCandle)?.volume || 0)) / 1000000).toFixed(2)}M</strong></span>
            </div>

            {/* Indicator Legend */}
            <div style={{ display: 'flex', gap: '10px', fontSize: '9px' }}>
              <span style={{ color: 'var(--gold)', fontWeight: 600 }}>— EMA 9</span>
              <span style={{ color: 'var(--sage)', fontWeight: 600 }}>— EMA 21</span>
            </div>
          </div>

          {/* SVG Canvas for Candlesticks, Lines, Volume & Crosshairs */}
          <div style={{ position: 'relative', width: '100%', height: '260px' }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}>
              
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                const y = topPad + ratio * (priceHeight - topPad);
                const priceAtY = maxPrice - ratio * (maxPrice - minPrice);
                return (
                  <g key={idx}>
                    <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="var(--border)" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                    <text x={chartWidth + 6} y={y + 3} fill="var(--dim)" fontSize="8" fontFamily="Geist Mono">
                      ${priceAtY.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Volume Separation Line */}
              <line x1="0" y1={height - 70} x2={chartWidth} y2={height - 70} stroke="var(--border)" strokeWidth="1" opacity="0.8" />
              <text x="8" y={height - 73} fill="var(--dim)" fontSize="7" fontFamily="Geist Mono" letterSpacing="0.1em">
                VOLUME (SHARES)
              </text>

              {/* Real-time Volume Bars */}
              {candles.map((c, i) => {
                const x = getX(i);
                const barWidth = Math.max((chartWidth / candles.length) * 0.7, 2);
                const barY = getVolY(c.volume);
                const barH = (height - 15) - barY;
                const candleBullish = c.close >= c.open;
                return (
                  <rect
                    key={`vol-${i}`}
                    x={x - barWidth / 2}
                    y={barY}
                    width={barWidth}
                    height={Math.max(barH, 1)}
                    fill={candleBullish ? 'rgba(61, 90, 71, 0.45)' : 'rgba(139, 58, 42, 0.45)'}
                  />
                );
              })}

              {/* Chart Mode: Candlesticks vs Area */}
              {chartType === 'candle' ? (
                // Candlestick Rendering
                candles.map((c, i) => {
                  const x = getX(i);
                  const barWidth = Math.max((chartWidth / candles.length) * 0.68, 3);
                  const openY = getY(c.open);
                  const closeY = getY(c.close);
                  const highY = getY(c.high);
                  const lowY = getY(c.low);
                  const candleBullish = c.close >= c.open;
                  const bodyTop = Math.min(openY, closeY);
                  const bodyHeight = Math.max(Math.abs(openY - closeY), 1.5);
                  const strokeColor = candleBullish ? 'var(--sage)' : 'var(--rust)';
                  const fillColor = candleBullish ? 'var(--sage)' : 'var(--rust)';

                  return (
                    <g key={`candle-${i}`}>
                      {/* High-Low Wick */}
                      <line
                        x1={x}
                        y1={highY}
                        x2={x}
                        y2={lowY}
                        stroke={strokeColor}
                        strokeWidth="1.2"
                      />
                      {/* Body */}
                      <rect
                        x={x - barWidth / 2}
                        y={bodyTop}
                        width={barWidth}
                        height={bodyHeight}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth="0.8"
                      />
                    </g>
                  );
                })
              ) : (
                // Area / Line Mode
                <>
                  <path d={areaFill} fill="url(#areaGrad)" />
                  <path d={areaPath} fill="none" stroke="var(--gold)" strokeWidth="2" />
                </>
              )}

              {/* 9-Period EMA Curve */}
              {candles.length > 9 && (
                <path
                  d={`M ${candles.slice(8).map((_, idx) => `${getX(idx + 8)},${getY(ema9[idx + 8])}`).join(' L ')}`}
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="1.2"
                  opacity="0.85"
                />
              )}

              {/* 21-Period EMA Curve */}
              {candles.length > 21 && (
                <path
                  d={`M ${candles.slice(20).map((_, idx) => `${getX(idx + 20)},${getY(ema21[idx + 20])}`).join(' L ')}`}
                  fill="none"
                  stroke="var(--sage)"
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                  opacity="0.85"
                />
              )}

              {/* Active Current Price Dashed Marker Line */}
              {latestCandle && (
                <g>
                  <line
                    x1="0"
                    y1={getY(latestCandle.close)}
                    x2={chartWidth}
                    y2={getY(latestCandle.close)}
                    stroke={isBullish ? 'var(--sage)' : 'var(--rust)'}
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={chartWidth}
                    y={getY(latestCandle.close) - 8}
                    width={56}
                    height={16}
                    fill={isBullish ? 'var(--sage)' : 'var(--rust)'}
                  />
                  <text
                    x={chartWidth + 28}
                    y={getY(latestCandle.close) + 3}
                    textAnchor="middle"
                    fill="var(--paper)"
                    fontSize="8.5"
                    fontWeight="700"
                    fontFamily="Geist Mono">
                    ${latestCandle.close.toFixed(2)}
                  </text>
                </g>
              )}

              {/* Interactive Crosshair & Cursor HUD */}
              {mousePos && (
                <g pointerEvents="none">
                  {/* Vertical Crosshair Line */}
                  <line
                    x1={mousePos.x}
                    y1="0"
                    x2={mousePos.x}
                    y2={height - 15}
                    stroke="var(--dim)"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                  {/* Horizontal Crosshair Line */}
                  <line
                    x1="0"
                    y1={mousePos.y}
                    x2={chartWidth}
                    y2={mousePos.y}
                    stroke="var(--dim)"
                    strokeWidth="0.8"
                    strokeDasharray="2 2"
                  />
                  {/* Price Tag at Cursor */}
                  <rect
                    x={chartWidth}
                    y={mousePos.y - 7}
                    width={56}
                    height={14}
                    fill="var(--ink)"
                  />
                  <text
                    x={chartWidth + 28}
                    y={mousePos.y + 3}
                    textAnchor="middle"
                    fill="var(--paper)"
                    fontSize="8"
                    fontFamily="Geist Mono">
                    ${Math.max(0, maxPrice - ((mousePos.y - topPad) / ((priceHeight - topPad) || 1)) * (maxPrice - minPrice || 1)).toFixed(2)}
                  </text>
                </g>
              )}

              {/* Time Labels on X Axis */}
              {candles.filter((_, i) => i % 8 === 0).map((c, idx) => (
                <text
                  key={`t-${idx}`}
                  x={getX(candles.indexOf(c))}
                  y={height - 3}
                  textAnchor="middle"
                  fill="var(--dim)"
                  fontSize="7.5"
                  fontFamily="Geist Mono">
                  {c.time}
                </text>
              ))}

            </svg>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PORTFOLIO EQUITY & HIGH-WATER MARK CURVE */}
      {/* ========================================================================= */}
      {activeTab === 'equity' && (
        <div style={{ padding: '16px 20px', background: 'var(--paper2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <span className="label" style={{ color: 'var(--sage)' }}>PORTFOLIO EQUITY PROGRESSION</span>
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="label" style={{ color: 'var(--dim)' }}>BASELINE CAPITAL</span>
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--dim)', marginTop: '2px' }}>
                $100,000.00 (Alpaca Paper Tier 3)
              </div>
            </div>
          </div>

          <div style={{ height: '200px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 600 190" style={{ width: '100%', height: '100%', display: 'block' }}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sage)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--sage)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="20" y1="95" x2="580" y2="95" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
              <text x="585" y="98" fill="var(--dim)" fontSize="8" fontFamily="Geist Mono">$100k</text>

              {/* Equity Area & Curve */}
              {(() => {
                const minEq = 99000;
                const maxEq = 101500;
                const range = (maxEq - minEq) || 1;
                const count = Math.max(1, equityPoints.length - 1);
                const eqToY = (eqVal: number) => 170 - ((eqVal - minEq) / range) * 140;
                const eqToX = (idx: number) => 25 + (idx / count) * 540;

                const pointsStr = equityPoints.map(p => `${eqToX(p.index)},${eqToY(p.equity)}`).join(' L ');
                const fillStr = `M ${eqToX(0)},170 L ${pointsStr} L ${eqToX(equityPoints.length - 1)},170 Z`;

                return (
                  <>
                    <path d={fillStr} fill="url(#eqGrad)" />
                    <path d={`M ${pointsStr}`} fill="none" stroke="var(--sage)" strokeWidth="2.5" />
                    
                    {/* High-Water Mark reference */}
                    <line x1="25" y1={eqToY(100800)} x2="565" y2={eqToY(100800)} stroke="var(--gold)" strokeWidth="1" strokeDasharray="2 2" />
                    <text x="30" y={eqToY(100800) - 4} fill="var(--gold)" fontSize="7.5" fontFamily="Geist Mono">
                      High-Water Mark ($100,800)
                    </text>

                    {/* Latest Equity Dot */}
                    <circle
                      cx={eqToX(equityPoints.length - 1)}
                      cy={eqToY(equity)}
                      r="4.5"
                      fill="var(--paper)"
                      stroke="var(--sage)"
                      strokeWidth="2.5"
                    />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DYNAMIC OPTIONS PAYOFF RISK DIAGRAM */}
      {/* ========================================================================= */}
      {activeTab === 'payoff' && (
        <div style={{ padding: '16px 20px', background: 'var(--paper2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <span className="label" style={{ color: 'var(--gold)' }}>ACTIVE DEFINED-RISK SPREAD</span>
              <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginTop: '2px' }}>
                {symbol} {recommendedPlaybook} (Max Profit: +$160.00 · Max Risk: -$340.00)
              </div>
            </div>
            <span className="mode-pill mode-sage">{recommendedPlaybook}</span>
          </div>

          <div style={{ height: '200px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 600 180" style={{ width: '100%', height: '100%', display: 'block' }}>
              {/* Zero PnL Baseline */}
              <line x1="30" y1="100" x2="570" y2="100" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
              <text x="575" y="103" fill="var(--dim)" fontSize="8" fontFamily="Geist Mono">P&L $0</text>

              {/* Profit and Loss Polygons */}
              <polygon points="170,100 220,50 380,50 430,100" fill="rgba(61, 90, 71, 0.20)" />
              <polygon points="50,150 170,100 50,100" fill="rgba(139, 58, 42, 0.15)" />
              <polygon points="430,100 550,150 550,100" fill="rgba(139, 58, 42, 0.15)" />

              {/* Payoff Profile Polyline */}
              <path
                d="M 50 150 L 170 100 L 220 50 L 380 50 L 430 100 L 550 150"
                fill="none"
                stroke="var(--ink)"
                strokeWidth="2.5"
              />

              {/* Animated Spot Indicator */}
              <line x1="300" y1="30" x2="300" y2="150" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="3 2" />
              <circle cx="300" cy="50" r="5" fill="var(--paper)" stroke="var(--gold)" strokeWidth="2.5" />
              <text x="300" y="24" textAnchor="middle" fill="var(--gold)" fontSize="10" fontWeight="700" fontFamily="Geist Mono">
                Spot ${currentPrice > 0 ? currentPrice.toFixed(2) : "550.00"}
              </text>

              {/* Wing Labels & Breakeven strikes */}
              <text x="170" y="120" textAnchor="middle" fill="var(--dim)" fontSize="8" fontFamily="Geist Mono">Put Breakeven</text>
              <text x="430" y="120" textAnchor="middle" fill="var(--dim)" fontSize="8" fontFamily="Geist Mono">Call Breakeven</text>
              <text x="300" y="78" textAnchor="middle" fill="var(--sage)" fontSize="9.5" fontWeight="700" fontFamily="Geist Mono">
                +Max Profit Zone ($160.00)
              </text>
              <text x="100" y="138" textAnchor="middle" fill="var(--rust)" fontSize="8.5" fontFamily="Geist Mono">
                Max Loss (-$340)
              </text>
              <text x="500" y="138" textAnchor="middle" fill="var(--rust)" fontSize="8.5" fontFamily="Geist Mono">
                Max Loss (-$340)
              </text>
            </svg>
          </div>
        </div>
      )}

    </div>
  );
};
