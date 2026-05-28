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

const SEV_BORDER: Record<string, string> = {
  critical: '#ff4d4d',
  high:     '#f5a623',
  medium:   '#2a2a2a',
}

const SEV_BADGE: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(255,77,77,0.10)',  color: '#ff4d4d' },
  high:     { bg: 'rgba(245,166,35,0.10)', color: '#f5a623' },
  medium:   { bg: 'rgba(100,100,100,0.08)', color: '#6b6b6b' },
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
    dilution: 'Dilution risk', 'm&a': 'Acquisition activity', debt: 'Financing activity',
    regulatory: 'Regulatory event', management: 'Management change', dividend: 'Dividend event',
    guidance: 'Market guidance', earnings: 'Earnings activity',
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
  const color = value >= 8 ? '#ff4d4d' : value >= 6 ? '#f5a623' : '#555'
  return <span className="text-xs font-medium" style={{ color }}>Impact {label}</span>
}

function AttentionCard({ item, isLast }: { item: AttentionItem; isLast?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <button
      onClick={() => setExpanded(e => !e)}
      className="w-full text-left px-5 py-4 transition-colors hover:bg-[#171717]"
      style={{
        borderLeft: `3px solid ${SEV_BORDER[item.priority]}`,
        borderBottom: isLast ? 'none' : '1px solid #1a1a1a',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-white tracking-tight">{item.ticker}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={SEV_BADGE[item.priority]}>
            {SEV_LABEL[item.priority]}
          </span>
        </div>
        {item.portfolioImpact != null && <ImpactLevel value={item.portfolioImpact} />}
      </div>

      <p className="text-sm font-medium text-white mb-1">{item.category}</p>

      <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{item.whyItMatters}</p>

      {expanded && (
        <div className="flex items-center gap-4 mt-3 pt-3 text-xs" style={{ borderTop: '1px solid #1e1e1e', color: '#555' }}>
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
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #232323' }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555' }}>
          What Needs Attention
        </p>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,77,77,0.10)', color: '#ff4d4d' }}>
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,0.10)', color: '#f5a623' }}>
              {highCount} active
            </span>
          )}
          {items.length === 0 && (
            <span className="text-xs font-medium" style={{ color: '#00dc82' }}>All clear</span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(0,220,130,0.08)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00dc82" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-white">No active signals</p>
          <p className="text-xs mt-1" style={{ color: '#555' }}>Portfolio is operating as expected</p>
        </div>
      ) : (
        <div>
          {visibleItems.map((item, idx) => (
            <AttentionCard key={item.id} item={item} isLast={!hasMore && idx === visibleItems.length - 1} />
          ))}
          {hasMore && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="w-full px-5 py-3 text-xs font-medium transition-colors hover:text-white"
              style={{ color: '#555', borderTop: '1px solid #1a1a1a' }}
            >
              {showAll ? 'Show less' : `${items.length - 5} more items →`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
