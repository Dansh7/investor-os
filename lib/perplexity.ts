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

  const query =
    `What happened today with ${ticker} (${companyName}) that matters to a stock investor? ` +
    `Include earnings, news, analyst actions, executive statements, macro impact. Cite sources.`

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
    `For ${ticker} (${companyName}) most recent earnings report: ` +
    `Find revenue actual vs analyst consensus estimate, EPS actual vs analyst consensus estimate. ` +
    `IMPORTANT: Cross-reference minimum 3 separate sources (e.g. SEC filing + CNBC/Bloomberg + Seeking Alpha/MarketWatch). ` +
    `If fewer than 3 sources found, explicitly state that. ` +
    `Also include: gross margin, stock reaction on earnings day %, guidance next quarter. ` +
    `Cite all sources with URLs.`

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

  const summary = json.choices?.[0]?.message?.content ?? ''
  const sources = json.citations ?? []
  const promptTokens     = json.usage?.prompt_tokens     ?? 0
  const completionTokens = json.usage?.completion_tokens ?? 0
  const estimatedCostUsd =
    (promptTokens     / 1_000_000) * COST_PER_M_INPUT  +
    (completionTokens / 1_000_000) * COST_PER_M_OUTPUT +
    COST_PER_SEARCH

  console.log(
    `[perplexity/earnings] ${ticker} — in:${promptTokens} out:${completionTokens} ` +
    `sources:${sources.length} est:$${estimatedCostUsd.toFixed(5)}`
  )

  return {
    summary,
    sources,
    raw: JSON.stringify(json, null, 2),
    usage: { promptTokens, completionTokens, estimatedCostUsd },
  }
}
