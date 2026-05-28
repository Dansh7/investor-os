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

const EVENT_COLOR: Record<string, string> = {
  earnings:    '#a78bfa',
  dividend:    '#00dc82',
  ex_dividend: '#00dc82',
  split:       '#60a5fa',
  macro:       '#f5a623',
  fed_meeting: '#f5a623',
  conference:  '#6b6b6b',
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
  const sorted = [...events]
    .filter(e => e.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())

  const upcoming7 = sorted.filter(e => {
    const d = daysUntil(e.scheduled_at!)
    return d >= 0 && d <= 7
  }).length

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ borderBottom: '1px solid #232323' }}>
        <h2 className="text-sm font-semibold text-white">Upcoming Events</h2>
        {upcoming7 > 0 ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,166,35,0.10)', color: '#f5a623' }}>
            {upcoming7} this week
          </span>
        ) : sorted.length > 0 ? (
          <span className="text-xs" style={{ color: '#555' }}>{sorted.length} scheduled</span>
        ) : null}
      </div>

      {sorted.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm" style={{ color: '#555' }}>No upcoming events</p>
      ) : (
        <div>
          {sorted.map((ev, idx) => {
            const days = daysUntil(ev.scheduled_at!)
            const { text: dayText, urgent } = formatDays(days)
            const evColor = EVENT_COLOR[ev.event_type] ?? '#6b6b6b'

            return (
              <div
                key={ev.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: idx < sorted.length - 1 ? '1px solid #1a1a1a' : 'none' }}
              >
                <div
                  className="shrink-0 min-w-[52px] text-center rounded-lg px-2 py-1.5"
                  style={{
                    background: urgent ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${urgent ? 'rgba(245,166,35,0.20)' : '#232323'}`,
                  }}
                >
                  <p className="text-xs font-bold tabular-nums" style={{ color: urgent ? '#f5a623' : '#9a9a9a' }}>
                    {dayText}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#444' }}>
                    {new Date(ev.scheduled_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    {ev.ticker && (
                      <span className="font-mono text-xs font-bold text-white tracking-tight">{ev.ticker}</span>
                    )}
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{ background: `color-mix(in srgb, ${evColor} 12%, transparent)`, color: evColor }}
                    >
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm leading-snug" style={{ color: '#e0e0e0' }}>
                    {ev.event_name ?? ev.event_type}
                  </p>
                  {ev.notes && (
                    <p className="text-xs mt-0.5" style={{ color: '#666' }}>{ev.notes}</p>
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
