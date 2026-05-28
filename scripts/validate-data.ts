import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const [h, events, wl, news, alerts] = await Promise.all([
    sb.from('holdings').select('ticker, thesis, conviction_score, target_allocation_pct, max_allocation_pct').eq('portfolio_id', 1),
    sb.from('events').select('id, ticker, event_date, title'),
    sb.from('watchlist').select('id, ticker').eq('portfolio_id', 1),
    sb.from('news_items').select('id, published_at, action_type').order('published_at', { ascending: false }),
    sb.from('alerts').select('id, ticker, alert_status').eq('portfolio_id', 1),
  ])

  const holdings = h.data ?? []
  console.log('=== HOLDINGS ===')
  console.log('Missing thesis:', holdings.filter(x => !x.thesis).map(x => x.ticker))
  console.log('Missing conviction:', holdings.filter(x => x.conviction_score == null).map(x => x.ticker))
  console.log('Missing target_alloc:', holdings.filter(x => x.target_allocation_pct == null).map(x => x.ticker))
  console.log('Missing max_alloc:', holdings.filter(x => x.max_allocation_pct == null).map(x => x.ticker))

  console.log('\n=== EVENTS ===')
  const ev = events.data ?? []
  console.log('Total:', ev.length)
  console.log('Missing date:', ev.filter(x => !x.event_date).length)
  console.log('Missing ticker:', ev.filter(x => !x.ticker).length)

  console.log('\n=== WATCHLIST ===')
  console.log('Items:', (wl.data ?? []).length)

  console.log('\n=== NEWS ===')
  const ni = news.data ?? []
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  console.log('Total items:', ni.length)
  console.log('Latest published_at:', ni[0]?.published_at ?? 'none')
  console.log('Stale >7d:', ni.filter(x => x.published_at && x.published_at < cutoff).length)
  const byAction: Record<string, number> = { immediate: 0, daily: 0, weekly: 0, discard: 0 }
  for (const x of ni) if (x.action_type in byAction) byAction[x.action_type]++
  console.log('By action:', JSON.stringify(byAction))

  console.log('\n=== ALERTS ===')
  const al = alerts.data ?? []
  const holdingTickers = new Set(holdings.map(x => x.ticker))
  const orphan = al.filter(a => a.ticker && !holdingTickers.has(a.ticker))
  console.log('Total:', al.length)
  console.log('Active:', al.filter(x => x.alert_status === 'active').length)
  console.log('Acknowledged:', al.filter(x => x.alert_status === 'acknowledged').length)
  console.log('Orphan tickers (not in holdings):', [...new Set(orphan.map(x => x.ticker))])
}

run().catch(err => { console.error(err.message); process.exit(1) })
