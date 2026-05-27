import { NextRequest, NextResponse } from 'next/server'
import { default as YahooFinance } from 'yahoo-finance2'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('tickers')
  if (!param) return NextResponse.json([])

  const symbols = param.split(',').map(s => s.trim()).filter(Boolean)

  const results = await Promise.all(
    symbols.map(async (ticker) => {
      try {
        const q = await yf.quote(ticker, {
          fields: ['regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent'],
        })
        return {
          ticker,
          current_price: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          change_percent: q.regularMarketChangePercent ?? null,
        }
      } catch {
        return { ticker, current_price: null, change: null, change_percent: null }
      }
    })
  )

  return NextResponse.json(results)
}
