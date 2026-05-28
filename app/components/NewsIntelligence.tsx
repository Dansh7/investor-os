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

const BUCKET_META: Record<Bucket, { label: string; badge: string; dot: string; activeBorder: string }> = {
  immediate: {
    label: 'Immediate',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    dot: 'bg-red-500',
    activeBorder: 'border-b-red-500',
  },
  daily: {
    label: 'Daily',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    dot: 'bg-amber-400',
    activeBorder: 'border-b-amber-400',
  },
  weekly: {
    label: 'Weekly',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
    dot: 'bg-sky-400',
    activeBorder: 'border-b-sky-400',
  },
}

const THESIS_STYLE: Record<string, string> = {
  breaking:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  weakening:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  supporting: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
}

const SENTIMENT_STYLE: Record<string, string> = {
  positive: 'text-emerald-500',
  negative: 'text-red-500',
  neutral:  'text-zinc-400',
  mixed:    'text-amber-500',
}

function ImpactBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100)
  const color = value >= 8 ? 'bg-red-400' : value >= 6 ? 'bg-amber-400' : value >= 4 ? 'bg-sky-400' : 'bg-zinc-300 dark:bg-zinc-600'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular-nums text-xs">{value.toFixed(1)}</span>
    </div>
  )
}

function NewsRow({ item }: { item: NewsItem }) {
  const [expanded, setExpanded] = useState(false)
  const hasThesis = item.thesis_impact && item.thesis_impact !== 'none'

  return (
    <div
      className="px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
      onClick={() => setExpanded(e => !e)}
    >
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        {item.ticker && (
          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.ticker}</span>
        )}

        {/* Verification badge — primary signal */}
        {item.is_verified ? (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            ✓ Verified
          </span>
        ) : (
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
            Unverified
          </span>
        )}

        {hasThesis && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${THESIS_STYLE[item.thesis_impact!] ?? ''}`}>
            thesis {item.thesis_impact}
          </span>
        )}
        {item.sentiment && item.sentiment !== 'neutral' && (
          <span className={`text-xs font-medium ${SENTIMENT_STYLE[item.sentiment] ?? ''}`}>{item.sentiment}</span>
        )}
      </div>

      {/* Headline */}
      <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">
        {item.headline.slice(0, 120)}{item.headline.length > 120 ? '…' : ''}
      </p>

      {/* Scores — portfolio impact primary, importance secondary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
        {item.portfolio_impact_score != null && (
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Portfolio impact</span>
            <ImpactBar value={item.portfolio_impact_score} />
          </div>
        )}
        {item.importance_score != null && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Importance</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{item.importance_score.toFixed(1)}</span>
          </div>
        )}
        {item.urgency_score != null && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Urgency</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">{item.urgency_score.toFixed(1)}</span>
          </div>
        )}
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{item.source}</span>
        {item.published_at && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {new Date(item.published_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-2.5 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800 pt-2.5">
          {item.summary && (
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{item.summary}</p>
          )}
          {item.scoring_reason && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 italic leading-relaxed">{item.scoring_reason}</p>
          )}
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-sky-500 hover:underline"
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

  // Auto-select first non-empty tab
  const effectiveTab: Bucket = byBucket[activeTab].length > 0
    ? activeTab
    : BUCKET_ORDER.find(b => byBucket[b].length > 0) ?? 'immediate'

  const displayItems = byBucket[effectiveTab]

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold">News Intelligence</h2>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{items.length} scored</span>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">No news scored yet — run the news pipeline</p>
      ) : (
        <>
          {/* Tabs — Immediate first, Daily second, Weekly third */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            {BUCKET_ORDER.map(bucket => {
              const meta = BUCKET_META[bucket]
              const count = byBucket[bucket].length
              const isActive = effectiveTab === bucket
              return (
                <button
                  key={bucket}
                  onClick={() => setActiveTab(bucket)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2
                    ${isActive
                      ? `border-b-zinc-900 dark:border-b-zinc-100 text-zinc-900 dark:text-zinc-100`
                      : 'border-b-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
                  {meta.label}
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${meta.badge}`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {displayItems.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">No {BUCKET_META[effectiveTab].label} items</p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-96 overflow-y-auto">
              {displayItems.map(item => <NewsRow key={item.id} item={item} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
