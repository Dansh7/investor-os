'use client'

interface HoldingRow {
  ticker: string
  company_name: string
  weight: number
  conviction_score?: number | null
  target_allocation_pct?: number | null
  max_allocation_pct?: number | null
  thesis?: string | null
  thesis_status?: string | null
}

interface Props {
  holdings: HoldingRow[]
  cashPct: number
  maxCashPct?: number
}

interface Flag {
  ticker: string
  label: string
  detail: string
  type: 'risk' | 'opportunity' | 'info'
}

const TYPE_STYLE = {
  risk:        'border-l-red-400',
  opportunity: 'border-l-emerald-400',
  info:        'border-l-zinc-300 dark:border-l-zinc-600',
}

const TYPE_BADGE = {
  risk:        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  opportunity: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  info:        'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

export function ConvictionMatrix({ holdings, cashPct, maxCashPct = 25 }: Props) {
  const flags: Flag[] = []

  for (const h of holdings) {
    // Above max allocation
    if (h.max_allocation_pct != null && h.weight > h.max_allocation_pct) {
      flags.push({
        ticker: h.ticker,
        label: 'Overweight',
        detail: `${h.weight.toFixed(1)}% vs ${h.max_allocation_pct}% max`,
        type: 'risk',
      })
    }

    // High conviction but underweight vs target
    if (
      (h.conviction_score ?? 0) >= 7 &&
      h.target_allocation_pct != null &&
      h.weight < h.target_allocation_pct * 0.7
    ) {
      flags.push({
        ticker: h.ticker,
        label: 'Underweight vs conviction',
        detail: `Conv ${h.conviction_score}/10 · ${h.weight.toFixed(1)}% vs ${h.target_allocation_pct}% target`,
        type: 'opportunity',
      })
    }

    // Low conviction but significant position
    if ((h.conviction_score ?? 10) <= 4 && h.weight >= 4) {
      flags.push({
        ticker: h.ticker,
        label: 'Low conviction / large position',
        detail: `Conv ${h.conviction_score}/10 · ${h.weight.toFixed(1)}% weight`,
        type: 'risk',
      })
    }

    // Thesis weakening/breaking
    if (h.thesis_status === 'weakening') {
      flags.push({
        ticker: h.ticker,
        label: 'Thesis weakening',
        detail: `Review allocation — thesis under pressure`,
        type: 'risk',
      })
    }
    if (h.thesis_status === 'broken') {
      flags.push({
        ticker: h.ticker,
        label: 'Thesis broken',
        detail: `Exit signal — original thesis invalidated`,
        type: 'risk',
      })
    }

    // No thesis for meaningful position
    if (!h.thesis && h.weight >= 3) {
      flags.push({
        ticker: h.ticker,
        label: 'No documented thesis',
        detail: `${h.weight.toFixed(1)}% position — document your rationale`,
        type: 'info',
      })
    }
  }

  // High cash
  if (cashPct > maxCashPct) {
    flags.push({
      ticker: 'CASH',
      label: 'High cash drag',
      detail: `${cashPct.toFixed(1)}% cash — consider deploying if opportunities exist`,
      type: 'info',
    })
  }

  const sorted = flags.sort((a, b) => {
    const order = { risk: 0, opportunity: 1, info: 2 }
    return order[a.type] - order[b.type]
  })

  const risks = flags.filter(f => f.type === 'risk').length
  const opps  = flags.filter(f => f.type === 'opportunity').length

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
        <h2 className="text-sm font-semibold">Conviction Matrix</h2>
        {risks > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
            {risks} risk{risks !== 1 ? 's' : ''}
          </span>
        )}
        {opps > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            {opps} opportunity{opps !== 1 ? 's' : ''}
          </span>
        )}
        {flags.length === 0 && (
          <span className="text-xs text-emerald-500 dark:text-emerald-400">✓ Well sized</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">Portfolio sizing looks clean</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {sorted.map((f, i) => (
            <div key={i} className={`flex items-start gap-3 border-l-4 ${TYPE_STYLE[f.type]} px-4 py-3`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{f.ticker}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${TYPE_BADGE[f.type]}`}>
                    {f.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{f.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
