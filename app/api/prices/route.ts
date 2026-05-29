import { NextRequest, NextResponse } from 'next/server'
import { default as YahooFinance } from 'yahoo-finance2'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const QUOTE_FIELDS = [
  'regularMarketPrice',
  'regularMarketChange',
  'regularMarketChangePercent',
  'preMarketPrice',
  'preMarketChange',
  'preMarketChangePercent',
  'postMarketPrice',
  'postMarketChange',
  'postMarketChangePercent',
  'marketState',
  'hasPrePostMarketData',
] as const

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('tickers')
  if (!param) return NextResponse.json([])

  const symbols = param.split(',').map(s => s.trim()).filter(Boolean)

  const results = await Promise.all(
    symbols.map(async (ticker) => {
      try {
        const q = await yf.quote(ticker, { fields: [...QUOTE_FIELDS] })
        return {
          ticker,
          current_price:       q.regularMarketPrice ?? null,
          change:              q.regularMarketChange ?? null,
          change_percent:      q.regularMarketChangePercent ?? null,
          pre_change_percent:  q.preMarketChangePercent ?? null,
          pre_change:          q.preMarketChange ?? null,
          post_change_percent: q.postMarketChangePercent ?? null,
          post_change:         q.postMarketChange ?? null,
          market_state:        q.marketState ?? null,
          has_extended:        q.hasPrePostMarketData ?? false,
        }
      } catch {
        return {
          ticker,
          current_price: null, change: null, change_percent: null,
          pre_change_percent: null, pre_change: null,
          post_change_percent: null, post_change: null,
          market_state: null, has_extended: false,
        }
      }
    })
  )

  return NextResponse.json(results)
}
