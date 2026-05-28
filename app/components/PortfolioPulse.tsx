'use client'

interface Props {
  totalValue: number
  cashPct: number
  todayPnL: number
  todayPnLPct: number
  criticalAlerts: number
  warningAlerts: number
  minCashPct?: number | null
  maxCashPct?: number | null
  loading: boolean
  hasPrices: boolean
  formatAmount: (n: number, decimals?: number) => string
}

function signedPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

function StatCell({
  label,
  value,
  sub,
  valueColor = '#ffffff',
  subColor = '#555',
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
  subColor?: string
}) {
  return (
    <div className="px-5 py-5">
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>
        {label}
      </p>
      <p className="text-base font-semibold tabular-nums" style={{ color: valueColor }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-0.5" style={{ color: subColor }}>{sub}</p>}
    </div>
  )
}

export function PortfolioPulse({
  totalValue, cashPct, todayPnL, todayPnLPct,
  criticalAlerts, warningAlerts, minCashPct, maxCashPct,
  loading, hasPrices, formatAmount,
}: Props) {
  const totalAlerts = criticalAlerts + warningAlerts

  const status = criticalAlerts > 0 ? 'off-plan' : warningAlerts > 0 ? 'partial' : 'on-plan'

  const statusCfg = {
    'on-plan':  { label: 'On Plan',  color: '#00dc82', sub: 'No active issues requiring attention' },
    'partial':  { label: 'Partial',  color: '#f5a623', sub: `${warningAlerts} signal${warningAlerts !== 1 ? 's' : ''} worth reviewing` },
    'off-plan': { label: 'Off Plan', color: '#ff4d4d', sub: `${criticalAlerts} critical issue${criticalAlerts !== 1 ? 's' : ''} require action` },
  }[status]

  const riskLevel = criticalAlerts > 1 ? 'high' : criticalAlerts === 1 ? 'elevated' : warningAlerts >= 3 ? 'moderate' : 'low'

  const RISK_CFG: Record<string, { label: string; bg: string; color: string }> = {
    low:      { label: 'Low Risk',      bg: 'rgba(0,220,130,0.08)',   color: '#00dc82' },
    moderate: { label: 'Moderate Risk', bg: 'rgba(245,166,35,0.10)',  color: '#f5a623' },
    elevated: { label: 'Elevated Risk', bg: 'rgba(245,120,35,0.10)',  color: '#f57a23' },
    high:     { label: 'High Risk',     bg: 'rgba(255,77,77,0.10)',   color: '#ff4d4d' },
  }
  const riskCfg = RISK_CFG[riskLevel]

  const cashHigh = maxCashPct != null && cashPct > maxCashPct
  const cashLow  = minCashPct != null && cashPct < minCashPct
  const cashSub     = cashHigh ? 'Above target' : cashLow ? 'Below minimum' : 'In range'
  const cashSubColor = cashHigh || cashLow ? '#f5a623' : '#00dc82'
  const cashValueColor = cashHigh || cashLow ? '#f5a623' : '#ffffff'

  const hasDayPnL = hasPrices && todayPnL !== 0
  const pnlValueColor = hasDayPnL ? (todayPnL >= 0 ? '#00dc82' : '#ff4d4d') : '#ffffff'
  const pnlSubColor   = todayPnL >= 0 ? '#00dc82' : '#ff4d4d'

  const alertSub = criticalAlerts > 0 ? `${criticalAlerts} critical` : totalAlerts > 0 ? `${totalAlerts} active` : 'All clear'
  const alertSubColor = criticalAlerts > 0 ? '#ff4d4d' : totalAlerts > 0 ? '#f5a623' : '#00dc82'

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      {/* Hero */}
      <div className="px-7 pt-8 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 12 }}>
              Portfolio Status
            </p>
            <p className="text-4xl font-bold tracking-tight leading-none" style={{ color: statusCfg.color }}>
              {statusCfg.label}
            </p>
            <p className="text-sm mt-2.5" style={{ color: '#666' }}>
              {statusCfg.sub}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 12 }}>
              Risk
            </p>
            <span
              className="inline-flex px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: riskCfg.bg, color: riskCfg.color }}
            >
              {riskCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{ borderTop: '1px solid #1e1e1e' }}>
        {(['Portfolio', 'Today', 'Cash', 'Signals'] as const).map((label, i) => {
          if (label === 'Portfolio') return (
            <div key={label} className="px-5 py-5" style={{ borderRight: '1px solid #1e1e1e' }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>Portfolio</p>
              <p className="text-base font-semibold tabular-nums text-white">{loading ? '—' : formatAmount(totalValue)}</p>
            </div>
          )
          if (label === 'Today') return (
            <div key={label} className="px-5 py-5" style={{ borderRight: '1px solid #1e1e1e' }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>Today</p>
              <p className="text-base font-semibold tabular-nums" style={{ color: pnlValueColor }}>{hasDayPnL ? formatAmount(todayPnL) : '—'}</p>
              <p className="text-xs mt-0.5" style={{ color: hasDayPnL ? pnlSubColor : '#555' }}>{hasDayPnL ? signedPct(todayPnLPct) : 'Prices loading'}</p>
            </div>
          )
          if (label === 'Cash') return (
            <div key={label} className="px-5 py-5" style={{ borderRight: '1px solid #1e1e1e' }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>Cash</p>
              <p className="text-base font-semibold tabular-nums" style={{ color: cashValueColor }}>{`${cashPct.toFixed(1)}%`}</p>
              <p className="text-xs mt-0.5" style={{ color: cashSubColor }}>{cashSub}</p>
            </div>
          )
          return (
            <div key={label} className="px-5 py-5">
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555', marginBottom: 6 }}>Signals</p>
              <p className="text-base font-semibold tabular-nums text-white">{String(totalAlerts)}</p>
              <p className="text-xs mt-0.5" style={{ color: alertSubColor }}>{alertSub}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
