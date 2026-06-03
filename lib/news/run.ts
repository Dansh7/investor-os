import { getServerSupabase } from './db'
import { fetchEdgarFilings } from './sources/edgar'
import { syncYahooEvents } from './sources/yahoo-events'
import { discoverPerplexityNews } from './sources/perplexity'
import { scoreArticles } from './pipeline/scorer'
import { backfillHebrew } from '../scorer'
import { deduplicateAndCluster } from './pipeline/deduplicator'
import { routeArticles } from './pipeline/router'
import type { Holding, RawArticle, PipelineResult } from './types'

export interface RunOptions {
  maxArticlesPerHolding?: number
  maxHoldings?: number
  /** Perplexity is disabled by default — enable by setting PERPLEXITY_API_KEY */
  enablePerplexity?: boolean
  skipEdgar?: boolean
  skipScoring?: boolean
}

export async function runNewsPipeline(opts: RunOptions = {}): Promise<PipelineResult & { routerOutput: Awaited<ReturnType<typeof routeArticles>> }> {
  const {
    maxArticlesPerHolding = 3,
    maxHoldings,
    enablePerplexity = false,
    skipEdgar = false,
    skipScoring = false,
  } = opts

  const supabase = getServerSupabase()

  // ── Load active holdings ──────────────────────────────────────────────────────
  const { data: rawHoldings, error: hErr } = await supabase
    .from('holdings')
    .select('id, ticker, company_name, shares, avg_buy_price, portfolio_id, thesis, thesis_status, thesis_break_conditions, conviction_score')
    .eq('is_active', true)

  if (hErr || !rawHoldings?.length) throw new Error(`No holdings: ${hErr?.message ?? 'empty'}`)

  const holdings: Holding[] = maxHoldings ? rawHoldings.slice(0, maxHoldings) : rawHoldings
  const portfolioId: number = holdings[0].portfolio_id
  const holdingsByTicker = new Map(holdings.map(h => [h.ticker, h]))

  console.log(`Holdings (${holdings.length}): ${holdings.map(h => h.ticker).join(', ')}`)

  const rawArticles: RawArticle[] = []

  // ── 1. SEC EDGAR ──────────────────────────────────────────────────────────────
  if (!skipEdgar) {
    console.log('\n[EDGAR] Fetching SEC filings...')
    for (const h of holdings) {
      const articles = await fetchEdgarFilings(h.ticker, { count: maxArticlesPerHolding, companyName: h.company_name })
      console.log(`  ${h.ticker}: ${articles.length} articles`)
      rawArticles.push(...articles)
    }
  }

  // ── 2. Yahoo Finance events ───────────────────────────────────────────────────
  console.log('\n[YAHOO-EVENTS] Syncing earnings dates...')
  const eventsSynced = await syncYahooEvents(holdings, supabase)
  console.log(`  ${eventsSynced} new events synced`)

  // ── 3. Perplexity (disabled by default — enable via PERPLEXITY_API_KEY) ───────
  const hasPerplexityKey = Boolean(process.env.PERPLEXITY_API_KEY)
  if (enablePerplexity && hasPerplexityKey) {
    console.log('\n[PERPLEXITY] Discovering context...')
    for (const h of holdings) {
      const articles = await discoverPerplexityNews(h.ticker, h.company_name)
      if (articles.length) console.log(`  ${h.ticker}: context fetched`)
      rawArticles.push(...articles)
    }
  } else if (enablePerplexity && !hasPerplexityKey) {
    console.log('\n[PERPLEXITY] Skipped — add PERPLEXITY_API_KEY to .env.local to enable')
  }

  console.log(`\nTotal raw articles: ${rawArticles.length}`)

  if (!rawArticles.length) {
    const empty = { immediate: 0, daily: 0, weekly: 0, discard: 0, historical: 0 }
    return { articles_fetched: 0, articles_scored: 0, articles_stored: 0, alerts_created: 0, events_synced: eventsSynced, skipped_duplicates: 0, routing_summary: empty, routerOutput: { stored: 0, alerts: 0, duplicates: 0, historical: 0, routing: empty, examples: [] } }
  }

  // ── 4. Score via Claude ───────────────────────────────────────────────────────
  let scored: Awaited<ReturnType<typeof scoreArticles>> = []

  if (!skipScoring) {
    console.log('\n[SCORER] Scoring via Claude Haiku...')
    scored = await scoreArticles(rawArticles, holdingsByTicker)
    for (const { article, score } of scored) {
      const imp = score.importance_score.toFixed(1).padStart(4)
      const imp2 = score.portfolio_impact_score.toFixed(1).padStart(4)
      const conf = score.confidence_score.toFixed(1).padStart(4)
      console.log(`  ${article.ticker.padEnd(5)} imp=${imp} impact=${imp2} conf=${conf} [${score.sentiment.padEnd(8)}] ${article.headline.slice(0, 65)}`)
    }
  } else {
    scored = rawArticles.map(article => ({
      article,
      score: { importance_score: 2, portfolio_impact_score: 2, urgency_score: 0, confidence_score: 0, sentiment: 'neutral' as const, tags: ['unscored'], summary: article.summary ?? article.headline, thesis_impact: 'none' as const, scoring_reason: 'scoring skipped' },
    }))
  }

  // ── 5. Deduplicate & cluster ──────────────────────────────────────────────────
  console.log('\n[DEDUP] Deduplicating...')
  const dedupResults = await deduplicateAndCluster(scored, supabase)
  const newCount = dedupResults.filter(r => r.isNew).length
  const dupCount = dedupResults.filter(r => !r.isNew).length
  console.log(`  ${newCount} new, ${dupCount} duplicates`)

  // ── 6. Route to DB ────────────────────────────────────────────────────────────
  console.log('\n[ROUTER] Routing articles...')
  const routerOutput = await routeArticles(dedupResults, portfolioId, supabase)
  console.log(`  immediate=${routerOutput.routing.immediate} daily=${routerOutput.routing.daily} weekly=${routerOutput.routing.weekly} discard=${routerOutput.routing.discard}`)
  console.log(`  Stored: ${routerOutput.stored}, Alerts: ${routerOutput.alerts}, Duplicates skipped: ${routerOutput.duplicates}`)

  // ── 7. Hebrew back-fill ───────────────────────────────────────────────────────
  console.log('\n[HEBREW] Translating new items...')
  const hebrewUpdated = await backfillHebrew(holdings.map(h => h.ticker))
  console.log(`  ${hebrewUpdated} rows updated with Hebrew content`)

  return {
    articles_fetched: rawArticles.length,
    articles_scored: scored.length,
    articles_stored: routerOutput.stored,
    alerts_created: routerOutput.alerts,
    events_synced: eventsSynced,
    skipped_duplicates: routerOutput.duplicates,
    routing_summary: routerOutput.routing,
    routerOutput,
  }
}
