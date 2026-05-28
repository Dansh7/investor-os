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
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  function EventRow({ event, isLast }: { event: TimelineEvent; isLast?: boolean }) {
    const days = daysUntil(event.scheduled_at)
    const highlight = days <= 7
    return (
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          background: highlight ? 'rgba(245,166,35,0.03)' : 'transparent',
          borderBottom: isLast ? 'none' : '1px solid #1a1a1a',
        }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-xs tabular-nums w-14 shrink-0" style={{ color: '#555' }}>
            {formatDate(event.scheduled_at)}
          </span>
          <span className="font-mono text-xs font-bold shrink-0" style={{ color: highlight ? '#ffffff' : '#c8c8c8' }}>
            {event.ticker}
          </span>
          <span className="text-xs truncate capitalize" style={{ color: '#666' }}>
            {event.event_name ?? event.event_type}
          </span>
        </div>
        <span
          className="text-xs tabular-nums font-semibold shrink-0 ml-3"
          style={{ color: days <= 7 ? '#f5a623' : days <= 30 ? '#9a9a9a' : '#555' }}
        >
          {daysLabel(days)}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111111', border: '1px solid #232323' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #232323' }}>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#555' }}>
          Coming Up
        </p>
      </div>

      {upcoming.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-sm" style={{ color: '#555' }}>No upcoming events</p>
        </div>
      ) : (
        <div>
          {upcoming.map((event, idx) => (
            <EventRow key={event.id} event={event} isLast={idx === upcoming.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
