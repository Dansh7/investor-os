/**
 * Syncs upcoming earnings dates from Yahoo Finance for all holdings
 * plus a specified watchlist of tickers (AMZN, NVDA, TSLA, PLTR).
 */
import { createClient } from '@supabase/supabase-js'
import YahooFinance from 'yahoo-finance2'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// Portfolio tickers + extra watchlist tickers to sync
const EXTRA_TICKERS = ['AMZN', 'NVDA', 'TSLA', 'PLTR']

async function syncEarnings(ticker: string, portfolioId: number): Promise<number> {
  try {
    const summary = await yf.quoteSummary(ticker, { modules: ['calendarEvents'] })
    const cal = summary.calendarEvents
    if (!cal?.earnings?.earningsDate?.length) {
      console.log(`  ${ticker}: no earnings dates found`)
      return 0
    }

    let inserted = 0
    for (const rawDate of cal.earnings.earningsDate) {
      const dt = rawDate instanceof Date ? rawDate : new Date(rawDate as string)
      const iso = dt.toISOString()

      // Skip past dates
      if (dt < new Date()) continue

      // Dedup: skip if already exists within ±1 day
      const { data: existing } = await sb
        .from('events')
        .select('id')
        .eq('ticker', ticker)
        .eq('event_type', 'earnings')
        .gte('scheduled_at', new Date(dt.getTime() - 86_400_000).toISOString())
        .lte('scheduled_at', new Date(dt.getTime() + 86_400_000).toISOString())
        .limit(1)

      if (existing?.length) continue

      const { error } = await sb.from('events').insert({
        portfolio_id: portfolioId,
        ticker,
        event_type: 'earnings',
        event_name: `${ticker} Earnings`,
        scheduled_at: iso,
        source: 'yahoo-finance',
      })

      if (error) console.warn(`  ${ticker} insert error: ${error.message}`)
      else inserted++
    }

    console.log(`  ${ticker}: ${inserted} event(s) inserted`)
    return inserted
  } catch (err) {
    console.warn(`  ${ticker}: ${(err as Error).message}`)
    return 0
  }
}

async function main() {
  // Fetch current holdings
  const { data: holdings, error } = await sb
    .from('holdings')
    .select('ticker, portfolio_id')
    .eq('portfolio_id', 1)

  if (error) throw new Error(error.message)

  const holdingTickers = (holdings ?? []).map(h => h.ticker)
  const allTickers = [...new Set([...holdingTickers, ...EXTRA_TICKERS])]

  console.log(`Syncing earnings for: ${allTickers.join(', ')}\n`)

  let total = 0
  for (const ticker of allTickers) {
    total += await syncEarnings(ticker, 1)
  }

  console.log(`\nEvents sync complete. Total inserted: ${total}`)

  // Show final state
  const { data: events } = await sb
    .from('events')
    .select('ticker, event_type, scheduled_at, event_name')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(20)

  console.log('\nUpcoming events in DB:')
  for (const e of events ?? []) {
    const d = new Date(e.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    console.log(`  ${e.ticker?.padEnd(6)} ${e.event_type.padEnd(10)} ${d}  ${e.event_name}`)
  }
}

main().catch(err => { console.error(err.message); process.exit(1) })
