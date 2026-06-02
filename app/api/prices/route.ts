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
  'fiftyTwoWeekHigh',
] as const

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('tickers')
  if (!param) return NextResponse.json([])

  const symbols = param.split(',').map(s => s.trim()).filter(Boolean)
  const year = new Date().getFullYear()

  // YTD baseline: last trading close of previous year (fetch Dec 20 – Jan 5 window)
  const ytdPeriod1 = `${year - 1}-12-20`
  const ytdPeriod2 = `${year}-01-06`

  const results = await Promise.all(
    symbols.map(async (ticker) => {
      // Currency pairs / indices don't need YTD in the portfolio table
      const skipYtd = ticker.startsWith('^') || ticker.endsWith('=X')

      try {
        const [q, ytdHist] = await Promise.all([
          yf.quote(ticker, { fields: [...QUOTE_FIELDS] }),
          skipYtd
            ? Promise.resolve([])
            : yf.historical(ticker, { period1: ytdPeriod1, period2: ytdPeriod2, interval: '1d' }).catch(() => []),
        ])

        const curPrice = q.regularMarketPrice ?? null

        // Last closing price of the previous calendar year
        const prevYearClose = ([...ytdHist] as { date: Date | string; close: number }[])
          .filter(d => new Date(d.date).getFullYear() < year)
          .pop()?.close ?? null

        const ytdPct = prevYearClose != null && curPrice != null
          ? ((curPrice - prevYearClose) / prevYearClose) * 100
          : null

        return {
          ticker,
          current_price:       curPrice,
          change:              q.regularMarketChange ?? null,
          change_percent:      q.regularMarketChangePercent ?? null,
          pre_change_percent:  q.preMarketChangePercent ?? null,
          pre_change:          q.preMarketChange ?? null,
          post_change_percent: q.postMarketChangePercent ?? null,
          post_change:         q.postMarketChange ?? null,
          market_state:        q.marketState ?? null,
          has_extended:        q.hasPrePostMarketData ?? false,
          fifty_two_week_high: q.fiftyTwoWeekHigh ?? null,
          ytd_pct:             ytdPct,
        }
      } catch {
        return {
          ticker,
          current_price: null, change: null, change_percent: null,
          pre_change_percent: null, pre_change: null,
          post_change_percent: null, post_change: null,
          market_state: null, has_extended: false, fifty_two_week_high: null,
          ytd_pct: null,
        }
      }
    })
  )

  return NextResponse.json(results)
}
