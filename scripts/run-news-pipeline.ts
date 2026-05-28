import { runNewsPipeline } from '../lib/news/run'
import type { ActionType } from '../lib/news/types'

const args = process.argv.slice(2)
const full = args.includes('--full')
const noScore = args.includes('--no-score')

const ACTION_LABEL: Record<ActionType, string> = {
  immediate: '🔴 IMMEDIATE ALERT',
  daily:     '🟡 DAILY BRIEFING',
  weekly:    '🟢 WEEKLY BRIEFING',
  discard:   '⚪ DISCARDED',
  historical: '🗄  HISTORICAL (archived)',
}

const sep  = '─'.repeat(72)
const sep2 = '═'.repeat(72)

console.log(sep2)
console.log('  Investor OS — Phase B News Engine (Calibrated)')
console.log(`  ${new Date().toISOString()}`)
if (!process.env.ANTHROPIC_API_KEY)  console.log('  ⚠  ANTHROPIC_API_KEY not set — scoring disabled')
if (!process.env.PERPLEXITY_API_KEY) console.log('  ℹ  PERPLEXITY disabled (add PERPLEXITY_API_KEY to enable)')
console.log(sep2)

runNewsPipeline({
  maxArticlesPerHolding: full ? 10 : 3,
  maxHoldings: full ? undefined : 5,
  skipScoring: noScore || !process.env.ANTHROPIC_API_KEY,
  enablePerplexity: false,
})
  .then(result => {
    const { routerOutput } = result

    console.log('\n' + sep2)
    console.log('  PIPELINE SUMMARY')
    console.log(sep2)
    console.log(`  Articles fetched   : ${result.articles_fetched}`)
    console.log(`  Articles scored    : ${result.articles_scored}`)
    console.log(`  Duplicates skipped : ${result.skipped_duplicates}`)
    console.log(`  Articles stored    : ${result.articles_stored}`)
    console.log(`  Alerts created     : ${result.alerts_created}`)
    console.log(`  Events synced      : ${result.events_synced}`)
    console.log('')
    console.log('  ROUTING BREAKDOWN')
    console.log(`  🔴 Immediate  : ${result.routing_summary.immediate}`)
    console.log(`  🟡 Daily      : ${result.routing_summary.daily}`)
    console.log(`  🟢 Weekly     : ${result.routing_summary.weekly}`)
    console.log(`  ⚪ Discarded  : ${result.routing_summary.discard}`)
    console.log(`  🗄  Historical : ${result.routing_summary.historical} (archived, no alerts)`)

    if (!routerOutput.examples.length) {
      console.log('\n  No examples to display.')
      return
    }

    // Show one representative per action bucket, then show all immediate/daily
    const byAction: Record<ActionType, typeof routerOutput.examples> = {
      immediate: [], daily: [], weekly: [], discard: [], historical: [],
    }
    for (const ex of routerOutput.examples) byAction[ex.action_type].push(ex)

    console.log('\n' + sep2)
    console.log('  SCORED EXAMPLES (one per routing bucket + all immediate)')
    console.log(sep2)

    let n = 0
    const toShow = [
      ...byAction.immediate,
      byAction.daily.slice(0, 2),
      byAction.weekly.slice(0, 1),
      byAction.discard.slice(0, 1),
    ].flat()

    for (const ex of toShow) {
      n++
      const impacted = ex.thesis_impact !== 'none'
        ? ` ← thesis ${ex.thesis_impact.toUpperCase()}` : ''

      console.log(`\n[${n}] ${ACTION_LABEL[ex.action_type]}${impacted}`)
      console.log(sep)
      console.log(`  Ticker             : ${ex.ticker}`)
      console.log(`  Headline           : ${ex.headline.slice(0, 78)}${ex.headline.length > 78 ? '…' : ''}`)
      console.log(`  Source             : ${ex.source}`)
      console.log(`  Is Verified        : ${ex.is_verified ? 'YES (Tier 1 — SEC filing)' : 'NO'}`)
      console.log(`  Importance         : ${ex.importance_score.toFixed(1)} / 10`)
      console.log(`  Portfolio Impact   : ${ex.portfolio_impact_score.toFixed(1)} / 10`)
      console.log(`  Urgency            : ${ex.urgency_score.toFixed(1)} / 10`)
      console.log(`  Confidence         : ${ex.confidence_score.toFixed(1)} / 10`)
      console.log(`  Sentiment          : ${ex.sentiment}`)
      console.log(`  Thesis Impact      : ${ex.thesis_impact}`)
      console.log(`  Tags               : ${ex.tags.join(', ')}`)
      console.log(`  Summary            : ${ex.summary.slice(0, 200)}`)
      console.log(`  Scoring Reason     : ${ex.scoring_reason.slice(0, 220)}`)
      console.log(sep)
    }

    // Routing logic QA
    console.log('\n' + sep2)
    console.log('  ROUTING LOGIC QA — spot-check examples')
    console.log(sep2)
    console.log('  Rule: impact >= 8               → IMMEDIATE')
    console.log('  Rule: urgency >= 8 AND imp >= 7 → IMMEDIATE')
    console.log('  Rule: thesis_impact = breaking  → IMMEDIATE (unconditional)')
    console.log('  Rule: impact >= 6               → DAILY')
    console.log('  Rule: imp >= 8 (alone)          → DAILY (not immediate)')
    console.log('  Rule: thesis_impact = weakening → DAILY')
    console.log('  Rule: MAX(imp,impact,urgency)≥3 → WEEKLY')
    console.log('')
    console.log('  Calibration cases:')
    console.log('  Case A: imp=9, impact=3, urgency=4 → DAILY  (impact alone doesn\'t reach 8)')
    console.log('  Case B: imp=6, impact=10            → IMMEDIATE (impact >= 8)')
    console.log('  Fed:    imp=8, impact=5, urgency=3  → DAILY  (imp>=8 alone → daily)')
    console.log('  SEC inv: imp=8, impact=8, urgency=10 → IMMEDIATE (impact >= 8)')
    console.log(sep2)
  })
  .catch(err => {
    console.error('\nPipeline failed:', err.message)
    process.exit(1)
  })
