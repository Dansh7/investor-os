'use client'

import { useState } from 'react'

export interface NewsItem {
  id: string
  ticker?: string | null
  headline: string
  source?: string | null
  source_url?: string | null
  published_at?: string | null
  importance_score?: number | null
  portfolio_impact_score?: number | null
  urgency_score?: number | null
  confidence_score?: number | null
  thesis_impact?: string | null
  action_type?: string | null
  is_verified?: boolean | null
  scoring_reason?: string | null
  sentiment?: string | null
  summary?: string | null
}

interface Props {
  items: NewsItem[]
}

const BUCKET_ORDER = ['immediate', 'daily', 'weekly'] as const
type Bucket = typeof BUCKET_ORDER[number]

const BUCKET_META: Record<Bucket, { label: string; dotColor: string; badgeBg: string; badgeColor: string }> = {
  immediate: { label: 'Immediate', dotColor: '#ff4d4d', badgeBg: 'rgba(255,77,77,0.10)',  badgeColor: '#ff4d4d' },
  daily:     { label: 'Daily',     dotColor: '#f5a623', badgeBg: 'rgba(245,166,35,0.10)', badgeColor: '#f5a623' },
  weekly:    { label: 'Weekly',    dotColor: '#60a5fa', badgeBg: 'rgba(96,165,250,0.10)', badgeColor: '#60a5fa' },
}

const THESIS_BADGE: Record<string, { bg: string; color: string }> = {
  breaking:   { bg: 'rgba(255,77,77,0.10)',  color: '#ff4d4d' },
  weakening:  { bg: 'rgba(245,166,35,0.10)', color: '#f5a623' },
  supporting: { bg: 'rgba(0,220,130,0.08)',  color: '#00dc82' },
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: '#00dc82',
  negative: '#ff4d4d',
  neutral:  '#555',
  mixed:    '#f5a623',
}

function ImpactBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = value >= 8 ? '#ff4d4d' : value >= 6 ? '#f5a623' : value >= 4 ? '#60a5fa' : '#333'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: '#222' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="tabular-nums text-xs" style={{ color: '#9a9a9a' }}>{value.toFixed(1)}</span>
    </div>
  )
}

function NewsRow({ item, isLast }: { item: NewsItem; isLast?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const hasThesis = item.thesis_impact && item.thesis_impact !== 'none'
  const thesisBadge = item.thesis_impact ? THESIS_BADGE[item.thesis_impact] : null

  return (
    <div
      className="px-4 py-3 cursor-pointer transition-colors hover:bg-[#171717]"
      style={{ borderBottom: isLast ? 'none' : '1px solid #1a1a1a' }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        {item.ticker && (
          <span className="font-mono text-xs font-bold text-white tracking-tight">{item.ticker}</span>
        )}
        {item.is_verified ? (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,220,130,0.08)', color: '#00dc82' }}>
            ✓ Verified
          </span>
        ) : (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(100,100,100,0.08)', color: '#555' }}>
            Unverified
          </span>
        )}
        {hasThesis && thesisBadge && (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={thesisBadge}>
            thesis {item.thesis_impact}
          </span>
        )}
        {item.sentiment && item.sentiment !== 'neutral' && (
          <span className="text-xs font-medium" style={{ color: SENTIMENT_COLOR[item.sentiment] ?? '#555' }}>
            {item.sentiment}
          </span>
        )}
      </div>

      <p className="text-sm leading-snug" style={{ color: '#e0e0e0' }}>
        {item.headline.slice(0, 120)}{item.headline.length > 120 ? '…' : ''}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
        {item.portfolio_impact_score != null && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium" style={{ color: '#666' }}>Portfolio impact</span>
            <ImpactBar value={item.portfolio_impact_score} />
          </div>
        )}
        {item.importance_score != null && (
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: '#555' }}>Importance</span>
            <span className="text-xs tabular-nums" style={{ color: '#9a9a9a' }}>{item.importance_score.toFixed(1)}</span>
          </div>
        )}
        {item.urgency_score != null && (
          <div className="flex items-center gap-1">
            <span className="text-xs" style={{ color: '#555' }}>Urgency</span>
            <span className="text-xs tabular-nums" style={{ color: '#9a9a9a' }}>{item.urgency_score.toFixed(1)}</span>
          </div>
        )}
        {item.source && <span className="text-xs" style={{ color: '#555' }}>{item.source}</span>}
        {item.published_at && (
          <span className="text-xs" style={{ color: '#555' }}>
            {new Date(item.published_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-2.5 space-y-1.5 pt-2.5" style={{ borderTop: '1px solid #1e1e1e' }}>
          {item.summary && (
            <p className="text-xs leading-relaxed" style={{ color: '#c8c8c8' }}>{item.summary}</p>
          )}
          {item.scoring_reason && (
            <p className="text-xs italic leading-relaxed" style={{ color: '#555' }}>{item.scoring_reason}</p>
          )}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs hover:underline"
              style={{ color: '#60a5fa' }}
              onClick={e => e.stopPropagation()}
            >
              View source →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export function NewsIntelligence({ items }: Props) {
  const [activeTab, setActiveTab] = useState<Bucket>('immediate')

  const byBucket: Record<Bucket, NewsItem[]> = { immediate: [], daily: [], weekly: [] }
  for (const item of items) {
    const b = (item.action_type ?? '') as Bucket
    if (b in byBucket) byBucket[b].push(item)
  }

  const effectiveTab: Bucket = byBucket[activeTab].length > 0
    ? activeTab
    : BUCKET_ORDER.find(b => byBucket[b].length > 0) ?? 'immediate'

  const displayItems = byBucket[effectiveTab]

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid #232323' }}>
        <h2 className="text-sm font-semibold text-white">News Intelligence</h2>
        <span className="text-xs" style={{ color: '#555' }}>{items.length} scored</span>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>No news scored yet — run the news pipeline</p>
      ) : (
        <>
          <div className="flex" style={{ borderBottom: '1px solid #232323' }}>
            {BUCKET_ORDER.map(bucket => {
              const meta = BUCKET_META[bucket]
              const count = byBucket[bucket].length
              const isActive = effectiveTab === bucket
              return (
                <button
                  key={bucket}
                  onClick={() => setActiveTab(bucket)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors"
                  style={{
                    color: isActive ? '#ffffff' : '#555',
                    borderBottom: `2px solid ${isActive ? '#ffffff' : 'transparent'}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.dotColor }} />
                  {meta.label}
                  {count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: meta.badgeBg, color: meta.badgeColor }}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {displayItems.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>No {BUCKET_META[effectiveTab].label} items</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {displayItems.map((item, idx) => (
                <NewsRow key={item.id} item={item} isLast={idx === displayItems.length - 1} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
