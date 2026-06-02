import { searchNews } from '../lib/perplexity'

async function main() {
  console.log('=== Perplexity test — NVDA ===\n')
  const result = await searchNews('NVDA', 'NVIDIA')

  if (result.error) {
    console.error('ERROR:', result.error)
    process.exit(1)
  }

  console.log('─── SUMMARY ───')
  console.log(result.summary)

  console.log('\n─── SOURCES ───')
  result.sources.forEach((s, i) => console.log(`  [${i + 1}] ${s}`))

  if (result.usage) {
    console.log('\n─── USAGE ───')
    console.log(`  Prompt tokens:     ${result.usage.promptTokens}`)
    console.log(`  Completion tokens: ${result.usage.completionTokens}`)
    console.log(`  Estimated cost:    $${result.usage.estimatedCostUsd.toFixed(5)}`)
  }

  console.log('\n─── RAW JSON ───')
  console.log(result.raw)
}

main().catch(err => { console.error(err); process.exit(1) })
