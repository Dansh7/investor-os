'use client'

export interface CalendarEvent {
  id: string
  ticker?: string | null
  event_type: string
  event_name?: string | null
  scheduled_at?: string | null
  notes?: string | null
}

interface Props {
  events: CalendarEvent[]
}

const EVENT_STYLE: Record<string, string> = {
  earnings:       'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  dividend:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  ex_dividend:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  split:          'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  macro:          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  fed_meeting:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  conference:     'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function formatDays(n: number): { text: string; urgent: boolean } {
  if (n < 0)   return { text: `${Math.abs(n)}d ago`, urgent: false }
  if (n === 0) return { text: 'Today', urgent: true }
  if (n === 1) return { text: 'Tomorrow', urgent: true }
  if (n <= 7)  return { text: `${n}d`, urgent: true }
  return { text: `${n}d`, urgent: false }
}

export function UpcomingEvents({ events }: Props) {
  const now = new Date().toISOString()

  // Only future/today events, sorted by soonest
  const sorted = [...events]
    .filter(e => e.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())

  const upcoming7 = sorted.filter(e => {
    const d = daysUntil(e.scheduled_at!)
    return d >= 0 && d <= 7
  }).length

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5">
        <h2 className="text-sm font-semibold">Upcoming Events</h2>
        {upcoming7 > 0 ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
            {upcoming7} this week
          </span>
        ) : sorted.length > 0 ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{sorted.length} scheduled</span>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-400">No upcoming events</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {sorted.map(ev => {
            const days = daysUntil(ev.scheduled_at!)
            const { text: dayText, urgent } = formatDays(days)
            const typeStyle = EVENT_STYLE[ev.event_type] ?? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'

            return (
              <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                <div className={`shrink-0 min-w-[52px] text-center rounded-lg px-2 py-1.5 ${
                  urgent
                    ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800'
                    : 'bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800'
                }`}>
                  <p className={`text-xs font-bold tabular-nums ${urgent ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {dayText}
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                    {new Date(ev.scheduled_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    {ev.ticker && (
                      <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">{ev.ticker}</span>
                    )}
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${typeStyle}`}>
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">
                    {ev.event_name ?? ev.event_type}
                  </p>
                  {ev.notes && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{ev.notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
