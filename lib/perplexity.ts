const PERPLEXITY_BASE = 'https://api.perplexity.ai'
const MODEL = 'sonar'

// sonar pricing (as of 2025): $1/1M input tokens, $1/1M output tokens, +$5/1000 searches
const COST_PER_M_INPUT  = 1.0
const COST_PER_M_OUTPUT = 1.0
const COST_PER_SEARCH   = 0.005

export interface PerplexityResult {
  summary: string
  sources: string[]
  raw: string
  error?: string
  usage?: { promptTokens: number; completionTokens: number; estimatedCostUsd: number }
}

export async function searchNews(
  ticker: string,
  companyName: string
): Promise<PerplexityResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    return { summary: '', sources: [], raw: '', error: 'PERPLEXITY_API_KEY not set' }
  }

  const today = new Date().toISOString().split('T')[0]
  const query =
    `What happened with ${ticker} (${companyName}) in the last 24 hours? Date today is ${today}. ` +
    `Focus ONLY on: price movements today, breaking news today, analyst actions today, macro events affecting this stock today. ` +
    `If nothing happened today specifically, say 'no material news today'. ` +
    `Do NOT summarize old earnings reports or historical context. ` +
    `Cite sources with dates.`

  let res: Response
  try {
    res = await fetch(`${PERPLEXITY_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: query }],
        return_citations: true,
        return_images: false,
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[perplexity] network error for ${ticker}:`, msg)
    return { summary: '', sources: [], raw: '', error: msg }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    console.error(`[perplexity] HTTP ${res.status} for ${ticker}:`, text)
    return { summary: '', sources: [], raw: text, error: `HTTP ${res.status}` }
  }

  let json: {
    choices: { message: { content: string } }[]
    citations?: string[]
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  try {
    json = await res.json()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'JSON parse error'
    return { summary: '', sources: [], raw: '', error: msg }
  }

  const summary = json.choices?.[0]?.message?.content ?? ''
  const sources = json.citations ?? []
  const promptTokens    = json.usage?.prompt_tokens    ?? 0
  const completionTokens = json.usage?.completion_tokens ?? 0
  const estimatedCostUsd =
    (promptTokens    / 1_000_000) * COST_PER_M_INPUT  +
    (completionTokens / 1_000_000) * COST_PER_M_OUTPUT +
    COST_PER_SEARCH

  console.log(
    `[perplexity] ${ticker} — in:${promptTokens} out:${completionTokens} ` +
    `sources:${sources.length} est:$${estimatedCostUsd.toFixed(5)}`
  )

  return {
    summary,
    sources,
    raw: JSON.stringify(json, null, 2),
    usage: { promptTokens, completionTokens, estimatedCostUsd },
  }
}

export async function fetchEarnings(
  ticker: string,
  companyName: string
): Promise<PerplexityResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    return { summary: '', sources: [], raw: '', error: 'PERPLEXITY_API_KEY not set' }
  }

  const query =
    `${companyName} (${ticker}) most recent quarterly earnings results. ` +
    `Find: ` +
    `- Exact report date ` +
    `- Revenue: actual amount and Wall Street consensus estimate ` +
    `- EPS: actual and consensus estimate ` +
    `- Gross margin ` +
    `- Stock price reaction on earnings day (%) ` +
    `- One sentence guidance for next quarter ` +
    `- 3 key points from the investor call ` +
    `Sources required: cite at least 3 URLs from SEC EDGAR, CNBC, Reuters, MarketWatch, or Yahoo Finance.`

  let res: Response
  try {
    res = await fetch(`${PERPLEXITY_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: query }],
        return_citations: true,
        return_images: false,
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { summary: '', sources: [], raw: '', error: msg }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    return { summary: '', sources: [], raw: text, error: `HTTP ${res.status}` }
  }

  let json: {
    choices: { message: { content: string } }[]
    citations?: string[]
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  try {
    json = await res.json()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'JSON parse error'
    return { summary: '', sources: [], raw: '', error: msg }
  }

  const summary  = json.choices?.[0]?.message?.content ?? ''
  // Prefer the dedicated citations field; fall back to URLs extracted from the text
  const citationsField: string[] = json.citations ?? []
  const urlsInText = citationsField.length === 0
    ? [...new Set((summary.match(/https?:\/\/[^\s\)\]]+/g) ?? []))]
    : []
  const sources  = citationsField.length > 0 ? citationsField : urlsInText
  const promptTokens     = json.usage?.prompt_tokens     ?? 0
  const completionTokens = json.usage?.completion_tokens ?? 0
  const estimatedCostUsd =
    (promptTokens     / 1_000_000) * COST_PER_M_INPUT  +
    (completionTokens / 1_000_000) * COST_PER_M_OUTPUT +
    COST_PER_SEARCH

  console.log(
    `[perplexity/earnings] ${ticker} — in:${promptTokens} out:${completionTokens} ` +
    `citations:${citationsField.length} url_fallback:${urlsInText.length} est:$${estimatedCostUsd.toFixed(5)}`
  )

  return {
    summary,
    sources,
    raw: JSON.stringify(json, null, 2),
    usage: { promptTokens, completionTokens, estimatedCostUsd },
  }
}
