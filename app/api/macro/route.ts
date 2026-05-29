import { NextResponse } from 'next/server'

const CNN_URL = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata/'

export async function GET() {
  try {
    const res = await fetch(CNN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Referer': 'https://edition.cnn.com/markets/fear-and-greed',
        'Origin': 'https://edition.cnn.com',
      },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(`CNN ${res.status}`)
    const json = await res.json()
    const fg = json?.fear_and_greed
    if (fg?.score == null) throw new Error('no score')
    return NextResponse.json({
      fearGreed: {
        value: Math.round(fg.score * 10) / 10,
        rating: fg.rating,
        timestamp: fg.timestamp ?? null,
        previousClose: fg.previous_close ?? null,
      },
      source: 'CNN',
    })
  } catch {
    return NextResponse.json({ fearGreed: null, source: null })
  }
}
