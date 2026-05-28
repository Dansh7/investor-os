import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  const [news, alerts, events, wl] = await Promise.all([
    sb.from('news_items')
      .select('id, ticker, published_at, action_type, importance_score, portfolio_impact_score, urgency_score, thesis_impact, is_verified, sentiment, source')
      .order('published_at', { ascending: false }),
    sb.from('alerts')
      .select('id, ticker, alert_status, priority')
      .eq('portfolio_id', 1),
    sb.from('events')
      .select('id, ticker, event_type, scheduled_at')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(15),
    sb.from('watchlist').select('id').eq('portfolio_id', 1),
  ])

  const ni = news.data ?? []
  const al = alerts.data ?? []
  const ev = events.data ?? []

  console.log('=== NEWS ITEMS ===')
  console.log('Total:', ni.length)
  const byAction: Record<string, number> = { immediate: 0, daily: 0, weekly: 0, discard: 0 }
  for (const x of ni) { const k = x.action_type as string; if (k in byAction) byAction[k]++ }
  console.log('By routing:', JSON.stringify(byAction))
  console.log('Verified (SEC):', ni.filter((x: {is_verified?: boolean}) => x.is_verified).length)
  console.log('With thesis_impact != none:', ni.filter((x: {thesis_impact?: string}) => x.thesis_impact && x.thesis_impact !== 'none').length)
  console.log('Latest published_at:', ni[0]?.published_at?.slice(0, 10) ?? 'none')

  console.log('\n=== ALERTS ===')
  console.log('Total:', al.length)
  const active = al.filter(x => x.alert_status === 'active')
  console.log('Active:', active.length)
  let crit = 0, warn = 0, info = 0
  for (const a of active) {
    const p = a.priority ?? 0
    if (p >= 8) crit++; else if (p >= 5) warn++; else info++
  }
  console.log(`  Critical (p>=8): ${crit}`)
  console.log(`  Warning  (5-7):  ${warn}`)
  console.log(`  Info     (<5):   ${info}`)
  const tickers = [...new Set(active.map(a => a.ticker).filter(Boolean))]
  console.log('Active alert tickers:', tickers.join(', '))

  console.log('\n=== EVENTS (upcoming) ===')
  console.log('Count:', ev.length)
  for (const e of ev) {
    const d = new Date(e.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    console.log(`  ${(e.ticker ?? '?').padEnd(6)} ${e.event_type.padEnd(12)} ${d}`)
  }

  console.log('\n=== WATCHLIST ===')
  console.log('Items:', (wl.data ?? []).length)
}

run().catch(err => { console.error(err.message); process.exit(1) })
