export interface Holding {
  id: string
  ticker: string
  company_name: string
  shares: number
  avg_buy_price: number
  portfolio_id: number
  thesis?: string | null
  thesis_status?: string | null
  thesis_break_conditions?: string[] | null
  conviction_score?: number | null
}

export interface RawArticle {
  ticker: string
  headline: string
  summary?: string
  source: string
  source_url?: string
  source_tier: 1 | 2 | 3
  published_at?: Date
  raw_content?: string
  filing_materiality?: 'material' | 'notable' | 'routine'
}

export interface ScoreResult {
  importance_score: number
  portfolio_impact_score: number
  urgency_score: number
  confidence_score: number
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  tags: string[]
  summary: string
  thesis_impact: 'none' | 'supporting' | 'weakening' | 'breaking'
  scoring_reason: string
}

export type ActionType = 'immediate' | 'daily' | 'weekly' | 'discard' | 'historical'

export interface RoutedArticle {
  article: RawArticle
  score: ScoreResult
  is_verified: boolean
  action_type: ActionType
}

export interface ScoredArticle extends RawArticle {
  score: ScoreResult
}

export interface PipelineResult {
  articles_fetched: number
  articles_scored: number
  articles_stored: number
  alerts_created: number
  events_synced: number
  skipped_duplicates: number
  routing_summary: Record<ActionType, number>
}
