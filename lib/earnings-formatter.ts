import Anthropic from '@anthropic-ai/sdk'
import type { PerplexityResult } from './perplexity'

const MODEL = 'claude-haiku-4-5-20251001'
const COST_PER_M_INPUT  = 0.80
const COST_PER_M_OUTPUT = 4.00

export interface EarningsResult {
  quarter:             string
  date:                string
  revenue: {
    actual:   number | null
    estimate: number | null
    beat:     boolean | null
  }
  eps: {
    actual:   number | null
    estimate: number | null
    beat:     boolean | null
  }
  gross_margin_pct:     number | null
  stock_reaction_pct:   number | null
  guidance_next_quarter: string | null
  thesis_impact:        'supporting' | 'weakening' | 'neutral'
  hebrew_summary:       string
  hebrew_call_highlights: string[]
  sources:              string[]
  error?: string
  usage?: { inputTokens: number; outputTokens: number; estimatedCostUsd: number }
}

const PARSE_TOOL: Anthropic.Messages.Tool = {
  name: 'parse_earnings',
  description: 'Parse earnings report data and translate key points to Hebrew.',
  input_schema: {
    type: 'object',
    properties: {
      quarter: {
        type: 'string',
        description: 'Quarter label, e.g. "Q1 FY2025" or "Q4 2024".',
      },
      date: {
        type: 'string',
        description: 'Earnings report date in YYYY-MM-DD format.',
      },
      revenue_actual_b: {
        type: 'number',
        description: 'Actual revenue in billions USD. Null if not available.',
      },
      revenue_estimate_b: {
        type: 'number',
        description: 'Analyst consensus revenue estimate in billions USD. Null if not available.',
      },
      eps_actual: {
        type: 'number',
        description: 'Actual EPS (earnings per share). Null if not available.',
      },
      eps_estimate: {
        type: 'number',
        description: 'Analyst consensus EPS estimate. Null if not available.',
      },
      gross_margin_pct: {
        type: 'number',
        description: 'Gross margin percentage. Null if not available.',
      },
      stock_reaction_pct: {
        type: 'number',
        description: 'Stock price change % on earnings day (positive = up). Null if not available.',
      },
      guidance_next_quarter: {
        type: 'string',
        description: 'Company guidance for next quarter (revenue or EPS range). Null if not available.',
      },
      thesis_impact: {
        type: 'string',
        enum: ['supporting', 'weakening', 'neutral'],
        description: '"supporting" if results beat expectations and outlook is positive. "weakening" if missed or guidance cut. "neutral" if in-line with no clear direction.',
      },
      hebrew_summary: {
        type: 'string',
        description: 'Hebrew investor summary — max 2 sentences. What happened and why it matters to a shareholder. Write naturally, not a literal translation.',
      },
      hebrew_call_highlights: {
        type: 'array',
        items: { type: 'string' },
        description: 'Exactly 3 Hebrew bullet points from the investor call. Each max 15 words. Focus on guidance, strategy, risks mentioned by management.',
      },
    },
    required: [
      'quarter', 'date', 'thesis_impact',
      'hebrew_summary', 'hebrew_call_highlights',
    ],
  },
}

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

/** Parse a raw value to number, returning null for NaN/null/undefined/"null" */
function safeNum(v: number | string | null | undefined): number | null {
  if (v == null || v === 'null' || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

const EMPTY: EarningsResult = {
  quarter: '', date: '',
  revenue: { actual: null, estimate: null, beat: null },
  eps:     { actual: null, estimate: null, beat: null },
  gross_margin_pct: null, stock_reaction_pct: null,
  guidance_next_quarter: null,
  thesis_impact: 'neutral',
  hebrew_summary: '', hebrew_call_highlights: [],
  sources: [],
}

export async function formatEarnings(
  ticker: string,
  companyName: string,
  result: PerplexityResult
): Promise<EarningsResult> {
  const sources = result.sources ?? []
  if (result.error || !result.summary) {
    return { ...EMPTY, sources, error: result.error ?? 'empty Perplexity result' }
  }

  const prompt = `You are parsing an earnings report for ${ticker} (${companyName}) and translating key points to Hebrew for an Israeli investor.

RAW EARNINGS SUMMARY:
${result.summary}

Extract all available numbers and translate the investor call highlights to Hebrew. If a number is not mentioned, use null.`

  try {
    const msg = await getClient().messages.create({
      model: MODEL,
      max_tokens: 800,
      tools: [PARSE_TOOL],
      tool_choice: { type: 'tool', name: 'parse_earnings' },
      messages: [{ role: 'user', content: prompt }],
    })

    const block = msg.content.find(b => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') throw new Error('no tool_use block')

    type ToolInput = {
      quarter: string; date: string
      revenue_actual_b?: number | null; revenue_estimate_b?: number | null
      eps_actual?: number | null; eps_estimate?: number | null
      gross_margin_pct?: number | null; stock_reaction_pct?: number | null
      guidance_next_quarter?: string | null
      thesis_impact: string
      hebrew_summary: string; hebrew_call_highlights: string[]
    }
    const inp = block.input as ToolInput

    const revActual  = safeNum(inp.revenue_actual_b)
    const revEst     = safeNum(inp.revenue_estimate_b)
    const epsActual  = safeNum(inp.eps_actual)
    const epsEst     = safeNum(inp.eps_estimate)

    const THESIS = ['supporting', 'weakening', 'neutral'] as const
    const thesis = THESIS.includes(inp.thesis_impact as never)
      ? inp.thesis_impact as EarningsResult['thesis_impact']
      : 'neutral'

    const inputTokens      = msg.usage.input_tokens
    const outputTokens     = msg.usage.output_tokens
    const estimatedCostUsd =
      (inputTokens  / 1_000_000) * COST_PER_M_INPUT +
      (outputTokens / 1_000_000) * COST_PER_M_OUTPUT

    console.log(
      `[earnings-formatter] ${ticker} — in:${inputTokens} out:${outputTokens} ` +
      `thesis:${thesis} est:$${estimatedCostUsd.toFixed(5)}`
    )

    return {
      quarter:             inp.quarter ?? '',
      date:                inp.date    ?? '',
      revenue: {
        actual:   revActual,
        estimate: revEst,
        beat:     revActual != null && revEst != null ? revActual >= revEst : null,
      },
      eps: {
        actual:   epsActual,
        estimate: epsEst,
        beat:     epsActual != null && epsEst != null ? epsActual >= epsEst : null,
      },
      gross_margin_pct:     safeNum(inp.gross_margin_pct),
      stock_reaction_pct:   safeNum(inp.stock_reaction_pct),
      guidance_next_quarter: inp.guidance_next_quarter ?? null,
      thesis_impact:        thesis,
      hebrew_summary:       (inp.hebrew_summary ?? '').slice(0, 400),
      hebrew_call_highlights: (inp.hebrew_call_highlights ?? []).slice(0, 3).map(b => b.slice(0, 120)),
      sources,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[earnings-formatter] failed for ${ticker}:`, message)
    return { ...EMPTY, error: message }
  }
}
