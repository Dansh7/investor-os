'use client'

import type { AlertRow } from './RiskMonitor'
import type { NewsItem } from './NewsIntelligence'

interface HoldingMeta {
  ticker: string
  weight: number
  conviction_score?: number | null
  max_allocation_pct?: number | null
  thesis?: string | null
  thesis_status?: string | null
}

interface PolicyMeta {
  min_cash_pct?: number | null
  max_cash_pct?: number | null
}

interface Props {
  alerts: AlertRow[]
  holdings: HoldingMeta[]
  newsItems: NewsItem[]
  cashPct: number
  policy: PolicyMeta | null
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(diffMs / 3_600_000)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High'
type PortfolioStatus = 'On-plan' | 'Partial' | 'Off-plan'
type CashStatus = 'Critical' | 'Low' | 'Healthy' | 'Elevated'

const RISK_STYLE: Record<RiskLevel, string> = {
  Low:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  Moderate: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  Elevated: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  High:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

const STATUS_STYLE: Record<PortfolioStatus, string> = {
  'On-plan':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  'Partial':  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'Off-plan': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

const CASH_STYLE: Record<CashStatus, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  Low:      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  Healthy:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  Elevated: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
}

function Pill({ label, value, style }: { label: string; value: string; style: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{label}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${style}`}>{value}</span>
    </div>
  )
}

export function StatusHeader({ alerts, holdings, newsItems, cashPct, policy }: Props) {
  const activeAlerts = alerts.filter(a => a.alert_status === 'active')
  const criticalCount = activeAlerts.filter(a => (a.priority ?? 0) >= 8).length
  const warningCount  = activeAlerts.filter(a => { const p = a.priority ?? 0; return p >= 5 && p < 8 }).length

  // Risk Level
  const riskLevel: RiskLevel = criticalCount > 0 ? 'High'
    : warningCount > 0 || holdings.some(h => h.thesis_status === 'weakening') ? 'Elevated'
    : activeAlerts.length > 0 ? 'Moderate'
    : 'Low'

  // Portfolio Status
  const hasThesisBroken = holdings.some(h => h.thesis_status === 'broken')
  const overweightCount = holdings.filter(h => h.max_allocation_pct != null && h.weight > h.max_allocation_pct).length
  const portfolioStatus: PortfolioStatus = (hasThesisBroken || criticalCount > 0) ? 'Off-plan'
    : (overweightCount > 0 || riskLevel === 'Elevated') ? 'Partial'
    : 'On-plan'

  // Decision queue — count unique tickers with any issue
  const issueTickers = new Set<string>()
  for (const a of activeAlerts) {
    if (a.ticker && (a.priority ?? 0) >= 5) issueTickers.add(a.ticker)
  }
  for (const h of holdings) {
    if (h.max_allocation_pct != null && h.weight > h.max_allocation_pct) issueTickers.add(h.ticker)
    if ((h.conviction_score ?? 10) <= 4 && h.weight >= 5) issueTickers.add(h.ticker)
    if (!h.thesis && h.weight >= 3) issueTickers.add(h.ticker)
  }
  const queueCount = issueTickers.size

  // Cash status
  const minCash = policy?.min_cash_pct ?? 5
  const maxCash = policy?.max_cash_pct ?? 25
  const cashStatus: CashStatus = cashPct < minCash / 2 ? 'Critical'
    : cashPct < minCash ? 'Low'
    : cashPct > maxCash ? 'Elevated'
    : 'Healthy'

  // Last news sync
  const latest = newsItems.find(n => n.published_at)
  const syncText = latest?.published_at
    ? relativeTime(latest.published_at)
    : 'Never'
  const syncStale = !latest?.published_at || (Date.now() - new Date(latest.published_at).getTime()) > 24 * 3_600_000

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Pill label="Status" value={portfolioStatus} style={STATUS_STYLE[portfolioStatus]} />
        <Pill label="Risk" value={riskLevel} style={RISK_STYLE[riskLevel]} />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Alerts</span>
          {activeAlerts.length === 0 ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">0 active</span>
          ) : (
            <span className="flex items-center gap-1">
              {criticalCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  {criticalCount} critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                  {warningCount} warning
                </span>
              )}
              {activeAlerts.length - criticalCount - warningCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400">
                  {activeAlerts.length - criticalCount - warningCount} info
                </span>
              )}
            </span>
          )}
        </div>

        {queueCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Queue</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              {queueCount} open
            </span>
          </div>
        )}

        <Pill
          label={`Cash ${cashPct.toFixed(1)}%`}
          value={cashStatus}
          style={CASH_STYLE[cashStatus]}
        />

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Last sync</span>
          <span className={`text-xs font-medium ${syncStale ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
            {syncText}
          </span>
        </div>
      </div>
    </div>
  )
}
