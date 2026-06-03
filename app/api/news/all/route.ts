import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/news/db'
import { fetchWithGate, type GateContext } from '@/lib/perplexity-cache'
import { validate } from '@/lib/validator'

export const dynamic    = 'force-dynamic'
export const maxDuration = 120  // Vercel Pro — extended timeout for batch processing

export async function GET(req: NextRequest) {
  const isMorningScan = req.nextUrl.searchParams.get('morning') === '1'

  // Parse changes param: "NVDA:3.5,AAPL:-2.1" → Map<ticker, changePercent>
  const changesMap = new Map<string, number>()
  const changesParam = req.nextUrl.searchParams.get('changes') ?? ''
  if (changesParam) {
    for (const entry of changesParam.split(',')) {
      const sep = entry.lastIndexOf(':')
      if (sep < 1) continue
      const ticker = entry.slice(0, sep).toUpperCase()
      const val    = parseFloat(entry.slice(sep + 1))
      if (!isNaN(val)) changesMap.set(ticker, val)
    }
  }

  const supabase  = getServerSupabase()
  const today     = new Date().toISOString().split('T')[0]
  const nextWeek  = new Date(Date.now() + 7 * 86_400_000).toISOString()

  // Load all context in parallel
  const [holdingsRes, eventsRes, alertsRes, watchlistRes] = await Promise.all([
    supabase.from('holdings').select('ticker, company_name').eq('portfolio_id', 1),
    supabase.from('events').select('ticker').gte('scheduled_at', today).lte('scheduled_at', nextWeek),
    supabase.from('alerts').select('ticker').eq('alert_status', 'active'),
    supabase.from('watchlist').select('ticker').eq('portfolio_id', 1),
  ])

  const holdings     = holdingsRes.data ?? []
  const eventTickers = new Set(eventsRes.data?.map(e => e.ticker) ?? [])
  const alertTickers = new Set(alertsRes.data?.map(a => a.ticker) ?? [])
  const knownTickers = [
    ...holdings.map(h => h.ticker),
    ...(watchlistRes.data?.map(w => w.ticker) ?? []),
  ]

  if (holdings.length === 0) return NextResponse.json([])

  // Process all holdings in parallel — cache hits return instantly
  const settled = await Promise.allSettled(
    holdings.map(async (h) => {
      const ctx: GateContext = {
        changePercent:       changesMap.get(h.ticker) ?? null,
        hasUpcomingEarnings: eventTickers.has(h.ticker),
        hasActiveAlert:      alertTickers.has(h.ticker),
        isMorningScan,
      }

      const result     = await fetchWithGate(h.ticker, h.company_name, ctx)
      const validation = validate({ scored: result.scored, perplexity: result.perplexity, knownTickers })

      return {
        ticker:       h.ticker,
        company_name: h.company_name,
        cacheHit:     result.cacheHit,
        gateBlocked:  result.gateBlocked,
        totalCostUsd: result.totalCostUsd,
        scored:       result.scored,
        perplexity:   { summary: result.perplexity.summary, sources: result.perplexity.sources },
        validation,
        routing:     result.gateBlocked ? 'ignore' : validation.routing,
        fetched_at:  new Date().toISOString(),
      }
    })
  )

  const results = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value
    console.error(`[news/all] failed for ${holdings[i].ticker}:`, s.reason)
    return {
      ticker:       holdings[i].ticker,
      company_name: holdings[i].company_name,
      cacheHit: false, gateBlocked: false, totalCostUsd: 0,
      scored: null, perplexity: null,
      validation: { flags: [], routing: 'ignore' as const, importance_score: 1, confidence_override: false },
      routing: 'ignore' as const,
      error: String(s.reason),
    }
  })

  return NextResponse.json(results)
}
