/**
 * Clears news_items and news_clusters so the pipeline can be re-run cleanly.
 * Does NOT touch alerts, events, holdings, or any other tables.
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // Clear cluster_id FK on news_items first to allow deleting clusters
  const { error: e1 } = await supabase.from('news_items').update({ cluster_id: null }).not('id', 'is', null)
  if (e1) throw new Error(`Unlink clusters: ${e1.message}`)

  const { error: e2, count: c2 } = await supabase.from('news_clusters').delete().not('id', 'is', null)
  if (e2) throw new Error(`Delete clusters: ${e2.message}`)

  const { error: e3, count: c3 } = await supabase.from('news_items').delete().not('id', 'is', null)
  if (e3) throw new Error(`Delete news_items: ${e3.message}`)

  console.log(`Cleared ${c2 ?? '?'} clusters and ${c3 ?? '?'} news_items.`)
}

main().catch(err => { console.error(err.message); process.exit(1) })
