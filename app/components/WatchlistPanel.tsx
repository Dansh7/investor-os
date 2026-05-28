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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
        <h2 className="text-sm font-semibold">Watchlist</h2>
        {sorted.length > 0 && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{sorted.length} ticker{sorted.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">Watchlist empty — add tickers you&apos;re monitoring</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {sorted.map(item => (
            <div key={item.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.ticker}</span>
                    {item.company_name && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.company_name}</span>
                    )}
                  </div>
                  {item.watch_reason && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-snug">{item.watch_reason}</p>
                  )}
                  {(item.target_price || item.alert_below || item.alert_above) && (
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                      {item.target_price != null && <span>target ${item.target_price.toFixed(2)}</span>}
                      {item.alert_below != null && <span>alert &lt; ${item.alert_below.toFixed(2)}</span>}
                      {item.alert_above != null && <span>alert &gt; ${item.alert_above.toFixed(2)}</span>}
                    </div>
                  )}
                </div>
                {item.priority != null && item.priority >= 7 && (
                  <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
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
