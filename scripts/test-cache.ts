import { fetchWithGate, type GateContext } from '../lib/perplexity-cache'

const TICKER  = 'NVDA'
const COMPANY = 'NVIDIA'

// Realistic context: NVDA moved +6.26% today, no earnings imminent
const CTX_RUN1: GateContext = {
  changePercent:       6.26,
  hasUpcomingEarnings: false,
  hasActiveAlert:      false,
  isMorningScan:       true,   // first run of the day — gate always passes
}

// Second run: same context but cache should intercept before gate is even checked
const CTX_RUN2: GateContext = {
  changePercent:       6.26,
  hasUpcomingEarnings: false,
  hasActiveAlert:      false,
  isMorningScan:       false,
}

function printResult(
  run: number,
  result: Awaited<ReturnType<typeof fetchWithGate>>
) {
  console.log(`\n${'═'.repeat(52)}`)
  console.log(`  RUN ${run} — ${result.cacheHit ? '✅ CACHE HIT' : result.gateBlocked ? '⛔ GATE BLOCKED' : '🌐 API CALL'}`)
  console.log(`${'═'.repeat(52)}`)

  if (result.gateBlocked) {
    console.log('  Skipped — no trigger condition met')
    return
  }

  if (result.cacheHit) {
    console.log(`  Cost:          $0.00  (cache served result)`)
    console.log(`  Routing:       ${result.scored.routing}`)
    console.log(`  Hebrew title:  ${result.scored.hebrew_title}`)
    console.log(`  Thesis:        ${result.scored.thesis_impact}`)
    console.log(`  Action:        ${result.scored.action_type}`)
    return
  }

  console.log(`  Cost:          $${result.totalCostUsd.toFixed(5)}`)
  console.log(`  Routing:       ${result.scored.routing}`)
  console.log(`  Hebrew title:  ${result.scored.hebrew_title}`)
  console.log(`  Thesis:        ${result.scored.thesis_impact}`)
  console.log(`  Action:        ${result.scored.action_type}`)
  console.log(`  Sources:       ${result.perplexity.sources.length}`)
  console.log(`  Importance:    ${result.scored.importance_score}/10`)
  console.log(`  Port. impact:  ${result.scored.portfolio_impact_score}/10`)
  console.log(`  Urgency:       ${result.scored.urgency_score}/10`)
}

async function main() {
  console.log(`\n=== Cache test — ${TICKER} back-to-back ===`)
  console.log(`TTL: 4 hours | Gate: >2% move | morning | earnings | alert\n`)

  const r1 = await fetchWithGate(TICKER, COMPANY, CTX_RUN1)
  printResult(1, r1)

  const r2 = await fetchWithGate(TICKER, COMPANY, CTX_RUN2)
  printResult(2, r2)

  console.log('\n=== Done ===')
}

main().catch(err => { console.error(err); process.exit(1) })
