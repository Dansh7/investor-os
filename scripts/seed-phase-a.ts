import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // ── 1. Get the first portfolio ──────────────────────────────────────────────
  const { data: portfolios, error: pErr } = await supabase
    .from('portfolios')
    .select('id, name')
    .limit(1)

  if (pErr || !portfolios?.length) {
    console.error('No portfolio found:', pErr?.message ?? 'empty result')
    process.exit(1)
  }

  const portfolioId = portfolios[0].id as number
  console.log(`Seeding into portfolio: ${portfolios[0].name} (${portfolioId})`)

  // ── 2. portfolio_policy ─────────────────────────────────────────────────────
  const { error: ppErr } = await supabase
    .from('portfolio_policy')
    .upsert(
      {
        portfolio_id: portfolioId,
        max_single_position_pct: 20,
        max_sector_pct: 40,
        min_cash_pct: 5,
        rebalance_trigger_pct: 5,
        stop_loss_pct: 15,
        max_drawdown_pct: 25,
        rules: [
          'Never chase a position up more than 5% from intended entry',
          'Always size down when conviction_score < 6',
          'Review thesis before adding to a losing position',
          'No more than 2 new positions per month without full thesis write-up',
        ],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'portfolio_id' }
    )

  if (ppErr) {
    console.error('portfolio_policy error:', ppErr.message)
  } else {
    console.log('✓ portfolio_policy seeded')
  }

  // ── 3. portfolio_objectives ─────────────────────────────────────────────────
  const { error: poErr } = await supabase
    .from('portfolio_objectives')
    .upsert(
      {
        portfolio_id: portfolioId,
        primary_goal: 'Long-term wealth compounding with asymmetric upside',
        time_horizon: '5–10 years',
        target_annual_return_pct: 15,
        risk_tolerance: 'aggressive',
        benchmark_ticker: 'SPY',
        liquidity_needs: 'No near-term liquidity needs — full investment horizon',
        tax_considerations: 'Prefer holding >1 year for long-term capital gains',
        constraints: [
          'No leverage',
          'No short selling',
          'Max 5% in any single speculative position',
          'Minimum 2 weeks research before initiating new position',
        ],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'portfolio_id' }
    )

  if (poErr) {
    console.error('portfolio_objectives error:', poErr.message)
  } else {
    console.log('✓ portfolio_objectives seeded')
  }

  // ── 4. playbook_rules ───────────────────────────────────────────────────────
  const rules = [
    {
      portfolio_id: portfolioId,
      rule_name: 'Thesis Break — Immediate Review',
      trigger_condition: 'thesis_status changes to broken',
      action: 'Send Telegram alert, open decision_item to evaluate exit within 48h',
      priority: 10,
      applies_to: [],
    },
    {
      portfolio_id: portfolioId,
      rule_name: 'Position Size Breach',
      trigger_condition: 'Single position exceeds max_single_position_pct',
      action: 'Alert CIO to trim position to target allocation',
      priority: 9,
      applies_to: [],
    },
    {
      portfolio_id: portfolioId,
      rule_name: 'Earnings — Pre-Event Sizing',
      trigger_condition: 'Earnings date within 5 days',
      action: 'Review position size vs max_allocation_pct, optionally reduce to target',
      priority: 7,
      applies_to: [],
    },
    {
      portfolio_id: portfolioId,
      rule_name: 'High Importance News — Alert',
      trigger_condition: 'importance_score >= 8 OR portfolio_impact_score >= 7',
      action: 'Send immediate Telegram alert, create decision_item',
      priority: 8,
      applies_to: [],
    },
    {
      portfolio_id: portfolioId,
      rule_name: 'Conviction Drop — Review',
      trigger_condition: 'conviction_score drops below 5',
      action: 'Flag holding for thesis review, add to next weekly CIO briefing',
      priority: 6,
      applies_to: [],
    },
    {
      portfolio_id: portfolioId,
      rule_name: 'Cash Below Minimum',
      trigger_condition: 'Cash allocation falls below min_cash_pct',
      action: 'Pause new position sizing, review for rebalancing opportunity',
      priority: 8,
      applies_to: [],
    },
  ]

  const { error: prErr } = await supabase.from('playbook_rules').insert(rules)

  if (prErr) {
    console.error('playbook_rules error:', prErr.message)
  } else {
    console.log(`✓ playbook_rules seeded (${rules.length} rules)`)
  }

  console.log('\nPhase A seed complete.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
