import Anthropic from '@anthropic-ai/sdk'
import type { PerplexityResult } from './perplexity'

const MODEL = 'claude-haiku-4-5-20251001'

// Haiku pricing: $0.80/1M input, $4/1M output
const COST_PER_M_INPUT  = 0.80
const COST_PER_M_OUTPUT = 4.00

export interface ScoredNews {
  importance_score:       number
  portfolio_impact_score: number
  urgency_score:          number
  confidence_score:       number
  thesis_impact:  'supporting' | 'weakening' | 'breaking' | 'neutral'
  action_type:    'no_action'  | 'monitor'   | 'review'   | 'urgent'
  hebrew_title:   string
  hebrew_summary: string
  routing: 'immediate' | 'daily' | 'weekly' | 'ignore'
  error?:  string
  usage?: { inputTokens: number; outputTokens: number; estimatedCostUsd: number }
}

// ─── Deterministic routing from scores ───────────────────────────────────────

function computeRouting(
  portfolio_impact: number,
  thesis_impact: string,
  urgency: number,
  importance: number
): ScoredNews['routing'] {
  if (
    portfolio_impact >= 8 ||
    thesis_impact === 'breaking' ||
    (urgency >= 8 && importance >= 7)
  ) return 'immediate'

  if (
    portfolio_impact >= 6 ||
    thesis_impact === 'weakening' ||
    importance >= 8
  ) return 'daily'

  if (Math.max(portfolio_impact, urgency, importance) >= 3) return 'weekly'

  return 'ignore'
}

// ─── Tool schema ──────────────────────────────────────────────────────────────

const SCORE_TOOL: Anthropic.Messages.Tool = {
  name: 'score_and_translate',
  description: 'Score a news summary for a stock investor and translate to Hebrew.',
  input_schema: {
    type: 'object',
    properties: {
      importance_score: {
        type: 'integer',
        description: 'Global significance of this event to any investor (1 = trivial background noise, 10 = market-moving).',
      },
      portfolio_impact_score: {
        type: 'integer',
        description: 'Direct impact on this holding\'s price or thesis today (1 = irrelevant, 10 = immediate price driver). Calibrate: earnings/guidance/M&A 7–9 | analyst action 5–7 | macro context 3–5 | background 1–3.',
      },
      urgency_score: {
        type: 'integer',
        description: 'Time sensitivity — how quickly must an investor act (1 = no rush, 10 = act today before market open).',
      },
      confidence_score: {
        type: 'integer',
        description: 'Your confidence in this scoring given source quality and information completeness (1 = very uncertain, 10 = very confident).',
      },
      thesis_impact: {
        type: 'string',
        enum: ['supporting', 'weakening', 'breaking', 'neutral'],
        description: '"breaking" = directly threatens or triggers an exit condition. "weakening" = raises meaningful concerns. "supporting" = confirms the bull case. "neutral" = no clear thesis relevance.',
      },
      action_type: {
        type: 'string',
        enum: ['no_action', 'monitor', 'review', 'urgent'],
        description: 'Recommended investor response: "urgent" = act immediately, "review" = evaluate position today, "monitor" = watch next few days, "no_action" = informational only.',
      },
      hebrew_title: {
        type: 'string',
        description: 'Punchy Hebrew news headline written for an Israeli stock investor. Max 80 characters. Should answer: what happened?',
      },
      hebrew_summary: {
        type: 'string',
        description: 'Concise Hebrew investor summary answering: what happened and why does it matter to a shareholder? Max 300 characters. Write naturally, not as a literal translation.',
      },
    },
    required: [
      'importance_score', 'portfolio_impact_score', 'urgency_score', 'confidence_score',
      'thesis_impact', 'action_type', 'hebrew_title', 'hebrew_summary',
    ],
  },
}

// ─── Client singleton ─────────────────────────────────────────────────────────

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scoreNews(
  ticker: string,
  companyName: string,
  result: PerplexityResult
): Promise<ScoredNews> {
  const empty: ScoredNews = {
    importance_score: 1, portfolio_impact_score: 1, urgency_score: 1, confidence_score: 0,
    thesis_impact: 'neutral', action_type: 'no_action',
    hebrew_title: '', hebrew_summary: '', routing: 'ignore',
  }

  if (result.error || !result.summary) {
    return { ...empty, error: result.error ?? 'empty Perplexity result' }
  }

  const sourcesStr = result.sources.length > 0
    ? result.sources.slice(0, 5).map((s, i) => `  [${i + 1}] ${s}`).join('\n')
    : '  (none)'

  const prompt = `You are a CIO scoring news for a stock portfolio and translating it to Hebrew.

TICKER: ${ticker}
COMPANY: ${companyName}

NEWS SUMMARY:
${result.summary}

CITED SOURCES:
${sourcesStr}

Score this news for a stock investor and translate it to Hebrew. Be precise — do not over-inflate scores for routine market context.`

  try {
    const msg = await getClient().messages.create({
      model: MODEL,
      max_tokens: 600,
      tools: [SCORE_TOOL],
      tool_choice: { type: 'tool', name: 'score_and_translate' },
      messages: [{ role: 'user', content: prompt }],
    })

    const block = msg.content.find(b => b.type === 'tool_use')
    if (!block || block.type !== 'tool_use') throw new Error('no tool_use block in response')

    type ToolInput = {
      importance_score: number; portfolio_impact_score: number
      urgency_score: number; confidence_score: number
      thesis_impact: string; action_type: string
      hebrew_title: string; hebrew_summary: string
    }
    const inp = block.input as ToolInput

    const clamp = (n: number) => Math.min(10, Math.max(1, Math.round(n)))

    const importance      = clamp(inp.importance_score)
    const portfolioImpact = clamp(inp.portfolio_impact_score)
    const urgency         = clamp(inp.urgency_score)
    const confidence      = clamp(inp.confidence_score)

    const THESIS_VALUES = ['supporting', 'weakening', 'breaking', 'neutral'] as const
    const ACTION_VALUES = ['no_action', 'monitor', 'review', 'urgent'] as const

    const thesisImpact = THESIS_VALUES.includes(inp.thesis_impact as never)
      ? inp.thesis_impact as ScoredNews['thesis_impact'] : 'neutral'
    const actionType = ACTION_VALUES.includes(inp.action_type as never)
      ? inp.action_type as ScoredNews['action_type'] : 'monitor'

    const inputTokens      = msg.usage.input_tokens
    const outputTokens     = msg.usage.output_tokens
    const estimatedCostUsd =
      (inputTokens  / 1_000_000) * COST_PER_M_INPUT +
      (outputTokens / 1_000_000) * COST_PER_M_OUTPUT

    const routing = computeRouting(portfolioImpact, thesisImpact, urgency, importance)

    console.log(
      `[scorer] ${ticker} — imp:${importance} port:${portfolioImpact} urg:${urgency} ` +
      `conf:${confidence} thesis:${thesisImpact} action:${actionType} ` +
      `routing:${routing} in:${inputTokens} out:${outputTokens} est:$${estimatedCostUsd.toFixed(5)}`
    )

    return {
      importance_score:       importance,
      portfolio_impact_score: portfolioImpact,
      urgency_score:          urgency,
      confidence_score:       confidence,
      thesis_impact:          thesisImpact,
      action_type:            actionType,
      hebrew_title:           inp.hebrew_title.slice(0, 80),
      hebrew_summary:         inp.hebrew_summary.slice(0, 300),
      routing,
      usage: { inputTokens, outputTokens, estimatedCostUsd },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[scorer] failed for ${ticker}:`, message)
    return { ...empty, error: message }
  }
}
