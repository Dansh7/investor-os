'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Font constants ───────────────────────────────────────────────────────────

const BEBAS = "var(--font-bebas), 'Bebas Neue', sans-serif"
const MONO  = "var(--font-dm-mono), 'DM Mono', monospace"
const SANS  = "var(--font-dm-sans), 'DM Sans', system-ui, sans-serif"

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  vix:            number | null
  vixChange:      number | null
  vixChangePct:   number | null
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
  exposureData:   { label: string; pct: number; color: string }[]
}

// ─── Zone helpers ─────────────────────────────────────────────────────────────

function fgZone(v: number): { label: string; color: string } {
  if (v <= 25) return { label: 'Extreme Fear', color: '#ff3b3b' }
  if (v <= 45) return { label: 'Fear',         color: '#ff8800' }
  if (v <= 55) return { label: 'Neutral',      color: '#888888' }
  if (v <= 75) return { label: 'Greed',        color: '#00ff87' }
  return              { label: 'Extreme Greed',color: '#00ffaa' }
}

function vixZone(v: number): { label: string; color: string; bg: string } {
  if (v < 18)  return { label: 'LOW',      color: '#00ff87',  bg: 'rgba(0,255,135,0.10)' }
  if (v < 24)  return { label: 'MODERATE', color: '#aaaaaa',  bg: 'rgba(200,200,200,0.08)' }
  if (v < 32)  return { label: 'ELEVATED', color: '#ffaa00',  bg: 'rgba(255,170,0,0.10)' }
  return              { label: 'EXTREME',  color: '#ff3b3b',  bg: 'rgba(255,59,59,0.10)' }
}

function marketStatus(fg: number | null, vix: number | null): { headline: string; detail: string } {
  if (fg == null && vix == null) return { headline: 'ממתין לנתוני שוק', detail: '…' }
  if (fg == null) return vix! < 15
    ? { headline: 'שוק רגוע', detail: 'VIX נמוך — מעקב שוטף מומלץ' }
    : { headline: 'תנודתיות מוגברת', detail: 'VIX גבוה — שמור על פוזיציות שמרניות' }
  if (vix == null) return fg > 60
    ? { headline: 'מצב שוק: חיובי', detail: 'Fear & Greed חיובי — מומנטום שורי' }
    : fg < 30
      ? { headline: 'מצב שוק: פחד', detail: 'Fear & Greed שלילי — בדוק הזדמנויות כניסה' }
      : { headline: 'מצב שוק: ניטרלי', detail: 'סנטימנט מאוזן — המתן לאיתות ברור' }
  if (fg >= 55 && vix < 20) return { headline: 'מצב שוק: חיובי', detail: 'VIX נמוך + Fear & Greed חיובי — תנאים טובים למומנטום' }
  if (fg >= 55 && vix < 30) return { headline: 'מצב שוק: חיובי', detail: 'סנטימנט שורי + תנודתיות מתונה — שמור על החשיפה' }
  if (fg >= 55)              return { headline: 'מצב שוק: זהירות', detail: 'Fear & Greed חיובי למרות VIX מוגבר — קזז סיכון' }
  if (fg < 30 && vix > 30)   return { headline: 'מצב שוק: שלילי', detail: 'פחד קיצוני + VIX גבוה — עבור לנכסי מגן' }
  if (fg < 30)               return { headline: 'מצב שוק: פחד', detail: 'סנטימנט שלילי — בדוק נקודות כניסה' }
  return                              { headline: 'מצב שוק: מעורב', detail: 'איתותים סותרים — שמור על פוזיציות שמרניות' }
}

function connectionStatus(fg: number | null, vix: number | null): { label: string; color: string; bg: string } {
  if (fg == null || vix == null) return { label: 'טוען',       color: '#555',    bg: 'rgba(85,85,85,0.10)' }
  if (fg >= 55 && vix < 20) return      { label: 'איתות חיובי', color: '#00ff87', bg: 'rgba(0,255,135,0.08)' }
  if (fg < 30 || vix > 30)  return      { label: 'סיכון גבוה',  color: '#ff3b3b', bg: 'rgba(255,59,59,0.08)' }
  return                                 { label: 'זהירות',       color: '#ffaa00', bg: 'rgba(255,170,0,0.08)' }
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
// viewBox 280×185. Arc centre (140, 148), radius 118.
// Zone label is rendered outside in HTML for legibility at small sizes.

function FGGauge({ value, color }: { value: number; color: string }) {
  const cx = 140, cy = 148, r = 118, nLen = 100

  const pt = (v: number) => {
    const a = Math.PI * (1 - v / 100)
    return { x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy - r * Math.sin(a)).toFixed(1) }
  }

  const na  = Math.PI * (1 - Math.max(0, Math.min(100, value)) / 100)
  const tip = { x: +(cx + nLen * Math.cos(na)).toFixed(1), y: +(cy - nLen * Math.sin(na)).toFixed(1) }
  const arc = `M ${pt(0).x} ${pt(0).y} A ${r} ${r} 0 0 1 ${pt(100).x} ${pt(100).y}`
  const topY = cy - r  // = 30

  return (
    <svg viewBox="18 3 244 168" overflow="visible" style={{ display: 'block', width: '100%', height: 'auto' }}>
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
      <path d={arc} fill="none" stroke="#1e1e1e" strokeWidth="17" strokeLinecap="round" />
      {/* Gradient arc */}
      <path d={arc} fill="none" stroke="url(#cnnGrad)" strokeWidth="17" strokeLinecap="round" />

      {/* Tick at 50 */}
      <line x1={cx} y1={topY + 2} x2={cx} y2={topY + 16} stroke="#3a3a3a" strokeWidth="2.5" />

      {/* Needle */}
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y}
        stroke="#ffffff" strokeWidth="4" strokeLinecap="round" filter="url(#cnnGlow)" />
      <circle cx={cx} cy={cy} r="8" fill="#ffffff" filter="url(#cnnGlow)" />
      <circle cx={cx} cy={cy} r="3.5" fill="#080808" />
    </svg>
  )
}

// ─── Cash donut ───────────────────────────────────────────────────────────────

function CashDonut({ cashPct }: { cashPct: number }) {
  const r = 22, circ = 2 * Math.PI * r
  const invLen  = ((100 - cashPct) / 100) * circ
  const cashLen = (cashPct / 100) * circ
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" style={{ flexShrink: 0 }}>
      <circle cx="27" cy="27" r={r} fill="none" stroke="#1a1a1a" strokeWidth="6" />
      <circle cx="27" cy="27" r={r} fill="none" stroke="#00ff87" strokeWidth="6"
        strokeDasharray={`${invLen.toFixed(1)} ${circ.toFixed(1)}`}
        transform="rotate(-90 27 27)" strokeLinecap="butt" opacity="0.65" />
      <circle cx="27" cy="27" r={r} fill="none" stroke="#3b82f6" strokeWidth="6"
        strokeDasharray={`${cashLen.toFixed(1)} ${circ.toFixed(1)}`}
        strokeDashoffset={(-invLen).toFixed(1)}
        transform="rotate(-90 27 27)" strokeLinecap="butt" />
    </svg>
  )
}

// ─── Mini donut (KPI strip) ───────────────────────────────────────────────────

function MiniDonut({ cashPct }: { cashPct: number }) {
  const r = 15, circ = 2 * Math.PI * r
  const invLen  = ((100 - cashPct) / 100) * circ
  const cashLen = (cashPct / 100) * circ
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" style={{ flexShrink: 0 }}>
      <circle cx="19" cy="19" r={r} fill="none" stroke="#1a1a1a" strokeWidth="5" />
      <circle cx="19" cy="19" r={r} fill="none" stroke="#00ff87" strokeWidth="5"
        strokeDasharray={`${invLen.toFixed(1)} ${circ.toFixed(1)}`}
        transform="rotate(-90 19 19)" strokeLinecap="butt" opacity="0.6" />
      <circle cx="19" cy="19" r={r} fill="none" stroke="#3b82f6" strokeWidth="5"
        strokeDasharray={`${cashLen.toFixed(1)} ${circ.toFixed(1)}`}
        strokeDashoffset={(-invLen).toFixed(1)}
        transform="rotate(-90 19 19)" strokeLinecap="butt" />
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
        border: `1px solid ${hov ? '#2a2a2a' : '#1a1a1a'}`,
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── CARD 1 — FEAR & GREED ────────────────────────────────────────────────────

function FearGreedCard({ fearGreed, loaded }: {
  fearGreed: number | null
  loaded: boolean
}) {
  const zone = fearGreed != null ? fgZone(fearGreed) : null

  return (
    <Card className="card-animate-2" style={{ alignSelf: 'stretch' }}>
      <div style={{ padding: '12px 2px 8px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Title + source on one line — minimal padding to maximise gauge */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4, padding: '0 10px' }}>
          <p style={{ fontFamily: SANS, fontSize: 12, color: '#ccc', fontWeight: 600 }}>
            Fear &amp; Greed
          </p>
          <p style={{ fontFamily: SANS, fontSize: 9, color: '#444', fontWeight: 500 }}>
            CNN · live
          </p>
        </div>

        {/* Gauge area */}
        {!loaded ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: '#333' }}>loading…</span>
          </div>
        ) : fearGreed == null ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: SANS, fontSize: 13, color: '#444' }}>Unavailable</span>
          </div>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              <FGGauge value={fearGreed} color={zone!.color} />
            </div>
            {/* Value + zone — rendered in HTML for clear separation below needle base */}
            <div style={{ textAlign: 'center', paddingTop: 4, paddingBottom: 2 }}>
              <div style={{
                fontFamily: BEBAS, fontSize: 40, color: zone!.color,
                lineHeight: 1, letterSpacing: '0.02em',
              }}>
                {Math.round(fearGreed)}
              </div>
              <div style={{
                fontFamily: SANS, fontSize: 10, fontWeight: 600,
                color: zone!.color, letterSpacing: '0.04em', marginTop: 1,
              }}>
                {zone!.label}
              </div>
            </div>
          </>
        )}

      </div>
    </Card>
  )
}

// ─── CARD 2 — VIX (compact) ───────────────────────────────────────────────────

function VixCard({ vix, vixChange, vixChangePct }: {
  vix: number | null
  vixChange: number | null
  vixChangePct: number | null
}) {
  const info = vix != null ? vixZone(vix) : null
  const chgPos   = (vixChange ?? 0) >= 0
  const chgColor = chgPos ? '#00ff87' : '#ff5a5a'

  return (
    <Card className="card-animate-1" style={{ alignSelf: 'stretch' }}>
      <div style={{ padding: '20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* VIX as the primary instrument label */}
        <div style={{ marginBottom: 6 }}>
          <p style={{ fontFamily: BEBAS, fontSize: 22, color: '#d4d4d4', letterSpacing: '0.06em', lineHeight: 1, marginBottom: 6 }}>
            VIX
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="20" height="10" viewBox="0 0 44 26" fill="none"
              stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.55}>
              <polyline points="1,13 9,13 13,2 19,24 25,13 31,13 35,8 39,13 43,13" />
            </svg>
            <span style={{ fontFamily: SANS, fontSize: 10, color: '#4a4a4a', fontWeight: 500 }}>
              Volatility Index
            </span>
          </div>
        </div>

        {/* Spacer pushes value to lower half */}
        <div style={{ flex: 1 }} />

        {/* Hero value */}
        {vix != null ? (
          <>
            <div style={{ fontFamily: BEBAS, fontSize: 60, color: '#ffffff', letterSpacing: '0.01em', lineHeight: 0.88, marginBottom: 6 }}>
              {vix.toFixed(1)}
            </div>
            {vixChange != null && vixChangePct != null && (
              <div style={{
                fontFamily: MONO, fontSize: 11, fontWeight: 500,
                color: chgColor, marginBottom: 10,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {chgPos ? '▲' : '▼'} {chgPos ? '+' : ''}{vixChange.toFixed(1)} ({chgPos ? '+' : ''}{vixChangePct.toFixed(1)}%)
              </div>
            )}
            <span style={{
              fontFamily: SANS, fontSize: 10, fontWeight: 700,
              color: info!.color, background: info!.bg,
              padding: '3px 10px', borderRadius: 20, letterSpacing: '0.04em',
              textTransform: 'uppercase', alignSelf: 'flex-start',
            }}>
              {info!.label}
            </span>
          </>
        ) : (
          <div style={{ fontFamily: BEBAS, fontSize: 60, color: '#2a2a2a' }}>—</div>
        )}

      </div>
    </Card>
  )
}

// ─── CARD 3 — PORTFOLIO VALUE (hero) ─────────────────────────────────────────

function PortfolioValueCard({
  totalValue, investedValue,
  cashPct, todayPnL, todayPnLPct,
  loading, hasPrices, formatAmount, currency, exposureData, holdingsCount,
}: {
  totalValue:    number
  investedValue: number
  cashPct:       number
  todayPnL:      number
  todayPnLPct:   number
  loading:       boolean
  hasPrices:     boolean
  formatAmount:  (n: number, d?: number) => string
  currency:      'USD' | 'ILS'
  exposureData:  { label: string; pct: number; color: string }[]
  holdingsCount: number
}) {
  const hasPnL   = hasPrices && Math.abs(todayPnL) > 0
  const pnlPos   = todayPnL >= 0
  const pnlColor = hasPnL ? (pnlPos ? '#00ff87' : '#ff3b3b') : '#3a3a3a'
  const pnlSign  = pnlPos ? '+' : ''
  const countTotal = useCountUp(Math.round(totalValue))

  return (
    <Card className="card-animate-0">
      {/* Vertical flex: main content row + KPI strip */}
      <div style={{ padding: '28px 32px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ── Main row: left + right side by side ── */}
        <div style={{ display: 'flex', gap: 0, flex: 1, paddingBottom: 22 }}>

          {/* Left: core metrics */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

            <p style={{ fontFamily: SANS, fontSize: 13, color: '#888', letterSpacing: '-0.01em', marginBottom: 14, fontWeight: 600 }}>
              Portfolio Value
            </p>

            {/* Hero value + P&L */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
              <div style={{
                fontFamily: BEBAS, fontSize: 64, color: loading ? '#2a2a2a' : '#ffffff',
                letterSpacing: '0.01em', lineHeight: 0.88,
              }}>
                {loading ? '—' : formatAmount(countTotal)}
              </div>
              {hasPnL && (
                <div style={{ textAlign: 'right', paddingBottom: 6, flexShrink: 0 }}>
                  <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 700, color: pnlColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>
                    {pnlSign}{formatAmount(Math.abs(todayPnL))}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: pnlColor, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                    ({pnlSign}{todayPnLPct.toFixed(2)}%)
                  </div>
                  <div style={{ fontFamily: SANS, fontSize: 11, color: '#666', marginTop: 5 }}>
                    Today
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right: exposure panel */}
          {exposureData.length > 0 && (
            <div style={{
              width: 200, flexShrink: 0,
              borderLeft: '1px solid #191919',
              marginLeft: 32, paddingLeft: 28,
              display: 'flex', flexDirection: 'column',
            }}>
              <p style={{ fontFamily: SANS, fontSize: 12, color: '#888', letterSpacing: 'normal', marginBottom: 16, fontWeight: 600 }}>
                Exposure
              </p>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                {exposureData.map((item, i) => (
                  <div
                    key={item.label}
                    style={{
                      paddingTop: 9, paddingBottom: 9,
                      borderBottom: i < exposureData.length - 1 ? '1px solid #141414' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                        <span style={{ fontFamily: SANS, fontSize: 13, color: '#999' }}>{item.label}</span>
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, color: '#e8e8e8', fontVariantNumeric: 'tabular-nums' }}>
                        {item.pct.toFixed(1)}%
                      </span>
                    </div>
                    {/* Allocation bar */}
                    <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', marginTop: 2 }}>
                      <div style={{
                        width: `${Math.min(100, item.pct)}%`, height: '100%',
                        background: item.color, borderRadius: 2, opacity: 0.75,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── 4-metric KPI strip ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: '1px solid #191919',
          paddingTop: 18,
          paddingBottom: 24,
        }}>

          {/* 1 — Cash (with donut) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 16 }}>
            <MiniDonut cashPct={cashPct} />
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', fontWeight: 500, marginBottom: 4 }}>Cash</div>
              <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: '#e8e8e8', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                {formatAmount(totalValue * cashPct / 100)}
              </div>
              <div style={{ fontFamily: BEBAS, fontSize: 17, color: '#3b82f6', lineHeight: 1, marginTop: 2 }}>
                {cashPct.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 2 — Holdings */}
          <div style={{ borderLeft: '1px solid #1a1a1a', padding: '0 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', fontWeight: 500, marginBottom: 4 }}>Holdings</div>
            <div style={{ fontFamily: BEBAS, fontSize: 36, color: '#e8e8e8', lineHeight: 0.9, marginBottom: 4 }}>
              {holdingsCount}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 11, color: '#555', fontWeight: 500 }}>positions</div>
          </div>

          {/* 3 — Deployed (current market value of holdings, from live prices) */}
          <div style={{ borderLeft: '1px solid #1a1a1a', padding: '0 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', fontWeight: 500, marginBottom: 4 }}>Invested</div>
            <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: '#e8e8e8', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {hasPrices ? formatAmount(investedValue) : '—'}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 11, color: '#555', fontWeight: 500, marginTop: 2 }}>
              {hasPrices ? `${(100 - cashPct).toFixed(1)}% deployed` : 'awaiting prices'}
            </div>
          </div>

          {/* 4 — Daily P&L (from live price feed, same source as hero) */}
          <div style={{ borderLeft: '1px solid #1a1a1a', padding: '0 16px' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#555', fontWeight: 500, marginBottom: 4 }}>Today</div>
            <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: pnlColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
              {hasPnL ? `${pnlSign}${formatAmount(Math.abs(todayPnL))}` : '—'}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: pnlColor, fontWeight: 500, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {hasPnL ? `${pnlSign}${todayPnLPct.toFixed(2)}%` : 'market closed'}
            </div>
          </div>

        </div>

      </div>
    </Card>
  )
}

// ─── MARKET CONNECTION BAR ────────────────────────────────────────────────────

function MarketConnectionBar({ fearGreed, vix }: { fearGreed: number | null; vix: number | null }) {
  const status = marketStatus(fearGreed, vix)
  const pill   = connectionStatus(fearGreed, vix)

  return (
    <div style={{
      background: '#090909',
      borderTop: '1px solid #191919', borderBottom: '1px solid #191919',
      minHeight: 58, display: 'flex', alignItems: 'center', padding: '10px 36px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
      }} />

      {/* Signal icon */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, zIndex: 1, marginRight: 18 }}>
        <svg width="14" height="11" viewBox="0 0 44 28" fill="none" stroke="#00e5cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1,14 10,14 14,3 20,25 26,14 32,14 36,7 40,14 43,14" />
        </svg>
      </div>

      {/* Two-line insight — direction rtl for correct Hebrew rendering */}
      <div style={{ flex: 1, zIndex: 1, minWidth: 0, direction: 'rtl', textAlign: 'right' }}>
        <p style={{ fontFamily: SANS, fontSize: 14, color: '#f0f0f0', fontWeight: 700, lineHeight: 1.2, margin: 0 }}>
          {status.headline}
        </p>
        <p style={{ fontFamily: SANS, fontSize: 12, color: '#999', fontWeight: 400, lineHeight: 1.4, margin: '4px 0 0' }}>
          {status.detail}
        </p>
      </div>

      {/* Status pill */}
      <div style={{ zIndex: 1, flexShrink: 0, marginLeft: 24 }}>
        <span style={{
          fontFamily: SANS, fontSize: 12, fontWeight: 700,
          color: pill.color, background: pill.bg,
          padding: '6px 16px', borderRadius: 20, letterSpacing: '0.02em',
          border: `1px solid ${pill.color}55`,
          whiteSpace: 'nowrap',
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
  vix, vixChange, vixChangePct,
  totalValue, investedValue, cashPct, todayPnL, todayPnLPct,
  loading, hasPrices, formatAmount, currency,
  criticalAlerts, warningAlerts, totalAlerts, holdingsCount,
  lastSync, minCashPct, maxCashPct, exposureData,
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
      {/* 3-card grid: portfolio hero (1fr) + VIX + F&G (fixed 185px each) */}
      <div style={{
        maxWidth: 1380,
        margin: '0 auto',
        padding: '20px 36px 16px',
        display: 'grid',
        gridTemplateColumns: '1fr 168px 168px',
        gap: 14,
        alignItems: 'stretch',
      }}>
        <PortfolioValueCard
          totalValue={totalValue}
          investedValue={investedValue}
          cashPct={cashPct}
          todayPnL={todayPnL}
          todayPnLPct={todayPnLPct}
          loading={loading}
          hasPrices={hasPrices}
          formatAmount={formatAmount}
          currency={currency}
          exposureData={exposureData}
          holdingsCount={holdingsCount}
        />
        <VixCard vix={vix} vixChange={vixChange} vixChangePct={vixChangePct} />
        <FearGreedCard
          fearGreed={macro.fearGreed}
          loaded={macro.loaded}
        />
      </div>

      {/* Market Connection Bar */}
      <MarketConnectionBar fearGreed={macro.fearGreed} vix={vix} />
    </div>
  )
}
