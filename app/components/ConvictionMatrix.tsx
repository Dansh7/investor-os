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

const FLAG_BORDER: Record<string, string> = {
  risk:        '#ff4d4d',
  opportunity: '#00dc82',
  info:        '#2a2a2a',
}

const FLAG_BADGE: Record<string, { bg: string; color: string }> = {
  risk:        { bg: 'rgba(255,77,77,0.10)',   color: '#ff4d4d' },
  opportunity: { bg: 'rgba(0,220,130,0.08)',   color: '#00dc82' },
  info:        { bg: 'rgba(100,100,100,0.08)', color: '#6b6b6b' },
}

export function ConvictionMatrix({ holdings, cashPct, maxCashPct = 25 }: Props) {
  const flags: Flag[] = []

  for (const h of holdings) {
    if (h.max_allocation_pct != null && h.weight > h.max_allocation_pct) {
      flags.push({ ticker: h.ticker, label: 'Overweight', detail: `${h.weight.toFixed(1)}% vs ${h.max_allocation_pct}% max`, type: 'risk' })
    }
    if ((h.conviction_score ?? 0) >= 7 && h.target_allocation_pct != null && h.weight < h.target_allocation_pct * 0.7) {
      flags.push({ ticker: h.ticker, label: 'Underweight vs conviction', detail: `Conv ${h.conviction_score}/10 · ${h.weight.toFixed(1)}% vs ${h.target_allocation_pct}% target`, type: 'opportunity' })
    }
    if ((h.conviction_score ?? 10) <= 4 && h.weight >= 4) {
      flags.push({ ticker: h.ticker, label: 'Low conviction / large position', detail: `Conv ${h.conviction_score}/10 · ${h.weight.toFixed(1)}% weight`, type: 'risk' })
    }
    if (h.thesis_status === 'weakening') {
      flags.push({ ticker: h.ticker, label: 'Thesis weakening', detail: 'Review allocation — thesis under pressure', type: 'risk' })
    }
    if (h.thesis_status === 'broken') {
      flags.push({ ticker: h.ticker, label: 'Thesis broken', detail: 'Exit signal — original thesis invalidated', type: 'risk' })
    }
    if (!h.thesis && h.weight >= 3) {
      flags.push({ ticker: h.ticker, label: 'No documented thesis', detail: `${h.weight.toFixed(1)}% position — document your rationale`, type: 'info' })
    }
  }

  if (cashPct > maxCashPct) {
    flags.push({ ticker: 'CASH', label: 'High cash drag', detail: `${cashPct.toFixed(1)}% cash — consider deploying if opportunities exist`, type: 'info' })
  }

  const sorted = flags.sort((a, b) => {
    const order = { risk: 0, opportunity: 1, info: 2 }
    return order[a.type] - order[b.type]
  })

  const risks = flags.filter(f => f.type === 'risk').length
  const opps  = flags.filter(f => f.type === 'opportunity').length

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-3.5 flex items-center gap-2" style={{ borderBottom: '1px solid #232323' }}>
        <h2 className="text-sm font-semibold text-white">Conviction Matrix</h2>
        {risks > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,77,77,0.10)', color: '#ff4d4d' }}>
            {risks} risk{risks !== 1 ? 's' : ''}
          </span>
        )}
        {opps > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,220,130,0.08)', color: '#00dc82' }}>
            {opps} opportunity{opps !== 1 ? 's' : ''}
          </span>
        )}
        {flags.length === 0 && (
          <span className="text-xs" style={{ color: '#00dc82' }}>✓ Well sized</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>Portfolio sizing looks clean</p>
      ) : (
        <div>
          {sorted.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-4 py-3"
              style={{
                borderLeft: `3px solid ${FLAG_BORDER[f.type]}`,
                borderBottom: i < sorted.length - 1 ? '1px solid #1a1a1a' : 'none',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span className="font-mono text-xs font-bold text-white tracking-tight">{f.ticker}</span>
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded"
                    style={FLAG_BADGE[f.type]}
                  >
                    {f.label}
                  </span>
                </div>
                <p className="text-xs" style={{ color: '#9a9a9a' }}>{f.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
