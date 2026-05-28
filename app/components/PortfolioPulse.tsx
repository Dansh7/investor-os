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
  valueClass = '',
  subClass = 'text-zinc-400 dark:text-zinc-500',
}: {
  label: string
  value: string
  sub?: string
  valueClass?: string
  subClass?: string
}) {
  return (
    <div className="px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 mb-1.5">
        {label}
      </p>
      <p className={`text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 ${valueClass}`}>
        {value}
      </p>
      {sub && <p className={`text-xs mt-0.5 ${subClass}`}>{sub}</p>}
    </div>
  )
}

export function PortfolioPulse({
  totalValue, cashPct, todayPnL, todayPnLPct,
  criticalAlerts, warningAlerts, minCashPct, maxCashPct,
  loading, hasPrices, formatAmount,
}: Props) {
  const totalAlerts = criticalAlerts + warningAlerts

  const status = criticalAlerts > 0 ? 'off-plan'
    : warningAlerts > 0 ? 'partial'
    : 'on-plan'

  const statusCfg = {
    'on-plan': {
      label: 'On Plan',
      labelClass: 'text-emerald-500',
      sub: 'No active issues requiring attention',
    },
    'partial': {
      label: 'Partial',
      labelClass: 'text-amber-500',
      sub: `${warningAlerts} signal${warningAlerts !== 1 ? 's' : ''} worth reviewing`,
    },
    'off-plan': {
      label: 'Off Plan',
      labelClass: 'text-red-500',
      sub: `${criticalAlerts} critical issue${criticalAlerts !== 1 ? 's' : ''} require action`,
    },
  }[status]

  const riskLevel = criticalAlerts > 1 ? 'high'
    : criticalAlerts === 1 ? 'elevated'
    : warningAlerts >= 3 ? 'moderate'
    : warningAlerts >= 1 ? 'low'
    : 'low'

  const riskCfg = {
    low:      { label: 'Low Risk',      cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-400' },
    moderate: { label: 'Moderate Risk', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-400' },
    elevated: { label: 'Elevated Risk', cls: 'bg-orange-50 text-orange-700 dark:bg-orange-900/25 dark:text-orange-400' },
    high:     { label: 'High Risk',     cls: 'bg-red-50 text-red-700 dark:bg-red-900/25 dark:text-red-400' },
  }[riskLevel]

  const cashHigh = maxCashPct != null && cashPct > maxCashPct
  const cashLow = minCashPct != null && cashPct < minCashPct
  const cashValueClass = cashHigh || cashLow ? 'text-amber-500' : ''
  const cashSub = cashHigh ? 'Above target' : cashLow ? 'Below minimum' : 'In range'
  const cashSubClass = cashHigh || cashLow ? 'text-amber-500' : 'text-emerald-500'

  const hasDayPnL = hasPrices && todayPnL !== 0
  const pnlValueClass = hasDayPnL ? (todayPnL >= 0 ? 'text-emerald-500' : 'text-red-500') : ''
  const pnlSubClass = todayPnL >= 0 ? 'text-emerald-500' : 'text-red-500'

  const alertSub = criticalAlerts > 0 ? `${criticalAlerts} critical`
    : totalAlerts > 0 ? `${totalAlerts} active`
    : 'All clear'
  const alertSubClass = criticalAlerts > 0 ? 'text-red-500'
    : totalAlerts > 0 ? 'text-amber-500'
    : 'text-emerald-500'

  return (
    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      {/* Hero */}
      <div className="px-7 pt-8 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mb-3">
              Portfolio Status
            </p>
            <p className={`text-4xl font-bold tracking-tight leading-none ${statusCfg.labelClass}`}>
              {statusCfg.label}
            </p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2.5">
              {statusCfg.sub}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 mb-3">
              Risk
            </p>
            <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-semibold ${riskCfg.cls}`}>
              {riskCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-zinc-100 dark:divide-zinc-800">
        <StatCell
          label="Portfolio"
          value={loading ? '—' : formatAmount(totalValue)}
        />
        <StatCell
          label="Today"
          value={hasDayPnL ? formatAmount(todayPnL) : '—'}
          valueClass={pnlValueClass}
          sub={hasDayPnL ? signedPct(todayPnLPct) : 'Prices loading'}
          subClass={hasDayPnL ? pnlSubClass : 'text-zinc-400 dark:text-zinc-500'}
        />
        <StatCell
          label="Cash"
          value={`${cashPct.toFixed(1)}%`}
          valueClass={cashValueClass}
          sub={cashSub}
          subClass={cashSubClass}
        />
        <StatCell
          label="Signals"
          value={String(totalAlerts)}
          sub={alertSub}
          subClass={alertSubClass}
        />
      </div>
    </div>
  )
}
