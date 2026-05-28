/**
 * Seeds target_allocation_pct and max_allocation_pct for holdings
 * that were added via the UI (not via seed-thesis.ts).
 *
 * Values are TEMPORARY ESTIMATES — review and update with your
 * actual sizing targets before using for sizing decisions.
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOCATIONS: Record<string, {
  target_allocation_pct: number
  max_allocation_pct: number
  conviction_score?: number
  note: string
}> = {
  // TEMP: added via UI — review these targets
  ONDS: {
    target_allocation_pct: 2,
    max_allocation_pct: 4,
    conviction_score: 5,
    note: 'TEMP — small speculative position, conservative sizing',
  },
  MSFT: {
    target_allocation_pct: 8,
    max_allocation_pct: 12,
    conviction_score: 8,
    note: 'TEMP — large cap defensive anchor',
  },
  NOW: {
    target_allocation_pct: 6,
    max_allocation_pct: 10,
    conviction_score: 7,
    note: 'TEMP — enterprise software conviction play',
  },
}

async function main() {
  // Only update tickers that are actually missing allocation data
  const { data: holdings, error } = await sb
    .from('holdings')
    .select('ticker, target_allocation_pct, max_allocation_pct')
    .eq('portfolio_id', 1)
    .in('ticker', Object.keys(ALLOCATIONS))

  if (error) throw new Error(error.message)

  for (const h of holdings ?? []) {
    const alloc = ALLOCATIONS[h.ticker]
    if (!alloc) continue

    if (h.target_allocation_pct != null && h.max_allocation_pct != null) {
      console.log(`  ✓ ${h.ticker}: already has allocation data, skipping`)
      continue
    }

    const update: Record<string, unknown> = {
      target_allocation_pct: alloc.target_allocation_pct,
      max_allocation_pct: alloc.max_allocation_pct,
    }
    if (alloc.conviction_score !== undefined) {
      update.conviction_score = alloc.conviction_score
    }

    const { error: e } = await sb
      .from('holdings')
      .update(update)
      .eq('ticker', h.ticker)
      .eq('portfolio_id', 1)

    if (e) console.warn(`  ✗ ${h.ticker}: ${e.message}`)
    else console.log(`  ✓ ${h.ticker}: target=${alloc.target_allocation_pct}% max=${alloc.max_allocation_pct}%  [${alloc.note}]`)
  }

  console.log('\nAllocation seed complete.')
}

main().catch(err => { console.error(err.message); process.exit(1) })
