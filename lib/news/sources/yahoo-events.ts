import { default as YahooFinance } from 'yahoo-finance2'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Holding } from '../types'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

export async function syncYahooEvents(
  holdings: Holding[],
  supabase: SupabaseClient
): Promise<number> {
  let synced = 0

  for (const h of holdings) {
    try {
      const summary = await yf.quoteSummary(h.ticker, {
        modules: ['calendarEvents'],
      })
      const cal = summary.calendarEvents
      if (!cal?.earnings?.earningsDate?.length) continue

      for (const rawDate of cal.earnings.earningsDate) {
        const scheduledAt = rawDate instanceof Date ? rawDate : new Date(rawDate as string)
        const scheduledIso = scheduledAt.toISOString()

        // Check for existing event before inserting
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('ticker', h.ticker)
          .eq('event_type', 'earnings')
          .gte('scheduled_at', new Date(scheduledAt.getTime() - 86400000).toISOString())
          .lte('scheduled_at', new Date(scheduledAt.getTime() + 86400000).toISOString())
          .limit(1)

        if (existing?.length) continue

        const { error } = await supabase.from('events').insert({
          portfolio_id: h.portfolio_id,
          ticker: h.ticker,
          event_type: 'earnings',
          event_name: `${h.ticker} Earnings`,
          scheduled_at: scheduledIso,
          source: 'yahoo-finance',
        })

        if (!error) synced++
        else console.warn(`  [YAHOO-EVENTS] Insert error for ${h.ticker}: ${error.message}`)
      }
    } catch (err) {
      console.warn(`  [YAHOO-EVENTS] ${h.ticker}: ${(err as Error).message}`)
    }
  }

  return synced
}
