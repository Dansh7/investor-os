'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Font constants ───────────────────────────────────────────────────────────

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

// ─── Zone helpers ─────────────────────────────────────────────────────────────

function fgZone(v: number): { label: string; color: string } {
  if (v <= 25) return { label: 'EXTREME FEAR', color: '#ff3b3b' }
  if (v <= 45) return { label: 'FEAR',          color: '#ff8800' }
  if (v <= 55) return { label: 'NEUTRAL',       color: '#999999' }
  if (v <= 75) return { label: 'GREED',         color: '#00ff87' }
  return              { label: 'EXTREME GREED', color: '#00ffaa' }
}

function fgDescription(v: number): { headline: string; body: string } {
  if (v >= 75) return {
    headline: 'Market sentiment is extremely bullish.',
    body: 'Extreme confidence may signal overheating. Monitor for reversal signals.',
  }
  if (v >= 55) return {
    headline: 'Market sentiment is positive.',
    body: 'Investors are showing more confidence in the market.',
  }
  if (v >= 45) return {
    headline: 'Market sentiment is neutral.',
    body: 'Investors are holding steady with balanced conviction.',
  }
  if (v >= 25) return {
    headline: 'Market sentiment shows fear.',
    body: 'Investors are becoming cautious and reducing risk exposure.',
  }
  return {
    headline: 'Market sentiment shows extreme fear.',
    body: 'Investors are pulling back significantly from risk assets.',
  }
}

function vixZone(v: number): { label: string; color: string; bg: string } {
  if (v < 18)  return { label: 'LOW',      color: '#00ff87',  bg: 'rgba(0,255,135,0.10)' }
  if (v < 24)  return { label: 'MODERATE', color: '#aaaaaa',  bg: 'rgba(200,200,200,0.08)' }
  if (v < 32)  return { label: 'ELEVATED', color: '#ffaa00',  bg: 'rgba(255,170,0,0.10)' }
  return              { label: 'EXTREME',  color: '#ff3b3b',  bg: 'rgba(255,59,59,0.10)' }
}

function vixDescription(v: number): string {
  if (v < 18)  return 'Low volatility indicates a calm and stable market.'
  if (v < 24)  return 'Moderate volatility. Markets show normal fluctuation levels.'
  if (v < 32)  return 'Elevated volatility. Increased market uncertainty detected.'
  return 'Extreme volatility. High-risk environment — exercise caution.'
}

function timeAgoShort(d: Date | null): string {
  if (!d) return '—'
  const m = Math.floor((Date.now() - d.getTime()) / 60_000)
  if (m < 1) return 'JUST NOW'
  if (m < 60) return `${m}M AGO`
  return `${Math.floor(m / 60)}H AGO`
}

function marketSentence(fg: number | null, vix: number | null): string {
  if (fg == null && vix == null) return 'Awaiting market data…'
  if (fg == null) return vix! < 15 ? 'Low volatility — monitor positions closely' : 'Elevated volatility — exercise caution'
  if (vix == null) return fg > 60 ? 'Greed signals active — momentum favors bulls' : fg < 30 ? 'Fear dominant — potential opportunity or weakness' : 'Neutral — await clearer signals'
  if (fg >= 55 && vix < 20) return 'Greed + low volatility — favorable conditions for momentum plays'
  if (fg >= 55 && vix < 30) return 'Bullish sentiment, moderate volatility — maintain exposure'
  if (fg >= 55) return 'Greed despite elevated VIX — trim risk selectively'
  if (fg < 30 && vix > 30) return 'Extreme fear + high volatility — risk-off conditions prevail'
  if (fg < 30) return 'Fear dominant — potential contrarian setup'
  return 'Mixed signals — stay cautious and size positions conservatively'
}

function connectionStatus(fg: number | null, vix: number | null): { label: string; color: string; bg: string } {
  if (fg == null || vix == null) return { label: 'LOADING', color: '#555', bg: 'rgba(85,85,85,0.10)' }
  if (fg >= 55 && vix < 20) return { label: 'POSITIVE SIGNAL', color: '#00ff87', bg: 'rgba(0,255,135,0.08)' }
  if (fg < 30 || vix > 30)  return { label: 'RISK OFF',        color: '#ff3b3b', bg: 'rgba(255,59,59,0.08)' }
  return                             { label: 'CAUTION',         color: '#ffaa00', bg: 'rgba(255,170,0,0.08)' }
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
      setVal(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])
  return val
}

// ─── CNN-style Arc Gauge ──────────────────────────────────────────────────────
// viewBox 250×185, arc centre (125, 145), radius 115.
// Labels at 0 / 50 / 100. Value + label rendered below arc centre.

function FGGauge({ value, color }: { value: number; color: string }) {
  // viewBox 280×205 — wide enough for "100" label, tall enough for value + zone label
  const cx = 140, cy = 148, r = 118, nLen = 95

  const pt = (v: number) => {
    const a = Math.PI * (1 - v / 100)
    return { x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy - r * Math.sin(a)).toFixed(1) }
  }

  const na  = Math.PI * (1 - Math.max(0, Math.min(100, value)) / 100)
  const tip = { x: +(cx + nLen * Math.cos(na)).toFixed(1), y: +(cy - nLen * Math.sin(na)).toFixed(1) }
  const arc = `M ${pt(0).x} ${pt(0).y} A ${r} ${r} 0 0 1 ${pt(100).x} ${pt(100).y}`

  // Tick mark at v=50 (top of arc)
  const topY = cy - r

  return (
    <svg width="280" height="205" viewBox="0 0 280 205" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id="cnnGrad" gradientUnits="userSpaceOnUse" x1="22" y1="0" x2="258" y2="0">
          <stop offset="0%"   stopColor="#ff2222" />
          <stop offset="22%"  stopColor="#ff7700" />
          <stop offset="45%"  stopColor="#ddcc00" />
          <stop offset="70%"  stopColor="#88cc00" />
          <stop offset="100%" stopColor="#00ff87" />
        </linearGradient>
        <filter id="cnnGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path d={arc} fill="none" stroke="#1c1c1c" strokeWidth="14" strokeLinecap="round" />
      {/* Gradient arc */}
      <path d={arc} fill="none" stroke="url(#cnnGrad)" strokeWidth="14" strokeLinecap="round" />

      {/* Tick at 50 */}
      <line x1={cx} y1={topY - 2} x2={cx} y2={topY + 10} stroke="#3a3a3a" strokeWidth="2" />

      {/* Labels: 0 · 50 · 100 */}
      <text x={12} y={cy + 18} textAnchor="middle"
        style={{ fontFamily: MONO, fontSize: 11, fill: '#444' }}>0</text>
      <text x={cx} y={topY - 10} textAnchor="middle"
        style={{ fontFamily: MONO, fontSize: 11, fill: '#444' }}>50</text>
      <text x={268} y={cy + 18} textAnchor="middle"
        style={{ fontFamily: MONO, fontSize: 11, fill: '#444' }}>100</text>

      {/* Needle */}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y}
        stroke="#ffffff" strokeWidth="3" strokeLinecap="round" filter="url(#cnnGlow)" />
      {/* Base disc */}
      <circle cx={cx} cy={cy} r="7" fill="#ffffff" filter="url(#cnnGlow)" />
      <circle cx={cx} cy={cy} r="3" fill="#080808" />

      {/* Value — large number below arc baseline */}
      <text x={cx} y={cy + 32} textAnchor="middle"
        style={{ fontFamily: BEBAS, fontSize: 48, fill: color, letterSpacing: 1 }}>
        {Math.round(value)}
      </text>
      {/* Zone label */}
      <text x={cx} y={cy + 50} textAnchor="middle"
        style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, fill: color, letterSpacing: 2 }}>
        {fgZone(value).label}
      </text>
    </svg>
  )
}

// ─── Cash donut ───────────────────────────────────────────────────────────────

function CashDonut({ cashPct }: { cashPct: number }) {
  const r = 24, circ = 2 * Math.PI * r
  const invLen  = ((100 - cashPct) / 100) * circ
  const cashLen = (cashPct / 100) * circ
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ flexShrink: 0 }}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="#1a1a1a" strokeWidth="7" />
      <circle cx="30" cy="30" r={r} fill="none" stroke="#00ff87" strokeWidth="7"
        strokeDasharray={`${invLen.toFixed(1)} ${circ.toFixed(1)}`}
        transform="rotate(-90 30 30)" strokeLinecap="butt" opacity="0.7" />
      <circle cx="30" cy="30" r={r} fill="none" stroke="#3b82f6" strokeWidth="7"
        strokeDasharray={`${cashLen.toFixed(1)} ${circ.toFixed(1)}`}
        strokeDashoffset={(-invLen).toFixed(1)}
        transform="rotate(-90 30 30)" strokeLinecap="butt" />
    </svg>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, className, style }: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      className={className}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#0e0e0e',
        border: `1px solid ${hov ? '#2e2e2e' : '#1e1e1e'}`,
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

// ─── CARD 1 — FEAR & GREED (CNN style) ───────────────────────────────────────

function FearGreedCard({ fearGreed, loaded, vixForSentence }: {
  fearGreed: number | null
  loaded: boolean
  vixForSentence: number | null
}) {
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null)
  useEffect(() => { if (loaded && fearGreed != null) setFetchedAt(new Date()) }, [loaded, fearGreed])

  const zone = fearGreed != null ? fgZone(fearGreed) : null
  const desc = fearGreed != null ? fgDescription(fearGreed) : null

  return (
    <Card className="card-animate-0" style={{ flex: 1 }}>
      <div style={{ padding: '28px', display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>

        {/* ── Left: gauge ── */}
        <div style={{ flexShrink: 0 }}>
          {!loaded ? (
            <div style={{ width: 250, height: 185, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: MONO, fontSize: 12, color: '#333', letterSpacing: '0.06em' }}>loading…</span>
            </div>
          ) : fearGreed == null ? (
            <div style={{ width: 250, height: 185, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: '#ff3b3b' }}>Unavailable</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>CNN not reachable</span>
            </div>
          ) : (
            <FGGauge value={fearGreed} color={zone!.color} />
          )}
        </div>

        {/* ── Vertical divider ── */}
        <div style={{ width: 1, height: 120, background: '#1e1e1e', flexShrink: 0, alignSelf: 'center' }} />

        {/* ── Right: text panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <p style={{ fontFamily: SANS, fontSize: 19, fontWeight: 700, color: '#f0f0f0', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 4 }}>
            Fear and Greed Index
          </p>
          <p style={{ fontFamily: MONO, fontSize: 11, color: '#444', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>
            CNN Business
          </p>

          {desc != null ? (
            <>
              <p style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: '#e0e0e0', lineHeight: 1.4, marginBottom: 8 }}>
                {desc.headline}
              </p>
              <p style={{ fontFamily: SANS, fontSize: 13, color: '#555', lineHeight: 1.6, flex: 1 }}>
                {desc.body}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: SANS, fontSize: 13, color: '#333', lineHeight: 1.6, flex: 1 }}>
              Fetching real-time market sentiment data…
            </p>
          )}

          <p style={{ fontFamily: MONO, fontSize: 10, color: '#333', marginTop: 16, letterSpacing: '0.08em' }}>
            Updated:{' '}
            <span style={{ color: '#00e5cc' }}>
              {fetchedAt ? timeAgoShort(fetchedAt) : '—'}
            </span>
          </p>
        </div>

      </div>
    </Card>
  )
}

// ─── CARD 2 — VIX ────────────────────────────────────────────────────────────

function VixCard({ vix }: { vix: number | null }) {
  const info = vix != null ? vixZone(vix) : null
  const desc = vix != null ? vixDescription(vix) : null

  return (
    <Card className="card-animate-1" style={{ flex: 1 }}>
      <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

        {/* Title */}
        <p style={{ fontFamily: BEBAS, fontSize: 36, color: '#f0f0f0', letterSpacing: '0.06em', lineHeight: 1, marginBottom: 2 }}>
          VIX
        </p>
        <p style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 }}>
          Volatility Index
        </p>

        {/* Heartbeat circle */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          border: '2px solid #3b82f6',
          background: 'rgba(59,130,246,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <svg width="44" height="26" viewBox="0 0 44 26" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,13 9,13 13,2 19,24 25,13 31,13 35,8 39,13 43,13" />
          </svg>
        </div>

        {/* Big VIX number */}
        {vix != null ? (
          <>
            <div style={{ fontFamily: BEBAS, fontSize: 60, color: '#ffffff', letterSpacing: '0.02em', lineHeight: 1, marginBottom: 8 }}>
              {vix.toFixed(1)}
            </div>
            <span style={{
              fontFamily: MONO, fontSize: 12, fontWeight: 700,
              color: info!.color, background: info!.bg,
              padding: '4px 14px', borderRadius: 20, letterSpacing: '0.10em',
              marginBottom: 20,
            }}>
              {info!.label}
            </span>
            <p style={{ fontFamily: SANS, fontSize: 12, color: '#555', lineHeight: 1.6, marginTop: 'auto' }}>
              {desc}
            </p>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: BEBAS, fontSize: 52, color: '#2a2a2a', letterSpacing: '0.02em' }}>—</span>
          </div>
        )}

      </div>
    </Card>
  )
}

// ─── CARD 3 — PORTFOLIO VALUE ─────────────────────────────────────────────────

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
  const hasPnL   = hasPrices && Math.abs(todayPnL) > 0
  const pnlPos   = todayPnL >= 0
  const pnlColor = hasPnL ? (pnlPos ? '#00ff87' : '#ff3b3b') : '#3a3a3a'
  const pnlSign  = pnlPos ? '+' : ''

  const cashOOB    = cashPct > 20 || cashPct < 5
  const cashColor  = cashOOB ? '#3b82f6' : '#3b82f6'
  const countTotal = useCountUp(Math.round(totalValue))

  return (
    <Card className="card-animate-2" style={{ flex: 1 }}>
      <div style={{ padding: '28px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Label */}
        <p style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
          Portfolio Value
        </p>

        {/* Hero row: value + P&L side by side */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          {/* Main value */}
          <div style={{
            fontFamily: BEBAS, fontSize: 52,
            color: loading ? '#2a2a2a' : '#ffffff',
            letterSpacing: '0.01em', lineHeight: 1,
          }}>
            {loading ? '—' : formatAmount(countTotal)}
          </div>

          {/* Daily P&L stacked */}
          {hasPnL && (
            <div style={{ textAlign: 'right', paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 600, color: pnlColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                {pnlSign}{formatAmount(Math.abs(todayPnL))}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 13, color: pnlColor, opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>
                ({pnlSign}{todayPnLPct.toFixed(2)}%)
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: '0.10em', marginTop: 4, textTransform: 'uppercase' }}>
                Today
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#1e1e1e', margin: '16px 0' }} />

        {/* Cash row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          {/* Wallet icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: '#141414', border: '1px solid #242424',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.8" strokeLinecap="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>

          {/* Cash info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>
              Cash
            </div>
            <div style={{ fontFamily: SANS, fontSize: 16, fontWeight: 700, color: '#e0e0e0', fontVariantNumeric: 'tabular-nums' }}>
              {formatAmount(totalValue * cashPct / 100)}
            </div>
          </div>

          {/* Percentage */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: BEBAS, fontSize: 28, color: cashColor, letterSpacing: '0.02em', lineHeight: 1 }}>
              {cashPct.toFixed(1)}%
            </div>
            <div style={{ fontFamily: MONO, fontSize: 9, color: '#333', letterSpacing: '0.10em', textTransform: 'uppercase', marginTop: 2 }}>
              Of Portfolio
            </div>
          </div>

          {/* Donut */}
          <CashDonut cashPct={cashPct} />

        </div>

      </div>
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
      borderTop: '1px solid #1e1e1e', borderBottom: '1px solid #1e1e1e',
      height: 44, display: 'flex', alignItems: 'center', padding: '0 32px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Scanline */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px)',
      }} />

      {/* Chain icon + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, zIndex: 1 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00e5cc" strokeWidth="2.5" strokeLinecap="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span style={{ fontFamily: SANS, fontSize: 10, fontWeight: 600, color: '#00e5cc', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          Market Connection
        </span>
      </div>

      <div style={{ width: 1, height: 16, background: '#1e1e1e', margin: '0 20px', flexShrink: 0, zIndex: 1 }} />

      <p style={{ fontFamily: SANS, fontSize: 12, color: '#555', flex: 1, zIndex: 1, lineHeight: 1 }}>
        {sentence}
      </p>

      <div style={{ zIndex: 1, flexShrink: 0, marginLeft: 20 }}>
        <span style={{
          fontFamily: MONO, fontSize: 10, fontWeight: 700,
          color: pill.color, background: pill.bg,
          padding: '4px 14px', borderRadius: 20, letterSpacing: '0.08em',
          border: `1px solid ${pill.color}33`,
        }}>
          {pill.label}
        </span>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

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
      {/* 3-card row */}
      <div style={{
        maxWidth: 1380,
        margin: '0 auto',
        padding: '28px 36px 24px',
        display: 'grid',
        gridTemplateColumns: '2fr 1.3fr 1fr',
        gap: 20,
      }}>
        <FearGreedCard
          fearGreed={macro.fearGreed}
          loaded={macro.loaded}
          vixForSentence={vix}
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
        <VixCard vix={vix} />
      </div>

      {/* Market Connection Bar */}
      <MarketConnectionBar fearGreed={macro.fearGreed} vix={vix} />
    </div>
  )
}
