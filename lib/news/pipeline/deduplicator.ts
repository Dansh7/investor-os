import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RawArticle, ScoreResult } from '../types'

export function hashHeadline(headline: string): string {
  const normalized = headline
    .toLowerCase()
    .replace(/\[sec [0-9a-z-]+\]\s*/i, '')   // strip filing-type prefix
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 24)
}

export interface DeduplicationResult {
  article: RawArticle
  score: ScoreResult
  clusterId: string
  isNew: boolean
}

export async function deduplicateAndCluster(
  scored: Array<{ article: RawArticle; score: ScoreResult }>,
  supabase: SupabaseClient
): Promise<DeduplicationResult[]> {
  const results: DeduplicationResult[] = []

  for (const { article, score } of scored) {
    const hash = hashHeadline(article.headline)

    const { data: existing } = await supabase
      .from('news_clusters')
      .select('id, article_count')
      .eq('headline_hash', hash)
      .limit(1)
      .maybeSingle()

    if (existing) {
      // Known cluster — increment count only
      await supabase
        .from('news_clusters')
        .update({
          article_count: existing.article_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      results.push({ article, score, clusterId: existing.id, isNew: false })
    } else {
      // New cluster — placeholder id resolved after news_item insert
      results.push({ article, score, clusterId: hash, isNew: true })
    }
  }

  return results
}
