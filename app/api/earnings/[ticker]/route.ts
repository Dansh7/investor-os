import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchEarnings } from '@/lib/perplexity'
import { formatEarnings, type EarningsResult } from '@/lib/earnings-formatter'

export const dynamic     = 'force-dynamic'
export const maxDuration = 60

const CACHE_TABLE    = 'perplexity_cache'
const CACHE_TTL_HOURS = 4

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

function cacheKey(ticker: string) {
  return `earnings:${ticker.toUpperCase()}`
}

async function getCached(ticker: string): Promise<EarningsResult | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()
  const { data, error } = await getSupabase()
    .from(CACHE_TABLE)
    .select('result')
    .eq('ticker', cacheKey(ticker))
    .gte('cached_at', cutoff)
    .single()
  if (error || !data) return null
  return data.result as EarningsResult
}

async function setCached(ticker: string, result: EarningsResult): Promise<void> {
  const { error } = await getSupabase()
    .from(CACHE_TABLE)
    .upsert({ ticker: cacheKey(ticker), result, cached_at: new Date().toISOString() })
  if (error) console.warn(`[earnings/cache] write failed for ${ticker}:`, error.message)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params
  const ticker      = rawTicker.toUpperCase()
  const companyName = req.nextUrl.searchParams.get('company') ?? ticker
  const bust        = req.nextUrl.searchParams.get('bust') === '1'

  // Cache check (skip if bust=1)
  if (!bust) {
    const cached = await getCached(ticker)
    if (cached) {
      console.log(`[earnings] ${ticker} — CACHE HIT`)
      return NextResponse.json({ ...cached, cacheHit: true })
    }
  }

  // Fetch from Perplexity
  const raw = await fetchEarnings(ticker, companyName)
  if (raw.error) {
    return NextResponse.json({ error: raw.error }, { status: 502 })
  }

  // Format via Claude Haiku
  const result = await formatEarnings(ticker, companyName, raw)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  await setCached(ticker, result)
  return NextResponse.json({ ...result, cacheHit: false })
}
