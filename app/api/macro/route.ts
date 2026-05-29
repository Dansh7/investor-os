import { NextResponse } from 'next/server'

// Fear & Greed from alternative.me (crypto-based proxy; labelled as such in UI)
export async function GET() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error('upstream error')
    const json = await res.json()
    const item = json?.data?.[0]
    if (!item) throw new Error('no data')
    return NextResponse.json({
      fearGreed: { value: parseInt(item.value), classification: item.value_classification },
      source: 'alternative.me',
      timestamp: item.timestamp,
    })
  } catch {
    return NextResponse.json({ fearGreed: null, source: null, timestamp: null })
  }
}
