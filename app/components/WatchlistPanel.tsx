'use client'

export interface WatchlistItem {
  id: string
  ticker: string
  company_name?: string | null
  watch_reason?: string | null
  target_price?: number | null
  alert_below?: number | null
  alert_above?: number | null
  priority?: number | null
  added_at?: string | null
}

interface Props {
  items: WatchlistItem[]
}

export function WatchlistPanel({ items }: Props) {
  const sorted = [...items].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid #232323' }}>
        <h2 className="text-sm font-semibold text-white">Watchlist</h2>
        {sorted.length > 0 && (
          <span className="text-xs" style={{ color: '#555' }}>{sorted.length} ticker{sorted.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>Watchlist empty — add tickers you&apos;re monitoring</p>
      ) : (
        <div>
          {sorted.map((item, idx) => (
            <div
              key={item.id}
              className="px-4 py-3"
              style={{ borderBottom: idx < sorted.length - 1 ? '1px solid #1a1a1a' : 'none' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-mono text-sm font-bold text-white tracking-tight">{item.ticker}</span>
                    {item.company_name && (
                      <span className="text-xs" style={{ color: '#9a9a9a' }}>{item.company_name}</span>
                    )}
                  </div>
                  {item.watch_reason && (
                    <p className="text-xs leading-snug" style={{ color: '#9a9a9a' }}>{item.watch_reason}</p>
                  )}
                  {(item.target_price || item.alert_below || item.alert_above) && (
                    <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: '#555' }}>
                      {item.target_price != null && <span>target ${item.target_price.toFixed(2)}</span>}
                      {item.alert_below != null && <span>alert &lt; ${item.alert_below.toFixed(2)}</span>}
                      {item.alert_above != null && <span>alert &gt; ${item.alert_above.toFixed(2)}</span>}
                    </div>
                  )}
                </div>
                {item.priority != null && item.priority >= 7 && (
                  <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,166,35,0.10)', color: '#f5a623' }}>
                    hi-pri
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
