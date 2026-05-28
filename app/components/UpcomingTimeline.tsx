'use client'

export interface TimelineEvent {
  id: string
  ticker: string
  event_type: string
  event_name: string
  scheduled_at: string
  notes?: string | null
}

interface Props {
  events: TimelineEvent[]
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function daysLabel(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days}d`
}

export function UpcomingTimeline({ events }: Props) {
  const upcoming = events
    .filter(e => daysUntil(e.scheduled_at) >= 0)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 8)

  const soonItems = upcoming.filter(e => daysUntil(e.scheduled_at) <= 7)
  const laterItems = upcoming.filter(e => daysUntil(e.scheduled_at) > 7)

  function EventRow({ event, highlight }: { event: TimelineEvent; highlight?: boolean }) {
    const days = daysUntil(event.scheduled_at)
    return (
      <div className={`flex items-center justify-between px-5 py-3 ${highlight ? 'bg-amber-50/50 dark:bg-amber-900/5' : ''}`}>
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500 w-14 shrink-0">
            {formatDate(event.scheduled_at)}
          </span>
          <span className={`font-mono text-xs font-bold shrink-0 ${highlight ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
            {event.ticker}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate capitalize">
            {event.event_name ?? event.event_type}
          </span>
        </div>
        <span className={`text-xs tabular-nums font-medium shrink-0 ml-3 ${
          days <= 7 ? 'text-amber-500 font-semibold' : days <= 30 ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'
        }`}>
          {daysLabel(days)}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
          Coming Up
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No upcoming events</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
          {soonItems.map(event => (
            <EventRow key={event.id} event={event} highlight />
          ))}
          {laterItems.map(event => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
