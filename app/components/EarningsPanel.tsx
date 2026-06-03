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

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const THESIS = {
  supporting: { label: 'תומך',  icon: '✅',  accent: '#00ff87', bg: '#00ff8715', border: '#00ff8730' },
  weakening:  { label: 'מחליש', icon: '⚠️', accent: '#ffaa00', bg: '#ffaa0015', border: '#ffaa0030' },
  neutral:    { label: 'ניטרלי', icon: '',   accent: '#555555', bg: '#55555515', border: '#55555530' },
} as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number | null {
  if (v == null || v === 'null' || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function fmt(v: unknown, decimals = 2): string {
  const n = safeNum(v)
  if (n == null) return '—'
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(decimals)
}

function fmtRevenue(v: unknown): string {
  const b = safeNum(v)
  if (b == null) return '—'
  return b >= 1 ? `$${b.toFixed(2)}B` : `$${(b * 1000).toFixed(0)}M`
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`
  } catch { return iso }
}

function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url.slice(0, 25) }
}

function sourcesVerified(card: EarningsCard): boolean {
  return (card.sources ?? []).length >= 3
}

function getWarnings(card: EarningsCard): string[] {
  const w: string[] = []
  if (card.date && (Date.now() - new Date(card.date).getTime()) / 86_400_000 > 180)
    w.push('⚠️ דוח ישן')
  if ((card.sources ?? []).length < 3)
    w.push('⚠️ פחות מ-3 מקורות')
  return w
}

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number | null, duration = 800): number {
  const [val, setVal] = useState(0)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (target == null) { setVal(0); return }
    setVal(0)
    const start = performance.now()
    const tick = (now: number) => {
      const t     = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(target * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else setVal(target)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current != null) cancelAnimationFrame(raf.current) }
  }, [target, duration])

  return val
}

// ─── Metric column ────────────────────────────────────────────────────────────

interface MetricColProps {
  label:     string
  rawValue:  number | null
  fmtFn:     (v: number) => string
  estimate?: string | null
  beat?:     boolean | null
  verified:  boolean
}

function MetricCol({ label, rawValue, fmtFn, estimate, beat, verified }: MetricColProps) {
  const animated = useCountUp(rawValue)
  const display  = rawValue != null ? fmtFn(animated) : '—'

  return (
    <div style={{
      background: '#111111', border: '1px solid #1a1a1a', borderRadius: 10,
      padding: '20px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#999',
        textTransform: 'uppercase', letterSpacing: '2px',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: '#ffffff',
        lineHeight: 1, letterSpacing: '1px',
      }}>
        {display}
      </span>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4 }}>
        {estimate != null
          ? <><span>צפי {estimate}</span>{verified && beat != null && <span>{beat ? '✅' : '❌'}</span>}</>
          : <span style={{ color: '#555' }}>ללא צפי</span>
        }
      </div>
    </div>
  )
}

// ─── Call bullet item ─────────────────────────────────────────────────────────

function CallItem({ text }: { text: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, direction: 'rtl' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: '#00ff87',
        flexShrink: 0, marginTop: 6, display: 'inline-block',
      }} />
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 15, lineHeight: 1.55,
        color: hovered ? '#dddddd' : '#bbbbbb',
        transition: 'color 120ms ease',
      }}>
        {text}
      </span>
    </div>
  )
}

// ─── RefreshIcon ──────────────────────────────────────────────────────────────

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}>
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function EarningCard({ card }: { card: EarningsCard }) {
  const [hovered, setHovered] = useState(false)
  const th       = THESIS[card.thesis_impact] ?? THESIS.neutral
  const warnings = getWarnings(card)
  const sources  = card.sources ?? []
  const verified = sourcesVerified(card)
  const reactionN = safeNum(card.stock_reaction_pct)

  if (card.loading) {
    return (
      <div style={{
        background: '#0a0a0a', border: '1px solid #1f1f1f', borderLeft: '4px solid #1f1f1f',
        borderRadius: 16, padding: '28px 32px',
        fontFamily: "'DM Sans', sans-serif", color: '#333', fontSize: 13,
      }}>
        {card.ticker} — טוען…
      </div>
    )
  }

  if (card.error || !card.date) {
    return (
      <div style={{
        background: '#0a0a0a', border: '1px solid #1f1f1f', borderLeft: '4px solid #ff3b3b',
        borderRadius: 16, padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 500, color: '#ff3b3b' }}>
          {card.ticker}
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#444' }}>
          {card.error ?? 'אין נתוני רווחים'}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: `1px solid ${hovered ? '#2a2a2a' : '#1f1f1f'}`,
        borderLeft: `4px solid ${th.accent}`,
        borderRadius: 16,
        padding: '28px 32px',
        direction: 'rtl',
        animation: 'cardMount 400ms ease-out both',
        transition: 'border-color 150ms ease',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── TOP ROW ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 500,
          color: '#ffffff', background: '#111111',
          border: '1px solid #222222', borderRadius: 6, padding: '4px 10px',
        }}>
          {card.ticker}
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#aaa' }}>
          {card.quarter}
        </span>
        <span style={{ flex: 1 }} />
        {warnings.map((w, i) => (
          <span key={i} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            color: '#ffaa00', background: '#ffaa0010', border: '1px solid #ffaa0025',
            padding: '2px 8px', borderRadius: 99,
          }}>
            {w}
          </span>
        ))}
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#888' }}>
          {fmtDate(card.date)}
        </span>
        <span style={{ color: '#555', fontSize: 11, margin: '0 2px' }}>·</span>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
          color: verified ? '#00ff87' : '#ffaa00',
        }}>
          {sources.length} מקורות {verified ? '✅' : '⚠️'}
        </span>
      </div>

      {/* ── HERO METRICS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
        <MetricCol
          label="הכנסות"
          rawValue={safeNum(card.revenue.actual)}
          fmtFn={v => v >= 1 ? `$${v.toFixed(2)}B` : `$${(v * 1000).toFixed(0)}M`}
          estimate={card.revenue.estimate != null ? fmtRevenue(card.revenue.estimate) : null}
          beat={card.revenue.beat}
          verified={verified}
        />
        <MetricCol
          label="EPS"
          rawValue={safeNum(card.eps.actual)}
          fmtFn={v => `$${v.toFixed(2)}`}
          estimate={card.eps.estimate != null ? `$${fmt(card.eps.estimate)}` : null}
          beat={card.eps.beat}
          verified={verified}
        />
        <MetricCol
          label={card.gross_margin_pct != null ? 'מרווח גולמי' : 'תגובת שוק'}
          rawValue={card.gross_margin_pct != null ? safeNum(card.gross_margin_pct) : reactionN}
          fmtFn={v => {
            if (card.gross_margin_pct != null) return `${v.toFixed(1)}%`
            return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
          }}
          verified={verified}
        />
      </div>

      {/* Stock reaction below grid if margin also shown */}
      {card.gross_margin_pct != null && reactionN != null && (
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
          color: reactionN >= 0 ? '#00ff87' : '#ff3b3b',
          marginBottom: 12, direction: 'rtl',
        }}>
          תגובת שוק: {reactionN >= 0 ? '+' : ''}{reactionN.toFixed(1)}%
        </div>
      )}

      {/* ── DIVIDER ── */}
      <div style={{ borderTop: '1px solid #111111', margin: '16px 0' }} />

      {/* ── GUIDANCE ── */}
      {card.guidance_next_quarter && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'baseline' }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888', flexShrink: 0 }}>
            תחזית Q2:
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#aaa', direction: 'ltr', textAlign: 'left' }}>
            {card.guidance_next_quarter}
          </span>
        </div>
      )}

      {/* ── SUMMARY ── */}
      {card.hebrew_summary && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 16, color: '#aaaaaa', lineHeight: 1.7,
          margin: '0 0 20px', textAlign: 'right',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
        } as React.CSSProperties}>
          {card.hebrew_summary}
        </p>
      )}

      {/* ── INVESTOR CALL ── */}
      {card.hebrew_call_highlights.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, color: '#888',
            textTransform: 'uppercase', letterSpacing: '3px',
            marginBottom: 12,
          }}>
            שיחת משקיעים
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {card.hebrew_call_highlights.map((b, i) => <CallItem key={i} text={b} />)}
          </div>
        </div>
      )}

      {/* ── DIVIDER ── */}
      <div style={{ borderTop: '1px solid #111111', margin: '0 0 16px' }} />

      {/* ── BOTTOM ROW ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {sources.slice(0, 4).map((s, i) => (
            <span key={i}>
              <a
                href={s} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#666', textDecoration: 'none', transition: 'color 120ms' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                onMouseLeave={e => (e.currentTarget.style.color = '#666')}
              >
                {sourceDomain(s)}
              </a>
              {i < Math.min(sources.length, 4) - 1 && (
                <span style={{ color: '#555', marginLeft: 4 }}>,</span>
              )}
            </span>
          ))}
        </div>
        <span style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12, fontWeight: 600,
          color: th.accent, background: th.bg, border: `1px solid ${th.border}`,
          borderRadius: 20, padding: '4px 14px',
          display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}>
          {th.label} {th.icon}
        </span>
      </div>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EarningsPanel({ cards, onRefresh, loading }: Props) {
  return (
    <div style={{ background: '#0E0E0E', border: '1px solid #1C1C1C', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{
        borderBottom: '1px solid #1C1C1C', padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 600, color: '#E8E8E8', letterSpacing: '-0.01em' }}>
            רווחים
          </span>
          {!loading && cards.length > 0 && (
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#555' }}>
              {cards.filter(c => c.date).length} חברות
            </span>
          )}
        </div>
        <button
          onClick={onRefresh} disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'DM Sans', sans-serif",
            color: loading ? '#444' : '#909090', fontSize: 13, cursor: loading ? 'default' : 'pointer',
            background: '#161616', border: '1px solid #363636',
            padding: '7px 14px', borderRadius: 8, transition: 'color 0.12s, border-color 0.12s',
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#555' } }}
          onMouseLeave={e => { e.currentTarget.style.color = loading ? '#444' : '#909090'; e.currentTarget.style.borderColor = '#363636' }}
        >
          <RefreshIcon spinning={loading} />
          {loading ? 'טוען…' : 'רענן'}
        </button>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {loading && cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#333', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
            טוען נתוני רווחים…
          </div>
        ) : cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#333', fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
            אין דיווחי רווחים בחלון 90 הימים האחרונים
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {cards.map(card => <EarningCard key={card.ticker} card={card} />)}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        @keyframes cardMount { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
