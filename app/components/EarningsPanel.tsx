'use client'

import { useEffect, useRef, useState } from 'react'
import type { EarningsResult } from '@/lib/earnings-formatter'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EarningsCard extends EarningsResult {
  ticker:       string
  company_name: string
  cacheHit?:    boolean
  loading?:     boolean
  error?:       string
}

interface Props {
  cards:     EarningsCard[]
  onRefresh: () => void
  loading:   boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number | null {
  if (v == null || v === 'null' || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function fmt(v: unknown, d = 2): string {
  const n = safeNum(v); if (n == null) return '—'
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(d)
}

function fmtRevenue(v: unknown): string {
  const b = safeNum(v); if (b == null) return '—'
  return b >= 1 ? `$${b.toFixed(2)}B` : `$${(b * 1000).toFixed(0)}M`
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return iso }
}

function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url.slice(0, 20) }
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number | null, dur = 900): number {
  const [val, setVal] = useState(0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (target == null) { setVal(0); return }
    setVal(0)
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(target * e)
      if (p < 1) raf.current = requestAnimationFrame(tick); else setVal(target)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current != null) cancelAnimationFrame(raf.current) }
  }, [target, dur])
  return val
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function Donut({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const clamped = Math.min(Math.max(Math.round(pct), 1), 99)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `conic-gradient(${color} 0% ${clamped}%, #1a1a1a ${clamped}% 100%)`,
    }} />
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label:      string
  rawValue:   number | null
  fmtFn:      (v: number) => string
  sub:        string
  beat?:      boolean | null
  verified:   boolean
  donutPct:   number
  donutColor: string
}

function MetricCard({ label, rawValue, fmtFn, sub, beat, verified, donutPct, donutColor }: MetricCardProps) {
  const animated = useCountUp(rawValue)
  const display  = rawValue != null ? fmtFn(animated) : '—'

  return (
    <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 14, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#666', letterSpacing: '0.02em' }}>{label}</span>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, color: '#fff', lineHeight: 1, letterSpacing: '1px' }}>{display}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {beat != null && (
            <span style={{ fontSize: 12, color: beat ? '#00e5b3' : '#ff4d6d', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              {beat ? '↑ עמד בציפיות' : '↓ מתחת לציפיות'}
            </span>
          )}
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555' }}>{sub}</span>
      </div>
      <Donut pct={donutPct} color={donutColor} />
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#ccc', letterSpacing: '-0.01em' }}>{title}</span>
    </div>
  )
}

// ─── RefreshIcon ──────────────────────────────────────────────────────────────

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}>
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

// ─── Thesis config ────────────────────────────────────────────────────────────

const THESIS_CFG = {
  supporting: { label: 'תומך',   icon: '✅', color: '#00e5b3', bg: '#00e5b310', border: '#00e5b325' },
  weakening:  { label: 'מחליש',  icon: '⚠️', color: '#ffaa00', bg: '#ffaa0010', border: '#ffaa0025' },
  neutral:    { label: 'ניטרלי', icon: '',   color: '#777',    bg: '#77777710', border: '#77777725' },
} as const

// ─── Main card ────────────────────────────────────────────────────────────────

function EarningCard({ card }: { card: EarningsCard }) {
  const [hovered, setHovered] = useState(false)
  const th       = THESIS_CFG[card.thesis_impact] ?? THESIS_CFG.neutral
  const sources  = card.sources ?? []
  const verified = sources.length >= 3
  const reaction = safeNum(card.stock_reaction_pct)

  const revActual  = safeNum(card.revenue.actual)
  const revEst     = safeNum(card.revenue.estimate)
  const epsActual  = safeNum(card.eps.actual)
  const epsEst     = safeNum(card.eps.estimate)
  const margin     = safeNum(card.gross_margin_pct)

  // Donut percentages — actual vs estimate, or direct percentage for margin
  const revDonutPct  = revActual != null && revEst != null ? Math.min((revActual / revEst) * 85, 95) : revActual != null ? 78 : 0
  const epsDonutPct  = epsActual != null && epsEst != null ? Math.min((epsActual / epsEst) * 85, 95) : epsActual != null ? 78 : 0
  const margDonutPct = margin != null ? Math.min(margin, 95) : 0

  if (card.loading) {
    return (
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 18, padding: '32px 36px', color: '#333', fontFamily: "'DM Sans', sans-serif", fontSize: 14, animation: 'pulse 1.5s ease-in-out infinite' }}>
        טוען נתוני רווחים עבור {card.ticker}…
      </div>
    )
  }

  if (card.error || !card.date) {
    return (
      <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderLeft: '4px solid #ff4d6d', borderRadius: 18, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: '#ff4d6d' }}>{card.ticker}</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#555' }}>{card.error ?? 'אין נתוני רווחים'}</span>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: `1px solid ${hovered ? '#252525' : '#1a1a1a'}`,
        borderRadius: 18,
        overflow: 'hidden',
        animation: 'cardIn 400ms ease-out both',
        transition: 'border-color 150ms',
        direction: 'rtl',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >

      {/* ── COMPANY HEADER ── */}
      <div style={{ padding: '20px 28px 18px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Ticker + company */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#fff', letterSpacing: '2px', lineHeight: 1 }}>
              {card.ticker}
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#666' }}>
              {card.company_name}
            </span>
          </div>

          {/* Quarter + date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderRight: '1px solid #1f1f1f', paddingRight: 14 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#ccc', fontWeight: 600 }}>
              {card.quarter} Results
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#555' }}>
              {fmtDate(card.date)}
            </span>
          </div>
        </div>

        {/* Right side: source badge + thesis */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            color: verified ? '#00e5b3' : '#ffaa00',
            background: verified ? '#00e5b308' : '#ffaa0008',
            border: `1px solid ${verified ? '#00e5b320' : '#ffaa0020'}`,
            padding: '4px 10px', borderRadius: 99,
          }}>
            {sources.length} מקורות {verified ? '✅' : '⚠️'}
          </span>
          {!verified && (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#ffaa00', background: '#ffaa0010', border: '1px solid #ffaa0025', padding: '4px 10px', borderRadius: 99 }}>
              ⚠️ פחות מ-3 מקורות
            </span>
          )}
        </div>
      </div>

      {/* ── KEY TAKEAWAYS BANNER ── */}
      {card.hebrew_summary && (
        <div style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #0d1a14 0%, #0a100d 100%)', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>✦</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#00e5b3', marginLeft: 8 }}>
              {card.quarter} — עיקרי הדוח
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888', lineHeight: 1.5 }}>
              {' '}{card.hebrew_summary.split('.')[0]}.
            </span>
          </div>
        </div>
      )}

      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── 3 METRIC CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <MetricCard
            label="הכנסות"
            rawValue={revActual}
            fmtFn={v => v >= 1 ? `$${v.toFixed(2)}B` : `$${(v * 1000).toFixed(0)}M`}
            sub={revEst != null ? `צפי ${fmtRevenue(revEst)}` : 'ללא אומדן'}
            beat={card.revenue.estimate != null ? card.revenue.beat : null}
            verified={verified}
            donutPct={revDonutPct}
            donutColor="#a855f7"
          />
          <MetricCard
            label="EPS (Non-GAAP)"
            rawValue={epsActual}
            fmtFn={v => `$${v.toFixed(2)}`}
            sub={epsEst != null ? `צפי $${fmt(epsEst)}` : 'ללא אומדן'}
            beat={card.eps.estimate != null ? card.eps.beat : null}
            verified={verified}
            donutPct={epsDonutPct}
            donutColor="#00e5b3"
          />
          <MetricCard
            label="מרווח גולמי"
            rawValue={margin}
            fmtFn={v => `${v.toFixed(1)}%`}
            sub={reaction != null ? `תגובת שוק ${reaction >= 0 ? '+' : ''}${reaction.toFixed(1)}%` : ''}
            verified={verified}
            donutPct={margDonutPct}
            donutColor="#00e5b3"
          />
        </div>

        {/* ── CONTENT ROW: Executive Summary + Key Highlights ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Executive Summary */}
          <div style={{ background: '#0e0e0e', border: '1px solid #161616', borderRadius: 12, padding: '20px 22px' }}>
            <SectionHeader icon="📋" title="סיכום מנהלים" />
            {card.hebrew_summary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {card.hebrew_summary.split(/(?<=\.)\s+/).filter(Boolean).map((para, i) => (
                  <p key={i} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#999', lineHeight: 1.7, margin: 0, textAlign: 'right' }}>
                    {para}
                  </p>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#555', margin: 0 }}>אין נתוני סיכום</p>
            )}

            {/* Guidance */}
            {card.guidance_next_quarter && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a1a1a' }}>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555', display: 'block', marginBottom: 4 }}>
                  תחזית הרבעון הבא
                </span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#888', direction: 'ltr', display: 'block', textAlign: 'left' }}>
                  {card.guidance_next_quarter}
                </span>
              </div>
            )}
          </div>

          {/* Key Highlights */}
          <div style={{ background: '#0e0e0e', border: '1px solid #161616', borderRadius: 12, padding: '20px 22px' }}>
            <SectionHeader icon="⭐" title="עיקרי הדוח" />
            {card.hebrew_call_highlights.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {card.hebrew_call_highlights.map((pt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, direction: 'rtl' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#00e5b312', border: '1px solid #00e5b325', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00e5b3', display: 'inline-block' }} />
                    </span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#aaa', lineHeight: 1.6, textAlign: 'right' }}>
                      {pt}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#555', margin: 0 }}>אין נקודות עיקריות</p>
            )}

            {/* Press Release / Sources */}
            {sources.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1a1a1a', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {sources.slice(0, 3).map((s, i) => (
                  <a key={i} href={s} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#00e5b3', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {sourceDomain(s)} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── BOTTOM ROW: Stock Reaction bar + Thesis ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, flexWrap: 'wrap', gap: 12 }}>
          {/* Stock reaction visual */}
          {reaction != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#555' }}>תגובת שוק:</span>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600,
                color: reaction >= 0 ? '#00e5b3' : '#ff4d6d',
              }}>
                {reaction >= 0 ? '+' : ''}{reaction.toFixed(1)}%
              </span>
              {/* Mini bar */}
              <div style={{ width: 80, height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${Math.min(Math.abs(reaction) * 8, 100)}%`,
                  background: reaction >= 0 ? '#00e5b3' : '#ff4d6d',
                  marginRight: reaction >= 0 ? 'auto' : 0,
                  marginLeft: reaction >= 0 ? 0 : 'auto',
                }} />
              </div>
            </div>
          )}

          {/* Cache indicator */}
          {card.cacheHit && (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#333' }}>מטמון</span>
          )}

          {/* Thesis pill */}
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
            color: th.color, background: th.bg, border: `1px solid ${th.border}`,
            borderRadius: 99, padding: '5px 16px',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            {th.label} {th.icon}
          </span>
        </div>

      </div>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EarningsPanel({ cards, onRefresh, loading }: Props) {
  return (
    <div style={{ background: '#080808', border: '1px solid #161616', borderRadius: 18, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600, color: '#e8e8e8', letterSpacing: '-0.02em' }}>
            רווחים
          </span>
          {!loading && cards.filter(c => c.date).length > 0 && (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#444', background: '#111', border: '1px solid #1e1e1e', borderRadius: 6, padding: '2px 8px' }}>
              {cards.filter(c => c.date).length} חברות
            </span>
          )}
        </div>
        <button onClick={onRefresh} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: "'DM Sans', sans-serif", fontSize: 13,
          color: loading ? '#333' : '#888', cursor: loading ? 'default' : 'pointer',
          background: '#111', border: '1px solid #1e1e1e',
          padding: '7px 14px', borderRadius: 8, transition: 'all 0.12s',
        }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#333' } }}
          onMouseLeave={e => { e.currentTarget.style.color = loading ? '#333' : '#888'; e.currentTarget.style.borderColor = '#1e1e1e' }}
        >
          <RefreshIcon spinning={loading} />
          {loading ? 'טוען…' : 'רענן'}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {loading && cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#333', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
            טוען נתוני רווחים…
          </div>
        ) : cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#333', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
            אין דיווחי רווחים בחלון 90 הימים האחרונים
          </div>
        ) : (
          cards.map(card => <EarningCard key={card.ticker} card={card} />)
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        @keyframes cardIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }
      `}</style>
    </div>
  )
}
