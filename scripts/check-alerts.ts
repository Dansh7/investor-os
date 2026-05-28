import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { data } = await sb
    .from('alerts')
    .select('ticker,alert_type,priority,title,metadata')
    .eq('alert_status', 'active')
    .order('priority', { ascending: false })

  for (const a of data ?? []) {
    const m = (a.metadata ?? {}) as Record<string, number | string>
    const sev = a.priority >= 8 ? 'CRITICAL' : 'WARNING '
    console.log(`[${sev}] ${a.ticker} | ${a.alert_type} | p=${a.priority} | impact=${m.portfolio_impact_score} imp=${m.importance_score} urgency=${m.urgency_score}`)
    console.log(`  ${String(a.title).slice(0, 100)}`)
  }
}

main().catch(e => { console.error((e as Error).message); process.exit(1) })
