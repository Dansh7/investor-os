'use client'

import { AlertRow } from './RiskMonitor'

interface HoldingMeta {
  ticker: string
  company_name: string
  weight: number
  conviction_score?: number | null
  max_allocation_pct?: number | null
  target_allocation_pct?: number | null
  thesis?: string | null
}

interface Props {
  holdings: HoldingMeta[]
  alerts: AlertRow[]
}

type Priority = 'urgent' | 'high' | 'medium'

interface RawIssue {
  ticker: string
  priority: Priority
  label: string
  reason: string
}

interface ClusteredItem {
  key: string
  ticker: string
  priority: Priority
  issues: RawIssue[]
}

const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2 }

const PRIORITY_BORDER: Record<Priority, string> = {
  urgent: '#ff4d4d',
  high:   '#f5a623',
  medium: '#60a5fa',
}

const PRIORITY_BADGE: Record<Priority, { bg: string; color: string }> = {
  urgent: { bg: 'rgba(255,77,77,0.10)',  color: '#ff4d4d' },
  high:   { bg: 'rgba(245,166,35,0.10)', color: '#f5a623' },
  medium: { bg: 'rgba(96,165,250,0.10)', color: '#60a5fa' },
}

const ISSUE_DOT_COLOR: Record<Priority, string> = {
  urgent: '#ff4d4d',
  high:   '#f5a623',
  medium: '#60a5fa',
}

function collectIssues(holdings: HoldingMeta[], alerts: AlertRow[]): RawIssue[] {
  const issues: RawIssue[] = []

  for (const a of alerts) {
    if (a.alert_status !== 'active' || !a.ticker) continue
    const p = a.priority ?? 0
    if (p >= 8) {
      issues.push({ ticker: a.ticker, priority: 'urgent', label: 'Critical alert', reason: (a.title ?? a.message ?? '').slice(0, 80) })
    } else if (p >= 5) {
      issues.push({ ticker: a.ticker, priority: 'high', label: 'Warning alert', reason: (a.title ?? a.message ?? '').slice(0, 80) })
    }
  }

  for (const h of holdings) {
    if (h.max_allocation_pct != null && h.weight > h.max_allocation_pct) {
      issues.push({ ticker: h.ticker, priority: 'high', label: 'Overweight', reason: `${h.weight.toFixed(1)}% vs ${h.max_allocation_pct}% max` })
    }
  }

  for (const h of holdings) {
    if ((h.conviction_score ?? 10) <= 4 && h.weight >= 5) {
      issues.push({ ticker: h.ticker, priority: 'medium', label: 'Low conviction', reason: `Conv ${h.conviction_score}/10, ${h.weight.toFixed(1)}% weight` })
    }
  }

  for (const h of holdings) {
    if (!h.thesis && h.weight >= 3) {
      issues.push({ ticker: h.ticker, priority: 'medium', label: 'No thesis', reason: `${h.weight.toFixed(1)}% position without thesis` })
    }
  }

  return issues
}

export function DecisionQueue({ holdings, alerts }: Props) {
  const rawIssues = collectIssues(holdings, alerts)

  const tickerMap = new Map<string, RawIssue[]>()
  for (const issue of rawIssues) {
    if (!tickerMap.has(issue.ticker)) tickerMap.set(issue.ticker, [])
    tickerMap.get(issue.ticker)!.push(issue)
  }

  const clustered: ClusteredItem[] = []
  for (const [ticker, issues] of tickerMap) {
    const sorted = [...issues].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    clustered.push({ key: `cluster-${ticker}`, ticker, priority: sorted[0].priority, issues: sorted })
  }

  const sortedItems = clustered.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid #232323' }}>
        <h2 className="text-sm font-semibold text-white">Decision Queue</h2>
        {sortedItems.length > 0 ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,0.10)', color: '#f5a623' }}>
            {sortedItems.length} position{sortedItems.length !== 1 ? 's' : ''} flagged
          </span>
        ) : (
          <span className="text-xs" style={{ color: '#00dc82' }}>✓ Nothing pending</span>
        )}
      </div>

      {sortedItems.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>No decisions required right now</p>
      ) : (
        <div>
          {sortedItems.map((item, idx) => (
            <div
              key={item.key}
              className="px-4 py-3"
              style={{
                borderLeft: `3px solid ${PRIORITY_BORDER[item.priority]}`,
                borderBottom: idx < sortedItems.length - 1 ? '1px solid #1a1a1a' : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-white tracking-tight">{item.ticker}</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={PRIORITY_BADGE[item.priority]}>
                  {item.priority}
                </span>
                {item.issues.length > 1 && (
                  <span className="text-xs" style={{ color: '#555' }}>{item.issues.length} issues</span>
                )}
              </div>
              <ul className="space-y-1">
                {item.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className="shrink-0 mt-1.5 rounded-full"
                      style={{ width: 5, height: 5, background: ISSUE_DOT_COLOR[issue.priority], display: 'inline-block' }}
                    />
                    <span className="text-xs" style={{ color: '#9a9a9a' }}>
                      <span className="font-medium text-white">{issue.label}:</span>{' '}
                      {issue.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
