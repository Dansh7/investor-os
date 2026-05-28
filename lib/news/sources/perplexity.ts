import type { RawArticle } from '../types'

export async function discoverPerplexityNews(
  ticker: string,
  companyName: string
): Promise<RawArticle[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    console.warn(`  [PERPLEXITY] No API key — skipping ${ticker}`)
    return []
  }

  const prompt =
    `What are the most significant news events in the last 7 days for ${companyName} (${ticker})? ` +
    `Focus on: earnings, guidance changes, product launches, regulatory actions, M&A, executive changes. ` +
    `Be concise and factual. List each news item separately.`

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        search_recency_filter: 'week',
        max_tokens: 512,
      }),
    })

    if (!res.ok) {
      console.warn(`  [PERPLEXITY] API error for ${ticker}: ${res.status} ${res.statusText}`)
      return []
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) return []

    return [{
      ticker,
      headline: `${companyName} — Recent News Discovery`,
      summary: content,
      source: 'Perplexity AI',
      source_tier: 3,
      published_at: new Date(),
      raw_content: content,
    }]
  } catch (err) {
    console.warn(`  [PERPLEXITY] ${ticker}: ${(err as Error).message}`)
    return []
  }
}
