import { createClient } from '@supabase/supabase-js'
import { searchNews,  type PerplexityResult } from './perplexity'
import { scoreNews,   type ScoredNews        } from './scorer'

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TABLE    = 'perplexity_cache'
const CACHE_TTL_HOURS = 4

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GateContext {
  /** Today's price % change for this ticker (null = unknown / market closed) */
  changePercent:       number | null
  /** True if there is an event (earnings, etc.) within 7 days */
  hasUpcomingEarnings: boolean
  /** True if there is at least one active alert for this ticker */
  hasActiveAlert:      boolean
  /** True if this is the first run of the calendar day (force refresh) */
  isMorningScan:       boolean
}

/** What the cache stores per ticker */
export interface CacheRecord {
  perplexity: PerplexityResult
  scored:     ScoredNews
}

export interface FetchResult extends CacheRecord {
  cacheHit:      boolean
  gateBlocked:   boolean
  totalCostUsd:  number
}

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// ─── Cache I/O ────────────────────────────────────────────────────────────────

async function getCached(ticker: string): Promise<CacheRecord | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString()
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from(CACHE_TABLE)
    .select('result')
    .eq('ticker', ticker)
    .gte('cached_at', cutoff)
    .single()

  if (error || !data) return null
  return data.result as CacheRecord
}

async function setCached(ticker: string, record: CacheRecord): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from(CACHE_TABLE)
    .upsert({ ticker, result: record, cached_at: new Date().toISOString() })

  if (error) console.warn(`[cache] failed to write cache for ${ticker}:`, error.message)
}

// ─── Relevance gate ───────────────────────────────────────────────────────────

function gate(ticker: string, ctx: GateContext): { allowed: boolean; reason: string } {
  if (ctx.isMorningScan)
    return { allowed: true,  reason: 'morning scan' }

  if (Math.abs(ctx.changePercent ?? 0) > 2)
    return { allowed: true,  reason: `price moved ${ctx.changePercent!.toFixed(1)}%` }

  if (ctx.hasUpcomingEarnings)
    return { allowed: true,  reason: 'earnings within 7 days' }

  if (ctx.hasActiveAlert)
    return { allowed: true,  reason: 'active alert' }

  return { allowed: false, reason: 'no trigger — price flat, no events, no alerts' }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

const EMPTY: CacheRecord = {
  perplexity: { summary: '', sources: [], raw: '' },
  scored: {
    importance_score: 1, portfolio_impact_score: 1, urgency_score: 1, confidence_score: 0,
    thesis_impact: 'neutral', action_type: 'no_action',
    hebrew_title: '', hebrew_summary: '', routing: 'ignore',
  },
}

export async function fetchWithGate(
  ticker: string,
  company: string,
  ctx: GateContext
): Promise<FetchResult> {
  // ── 1. Cache check ────────────────────────────────────────────────────────
  const cached = await getCached(ticker)
  if (cached) {
    const pCost = cached.perplexity.usage?.estimatedCostUsd ?? 0
    const sCost = cached.scored.usage?.estimatedCostUsd ?? 0
    console.log(
      `[cache] ${ticker} — CACHE HIT  (saved $${(pCost + sCost).toFixed(5)})`
    )
    return { ...cached, cacheHit: true, gateBlocked: false, totalCostUsd: 0 }
  }

  // ── 2. Relevance gate ────────────────────────────────────────────────────
  const { allowed, reason } = gate(ticker, ctx)
  if (!allowed) {
    console.log(`[cache] ${ticker} — GATE BLOCKED  (${reason})`)
    return { ...EMPTY, cacheHit: false, gateBlocked: true, totalCostUsd: 0 }
  }
  console.log(`[cache] ${ticker} — API CALL  (${reason})`)

  // ── 3. Perplexity ─────────────────────────────────────────────────────────
  const perplexity = await searchNews(ticker, company)
  if (perplexity.error) {
    console.warn(`[cache] ${ticker} — Perplexity error: ${perplexity.error}`)
    return { perplexity, scored: EMPTY.scored, cacheHit: false, gateBlocked: false, totalCostUsd: 0 }
  }

  // ── 4. Scorer ─────────────────────────────────────────────────────────────
  const scored = await scoreNews(ticker, company, perplexity)

  // ── 5. Write cache ────────────────────────────────────────────────────────
  if (!scored.error) {
    await setCached(ticker, { perplexity, scored })
  }

  const totalCostUsd =
    (perplexity.usage?.estimatedCostUsd ?? 0) +
    (scored.usage?.estimatedCostUsd ?? 0)

  console.log(`[cache] ${ticker} — stored  (total cost $${totalCostUsd.toFixed(5)})`)

  return { perplexity, scored, cacheHit: false, gateBlocked: false, totalCostUsd }
}
