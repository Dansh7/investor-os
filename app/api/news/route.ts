import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/news/db'
import { fetchWithGate, type GateContext } from '@/lib/perplexity-cache'
import { validate } from '@/lib/validator'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase()
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })

  const changePercent = parseFloat(req.nextUrl.searchParams.get('changePercent') ?? '0')
  const isMorningScan = req.nextUrl.searchParams.get('morning') === '1'

  const supabase  = getServerSupabase()
  const today     = new Date().toISOString().split('T')[0]
  const nextWeek  = new Date(Date.now() + 7 * 86_400_000).toISOString()

  const [holdingRes, eventsRes, alertsRes, allHoldingsRes, watchlistRes] = await Promise.all([
    supabase.from('holdings').select('company_name').eq('ticker', ticker).eq('portfolio_id', 1).maybeSingle(),
    supabase.from('events').select('id').eq('ticker', ticker).gte('scheduled_at', today).lte('scheduled_at', nextWeek).limit(1),
    supabase.from('alerts').select('id').eq('ticker', ticker).eq('alert_status', 'active').limit(1),
    supabase.from('holdings').select('ticker').eq('portfolio_id', 1),
    supabase.from('watchlist').select('ticker').eq('portfolio_id', 1),
  ])

  const company = holdingRes.data?.company_name ?? ticker
  const ctx: GateContext = {
    changePercent: isNaN(changePercent) ? null : changePercent,
    hasUpcomingEarnings: (eventsRes.data?.length ?? 0) > 0,
    hasActiveAlert:      (alertsRes.data?.length ?? 0) > 0,
    isMorningScan,
  }

  const result = await fetchWithGate(ticker, company, ctx)

  const knownTickers = [
    ...(allHoldingsRes.data?.map(h => h.ticker) ?? []),
    ...(watchlistRes.data?.map(w => w.ticker) ?? []),
  ]

  const validation = validate({ scored: result.scored, perplexity: result.perplexity, knownTickers })

  return NextResponse.json({
    ticker,
    company_name: company,
    cacheHit:    result.cacheHit,
    gateBlocked: result.gateBlocked,
    totalCostUsd: result.totalCostUsd,
    scored:      result.scored,
    perplexity:  { summary: result.perplexity.summary, sources: result.perplexity.sources },
    validation,
    routing: result.gateBlocked ? 'ignore' : validation.routing,
  })
}
