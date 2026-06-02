import { searchNews } from '../lib/perplexity'
import { scoreNews } from '../lib/scorer'

async function main() {
  const ticker = 'NVDA'
  const company = 'NVIDIA'

  console.log(`=== Scorer test — ${ticker} ===\n`)

  // Step 1: fetch news via Perplexity
  console.log('── Step 1: Perplexity search ──')
  const perplexityResult = await searchNews(ticker, company)

  if (perplexityResult.error) {
    console.error('Perplexity error:', perplexityResult.error)
    process.exit(1)
  }

  console.log(`Summary length: ${perplexityResult.summary.length} chars`)
  console.log(`Sources: ${perplexityResult.sources.length}`)
  console.log(`Perplexity cost: $${perplexityResult.usage?.estimatedCostUsd.toFixed(5) ?? 'n/a'}\n`)

  // Step 2: score + translate
  console.log('── Step 2: Scoring & translation ──')
  const scored = await scoreNews(ticker, company, perplexityResult)

  if (scored.error) {
    console.error('Scorer error:', scored.error)
    process.exit(1)
  }

  // ── Output ────────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════')
  console.log('  SCORED + TRANSLATED RESULT')
  console.log('════════════════════════════════\n')

  console.log('SCORES')
  console.log(`  importance_score:       ${scored.importance_score}/10`)
  console.log(`  portfolio_impact_score: ${scored.portfolio_impact_score}/10`)
  console.log(`  urgency_score:          ${scored.urgency_score}/10`)
  console.log(`  confidence_score:       ${scored.confidence_score}/10`)

  console.log('\nCLASSIFICATION')
  console.log(`  thesis_impact: ${scored.thesis_impact}`)
  console.log(`  action_type:   ${scored.action_type}`)
  console.log(`  routing:       ${scored.routing}`)

  console.log('\nHEBREW')
  console.log(`  title:   ${scored.hebrew_title}`)
  console.log(`  summary: ${scored.hebrew_summary}`)

  if (scored.usage) {
    const totalCost = (perplexityResult.usage?.estimatedCostUsd ?? 0) + scored.usage.estimatedCostUsd
    console.log('\nCOST')
    console.log(`  Scorer in:${scored.usage.inputTokens} out:${scored.usage.outputTokens}  $${scored.usage.estimatedCostUsd.toFixed(5)}`)
    console.log(`  Total pipeline (Perplexity + Scorer): $${totalCost.toFixed(5)}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
