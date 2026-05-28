'use client'

import { useState } from 'react'

export interface AlertRow {
  id: string
  ticker: string
  alert_type: string
  alert_status: string
  priority: number
  title: string
  body?: string | null
  message?: string | null
  triggered_at: string
  metadata?: {
    thesis_impact?: string
    portfolio_impact_score?: number
    urgency_score?: number
    sentiment?: string
  } | null
}

export interface NewsItem {
  id: string
  ticker?: string | null
  headline: string
  source?: string | null
  source_url?: string | null
  summary?: string | null
  tags?: string[] | null
  thesis_impact?: string | null
  action_type?: string | null
  portfolio_impact_score?: number | null
  urgency_score?: number | null
  confidence_score?: number | null
  importance_score?: number | null
  is_verified?: boolean | null
  scoring_reason?: string | null
  sentiment?: string | null
  published_at?: string | null
}

interface AttentionItem {
  id: string
  ticker: string
  priority: 'critical' | 'high' | 'medium'
  category: string
  whyItMatters: string
  timestamp?: string
  portfolioImpact?: number
  urgency?: number
}

interface Props {
  alerts: AlertRow[]
  newsItems: NewsItem[]
}

const SEV_BADGE: Record<string, string> = {
  critical: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  high:     'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  medium:   'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

const SEV_LABEL: Record<string, string> = {
  critical: 'Critical',
  high:     'Review',
  medium:   'Monitor',
}

function firstSentence(text: string, maxLen = 110): string {
  if (!text) return ''
  const dot = text.indexOf('. ')
  if (dot > 0 && dot < maxLen) return text.slice(0, dot + 1).trim()
  if (text.length <= maxLen) return text.trim()
  return text.slice(0, maxLen).trim() + '…'
}

function deriveAlertCategory(alertType: string, body: string): string {
  if (alertType === 'thesis_break') return 'Thesis trigger'
  if (alertType === 'thesis_risk') return 'Thesis concern'
  return deriveFromText(body)
}

function deriveNewsCategory(tags: string[], summary: string, thesisImpact: string): string {
  if (thesisImpact === 'breaking') return 'Thesis trigger'
  if (thesisImpact === 'weakening') return 'Thesis concern'
  const tagMap: Record<string, string> = {
    dilution:   'Dilution risk',
    'm&a':      'Acquisition activity',
    debt:       'Financing activity',
    regulatory: 'Regulatory event',
    management: 'Management change',
    dividend:   'Dividend event',
    guidance:   'Market guidance',
    earnings:   'Earnings activity',
  }
  for (const [tag, label] of Object.entries(tagMap)) {
    if (tags.includes(tag)) {
      if (tag === 'earnings' && tags.includes('guidance')) return 'Earnings & guidance'
      return label
    }
  }
  return deriveFromText(summary)
}

function deriveFromText(text: string): string {
  const t = text.toLowerCase()
  if (t.includes('audit') || t.includes('certif')) return 'Auditor change'
  if (t.includes('acqui') || t.includes('merger') || t.includes('disposition')) return 'Acquisition activity'
  if (t.includes('dilut') || t.includes('unregistered') || t.includes('equity securities')) return 'Dilution risk'
  if (t.includes('delist')) return 'Delisting notice'
  if (t.includes('debt') || t.includes('obligation') || t.includes('credit') || t.includes('financ')) return 'Financing activity'
  if (t.includes('earnings') || t.includes('results of operations') || t.includes('revenue')) return 'Earnings activity'
  if (t.includes('guidance') || t.includes('outlook') || t.includes('reg fd')) return 'Market guidance'
  if (t.includes('regulat') || t.includes('compliance')) return 'Regulatory activity'
  if (t.includes('appoint') || t.includes('depart') || t.includes('resign') || t.includes('director')) return 'Management change'
  return 'Activity detected'
}

function buildItems(alerts: AlertRow[], newsItems: NewsItem[]): AttentionItem[] {
  const items: AttentionItem[] = []
  const seenTickers = new Set<string>()

  for (const a of alerts.filter(a => a.alert_status === 'active')) {
    if (seenTickers.has(a.ticker)) continue
    seenTickers.add(a.ticker)
    const body = a.body || a.message || a.title || ''
    items.push({
      id: `alert-${a.id}`,
      ticker: a.ticker,
      priority: a.priority >= 8 ? 'critical' : 'high',
      category: deriveAlertCategory(a.alert_type, body),
      whyItMatters: firstSentence(a.body || a.message || a.title || ''),
      timestamp: a.triggered_at,
      portfolioImpact: a.metadata?.portfolio_impact_score,
      urgency: a.metadata?.urgency_score,
    })
  }

  const actionItems = newsItems.filter(n => n.action_type === 'immediate' || n.action_type === 'daily')
  for (const n of actionItems) {
    if (!n.ticker || seenTickers.has(n.ticker)) continue
    seenTickers.add(n.ticker)
    const summary = n.summary || n.headline
    items.push({
      id: `news-${n.id}`,
      ticker: n.ticker,
      priority: n.action_type === 'immediate' ? 'high' : 'medium',
      category: deriveNewsCategory(n.tags ?? [], summary, n.thesis_impact ?? 'none'),
      whyItMatters: firstSentence(summary),
      timestamp: n.published_at ?? undefined,
      portfolioImpact: n.portfolio_impact_score ?? undefined,
      urgency: n.urgency_score ?? undefined,
    })
  }

  const order = { critical: 0, high: 1, medium: 2 }
  return items.sort((a, b) => order[a.priority] - order[b.priority])
}

function ImpactLevel({ value }: { value: number }) {
  const label = value >= 8 ? 'High' : value >= 6 ? 'Medium' : value >= 4 ? 'Low' : 'Minimal'
  const cls = value >= 8 ? 'text-red-500' : value >= 6 ? 'text-amber-500' : 'text-zinc-400 dark:text-zinc-500'
  return <span className={`text-xs font-medium ${cls}`}>Impact {label}</span>
}

function AttentionCard({ item }: { item: AttentionItem }) {
  const [expanded, setExpanded] = useState(false)

  const borderCls = item.priority === 'critical' ? 'border-l-red-400'
    : item.priority === 'high' ? 'border-l-amber-400'
    : 'border-l-zinc-200 dark:border-l-zinc-700'

  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className={`w-full text-left px-5 py-4 border-l-[3px] ${borderCls} hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors`}
    >
      {/* Row 1: ticker + severity badge */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {item.ticker}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEV_BADGE[item.priority]}`}>
            {SEV_LABEL[item.priority]}
          </span>
        </div>
        {item.portfolioImpact != null && <ImpactLevel value={item.portfolioImpact} />}
      </div>

      {/* Row 2: plain-English category */}
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {item.category}
      </p>

      {/* Row 3: why it matters */}
      <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
        {item.whyItMatters}
      </p>

      {/* Expanded detail */}
      {expanded && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500">
          {date && <span>{date}</span>}
          {item.urgency != null && <span>Urgency {item.urgency.toFixed(0)}/10</span>}
          {item.portfolioImpact != null && <span>Portfolio impact {item.portfolioImpact.toFixed(0)}/10</span>}
        </div>
      )}
    </button>
  )
}

export function AttentionQueue({ alerts, newsItems }: Props) {
  const [showAll, setShowAll] = useState(false)
  const items = buildItems(alerts, newsItems)
  const visibleItems = showAll ? items : items.slice(0, 5)
  const hasMore = items.length > 5

  const criticalCount = items.filter(i => i.priority === 'critical').length
  const highCount = items.filter(i => i.priority === 'high').length

  return (
    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
          What Needs Attention
        </p>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              {highCount} active
            </span>
          )}
          {items.length === 0 && (
            <span className="text-xs font-medium text-emerald-500">All clear</span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-3">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-500">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No active signals</p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Portfolio is operating as expected</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
          {visibleItems.map(item => <AttentionCard key={item.id} item={item} />)}
          {hasMore && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="w-full px-5 py-3 text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              {showAll ? 'Show less' : `${items.length - 5} more items →`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
