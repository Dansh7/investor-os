import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const theses: Record<string, {
  thesis: string
  thesis_status: string
  thesis_break_conditions: string[]
  conviction_score: number
  target_allocation_pct: number
  max_allocation_pct: number
}> = {
  IBIT: {
    thesis: 'IBIT (iShares Bitcoin ETF) provides institutional-grade Bitcoin exposure with minimal tracking error and fee drag. Bitcoin thesis: scarce digital store of value, institutional allocation accelerating post-ETF approval, supply constraint from halving cycles, and growing sovereign reserve interest.',
    thesis_status: 'intact',
    thesis_break_conditions: [
      'SEC revokes or materially restricts Bitcoin spot ETF approvals',
      'Bitcoin loses institutional adoption momentum — ETF AUM declines >30% sustained',
      'Bitcoin undergoes >70% drawdown sustained for more than 18 months',
      'BlackRock terminates or restructures the IBIT product',
    ],
    conviction_score: 7,
    target_allocation_pct: 8,
    max_allocation_pct: 12,
  },
  URA: {
    thesis: 'URA provides diversified exposure to the uranium and nuclear fuel cycle. Thesis: nuclear renaissance driven by AI data center power demand, energy security priorities, and net-zero commitments requiring reliable baseload power. Uranium supply deficit persists as new mines take 10+ years to develop.',
    thesis_status: 'intact',
    thesis_break_conditions: [
      'Major nuclear accident (Chernobyl/Fukushima scale) triggers global phase-out momentum',
      'Uranium spot price collapses below $50/lb sustained more than 6 months',
      'Multiple planned reactor builds cancelled due to cost overruns or policy reversal',
      'Alternative baseload technologies (geothermal, fusion) gain faster-than-expected traction',
    ],
    conviction_score: 7,
    target_allocation_pct: 7,
    max_allocation_pct: 12,
  },
  AMD: {
    thesis: 'AMD is gaining structural share in data center compute via EPYC CPUs (displacing Intel in servers) and MI300X AI accelerators (competing with NVIDIA in AI inference). AMD benefits from the same AI infrastructure buildout as NVIDIA but at lower valuation multiples and with improving execution track record.',
    thesis_status: 'intact',
    thesis_break_conditions: [
      'AMD server CPU market share falls below 20% in data center after two consecutive declines',
      'MI300X AI accelerator series fails to achieve meaningful enterprise adoption vs NVIDIA H-series',
      'Intel Gaudi or next-gen architecture achieves competitive performance/price parity',
      'Gross margin compression below 45% indicating structural pricing weakness',
    ],
    conviction_score: 7,
    target_allocation_pct: 10,
    max_allocation_pct: 15,
  },
  BMNR: {
    thesis: 'Speculative position in a small/mid-cap company. High risk, asymmetric upside thesis. Position sized conservatively given limited public information and low analyst coverage.',
    thesis_status: 'intact',
    thesis_break_conditions: [
      'Any SEC enforcement action or material fraud allegation',
      'Revenue declines more than 30% without credible recovery plan',
      'Management credibility issues emerge — material misrepresentation of results',
    ],
    conviction_score: 4,
    target_allocation_pct: 3,
    max_allocation_pct: 5,
  },
  IREN: {
    thesis: 'IREN (Iris Energy) is a Bitcoin miner focused on sustainable, low-cost energy. Thesis: Bitcoin price appreciation combined with operational efficiency improvements and growing infrastructure that can pivot to AI compute hosting. Positioned at the intersection of Bitcoin mining and AI infrastructure demand for GPU compute.',
    thesis_status: 'intact',
    thesis_break_conditions: [
      'Bitcoin price falls below $40,000 sustained for more than 6 months, destroying mining economics',
      'Network hashrate increase drives mining profitability below operating costs',
      'AI compute hosting thesis fails to materialise — no material revenue within 18 months',
      'Energy cost structure deteriorates — power purchase agreements expire unfavourably',
      'Debt levels become unsustainable relative to revenue',
    ],
    conviction_score: 6,
    target_allocation_pct: 6,
    max_allocation_pct: 10,
  },
}

async function main() {
  for (const [ticker, data] of Object.entries(theses)) {
    const { error } = await supabase
      .from('holdings')
      .update({
        thesis: data.thesis,
        thesis_status: data.thesis_status,
        thesis_break_conditions: data.thesis_break_conditions,
        conviction_score: data.conviction_score,
        target_allocation_pct: data.target_allocation_pct,
        max_allocation_pct: data.max_allocation_pct,
        thesis_updated_at: new Date().toISOString(),
      })
      .eq('ticker', ticker)

    if (error) console.warn(`  ✗ ${ticker}: ${error.message}`)
    else console.log(`  ✓ ${ticker}: conviction=${data.conviction_score}, status=${data.thesis_status}`)
  }
  console.log('\nThesis seed complete.')
}

main().catch(err => { console.error(err.message); process.exit(1) })
