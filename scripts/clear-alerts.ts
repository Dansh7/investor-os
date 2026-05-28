/**
 * Clears test/stale alerts from portfolio_id=1.
 * Safe to run before a clean pipeline run.
 * Does NOT touch news_items, events, holdings, or any other tables.
 */
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { count, error } = await sb
    .from('alerts')
    .delete()
    .eq('portfolio_id', 1)

  if (error) throw new Error(error.message)
  console.log(`Cleared ${count ?? '?'} alerts for portfolio_id=1`)
}

main().catch(err => { console.error(err.message); process.exit(1) })
