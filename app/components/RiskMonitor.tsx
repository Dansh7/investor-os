'use client'

export interface AlertRow {
  id: string
  ticker?: string | null
  alert_type: string
  title?: string | null
  message?: string | null
  body?: string | null
  alert_status: string
  priority?: number | null
  triggered_at?: string | null
  metadata?: {
    importance_score?: number
    portfolio_impact_score?: number
    urgency_score?: number
    thesis_impact?: string
    action_type?: string
    is_verified?: boolean
  } | null
}

interface Props {
  alerts: AlertRow[]
  onStatusChange: (id: string, status: string) => Promise<void>
}

function sev(p: number | null | undefined): 'critical' | 'warning' | 'info' {
  if ((p ?? 0) >= 8) return 'critical'
  if ((p ?? 0) >= 5) return 'warning'
  return 'info'
}

const SEV_ORDER = { critical: 0, warning: 1, info: 2 }

const BORDER = { critical: 'border-l-red-500', warning: 'border-l-amber-400', info: 'border-l-sky-400' }
const BADGE  = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  warning:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  info:     'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
}
const STATUS_BADGE: Record<string, string> = {
  active:       'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  acknowledged: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  dismissed:    'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
  resolved:     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export function RiskMonitor({ alerts, onStatusChange }: Props) {
  const active   = alerts.filter(a => a.alert_status === 'active')
  const critical = active.filter(a => sev(a.priority) === 'critical').length
  const warning  = active.filter(a => sev(a.priority) === 'warning').length
  const info     = active.filter(a => sev(a.priority) === 'info').length

  // Sort: critical → warning → info; newest first within each group
  const sorted = [...alerts].sort((a, b) => {
    const sa = sev(a.priority), sb = sev(b.priority)
    if (SEV_ORDER[sa] !== SEV_ORDER[sb]) return SEV_ORDER[sa] - SEV_ORDER[sb]
    const ta = a.triggered_at ? new Date(a.triggered_at).getTime() : 0
    const tb = b.triggered_at ? new Date(b.triggered_at).getTime() : 0
    return tb - ta
  })

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 mb-1.5">
          <h2 className="text-sm font-semibold">Risk Monitor</h2>
          {active.length === 0 && (
            <span className="text-xs text-emerald-500 dark:text-emerald-400">✓ Clear</span>
          )}
        </div>
        {active.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {critical > 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE.critical}`}>
                {critical} critical
              </span>
            )}
            {warning > 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE.warning}`}>
                {warning} warning
              </span>
            )}
            {info > 0 && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE.info}`}>
                {info} info
              </span>
            )}
          </div>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">No alerts — portfolio looks clean</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[480px] overflow-y-auto">
          {sorted.map(a => {
            const s = sev(a.priority)
            const text = a.title ?? a.body ?? a.message ?? ''
            const meta = a.metadata
            return (
              <div key={a.id} className={`flex border-l-4 ${BORDER[s]}`}>
                <div className="flex-1 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {a.ticker && (
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{a.ticker}</span>
                    )}
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${BADGE[s]}`}>
                      {s.toUpperCase()}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_BADGE[a.alert_status] ?? ''}`}>
                      {a.alert_status}
                    </span>
                    {meta?.thesis_impact && meta.thesis_impact !== 'none' && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        thesis {meta.thesis_impact}
                      </span>
                    )}
                    {meta?.is_verified && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">SEC ✓</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">{text.slice(0, 140)}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {meta?.portfolio_impact_score != null && (
                      <span className="font-medium text-zinc-600 dark:text-zinc-300">
                        impact {meta.portfolio_impact_score}
                      </span>
                    )}
                    {meta?.importance_score != null && <span>imp {meta.importance_score}</span>}
                    {meta?.urgency_score != null && <span>urgency {meta.urgency_score}</span>}
                    {a.triggered_at && <span>{new Date(a.triggered_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                {a.alert_status === 'active' && (
                  <div className="flex flex-col justify-center gap-1.5 px-3 border-l border-zinc-100 dark:border-zinc-800">
                    <button onClick={() => onStatusChange(a.id, 'acknowledged')}
                      className="text-xs text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">Ack</button>
                    <button onClick={() => onStatusChange(a.id, 'dismissed')}
                      className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">Dismiss</button>
                    <button onClick={() => onStatusChange(a.id, 'resolved')}
                      className="text-xs text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Resolve</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
