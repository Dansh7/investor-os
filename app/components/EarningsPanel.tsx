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

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—'
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(decimals)
}

function fmtRevenue(b: number | null | undefined): string {
  if (b == null) return '—'
  return b >= 1 ? `$${b.toFixed(2)}B` : `$${(b * 1000).toFixed(0)}M`
}

function BeatIcon({ beat }: { beat: boolean | null }) {
  if (beat === null) return <span style={{ color: '#555' }}>—</span>
  return <span>{beat ? '✅' : '❌'}</span>
}

const THESIS_META = {
  supporting: { label: 'תומך ✅',  color: '#00DC82', bg: 'rgba(0,220,130,0.08)' },
  weakening:  { label: 'מחליש ⚠️', color: '#F5A623', bg: 'rgba(245,166,35,0.10)' },
  neutral:    { label: 'ניטרלי',   color: '#666',    bg: 'rgba(100,100,100,0.07)' },
}

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

function EarningCard({ card }: { card: EarningsCard }) {
  const thesis = THESIS_META[card.thesis_impact] ?? THESIS_META.neutral

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
        padding: '20px 22px',
      }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#FF5A5A' }}>
          {card.ticker}
        </span>
        <span style={{ color: '#555', fontSize: 13, marginRight: 8 }}>
          {card.error ?? 'אין נתוני רווחים'}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1C1C1C',
      borderLeft: `3px solid ${thesis.color}`,
      borderRadius: 12,
      padding: '20px 22px',
      direction: 'rtl',
    }}>
      {/* Header: ticker — quarter date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'monospace', fontWeight: 700, fontSize: 13,
          color: thesis.color,
          background: `${thesis.color}18`,
          border: `1px solid ${thesis.color}44`,
          padding: '2px 8px', borderRadius: 4,
        }}>
          {card.ticker}
        </span>
        <span style={{ color: '#888', fontSize: 14, fontWeight: 500 }}>
          {card.quarter}
        </span>
        <span style={{ color: '#444', fontSize: 13 }}>
          {card.date}
        </span>
        {card.cacheHit && (
          <span style={{ fontSize: 10, color: '#333', marginRight: 'auto' }}>מטמון</span>
        )}
      </div>

      {/* Revenue + EPS row */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, color: '#C8C8C8' }}>
          <span style={{ color: '#666' }}>הכנסות: </span>
          <span style={{ fontWeight: 600 }}>{fmtRevenue(card.revenue.actual)}</span>{' '}
          <BeatIcon beat={card.revenue.beat} />
          {card.revenue.estimate != null && (
            <span style={{ color: '#555', fontSize: 12 }}> (צפי {fmtRevenue(card.revenue.estimate)})</span>
          )}
        </span>

        <span style={{ color: '#444' }}>|</span>

        <span style={{ fontSize: 14, color: '#C8C8C8' }}>
          <span style={{ color: '#666' }}>EPS: </span>
          <span style={{ fontWeight: 600 }}>${fmt(card.eps.actual)}</span>{' '}
          <BeatIcon beat={card.eps.beat} />
          {card.eps.estimate != null && (
            <span style={{ color: '#555', fontSize: 12 }}> (צפי ${fmt(card.eps.estimate)})</span>
          )}
        </span>

        {card.gross_margin_pct != null && (
          <>
            <span style={{ color: '#444' }}>|</span>
            <span style={{ fontSize: 14, color: '#C8C8C8' }}>
              <span style={{ color: '#666' }}>מרווח גולמי: </span>
              <span style={{ fontWeight: 600 }}>{card.gross_margin_pct.toFixed(1)}%</span>
            </span>
          </>
        )}
      </div>

      {/* Stock reaction */}
      {card.stock_reaction_pct != null && (
        <div style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 14, color: '#888' }}>תגובת שוק: </span>
          <span style={{
            fontSize: 15, fontWeight: 700,
            color: card.stock_reaction_pct >= 0 ? '#00DC82' : '#FF5A5A',
          }}>
            {card.stock_reaction_pct >= 0 ? '+' : ''}{card.stock_reaction_pct.toFixed(1)}%
          </span>
        </div>
      )}

      {/* Guidance */}
      {card.guidance_next_quarter && (
        <div style={{ marginBottom: 10, fontSize: 13, color: '#777' }}>
          <span style={{ color: '#555' }}>הנחיה הרבעון הבא: </span>
          {card.guidance_next_quarter}
        </div>
      )}

      {/* Hebrew summary */}
      {card.hebrew_summary && (
        <p style={{
          fontSize: 14, color: '#AAAAAA', lineHeight: 1.6,
          margin: '0 0 12px', direction: 'rtl', textAlign: 'right',
        }}>
          {card.hebrew_summary}
        </p>
      )}

      {/* Investor call highlights */}
      {card.hebrew_call_highlights.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>שיחת משקיעים:</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {card.hebrew_call_highlights.map((b, i) => (
              <li key={i} style={{ fontSize: 13, color: '#B0B0B0', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: '#444', flexShrink: 0 }}>•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Thesis */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 12, color: '#555' }}>תזה:</span>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: thesis.color, background: thesis.bg,
          padding: '2px 8px', borderRadius: 4,
        }}>
          {thesis.label}
        </span>
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
      {/* Header */}
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

      {/* Content */}
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
