import { validate } from '../lib/validator'
import type { ScoredNews } from '../lib/scorer'
import type { PerplexityResult } from '../lib/perplexity'

// ─── Shared good baseline ─────────────────────────────────────────────────────

const GOOD_PERPLEXITY: PerplexityResult = {
  summary: `NVIDIA reported Q1 FY2027 earnings with EPS of $1.87, beating estimates of $1.76.
Revenue was $46.7 billion, a 56% year-over-year increase. Data Center segment reached $41.1 billion.`,
  sources: [
    'https://public.com/stocks/nvda/earnings',
    'https://finance.yahoo.com/quote/NVDA',
    'https://investor.nvidia.com/home/default.aspx',
  ],
  raw: JSON.stringify({
    choices: [{ message: { content: `NVIDIA reported Q1 FY2027 EPS of $1.87 vs $1.76 expected.
Revenue $46.7 billion (+56% YoY). Data Center $41.1 billion. Gross margin 72%.` } }],
  }),
  usage: { promptTokens: 36, completionTokens: 458, estimatedCostUsd: 0.00549 },
}

const GOOD_SCORED: ScoredNews = {
  importance_score: 8, portfolio_impact_score: 8, urgency_score: 6, confidence_score: 9,
  thesis_impact: 'supporting', action_type: 'review', routing: 'immediate',
  hebrew_title: 'נוויידה: רבעון חזק עם 56% צמיחה בהכנסות',
  hebrew_summary: 'נוויידה דיווחה על רבעון חזק: הכנסות 46.7 מיליארד דולר, EPS של 1.87 דולר.',
}

const KNOWN_TICKERS = ['NVDA', 'TSLA', 'PLTR', 'AMD', 'AMZN', 'IBIT', 'URA', 'GBTC', 'IREN']

// ─── Print helper ─────────────────────────────────────────────────────────────

function printResult(label: string, output: ReturnType<typeof validate>) {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  ${label}`)
  console.log('═'.repeat(60))

  if (output.flags.length === 0) {
    console.log('  ✅ No flags — clean result')
  } else {
    console.log(`  ⚠  ${output.flags.length} flag(s) raised:\n`)
    for (const f of output.flags) {
      const icon = f.severity === 'error' ? '🔴' : '🟡'
      console.log(`  ${icon} [${f.type}]  ${f.message}`)
      if (f.detail) console.log(`      └─ ${f.detail}`)
    }
  }

  console.log(`\n  routing:          ${output.routing}`)
  console.log(`  importance_score: ${output.importance_score}`)
  console.log(`  confidence_override: ${output.confidence_override}`)
  if (output.hebrew_warning) console.log(`  hebrew_warning:   ${output.hebrew_warning}`)
}

// ─── Test 1: Clean result — should pass with no flags ─────────────────────────

function test1_clean() {
  const out = validate({ scored: GOOD_SCORED, perplexity: GOOD_PERPLEXITY, knownTickers: KNOWN_TICKERS })
  printResult('TEST 1 — Clean result (expect: no flags)', out)
  const passed = out.flags.length === 0
  console.log(`\n  → ${passed ? '✅ PASS' : '❌ FAIL'}: ${out.flags.length} flags`)
  return passed
}

// ─── Test 2: Future year "2028" in Hebrew summary ─────────────────────────────

function test2_futureYear() {
  const badScored: ScoredNews = {
    ...GOOD_SCORED,
    hebrew_summary: 'נוויידה תדווח בשנת 2028 על הכנסות של $46.7 מיליארד — צמיחה של 56%.',
  }
  const out = validate({ scored: badScored, perplexity: GOOD_PERPLEXITY, knownTickers: KNOWN_TICKERS })
  printResult('TEST 2 — Future year "2028" in Hebrew summary (expect: date_sanity flag)', out)
  const passed = out.flags.some(f => f.type === 'date_sanity') && out.confidence_override
  console.log(`\n  → ${passed ? '✅ PASS' : '❌ FAIL'}: date_sanity=${out.flags.some(f=>f.type==='date_sanity')} override=${out.confidence_override}`)
  return passed
}

// ─── Test 3: Made-up number not in raw source ─────────────────────────────────

function test3_hallucNumber() {
  const badScored: ScoredNews = {
    ...GOOD_SCORED,
    hebrew_summary: 'נוויידה דיווחה על הכנסות של 999,999 מיליארד דולר ו-EPS של 1.87 דולר.',
  }
  const out = validate({ scored: badScored, perplexity: GOOD_PERPLEXITY, knownTickers: KNOWN_TICKERS })
  printResult('TEST 3 — Made-up number "999999" not in raw (expect: number_inconsistency flag)', out)
  const passed = out.flags.some(f => f.type === 'number_inconsistency')
  console.log(`\n  → ${passed ? '✅ PASS' : '❌ FAIL'}: number_inconsistency=${out.flags.some(f=>f.type==='number_inconsistency')}`)
  return passed
}

// ─── Test 4: Year 2027 (next calendar year from 2026) ────────────────────────

function test4_year2027() {
  const badScored: ScoredNews = {
    ...GOOD_SCORED,
    hebrew_summary: 'נוויידה מתכננת בשנת 2027 להכפיל הכנסות ל-90 מיליארד דולר.',
  }
  const out = validate({ scored: badScored, perplexity: GOOD_PERPLEXITY, knownTickers: KNOWN_TICKERS })
  const year2027flagged = out.flags.some(f => f.type === 'date_sanity')
  printResult('TEST 4 — Year "2027" in Hebrew summary (expect: date_sanity if 2027 > currentYear)', out)
  const currentYear = new Date().getFullYear()
  console.log(`\n  Current year: ${currentYear}, 2027 > ${currentYear} = ${2027 > currentYear}`)
  console.log(`  → ${year2027flagged ? '🟡 FLAGGED' : '✅ CLEAN'}: date_sanity=${year2027flagged}`)
  return true // informational
}

// ─── Test 5: Low confidence downgrades routing ───────────────────────────────

function test5_confidenceFloor() {
  const lowConfScored: ScoredNews = {
    ...GOOD_SCORED,
    confidence_score: 3,  // < 4 → immediate/daily → weekly
    routing: 'immediate',
  }
  const out = validate({ scored: lowConfScored, perplexity: GOOD_PERPLEXITY, knownTickers: KNOWN_TICKERS })
  printResult('TEST 5 — confidence=3 with routing=immediate (expect: downgrade to weekly)', out)
  const passed = out.routing === 'weekly' && out.flags.some(f => f.type === 'confidence_floor')
  console.log(`\n  → ${passed ? '✅ PASS' : '❌ FAIL'}: routing=${out.routing} (expected "weekly")`)
  return passed
}

// ─── Test 6: All Tier-3 sources cap importance ───────────────────────────────

function test6_sourceQuality() {
  const tier3Perplexity: PerplexityResult = {
    ...GOOD_PERPLEXITY,
    sources: ['https://reddit.com/r/stocks/nvda', 'https://randomforum.io/nvda'],
  }
  const highImportanceScored: ScoredNews = { ...GOOD_SCORED, importance_score: 9 }
  const out = validate({ scored: highImportanceScored, perplexity: tier3Perplexity, knownTickers: KNOWN_TICKERS })
  printResult('TEST 6 — All Tier-3 sources, importance=9 (expect: cap to 6)', out)
  const passed = out.importance_score === 6 && out.flags.some(f => f.type === 'source_quality')
  console.log(`\n  → ${passed ? '✅ PASS' : '❌ FAIL'}: importance=${out.importance_score} (expected 6)`)
  return passed
}

// ─── Run all ──────────────────────────────────────────────────────────────────

function main() {
  console.log('=== Validator test suite ===\n')
  const results = [
    test1_clean(),
    test2_futureYear(),
    test3_hallucNumber(),
    test4_year2027(),
    test5_confidenceFloor(),
    test6_sourceQuality(),
  ]
  const passed = results.filter(Boolean).length
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`  RESULTS: ${passed}/${results.length} passed`)
  console.log('═'.repeat(60))
}

main()
