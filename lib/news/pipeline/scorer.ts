import Anthropic from '@anthropic-ai/sdk'
import type { RawArticle, ScoreResult, Holding } from '../types'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

const SOURCE_TIER_LABEL: Record<number, string> = {
  1: 'SEC/Regulatory — company-filed, highest trust, verified',
  2: 'Tier-2 financial media — established outlet, unverified',
  3: 'Discovery/context only — lower trust, do not treat as verified',
}

export async function scoreArticle(
  article: RawArticle,
  holding: Holding
): Promise<ScoreResult> {
  const breakConditions = (holding.thesis_break_conditions ?? []).length > 0
    ? holding.thesis_break_conditions!.map((c, i) => `  ${i + 1}. ${c}`).join('\n')
    : '  (none recorded)'

  const materialityCtx = article.filing_materiality
    ? `Filing Materiality: ${article.filing_materiality.toUpperCase()} — ${
        article.filing_materiality === 'material'
          ? 'May be significant: earnings, M&A, major contract, auditor change, delisting risk, or restatement. Score carefully.'
          : article.filing_materiality === 'notable'
          ? 'Worth attention: director change, new debt, dilution, restructuring. Score based on actual content.'
          : 'Routine administrative filing: shareholder votes, articles amendments, generic exhibits. portfolio_impact_score must be ≤ 4 UNLESS the headline explicitly mentions: dilution, guidance change, legal/regulatory action, M&A, or direct thesis break condition.'
      }`
    : ''

  const prompt = `You are a CIO scoring a news article for a private investment portfolio. Return ONLY valid JSON, no markdown, no explanation.

ARTICLE
Headline: ${article.headline}
Summary: ${article.summary?.slice(0, 800) ?? '(none)'}
Source: ${article.source} — ${SOURCE_TIER_LABEL[article.source_tier] ?? 'unknown'}
Ticker: ${article.ticker}
${materialityCtx ? `\n${materialityCtx}` : ''}
HOLDING CONTEXT
Thesis: ${holding.thesis ?? 'Not recorded — score conservatively'}
Thesis status: ${holding.thesis_status ?? 'unknown'}
Conviction score: ${holding.conviction_score ?? 'N/A'}/10
Break conditions (exit thesis if any are triggered):
${breakConditions}

FIELD DEFINITIONS
importance_score (0–10): global significance of this news event regardless of portfolio
portfolio_impact_score (0–10): direct relevance to THIS holding — must account for thesis, conviction score, and whether this touches any break conditions
  Calibration: routine SEC admin filings ≤ 4 | notable events 4–7 | earnings/guidance/M&A/legal 6–9 | thesis break condition 8–10
urgency_score (0–10): time sensitivity — how quickly does this need attention?
  Calibration: CEO arrest/fraud = 10 | earnings miss/beat = 7 | director departure = 4 | routine quarterly filing = 2 | shareholder vote = 1
confidence_score (0–10): your confidence in the accuracy of this scoring given available info
sentiment: positive | negative | neutral | mixed — from THIS portfolio holder's perspective
tags: 1–5 tags from: earnings, guidance, regulatory, m&a, product, macro, management, debt, dilution, dividend, technical, filing
summary: 1–2 sentence factual plain-English summary
thesis_impact: none | supporting | weakening | breaking — does this event affect our investment thesis?
  breaking = triggers or directly threatens a stated break condition
  weakening = raises concerns without definitively breaking thesis
  supporting = confirms or strengthens thesis
  none = no clear thesis relevance
scoring_reason: 1–2 sentence internal audit note — WHY were these specific scores assigned? Reference materiality, thesis relevance, break conditions if applicable. For QA only.

Return this exact JSON (all 10 fields):
{"importance_score":0,"portfolio_impact_score":0,"urgency_score":0,"confidence_score":0,"sentiment":"neutral","tags":[],"summary":"","thesis_impact":"none","scoring_reason":""}`

  try {
    const client = getClient()
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const result = JSON.parse(text) as ScoreResult

    result.importance_score = clamp(result.importance_score)
    result.portfolio_impact_score = clamp(result.portfolio_impact_score)
    result.urgency_score = clamp(result.urgency_score)
    result.confidence_score = clamp(result.confidence_score)

    return result
  } catch (err) {
    console.warn(`  [SCORER] Failed for "${article.headline.slice(0, 60)}": ${(err as Error).message}`)
    return {
      importance_score: 2,
      portfolio_impact_score: 2,
      urgency_score: 2,
      confidence_score: 0,
      sentiment: 'neutral',
      tags: ['unscored'],
      summary: article.summary?.slice(0, 200) ?? article.headline,
      thesis_impact: 'none',
      scoring_reason: 'Scoring failed — fallback defaults applied.',
    }
  }
}

export async function scoreArticles(
  articles: RawArticle[],
  holdingsByTicker: Map<string, Holding>
): Promise<Array<{ article: RawArticle; score: ScoreResult }>> {
  const results: Array<{ article: RawArticle; score: ScoreResult }> = []

  for (const article of articles) {
    const holding = holdingsByTicker.get(article.ticker)
    if (!holding) continue
    const score = await scoreArticle(article, holding)
    results.push({ article, score })
    await new Promise(r => setTimeout(r, 150))
  }

  return results
}

function clamp(val: number): number {
  return Math.max(0, Math.min(10, Number(val) || 0))
}
