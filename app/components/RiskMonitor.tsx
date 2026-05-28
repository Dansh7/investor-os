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

const SEV_BORDER: Record<string, string> = { critical: '#ff4d4d', warning: '#f5a623', info: '#60a5fa' }
const SEV_BADGE:  Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(255,77,77,0.10)',  color: '#ff4d4d' },
  warning:  { bg: 'rgba(245,166,35,0.10)', color: '#f5a623' },
  info:     { bg: 'rgba(96,165,250,0.10)', color: '#60a5fa' },
}
const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  active:       { bg: 'rgba(255,77,77,0.08)',   color: '#ff4d4d' },
  acknowledged: { bg: 'rgba(245,166,35,0.08)',  color: '#f5a623' },
  dismissed:    { bg: 'rgba(100,100,100,0.08)', color: '#555' },
  resolved:     { bg: 'rgba(0,220,130,0.08)',   color: '#00dc82' },
}

export function RiskMonitor({ alerts, onStatusChange }: Props) {
  const active   = alerts.filter(a => a.alert_status === 'active')
  const critical = active.filter(a => sev(a.priority) === 'critical').length
  const warning  = active.filter(a => sev(a.priority) === 'warning').length
  const info     = active.filter(a => sev(a.priority) === 'info').length

  const sorted = [...alerts].sort((a, b) => {
    const sa = sev(a.priority), sb = sev(b.priority)
    if (SEV_ORDER[sa] !== SEV_ORDER[sb]) return SEV_ORDER[sa] - SEV_ORDER[sb]
    const ta = a.triggered_at ? new Date(a.triggered_at).getTime() : 0
    const tb = b.triggered_at ? new Date(b.triggered_at).getTime() : 0
    return tb - ta
  })

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid #232323' }}>
        <div className="flex items-center gap-2.5 mb-1.5">
          <h2 className="text-sm font-semibold text-white">Risk Monitor</h2>
          {active.length === 0 && (
            <span className="text-xs" style={{ color: '#00dc82' }}>✓ Clear</span>
          )}
        </div>
        {active.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {critical > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={SEV_BADGE.critical}>
                {critical} critical
              </span>
            )}
            {warning > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={SEV_BADGE.warning}>
                {warning} warning
              </span>
            )}
            {info > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={SEV_BADGE.info}>
                {info} info
              </span>
            )}
          </div>
        )}
      </div>

      {alerts.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>No alerts — portfolio looks clean</p>
      ) : (
        <div className="max-h-[480px] overflow-y-auto">
          {sorted.map((a, idx) => {
            const s = sev(a.priority)
            const text = a.title ?? a.body ?? a.message ?? ''
            const meta = a.metadata
            return (
              <div
                key={a.id}
                className="flex"
                style={{
                  borderLeft: `3px solid ${SEV_BORDER[s]}`,
                  borderBottom: idx < sorted.length - 1 ? '1px solid #1a1a1a' : 'none',
                }}
              >
                <div className="flex-1 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {a.ticker && (
                      <span className="font-mono text-xs font-bold text-white tracking-tight">{a.ticker}</span>
                    )}
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={SEV_BADGE[s]}>
                      {s.toUpperCase()}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={STATUS_BADGE[a.alert_status] ?? { bg: 'rgba(100,100,100,0.08)', color: '#555' }}
                    >
                      {a.alert_status}
                    </span>
                    {meta?.thesis_impact && meta.thesis_impact !== 'none' && (
                      <span className="text-xs font-medium" style={{ color: '#f5a623' }}>
                        thesis {meta.thesis_impact}
                      </span>
                    )}
                    {meta?.is_verified && (
                      <span className="text-xs font-medium" style={{ color: '#00dc82' }}>SEC ✓</span>
                    )}
                  </div>
                  <p className="text-sm leading-snug" style={{ color: '#e0e0e0' }}>{text.slice(0, 140)}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: '#555' }}>
                    {meta?.portfolio_impact_score != null && (
                      <span className="font-medium" style={{ color: '#9a9a9a' }}>impact {meta.portfolio_impact_score}</span>
                    )}
                    {meta?.importance_score != null && <span>imp {meta.importance_score}</span>}
                    {meta?.urgency_score != null && <span>urgency {meta.urgency_score}</span>}
                    {a.triggered_at && <span>{new Date(a.triggered_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                {a.alert_status === 'active' && (
                  <div className="flex flex-col justify-center gap-1.5 px-3" style={{ borderLeft: '1px solid #1e1e1e' }}>
                    <button
                      onClick={() => onStatusChange(a.id, 'acknowledged')}
                      className="text-xs transition-colors hover:text-[#f5a623]"
                      style={{ color: '#555' }}
                    >Ack</button>
                    <button
                      onClick={() => onStatusChange(a.id, 'dismissed')}
                      className="text-xs transition-colors hover:text-white"
                      style={{ color: '#555' }}
                    >Dismiss</button>
                    <button
                      onClick={() => onStatusChange(a.id, 'resolved')}
                      className="text-xs transition-colors hover:text-[#00dc82]"
                      style={{ color: '#555' }}
                    >Resolve</button>
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
