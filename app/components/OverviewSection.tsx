'use client'

import { useState } from 'react'
import type { IntelItem } from './NewsIntelligencePanel'
import type { NewsItem } from './NewsIntelligence'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HoldingRow {
  ticker: string
  company_name: string
  changePercent: number | null
  value: number
  currentPrice: number | null
}

interface ExposureSlice { label: string; pct: number; color: string }

interface FearGreedData { value: number | null; rating: string | null }

interface Props {
  total:          number
  invested:       number
  cash:           number
  cashPct:        number
  todayPnL:       number
  todayPnLPct:    number
  holdingsCount:  number
  exposureData:   ExposureSlice[]
  vixValue:       number | null
  vixChangePct:   number | null
  fearGreed:      FearGreedData | null
  intelItems:     IntelItem[]
  sortedRows:     HoldingRow[]
  newsItems:      NewsItem[]
  fmtAmount:      (n: number, d?: number) => string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  return `${Math.floor(m / 60)}h ago`
}

// ─── Portfolio Value card ─────────────────────────────────────────────────────

function PortfolioCard({ total, invested, cash, cashPct, todayPnL, todayPnLPct, holdingsCount, fmtAmount }: {
  total: number; invested: number; cash: number; cashPct: number
  todayPnL: number; todayPnLPct: number; holdingsCount: number
  fmtAmount: (n: number, d?: number) => string
}) {
  const up = todayPnL >= 0
  return (
    <div style={{ background: '#111118', border: '1px solid #1a1a28', borderRadius: 14, padding: '22px 24px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
          Total Portfolio Value
        </div>
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {fmtAmount(total)}
        </div>
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: up ? '#00d4a8' : '#ff4d6d', marginTop: 8, fontWeight: 500 }}>
          {up ? '+' : ''}{fmtAmount(todayPnL)} ({up ? '+' : ''}{todayPnLPct.toFixed(2)}%) today
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, paddingTop: 18, borderTop: '1px solid #1a1a28' }}>
        {[
          { label: 'Cash',      value: fmtAmount(cash),                sub: `${cashPct.toFixed(1)}%` },
          { label: 'Invested',  value: fmtAmount(invested),            sub: `${(100 - cashPct).toFixed(1)}%` },
          { label: 'Positions', value: String(holdingsCount),          sub: 'Active' },
          { label: 'Day Change',value: (todayPnL >= 0 ? '+' : '') + fmtAmount(todayPnL), sub: `${todayPnLPct >= 0 ? '+' : ''}${todayPnLPct.toFixed(2)}%`, red: todayPnL < 0 },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: '#555', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 15, fontWeight: 600, color: s.red ? '#ff4d6d' : '#ccc' }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 11, color: s.red ? '#ff4d6d' : '#444' }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Allocation donut card ────────────────────────────────────────────────────

function AllocationCard({ exposureData }: { exposureData: ExposureSlice[] }) {
  const gradient = exposureData.map((d, i) => {
    const start = exposureData.slice(0, i).reduce((s, e) => s + e.pct, 0)
    return `${d.color} ${start.toFixed(1)}% ${(start + d.pct).toFixed(1)}%`
  }).join(', ')

  return (
    <div style={{ background: '#111118', border: '1px solid #1a1a28', borderRadius: 14, padding: '22px 24px' }}>
      <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
        Allocation
      </div>
      <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        {/* Donut */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: 90, height: 90, borderRadius: '50%', background: `conic-gradient(${gradient})` }} />
          <div style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: '#111118' }} />
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          {exposureData.slice(0, 4).map(d => (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 12, color: '#ccc', flexShrink: 0 }}>{d.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── VIX card ─────────────────────────────────────────────────────────────────

function VixCard({ vixValue, vixChangePct }: { vixValue: number | null; vixChangePct: number | null }) {
  const level = vixValue == null ? '' : vixValue < 15 ? 'Low' : vixValue < 25 ? 'Normal' : vixValue < 35 ? 'Elevated' : 'Extreme'
  const levelColor = vixValue == null ? '#555' : vixValue < 15 ? '#00d4a8' : vixValue < 25 ? '#7aab6b' : vixValue < 35 ? '#ffaa00' : '#ff4d6d'
  const up = (vixChangePct ?? 0) >= 0

  return (
    <div style={{ background: '#111118', border: '1px solid #1a1a28', borderRadius: 14, padding: '22px 24px' }}>
      <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        VIX Index
      </div>
      <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 38, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {vixValue?.toFixed(1) ?? '—'}
      </div>
      {vixChangePct != null && (
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: up ? '#00d4a8' : '#ff4d6d', marginTop: 8, fontWeight: 500 }}>
          {up ? '▲' : '▼'} {up ? '+' : ''}{vixChangePct.toFixed(1)}%
        </div>
      )}
      {level && (
        <span style={{ display: 'inline-block', marginTop: 12, fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600, color: levelColor, background: `${levelColor}18`, border: `1px solid ${levelColor}33`, padding: '2px 8px', borderRadius: 6 }}>
          {level}
        </span>
      )}
    </div>
  )
}

// ─── Fear & Greed card ────────────────────────────────────────────────────────

function FearGreedCard({ fearGreed }: { fearGreed: FearGreedData | null }) {
  const v = fearGreed?.value ?? null
  const rating = fearGreed?.rating ?? null

  const color = v == null ? '#444'
    : v < 25 ? '#ff4d6d'
    : v < 45 ? '#ffaa00'
    : v < 55 ? '#ffdd44'
    : v < 75 ? '#7aab6b'
    : '#00d4a8'

  const r = 38
  const totalLen = Math.PI * r
  const dash = v != null ? (v / 100) * totalLen : 0

  return (
    <div style={{ background: '#111118', border: '1px solid #1a1a28', borderRadius: 14, padding: '22px 24px' }}>
      <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#555', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
        Fear &amp; Greed
      </div>

      {/* Semicircle gauge */}
      <svg width="100%" height="60" viewBox="0 0 120 66" style={{ display: 'block', marginBottom: 6 }}>
        {/* Background arc */}
        <path d={`M 6 60 A ${r} ${r} 0 0 1 114 60`}
          fill="none" stroke="#1a1a28" strokeWidth="8" strokeLinecap="round" />
        {/* Value arc */}
        <path d={`M 6 60 A ${r} ${r} 0 0 1 114 60`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} ${totalLen}`}
          style={{ transition: 'stroke-dasharray 600ms ease-out' }}
        />
        {/* Value text in arc center */}
        {v != null && (
          <text x="60" y="56" textAnchor="middle" fill={color}
            style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: '18px', fontWeight: 700 }}>
            {Math.round(v)}
          </text>
        )}
      </svg>

      {v == null ? (
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: '#333' }}>—</div>
      ) : (
        <span style={{
          display: 'inline-block',
          fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, fontWeight: 600,
          color, background: `${color}18`, border: `1px solid ${color}33`,
          padding: '2px 8px', borderRadius: 6, textTransform: 'capitalize',
        }}>
          {rating ?? (v < 45 ? 'Fear' : v < 55 ? 'Neutral' : 'Greed')}
        </span>
      )}
    </div>
  )
}

// ─── AI Market Summary card ───────────────────────────────────────────────────

function AISummaryCard({ intelItems, newsItems }: { intelItems: IntelItem[]; newsItems: NewsItem[] }) {
  const item = intelItems.find(i => !i.gateBlocked && i.scored?.hebrew_summary)
  const summaryText = item?.scored?.hebrew_summary
    ?? newsItems[0]?.summary
    ?? 'אין נתוני AI זמינים כרגע. לחץ על רענן חדשות.'

  return (
    <div style={{ background: '#111118', border: '1px solid #1a1a28', borderRadius: 14, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #00d4a8, #0066ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, fontWeight: 600, color: '#ccc' }}>AI Market Summary</span>
        {intelItems.length > 0 && (
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: '#00d4a8', background: '#00d4a810', border: '1px solid #00d4a820', padding: '1px 7px', borderRadius: 99 }}>
            {intelItems.filter(i => !i.gateBlocked && i.scored).length} Insights
          </span>
        )}
      </div>
      <p style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 14, color: '#888', lineHeight: 1.7, margin: 0, direction: 'rtl', textAlign: 'right' }}>
        {summaryText}
      </p>
      <button style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, fontWeight: 600,
        color: '#00d4a8', background: '#00d4a810', border: '1px solid #00d4a825',
        padding: '7px 14px', borderRadius: 8, cursor: 'pointer', width: 'fit-content',
        transition: 'background 0.1s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#00d4a820')}
        onMouseLeave={e => (e.currentTarget.style.background = '#00d4a810')}
      >
        View Full Summary →
      </button>
    </div>
  )
}

// ─── Top Movers card ──────────────────────────────────────────────────────────

function TopMoversCard({ sortedRows }: { sortedRows: HoldingRow[] }) {
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers')

  const withChange = sortedRows.filter(r => r.changePercent != null)
  const gainers = [...withChange].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)).slice(0, 4)
  const losers  = [...withChange].sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0)).slice(0, 4)
  const rows = tab === 'gainers' ? gainers : losers

  return (
    <div style={{ background: '#111118', border: '1px solid #1a1a28', borderRadius: 14, padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4a8" strokeWidth="2" strokeLinecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, fontWeight: 600, color: '#ccc' }}>Top Movers</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['gainers', 'losers'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12,
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? '#fff' : '#555',
              background: tab === t ? (t === 'gainers' ? '#00d4a818' : '#ff4d6d18') : 'transparent',
              border: `1px solid ${tab === t ? (t === 'gainers' ? '#00d4a830' : '#ff4d6d30') : 'transparent'}`,
            }}>
              {t === 'gainers' ? 'Gainers' : 'Losers'}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: '#333', textAlign: 'center', padding: '16px 0' }}>No price data</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map(r => {
            const pct = r.changePercent ?? 0
            const up  = pct >= 0
            return (
              <div key={r.ticker} style={{ display: 'flex', alignItems: 'center', padding: '8px 6px', borderRadius: 8, transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1a1a28')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 13, fontWeight: 600, color: '#fff', width: 52, flexShrink: 0 }}>{r.ticker}</span>
                <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#666', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.company_name}</span>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 13, fontWeight: 600, color: up ? '#00d4a8' : '#ff4d6d', width: 60, textAlign: 'right', flexShrink: 0 }}>
                  {up ? '+' : ''}{pct.toFixed(2)}%
                </span>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 12, color: '#555', width: 60, textAlign: 'right', flexShrink: 0 }}>
                  {r.currentPrice != null ? `$${r.currentPrice.toFixed(2)}` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Market News card ─────────────────────────────────────────────────────────

function MarketNewsCard({ newsItems }: { newsItems: NewsItem[] }) {
  const items = newsItems.slice(0, 3)
  return (
    <div style={{ background: '#111118', border: '1px solid #1a1a28', borderRadius: 14, padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4a8" strokeWidth="2" strokeLinecap="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, fontWeight: 600, color: '#ccc' }}>Market News</span>
        </div>
        <button style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 12, color: '#00d4a8', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
      </div>

      {items.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: '#333', textAlign: 'center', padding: '16px 0' }}>No news items</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(n => (
            <div key={n.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* Color dot based on thesis/sentiment */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: n.thesis_impact === 'breaking' ? '#ff4d6d18' : n.thesis_impact === 'weakening' ? '#ffaa0018' : '#00d4a818',
                border: `1px solid ${n.thesis_impact === 'breaking' ? '#ff4d6d30' : n.thesis_impact === 'weakening' ? '#ffaa0030' : '#00d4a830'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-dm-mono), monospace', fontSize: 9, fontWeight: 700, color: n.thesis_impact === 'breaking' ? '#ff4d6d' : n.thesis_impact === 'weakening' ? '#ffaa00' : '#00d4a8' }}>
                  {n.ticker?.slice(0, 4) ?? 'MKT'}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 13, color: '#ccc', lineHeight: 1.4, marginBottom: 4, direction: 'rtl', textAlign: 'right', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' } as React.CSSProperties}>
                  {n.hebrew_title ?? (n.ticker ? `עדכון ${n.ticker}` : 'עדכון SEC')}
                </div>
                <div style={{ fontFamily: 'var(--font-dm-sans), sans-serif', fontSize: 11, color: '#444' }}>
                  {n.source ?? 'Unknown'} · {n.published_at ? timeAgo(n.published_at) : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function OverviewSection(props: Props) {
  const { total, invested, cash, cashPct, todayPnL, todayPnLPct, holdingsCount, exposureData, vixValue, vixChangePct, fearGreed, intelItems, sortedRows, newsItems, fmtAmount } = props

  return (
    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Row 1: Portfolio (2fr) + Allocation (1fr) + VIX (1fr) + Fear&Greed (1fr) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
        <PortfolioCard total={total} invested={invested} cash={cash} cashPct={cashPct} todayPnL={todayPnL} todayPnLPct={todayPnLPct} holdingsCount={holdingsCount} fmtAmount={fmtAmount} />
        <AllocationCard exposureData={exposureData} />
        <VixCard vixValue={vixValue} vixChangePct={vixChangePct} />
        <FearGreedCard fearGreed={fearGreed} />
      </div>

      {/* Row 2: AI Summary + Top Movers + Market News */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <AISummaryCard intelItems={intelItems} newsItems={newsItems} />
        <TopMoversCard sortedRows={sortedRows} />
        <MarketNewsCard newsItems={newsItems} />
      </div>
    </div>
  )
}
