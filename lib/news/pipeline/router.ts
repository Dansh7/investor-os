import type { SupabaseClient } from '@supabase/supabase-js'
import type { RawArticle, ScoreResult, ActionType } from '../types'
import type { DeduplicationResult } from './deduplicator'

/**
 * ROUTING LOGIC — precedence order:
 *
 * IMMEDIATE:
 *   - thesis_impact = 'breaking'                           (always)
 *   - portfolio_impact_score >= 8                          (high direct portfolio relevance)
 *   - urgency_score >= 8 AND importance_score >= 7         (time-critical AND globally significant)
 *
 * DAILY:
 *   - thesis_impact = 'weakening'                          (thesis erosion — needs attention soon)
 *   - portfolio_impact_score >= 6                          (meaningful portfolio relevance)
 *   - urgency_score >= 6 AND importance_score >= 5         (somewhat urgent AND meaningful)
 *   - importance_score >= 8 (alone)                        (globally major but low direct impact)
 *
 * WEEKLY:
 *   - MAX(importance, impact, urgency) >= 3                (low signal, worth noting)
 *
 * DISCARD:
 *   - everything else
 *
 * RECENCY FILTER (applied after score-based routing):
 *   - Immediate: max 72h — older → demote to Daily or Weekly
 *   - Daily:     max 7d  — older → demote to Weekly
 *   - Weekly:    max 90d — older → demote to Historical
 *   - Historical: stored for memory only — no alerts, excluded from briefings
 *
 * CRITICAL CONFIRMATION (priority=9 requires ALL):
 *   - portfolio_impact_score >= 8 AND urgency_score >= 8
 *   - effectiveAction is not 'historical'
 *   - AND one hard qualifier: thesis=breaking | Tier1+material filing |
 *     qualifying tags+imp>=7 | negative sentiment+imp>=8
 *
 * ROUTINE MATERIALITY GUARDRAIL:
 *   - Routine filings (shareholder votes, amendments, generic exhibits)
 *     cannot create alerts unless scorer tagged them with material content
 *     (dilution, guidance, regulatory, m&a, management, debt) or thesis impact != none
 */
export function computeActionType(score: ScoreResult): ActionType {
  const { importance_score: imp, portfolio_impact_score: impact, urgency_score: urgency, thesis_impact } = score

  // — IMMEDIATE ——————————————————————————————————————————————————————————————
  if (thesis_impact === 'breaking') return 'immediate'
  if (impact >= 8) return 'immediate'
  if (urgency >= 8 && imp >= 7) return 'immediate'

  // — DAILY ——————————————————————————————————————————————————————————————————
  if (thesis_impact === 'weakening') return 'daily'
  if (impact >= 6) return 'daily'
  if (urgency >= 6 && imp >= 5) return 'daily'
  if (imp >= 8) return 'daily'

  // — WEEKLY ————————————————————————————————————————————————————————————————
  if (Math.max(imp, impact, urgency) >= 3) return 'weekly'

  // — DISCARD ————————————————————————————————————————————————————————————————
  return 'discard'
}

function applyRecencyFilter(action: ActionType, publishedAt: Date | undefined): ActionType {
  if (!publishedAt || action === 'discard') return action

  const ageDays = (Date.now() - publishedAt.getTime()) / 86_400_000

  if (ageDays > 90) return 'historical'
  if (ageDays > 7 && (action === 'immediate' || action === 'daily')) return 'weekly'
  if (ageDays > 3 && action === 'immediate') return 'daily'

  return action
}

const CRITICAL_QUALIFYING_TAGS = new Set(['regulatory', 'm&a', 'dilution', 'debt'])
const ROUTINE_ALERT_TRIGGER_TAGS = new Set(['dilution', 'guidance', 'regulatory', 'm&a', 'management', 'debt'])

function qualifiesAsCritical(score: ScoreResult, article: RawArticle, effectiveAction: ActionType): boolean {
  if (score.portfolio_impact_score < 8 || score.urgency_score < 8) return false
  if (effectiveAction === 'historical') return false

  return (
    score.thesis_impact === 'breaking' ||
    (article.source_tier === 1 && article.filing_materiality === 'material') ||
    (score.tags.some(t => CRITICAL_QUALIFYING_TAGS.has(t)) && score.importance_score >= 7) ||
    (score.sentiment === 'negative' && score.importance_score >= 8)
  )
}

export function isVerified(sourceTier: number): boolean {
  return sourceTier === 1
}

export interface RouterResult {
  stored: number
  alerts: number
  duplicates: number
  historical: number
  routing: Record<ActionType, number>
  examples: Array<{
    ticker: string
    headline: string
    source: string
    is_verified: boolean
    importance_score: number
    portfolio_impact_score: number
    urgency_score: number
    confidence_score: number
    sentiment: string
    thesis_impact: string
    action_type: ActionType
    effective_action_type: ActionType
    summary: string
    tags: string[]
    scoring_reason: string
  }>
}

export async function routeArticles(
  items: DeduplicationResult[],
  portfolioId: number,
  supabase: SupabaseClient
): Promise<RouterResult> {
  let stored = 0
  let alerts = 0
  let historical = 0
  const duplicates = items.filter(i => !i.isNew).length
  const routing: Record<ActionType, number> = { immediate: 0, daily: 0, weekly: 0, discard: 0, historical: 0 }
  const examples: RouterResult['examples'] = []

  for (const item of items) {
    const { article, score } = item
    const action = computeActionType(score)
    const effectiveAction = applyRecencyFilter(action, article.published_at)
    const verified = isVerified(article.source_tier)

    routing[effectiveAction]++

    if (examples.length < 10) {
      examples.push({
        ticker: article.ticker,
        headline: article.headline,
        source: article.source,
        is_verified: verified,
        importance_score: score.importance_score,
        portfolio_impact_score: score.portfolio_impact_score,
        urgency_score: score.urgency_score,
        confidence_score: score.confidence_score,
        sentiment: score.sentiment,
        thesis_impact: score.thesis_impact,
        action_type: effectiveAction,
        effective_action_type: effectiveAction,
        summary: score.summary,
        tags: score.tags,
        scoring_reason: score.scoring_reason,
      })
    }

    if (!item.isNew) continue
    if (effectiveAction === 'discard') continue

    // 1. Insert news_item — historical items stored for memory but flagged
    const { data: newsItem, error: newsErr } = await supabase
      .from('news_items')
      .insert({
        ticker: article.ticker,
        headline: article.headline,
        summary: score.summary || article.summary,
        source: article.source,
        source_url: article.source_url,
        source_tier: article.source_tier,
        published_at: article.published_at?.toISOString(),
        importance_score: score.importance_score,
        portfolio_impact_score: score.portfolio_impact_score,
        sentiment: score.sentiment,
        tags: score.tags,
        raw_content: article.raw_content?.slice(0, 4000),
        processed: true,
        urgency_score: score.urgency_score,
        scoring_reason: score.scoring_reason,
        confidence_score: score.confidence_score,
        action_type: effectiveAction,
        is_verified: verified,
        thesis_impact: score.thesis_impact,
      })
      .select('id')
      .single()

    if (newsErr || !newsItem) {
      console.warn(`  [ROUTER] news_items insert failed: ${newsErr?.message}`)
      continue
    }

    stored++
    if (effectiveAction === 'historical') historical++

    // 2. Create cluster
    const { data: cluster } = await supabase
      .from('news_clusters')
      .insert({
        headline_hash: item.clusterId,
        canonical_event_id: newsItem.id,
        topic: score.tags[0] ?? 'general',
        tickers: [article.ticker],
        article_count: 1,
      })
      .select('id')
      .single()

    if (cluster) {
      await supabase.from('news_items').update({ cluster_id: cluster.id }).eq('id', newsItem.id)
    }

    // 3. Alerts — historical items never alert
    if (effectiveAction === 'historical') continue

    // Tighter threshold: decoupled from routing
    const shouldAlert =
      effectiveAction === 'immediate' ||
      score.portfolio_impact_score >= 8 ||
      score.thesis_impact === 'breaking' ||
      (score.thesis_impact === 'weakening' && score.portfolio_impact_score >= 7) ||
      (score.urgency_score >= 8 && score.portfolio_impact_score >= 7)

    if (!shouldAlert) continue

    // Routine materiality guardrail — defence-in-depth
    if (article.filing_materiality === 'routine') {
      const hasAlertTrigger =
        score.tags.some(t => ROUTINE_ALERT_TRIGGER_TAGS.has(t)) ||
        score.thesis_impact !== 'none'
      if (!hasAlertTrigger) continue
    }

    // Critical confirmation rule — priority=9 requires multi-factor verification
    const critical = qualifiesAsCritical(score, article, effectiveAction)
    const priority = critical ? 9
      : score.portfolio_impact_score >= 8 ? 8
      : 6

    const alertType = score.thesis_impact === 'breaking'
      ? 'thesis_break'
      : score.thesis_impact === 'weakening'
      ? 'thesis_risk'
      : 'news_spike'

    // 24h deduplication — skip if same ticker + alert_type already active within 24h at same or higher priority
    const cutoff24h = new Date(Date.now() - 24 * 3_600_000).toISOString()
    const { data: existing } = await supabase
      .from('alerts')
      .select('id, priority')
      .eq('ticker', article.ticker)
      .eq('alert_type', alertType)
      .eq('alert_status', 'active')
      .gte('triggered_at', cutoff24h)
      .limit(1)
      .maybeSingle()

    if (existing && existing.priority >= priority) {
      // Suppress: duplicate within 24h, severity not increasing
    } else {
      const { error: alertErr } = await supabase.from('alerts').insert({
        portfolio_id: portfolioId,
        ticker: article.ticker,
        alert_type: alertType,
        title: article.headline.slice(0, 200),
        body: score.summary,
        message: score.summary,
        alert_status: 'active',
        priority,
        source_news_id: newsItem.id,
        triggered_at: new Date().toISOString(),
        metadata: {
          importance_score: score.importance_score,
          portfolio_impact_score: score.portfolio_impact_score,
          urgency_score: score.urgency_score,
          confidence_score: score.confidence_score,
          sentiment: score.sentiment,
          thesis_impact: score.thesis_impact,
          action_type: effectiveAction,
          source_tier: article.source_tier,
          is_verified: verified,
          filing_materiality: article.filing_materiality,
          is_critical_confirmed: critical,
        },
      })

      if (!alertErr) alerts++
      else console.warn(`  [ROUTER] Alert insert failed: ${alertErr.message}`)
    }
  }

  return { stored, alerts, duplicates, historical, routing, examples }
}
