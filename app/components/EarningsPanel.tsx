'use client'

import type { EarningsResult } from '@/lib/earnings-formatter'

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
  if (v == null) return null
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

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso)
    const dd = String(d.getUTCDate()).padStart(2, '0')
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const yy = d.getUTCFullYear()
    return `${dd}.${mm}.${yy}`
  } catch { return iso }
}

function sourceDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url.slice(0, 30) }
}

// ─── Validation badges ────────────────────────────────────────────────────────

interface EarningsWarning { label: string }

function getWarnings(card: EarningsCard): EarningsWarning[] {
  const warnings: EarningsWarning[] = []
  if (card.date) {
    const ageDays = (Date.now() - new Date(card.date).getTime()) / 86_400_000
    if (ageDays > 180) warnings.push({ label: '⚠️ דוח ישן' })
  }
  if ((card.sources ?? []).length < 2) warnings.push({ label: '⚠️ מקור יחיד' })
  return warnings
}

// ─── Divider ──────────────────────────────────────────────────────────────────

const Divider = () => (
  <div style={{ borderTop: '1px solid #1E1E1E', margin: '12px 0' }} />
)

// ─── Metric row ───────────────────────────────────────────────────────────────

function MetricRow({
  label, actual, estimate, beat, prefix = '', suffix = '',
}: {
  label: string
  actual: string
  estimate?: string | null
  beat?: boolean | null
  prefix?: string
  suffix?: string
}) {
  const hasEstimate = estimate != null && estimate !== '—'
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline',
      justifyContent: 'space-between', gap: 8,
      fontSize: 14, lineHeight: 1.6,
    }}>
      <span style={{ color: '#666', flexShrink: 0 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <span style={{ fontWeight: 600, color: '#E0E0E0', fontVariantNumeric: 'tabular-nums' }}>
          {prefix}{actual}{suffix}
        </span>
        {hasEstimate && (
          <span style={{ color: '#555', fontSize: 12 }}>(צפי: {prefix}{estimate}{suffix})</span>
        )}
        {hasEstimate && beat != null && (
          <span style={{ fontSize: 13 }}>{beat ? '✅' : '❌'}</span>
        )}
      </span>
    </div>
  )
}

// ─── RefreshIcon ──────────────────────────────────────────────────────────────

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}
    >
      <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

const THESIS_META = {
  supporting: { label: 'תומך ✅',   color: '#00DC82', bg: 'rgba(0,220,130,0.08)' },
  weakening:  { label: 'מחליש ⚠️', color: '#F5A623', bg: 'rgba(245,166,35,0.10)' },
  neutral:    { label: 'ניטרלי',   color: '#555',    bg: 'rgba(100,100,100,0.07)' },
}

function EarningCard({ card }: { card: EarningsCard }) {
  const thesis   = THESIS_META[card.thesis_impact] ?? THESIS_META.neutral
  const warnings = getWarnings(card)
  const sources  = card.sources ?? []

  if (card.loading) {
    return (
      <div style={{
        background: '#111', border: '1px solid #1C1C1C', borderRadius: 12,
        padding: '20px 22px', color: '#444', fontSize: 14, textAlign: 'center',
      }}>
        {card.ticker} — טוען…
      </div>
    )
  }

  if (card.error || !card.date) {
    return (
      <div style={{
        background: '#111', border: '1px solid #1C1C1C', borderRadius: 12,
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#FF5A5A' }}>
          {card.ticker}
        </span>
        <span style={{ color: '#555', fontSize: 13 }}>
          {card.error ?? 'אין נתוני רווחים'}
        </span>
      </div>
    )
  }

  const reactionN = safeNum(card.stock_reaction_pct)

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1C1C1C',
      borderLeft: `3px solid ${thesis.color}`,
      borderRadius: 12,
      padding: '18px 20px',
      direction: 'rtl',
    }}>

      {/* ── Header: ticker | quarter | date ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <span style={{
          fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
          color: thesis.color,
          background: `${thesis.color}18`,
          border: `1px solid ${thesis.color}33`,
          padding: '2px 8px', borderRadius: 4,
        }}>
          {card.ticker}
        </span>
        <span style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>{card.quarter}</span>
        <span style={{ color: '#444', fontSize: 12 }}>|</span>
        <span style={{ color: '#555', fontSize: 12 }}>{fmtDate(card.date)}</span>
        {warnings.map((w, i) => (
          <span key={i} style={{
            fontSize: 11, color: '#F5A623',
            background: 'rgba(245,166,35,0.08)',
            padding: '1px 6px', borderRadius: 3,
          }}>
            {w.label}
          </span>
        ))}
        {card.cacheHit && (
          <span style={{ fontSize: 10, color: '#2A2A2A', marginRight: 'auto' }}>מטמון</span>
        )}
      </div>

      <Divider />

      {/* ── Metrics ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <MetricRow
          label="הכנסות:"
          actual={fmtRevenue(card.revenue.actual)}
          estimate={card.revenue.estimate != null ? fmtRevenue(card.revenue.estimate) : null}
          beat={card.revenue.estimate != null ? card.revenue.beat : null}
        />
        <MetricRow
          label="EPS:"
          actual={fmt(card.eps.actual)}
          estimate={card.eps.estimate != null ? fmt(card.eps.estimate) : null}
          beat={card.eps.estimate != null ? card.eps.beat : null}
          prefix="$"
        />
        {card.gross_margin_pct != null && (
          <MetricRow label="מרווח:" actual={fmt(card.gross_margin_pct, 1)} suffix="%" />
        )}
        {reactionN != null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ color: '#666' }}>תגובת שוק:</span>
            <span style={{
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: reactionN >= 0 ? '#00DC82' : '#FF5A5A',
            }}>
              {reactionN >= 0 ? '+' : ''}{reactionN.toFixed(1)}%
            </span>
          </div>
        )}
        {card.guidance_next_quarter && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
            <span style={{ color: '#666', flexShrink: 0 }}>הנחיה הרבעון הבא:</span>
            <span style={{ color: '#888', textAlign: 'left', direction: 'ltr' }}>{card.guidance_next_quarter}</span>
          </div>
        )}
      </div>

      <Divider />

      {/* ── Hebrew summary ── */}
      {card.hebrew_summary && (
        <p style={{
          fontSize: 13, color: '#AAAAAA', lineHeight: 1.65,
          margin: '0 0 10px', textAlign: 'right',
        }}>
          {card.hebrew_summary}
        </p>
      )}

      {/* ── Investor call highlights ── */}
      {card.hebrew_call_highlights.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 5 }}>שיחת משקיעים:</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {card.hebrew_call_highlights.map((b, i) => (
              <li key={i} style={{ fontSize: 13, color: '#B0B0B0', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#444', flexShrink: 0 }}>-</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Divider />

      {/* ── Thesis + sources ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#555' }}>תזה:</span>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: thesis.color, background: thesis.bg,
            padding: '2px 8px', borderRadius: 4,
          }}>
            {thesis.label}
          </span>
        </div>

        {sources.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {sources.slice(0, 3).map((s, i) => (
              <a
                key={i} href={s} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: '#3A3A3A', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#666')}
                onMouseLeave={e => (e.currentTarget.style.color = '#3A3A3A')}
              >
                {sourceDomain(s)}
              </a>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function EarningsPanel({ cards, onRefresh, loading }: Props) {
  return (
    <div style={{
      background: '#0E0E0E',
      border: '1px solid #1C1C1C',
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{
        borderBottom: '1px solid #1C1C1C',
        padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#E8E8E8', letterSpacing: '-0.01em' }}>
            רווחים
          </span>
          {!loading && cards.length > 0 && (
            <span style={{ fontSize: 13, color: '#555' }}>
              {cards.filter(c => c.date).length} חברות
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
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
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#333', fontSize: 14 }}>
            טוען נתוני רווחים…
          </div>
        ) : cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#333', fontSize: 14 }}>
            אין דיווחי רווחים בחלון 90 הימים האחרונים
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cards.map(card => <EarningCard key={card.ticker} card={card} />)}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
