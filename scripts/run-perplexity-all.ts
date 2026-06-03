/**
 * run-perplexity-all.ts
 * Runs the Perplexity + Claude intelligence pipeline for ALL holdings,
 * bypassing cache, and writes results to news_items with Hebrew content.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/run-perplexity-all.ts
 *   npx tsx --env-file=.env.local scripts/run-perplexity-all.ts --tickers PLTR,TSLA,AMZN
 */

import { createClient } from '@supabase/supabase-js'
import yahooFinance from 'yahoo-finance2'
import { searchNews } from '../lib/perplexity'
import { scoreNews } from '../lib/scorer'
import { validate } from '../lib/validator'

// ─── Day % from Yahoo Finance ─────────────────────────────────────────────────

async function fetchDayChange(ticker: string): Promise<number | null> {
  try {
    const q = await yahooFinance.quote(ticker)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pct = (q as any)?.regularMarketChangePercent
    return typeof pct === 'number' ? pct : null
  } catch {
    return null
  }
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sep  = '─'.repeat(72)
const sep2 = '═'.repeat(72)

function fmt(n: number) { return `$${n.toFixed(5)}` }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const db = getDb()

  console.log(sep2)
  console.log('  Investor OS — Perplexity Full Run (all holdings)')
  console.log(`  ${new Date().toISOString()}`)
  console.log(sep2)

  // 1. Load all holdings
  const { data: holdings, error: hErr } = await db
    .from('holdings')
    .select('ticker, company_name')
    .eq('portfolio_id', 1)
    .order('ticker')
  if (hErr || !holdings?.length) throw new Error(`No holdings: ${hErr?.message}`)

  // Filter by --tickers flag if provided
  const tickerArg = process.argv.find(a => a.startsWith('--tickers='))
    ?? (process.argv.includes('--tickers') ? process.argv[process.argv.indexOf('--tickers') + 1] : undefined)
  const filterSet = tickerArg
    ? new Set(tickerArg.replace('--tickers=', '').split(',').map(t => t.trim().toUpperCase()))
    : null
  const filtered = filterSet ? holdings.filter(h => filterSet.has(h.ticker)) : holdings

  const knownTickers = holdings.map(h => h.ticker)
  console.log(`\nRunning for (${filtered.length}): ${filtered.map(h => h.ticker).join(', ')}\n`)

  // 2. Clear perplexity_cache for selected tickers
  await db.from('perplexity_cache').delete().in('ticker', filtered.map(h => h.ticker))
  console.log(`Cache cleared for ${filtered.length} tickers.\n`)

  // 3. Process each holding
  const results: {
    ticker:   string
    routing:  string
    cost:     number
    stored:   boolean
    title:    string
    error?:   string
  }[] = []

  let totalCost = 0

  for (const h of filtered) {
    const { ticker, company_name } = h
    process.stdout.write(`[${ticker.padEnd(5)}] `)

    // 3a. Fetch real day% from Yahoo Finance
    const dayChangePct = await fetchDayChange(ticker)
    if (dayChangePct != null) {
      const sign = dayChangePct >= 0 ? '+' : ''
      process.stdout.write(`${sign}${dayChangePct.toFixed(2)}% today | Fetching… `)
    } else {
      process.stdout.write(`Fetching… `)
    }

    try {
      // 3b. Perplexity — pass day change so model knows there was movement
      const perplexity = await searchNews(ticker, company_name, dayChangePct)

      // --raw flag: print full Perplexity response before scoring
      if (process.argv.includes('--raw')) {
        console.log(`\n${'─'.repeat(60)}`)
        console.log(`RAW PERPLEXITY → ${ticker}`)
        console.log(`${'─'.repeat(60)}`)
        console.log(perplexity.summary)
        console.log(`Sources: ${perplexity.sources.slice(0, 3).join(' | ')}`)
        console.log(`${'─'.repeat(60)}\n`)
      }

      if (perplexity.error || !perplexity.summary) {
        console.log(`⚠ Perplexity error: ${perplexity.error}`)
        results.push({ ticker, routing: 'skip', cost: 0, stored: false, title: '—', error: perplexity.error })
        continue
      }

      // 3b. Claude scoring + Hebrew translation
      const scored = await scoreNews(ticker, company_name, perplexity)
      if (scored.error) {
        console.log(`⚠ Scorer error: ${scored.error}`)
        results.push({ ticker, routing: 'skip', cost: 0, stored: false, title: '—', error: scored.error })
        continue
      }

      // 3c. Validation
      const validation = validate({ scored, perplexity, knownTickers })
      const routing    = scored.routing  // already computed inside scoreNews

      const itemCost =
        (perplexity.usage?.estimatedCostUsd ?? 0) +
        (scored.usage?.estimatedCostUsd ?? 0)
      totalCost += itemCost

      process.stdout.write(`scored → ${routing.padEnd(9)} ${fmt(itemCost)}  `)

      // 3d. Write to news_items (upsert by ticker + today's date to avoid dups)
      if (routing === 'ignore' || routing === 'weekly' && validation.importance_score < 3) {
        console.log('(skipped — low signal)')
        results.push({ ticker, routing, cost: itemCost, stored: false, title: scored.hebrew_title })
        continue
      }

      const today = new Date().toISOString().split('T')[0]
      // Check if already stored today
      const { data: existing } = await db
        .from('news_items')
        .select('id')
        .eq('ticker', ticker)
        .eq('source', 'Perplexity AI')
        .gte('published_at', today)
        .limit(1)
        .maybeSingle()

      if (existing) {
        // Update existing row
        await db
          .from('news_items')
          .update({
            hebrew_title:           scored.hebrew_title.slice(0, 80),
            hebrew_summary:         scored.hebrew_summary.slice(0, 300),
            summary:                perplexity.summary.slice(0, 2000),
            importance_score:       scored.importance_score,
            portfolio_impact_score: scored.portfolio_impact_score,
            urgency_score:          scored.urgency_score,
            confidence_score:       scored.confidence_score,
            thesis_impact:          scored.thesis_impact,
            action_type:            validation.routing,
            sentiment:              'neutral',
          })
          .eq('id', existing.id)
        console.log('✓ updated')
        results.push({ ticker, routing: validation.routing, cost: itemCost, stored: true, title: scored.hebrew_title })
      } else {
        const { error: insErr } = await db
          .from('news_items')
          .insert({
            ticker,
            headline:               scored.hebrew_title.slice(0, 200),
            hebrew_title:           scored.hebrew_title.slice(0, 80),
            hebrew_summary:         scored.hebrew_summary.slice(0, 300),
            summary:                perplexity.summary.slice(0, 2000),
            source:                 'Perplexity AI',
            source_tier:            2,
            published_at:           new Date().toISOString(),
            importance_score:       validation.importance_score,
            portfolio_impact_score: scored.portfolio_impact_score,
            urgency_score:          scored.urgency_score,
            confidence_score:       scored.confidence_score,
            thesis_impact:          scored.thesis_impact,
            action_type:            validation.routing,
            is_verified:            false,
            processed:              true,
            sentiment:              'neutral',
            tags:                   [],
          })
        if (insErr) {
          console.log(`✗ insert error: ${insErr.message}`)
          results.push({ ticker, routing: validation.routing, cost: itemCost, stored: false, title: scored.hebrew_title, error: insErr.message })
        } else {
          console.log('✓ stored')
          results.push({ ticker, routing: validation.routing, cost: itemCost, stored: true, title: scored.hebrew_title })
        }
      }

      // 3e. Update perplexity_cache
      await db
        .from('perplexity_cache')
        .upsert({ ticker, result: { perplexity, scored }, cached_at: new Date().toISOString() })

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`✗ ${msg}`)
      results.push({ ticker, routing: 'error', cost: 0, stored: false, title: '—', error: msg })
    }
  }

  // 4. Summary report
  console.log('\n' + sep2)
  console.log('  RESULTS')
  console.log(sep2)

  const stored   = results.filter(r => r.stored)
  const skipped  = results.filter(r => !r.stored && !r.error)
  const errored  = results.filter(r => r.error)
  const byRoute  = { immediate: 0, daily: 0, weekly: 0, ignore: 0, skip: 0 } as Record<string, number>
  for (const r of results) byRoute[r.routing] = (byRoute[r.routing] ?? 0) + 1

  console.log(`\n  Stored  : ${stored.length} / ${filtered.length}`)
  console.log(`  Skipped : ${skipped.length}  (low signal)`)
  console.log(`  Errors  : ${errored.length}`)
  console.log(`  Total cost: $${totalCost.toFixed(4)}`)
  console.log(`\n  Routing breakdown:`)
  console.log(`    🔴 Immediate : ${byRoute.immediate ?? 0}`)
  console.log(`    🟡 Daily     : ${byRoute.daily ?? 0}`)
  console.log(`    🟢 Weekly    : ${byRoute.weekly ?? 0}`)
  console.log(`    ⚪ Ignored   : ${byRoute.ignore ?? 0}`)

  console.log('\n' + sep)
  console.log('  Ticker breakdown:')
  console.log(sep)
  for (const r of results) {
    const icon = r.stored ? '✅' : r.error ? '❌' : '⬜'
    const cost = r.cost > 0 ? ` (${fmt(r.cost)})` : ''
    console.log(`  ${icon} ${r.ticker.padEnd(6)} [${r.routing.padEnd(9)}]${cost}`)
    if (r.title && r.title !== '—') console.log(`         → ${r.title}`)
    if (r.error) console.log(`         ✗ ${r.error.slice(0, 80)}`)
  }
  console.log(sep2)
}

main().catch(err => {
  console.error('\nFatal:', err.message)
  process.exit(1)
})
