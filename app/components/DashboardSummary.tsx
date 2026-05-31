'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Font shorthands ──────────────────────────────────────────────────────────

const BEBAS = "var(--font-bebas), 'Bebas Neue', sans-serif"
const MONO  = "var(--font-dm-mono), 'DM Mono', monospace"
const SANS  = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  vix:            number | null
  totalValue:     number
  investedValue:  number
  cashPct:        number
  todayPnL:       number
  todayPnLPct:    number
  loading:        boolean
  hasPrices:      boolean
  formatAmount:   (n: number, decimals?: number) => string
  currency:       'USD' | 'ILS'
  criticalAlerts: number
  warningAlerts:  number
  totalAlerts:    number
  holdingsCount:  number
  lastSync:       Date | null
  minCashPct?:    number | null
  maxCashPct?:    number | null
}

// ─── Domain helpers ───────────────────────────────────────────────────────────

function fgZone(v: number): { label: string; color: string } {
  if (v <= 25) return { label: 'EXTREME FEAR',  color: 'var(--red)' }
  if (v <= 45) return { label: 'FEAR',           color: '#ff8800' }
  if (v <= 55) return { label: 'NEUTRAL',        color: 'var(--text-secondary)' }
  if (v <= 75) return { label: 'GREED',          color: 'var(--green)' }
  return              { label: 'EXTREME GREED',  color: '#00ffaa' }
}

function vixZone(v: number): { label: string; color: string; bg: string } {
  if (v < 15)  return { label: 'LOW',      color: 'var(--green)',  bg: 'rgba(0,255,135,0.10)' }
  if (v < 20)  return { label: 'MODERATE', color: '#999',          bg: 'rgba(180,180,180,0.08)' }
  if (v < 30)  return { label: 'ELEVATED', color: 'var(--amber)',  bg: 'rgba(255,170,0,0.10)' }
  return              { label: 'EXTREME',  color: 'var(--red)',    bg: 'rgba(255,59,59,0.10)' }
}

function marketSentence(fg: number | null, vix: number | null): string {
  if (fg == null && vix == null) return 'Awaiting market data…'
  if (fg == null) return vix! < 15 ? 'Low volatility — monitor positions closely' : 'Elevated volatility detected — exercise caution'
  if (vix == null) return fg > 60 ? 'Greed signals active — momentum favors bulls' : fg < 30 ? 'Fear dominant — potential opportunity or further weakness' : 'Neutral sentiment — await directional confirmation'
  if (fg >= 70 && vix < 15) return 'Extreme greed + calm markets — peak conditions, watch for exhaustion'
  if (fg >= 55 && vix < 18) return 'Greed + low volatility — favorable conditions for momentum plays'
  if (fg >= 55 && vix < 25) return 'Bullish sentiment with moderate volatility — maintain current exposure'
  if (fg >= 55)             return 'Greed despite elevated VIX — conflicting signals, trim risk selectively'
  if (fg >= 40 && vix < 20) return 'Neutral sentiment + calm markets — selective opportunities remain'
  if (fg >= 40)             return 'Neutral fear with rising volatility — consider defensive positioning'
  if (vix > 30)             return 'Extreme fear + high volatility — risk-off conditions prevail'
  return 'Fear dominant — potential contrarian setup or continued weakness'
}

function connectionStatus(fg: number | null, vix: number | null): { label: string; color: string; bg: string } {
  if (fg == null || vix == null) return { label: 'LOADING', color: '#555', bg: 'rgba(85,85,85,0.10)' }
  if (fg >= 55 && vix < 20) return { label: 'POSITIVE SIGNAL', color: 'var(--green)',  bg: 'rgba(0,255,135,0.08)' }
  if (fg < 30 || vix > 30)  return { label: 'RISK OFF',        color: 'var(--red)',    bg: 'rgba(255,59,59,0.08)' }
  return                             { label: 'CAUTION',         color: 'var(--amber)',  bg: 'rgba(255,170,0,0.08)' }
}

function timeAgoShort(d: Date | null): string {
  if (!d) return '—'
  const m = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) return
    const startTime = performance.now()
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(target * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return val
}

// ─── SVG Arc Gauge ───────────────────────────────────────────────────────────
// viewBox 200×116, centre (100, 112), radius 100, needle 80.

function FGGauge({ value, color }: { value: number; color: string }) {
  const cx = 100, cy = 112, r = 100, nLen = 80

  const pt = (v: number) => {
    const a = Math.PI * (1 - v / 100)
    return { x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy - r * Math.sin(a)).toFixed(1) }
  }
  const na  = Math.PI * (1 - Math.max(0, Math.min(100, value)) / 100)
  const tip = { x: +(cx + nLen * Math.cos(na)).toFixed(1), y: +(cy - nLen * Math.sin(na)).toFixed(1) }
  const arc = `M ${pt(0).x} ${pt(0).y} A ${r} ${r} 0 0 1 ${pt(100).x} ${pt(100).y}`

  return (
    <svg width="200" height="116" viewBox="0 0 200 116" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id="fgGaugeGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="200" y2="0">
          <stop offset="0%"   stopColor="#ff3b3b" />
          <stop offset="22%"  stopColor="#ff7700" />
          <stop offset="48%"  stopColor="#3a3a3a" />
          <stop offset="72%"  stopColor="#00cc66" />
          <stop offset="100%" stopColor="#00ff87" />
        </linearGradient>
        <filter id="needleGaugeGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <path d={arc} fill="none" stroke="#161616" strokeWidth="13" strokeLinecap="round" />
      {/* Gradient arc */}
      <path d={arc} fill="none" stroke="url(#fgGaugeGrad)" strokeWidth="13" strokeLinecap="round" opacity="0.90" />
      {/* Needle */}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y}
        stroke={color} strokeWidth="2.5" strokeLinecap="round" filter="url(#needleGaugeGlow)" />
      <circle cx={cx} cy={cy} r="5.5" fill={color} filter="url(#needleGaugeGlow)" />
      <circle cx={tip.x} cy={tip.y} r="3" fill={color} />
    </svg>
  )
}

// ─── Cash donut ───────────────────────────────────────────────────────────────

function CashDonut({ cashPct }: { cashPct: number }) {
  const r    = 26
  const circ = 2 * Math.PI * r
  const invLen  = ((100 - cashPct) / 100) * circ
  const cashLen = (cashPct / 100) * circ

  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle cx="32" cy="32" r={r} fill="none" stroke="#1a1a1a" strokeWidth="7" />
      {/* Invested (green) */}
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--green)" strokeWidth="7"
        strokeDasharray={`${invLen.toFixed(1)} ${circ.toFixed(1)}`}
        transform="rotate(-90 32 32)" strokeLinecap="butt" opacity="0.9" />
      {/* Cash (amber) */}
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--amber)" strokeWidth="7"
        strokeDasharray={`${cashLen.toFixed(1)} ${circ.toFixed(1)}`}
        strokeDashoffset={(-invLen).toFixed(1)}
        transform="rotate(-90 32 32)" strokeLinecap="butt" opacity="0.75" />
    </svg>
  )
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function Card({ children, className, style }: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? '#2e2e2e' : 'var(--border)'}`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.12s',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: SANS, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
      textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 18,
    }}>
      {children}
    </p>
  )
}

function CardDivider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
}

// ─── CARD 1 — MARKET PULSE ───────────────────────────────────────────────────

function MarketPulseCard({ vix, fearGreed, loaded }: {
  vix: number | null
  fearGreed: number | null
  loaded: boolean
}) {
  const zone    = fearGreed != null ? fgZone(fearGreed) : null
  const vixInfo = vix       != null ? vixZone(vix)      : null
  const countFG = useCountUp(Math.round(fearGreed ?? 0))

  return (
    <Card className="card-animate-0" style={{ flex: 1 }}>
      <div style={{ padding: '22px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardTitle>Market Pulse</CardTitle>

        {/* Gauge + Value */}
        {!loaded ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 140 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>loading…</span>
          </div>
        ) : fearGreed == null ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>Unavailable</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)' }}>CNN endpoint not reachable</span>
          </div>
        ) : (
          <>
            {/* Gauge + big number side by side */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
              <FGGauge value={fearGreed} color={zone!.color} />
              <div style={{ paddingBottom: 10 }}>
                <div style={{ fontFamily: BEBAS, fontSize: 56, color: zone!.color, lineHeight: 1, letterSpacing: '0.02em' }}>
                  {countFG}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: zone!.color, marginTop: 4, letterSpacing: '0.05em' }}>
                  {zone!.label}
                </div>
              </div>
            </div>

            {/* VIX */}
            {vix != null && vixInfo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--text-secondary)' }}>
                  VIX&nbsp;<span style={{ color: 'var(--text-primary)' }}>{vix.toFixed(1)}</span>
                </span>
                <span style={{
                  fontFamily: MONO, fontSize: 10, fontWeight: 600,
                  color: vixInfo.color, background: vixInfo.bg,
                  padding: '2px 9px', borderRadius: 4, letterSpacing: '0.08em',
                }}>
                  {vixInfo.label}
                </span>
              </div>
            )}

            {/* Sentiment sentence */}
            <p style={{ fontFamily: SANS, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1 }}>
              {marketSentence(fearGreed, vix)}
            </p>
          </>
        )}

        {/* Attribution */}
        <p style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-muted)', marginTop: 14, letterSpacing: '0.06em' }}>
          CNN · TradingView
        </p>
      </div>
    </Card>
  )
}

// ─── CARD 2 — PORTFOLIO VALUE ─────────────────────────────────────────────────

function PortfolioValueCard({ totalValue, cashPct, todayPnL, todayPnLPct, loading, hasPrices, formatAmount, currency }: {
  totalValue:   number
  cashPct:      number
  todayPnL:     number
  todayPnLPct:  number
  loading:      boolean
  hasPrices:    boolean
  formatAmount: (n: number, d?: number) => string
  currency:     'USD' | 'ILS'
}) {
  const hasPnL   = hasPrices && todayPnL !== 0
  const pnlColor = hasPnL ? (todayPnL >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-secondary)'
  const pnlSign  = todayPnL >= 0 ? '+' : ''
  const cashOOB  = cashPct > 20 || cashPct < 5
  const cashColor = cashOOB ? 'var(--amber)' : 'var(--green)'

  const countTotal = useCountUp(Math.round(totalValue))

  return (
    <Card className="card-animate-1" style={{ flex: 1 }}>
      <div style={{ padding: '22px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardTitle>Portfolio Value</CardTitle>

        {/* Hero number */}
        <div style={{
          fontFamily: BEBAS, fontSize: 56,
          color: loading ? 'var(--text-muted)' : 'var(--text-primary)',
          lineHeight: 1, letterSpacing: '0.01em', marginBottom: 6,
        }}>
          {loading ? '—' : formatAmount(countTotal)}
        </div>

        {/* Daily P&L */}
        {hasPnL && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 500, color: pnlColor, fontVariantNumeric: 'tabular-nums' }}>
              {pnlSign}{formatAmount(Math.abs(todayPnL))}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: pnlColor, opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>
              {pnlSign}{todayPnLPct.toFixed(2)}%
            </span>
            <span style={{ fontSize: 12, color: pnlColor }}>{todayPnL >= 0 ? '▲' : '▼'}</span>
          </div>
        )}
        <p style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 4 }}>
          Today
        </p>

        <CardDivider />

        {/* Cash row + donut */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8" strokeLinecap="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(totalValue * cashPct / 100)}&nbsp;
                <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>CASH</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: cashColor, fontWeight: 600, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                {cashPct.toFixed(1)}% of portfolio
              </div>
            </div>
          </div>
          <CashDonut cashPct={cashPct} />
        </div>

      </div>
    </Card>
  )
}

// ─── CARD 3 — PORTFOLIO STATUS ────────────────────────────────────────────────

function PortfolioStatusCard({ criticalAlerts, warningAlerts, totalAlerts, holdingsCount, lastSync, cashPct }: {
  criticalAlerts: number
  warningAlerts:  number
  totalAlerts:    number
  holdingsCount:  number
  lastSync:       Date | null
  cashPct:        number
}) {
  const status      = criticalAlerts > 0 ? 'OFF PLAN' : warningAlerts > 0 ? 'PARTIAL' : 'ON PLAN'
  const statusColor = criticalAlerts > 0 ? 'var(--red)'   : warningAlerts > 0 ? 'var(--amber)' : 'var(--green)'
  const statusBg    = criticalAlerts > 0 ? 'rgba(255,59,59,0.08)' : warningAlerts > 0 ? 'rgba(255,170,0,0.08)' : 'rgba(0,255,135,0.08)'

  const riskLevel = criticalAlerts > 1 ? 'HIGH RISK' : criticalAlerts === 1 ? 'ELEVATED' : warningAlerts >= 3 ? 'MODERATE' : 'LOW RISK'
  const riskColor = criticalAlerts > 0 ? 'var(--red)' : warningAlerts > 0 ? 'var(--amber)' : '#555'

  const barColor  = criticalAlerts > 0 ? 'var(--red)' : warningAlerts > 2 ? 'var(--amber)' : 'var(--green)'

  const metrics = [
    { label: 'Active Signals', value: String(totalAlerts),      color: totalAlerts > 0 ? 'var(--amber)' : '#444' },
    { label: 'Holdings',       value: String(holdingsCount),    color: 'var(--text-primary)' },
    { label: 'Critical',       value: String(criticalAlerts),   color: criticalAlerts > 0 ? 'var(--red)' : '#444' },
    { label: 'Last Sync',      value: timeAgoShort(lastSync),   color: 'var(--text-secondary)' },
  ]

  return (
    <Card className="card-animate-2" style={{ flex: 1 }}>
      <div style={{ padding: '22px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardTitle>Portfolio Status</CardTitle>

        {/* Status + Risk pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: MONO, fontSize: 12, fontWeight: 700,
            color: statusColor, background: statusBg,
            padding: '6px 16px', borderRadius: 40, letterSpacing: '0.06em',
            border: `1px solid ${statusColor}28`,
          }}>
            {status}
          </span>
          <span style={{
            fontFamily: MONO, fontSize: 10, fontWeight: 600,
            color: riskColor, background: 'rgba(100,100,100,0.06)',
            padding: '6px 14px', borderRadius: 40, letterSpacing: '0.04em',
            border: '1px solid #2a2a2a',
          }}>
            {riskLevel}
          </span>
        </div>

        {/* 2×2 metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 28px', flex: 1 }}>
          {metrics.map(m => (
            <div key={m.label}>
              <div style={{ fontFamily: BEBAS, fontSize: 30, color: m.color, lineHeight: 1, letterSpacing: '0.02em' }}>
                {m.value}
              </div>
              <div style={{ fontFamily: SANS, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3 }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom risk bar */}
      <div style={{ height: 4, background: barColor, opacity: 0.85, transition: 'background 0.4s' }} />
    </Card>
  )
}

// ─── MARKET CONNECTION BAR ────────────────────────────────────────────────────

function MarketConnectionBar({ fearGreed, vix }: { fearGreed: number | null; vix: number | null }) {
  const sentence = marketSentence(fearGreed, vix)
  const pill     = connectionStatus(fearGreed, vix)

  return (
    <div style={{
      background: '#090909',
      borderTop:    '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      height: 44,
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Scanline texture overlay */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.14) 3px, rgba(0,0,0,0.14) 4px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Chain icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, zIndex: 1 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Market Connection
        </span>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 20px', flexShrink: 0, zIndex: 1 }} />

      {/* Dynamic sentence */}
      <p style={{ fontFamily: SANS, fontSize: 12, color: 'var(--text-secondary)', flex: 1, zIndex: 1, lineHeight: 1 }}>
        {sentence}
      </p>

      {/* Status pill */}
      <div style={{ zIndex: 1, flexShrink: 0, marginLeft: 20 }}>
        <span style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 700,
          color: pill.color, background: pill.bg,
          padding: '4px 14px', borderRadius: 20, letterSpacing: '0.08em',
          border: `1px solid ${pill.color}30`,
        }}>
          {pill.label}
        </span>
      </div>
    </div>
  )
}

// ─── Root component ───────────────────────────────────────────────────────────

interface MacroState { fearGreed: number | null; loaded: boolean }

export function DashboardSummary({
  vix, totalValue, investedValue, cashPct, todayPnL, todayPnLPct,
  loading, hasPrices, formatAmount, currency,
  criticalAlerts, warningAlerts, totalAlerts, holdingsCount,
  lastSync, minCashPct, maxCashPct,
}: Props) {
  const [macro, setMacro] = useState<MacroState>({ fearGreed: null, loaded: false })

  useEffect(() => {
    fetch('/api/macro')
      .then(r => r.json())
      .then(d => setMacro({ fearGreed: d.fearGreed?.value ?? null, loaded: true }))
      .catch(() => setMacro({ fearGreed: null, loaded: true }))
  }, [])

  return (
    <div>
      {/* 3-card grid */}
      <div style={{
        maxWidth: 1320,
        margin: '0 auto',
        padding: '28px 40px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 20,
      }}>
        <MarketPulseCard
          vix={vix}
          fearGreed={macro.fearGreed}
          loaded={macro.loaded}
        />
        <PortfolioValueCard
          totalValue={totalValue}
          cashPct={cashPct}
          todayPnL={todayPnL}
          todayPnLPct={todayPnLPct}
          loading={loading}
          hasPrices={hasPrices}
          formatAmount={formatAmount}
          currency={currency}
        />
        <PortfolioStatusCard
          criticalAlerts={criticalAlerts}
          warningAlerts={warningAlerts}
          totalAlerts={totalAlerts}
          holdingsCount={holdingsCount}
          lastSync={lastSync}
          cashPct={cashPct}
        />
      </div>

      {/* Full-width Market Connection Bar */}
      <MarketConnectionBar fearGreed={macro.fearGreed} vix={vix} />
    </div>
  )
}
