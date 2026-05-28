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

const PRIORITY_BORDER = {
  urgent: 'border-l-red-500',
  high:   'border-l-amber-400',
  medium: 'border-l-sky-400',
}

const PRIORITY_LABEL = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  high:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  medium: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
}

const ISSUE_DOT: Record<Priority, string> = {
  urgent: 'bg-red-400',
  high:   'bg-amber-400',
  medium: 'bg-sky-400',
}

function collectIssues(holdings: HoldingMeta[], alerts: AlertRow[]): RawIssue[] {
  const issues: RawIssue[] = []

  // Active alerts (critical → urgent, warning → high)
  for (const a of alerts) {
    if (a.alert_status !== 'active' || !a.ticker) continue
    const p = a.priority ?? 0
    if (p >= 8) {
      issues.push({
        ticker: a.ticker,
        priority: 'urgent',
        label: 'Critical alert',
        reason: (a.title ?? a.message ?? '').slice(0, 80),
      })
    } else if (p >= 5) {
      issues.push({
        ticker: a.ticker,
        priority: 'high',
        label: 'Warning alert',
        reason: (a.title ?? a.message ?? '').slice(0, 80),
      })
    }
  }

  // Overweight
  for (const h of holdings) {
    if (h.max_allocation_pct != null && h.weight > h.max_allocation_pct) {
      issues.push({
        ticker: h.ticker,
        priority: 'high',
        label: 'Overweight',
        reason: `${h.weight.toFixed(1)}% vs ${h.max_allocation_pct}% max`,
      })
    }
  }

  // Low conviction + significant position
  for (const h of holdings) {
    if ((h.conviction_score ?? 10) <= 4 && h.weight >= 5) {
      issues.push({
        ticker: h.ticker,
        priority: 'medium',
        label: 'Low conviction',
        reason: `Conv ${h.conviction_score}/10, ${h.weight.toFixed(1)}% weight`,
      })
    }
  }

  // Missing thesis for significant position
  for (const h of holdings) {
    if (!h.thesis && h.weight >= 3) {
      issues.push({
        ticker: h.ticker,
        priority: 'medium',
        label: 'No thesis',
        reason: `${h.weight.toFixed(1)}% position without thesis`,
      })
    }
  }

  return issues
}

export function DecisionQueue({ holdings, alerts }: Props) {
  const rawIssues = collectIssues(holdings, alerts)

  // Cluster by ticker — one row per ticker, highest priority wins
  const tickerMap = new Map<string, RawIssue[]>()
  for (const issue of rawIssues) {
    if (!tickerMap.has(issue.ticker)) tickerMap.set(issue.ticker, [])
    tickerMap.get(issue.ticker)!.push(issue)
  }

  const clustered: ClusteredItem[] = []
  for (const [ticker, issues] of tickerMap) {
    const sorted = [...issues].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    clustered.push({
      key: `cluster-${ticker}`,
      ticker,
      priority: sorted[0].priority,
      issues: sorted,
    })
  }

  const sortedItems = clustered.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
        <h2 className="text-sm font-semibold">Decision Queue</h2>
        {sortedItems.length > 0 ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            {sortedItems.length} position{sortedItems.length !== 1 ? 's' : ''} flagged
          </span>
        ) : (
          <span className="text-xs text-emerald-500 dark:text-emerald-400">✓ Nothing pending</span>
        )}
      </div>

      {sortedItems.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">No decisions required right now</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {sortedItems.map(item => (
            <div key={item.key} className={`border-l-4 ${PRIORITY_BORDER[item.priority]} px-4 py-3`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{item.ticker}</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${PRIORITY_LABEL[item.priority]}`}>
                  {item.priority}
                </span>
                {item.issues.length > 1 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {item.issues.length} issues
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {item.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full ${ISSUE_DOT[issue.priority]}`} />
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">
                      <span className="font-medium">{issue.label}:</span>{' '}
                      <span className="text-zinc-500 dark:text-zinc-400">{issue.reason}</span>
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
