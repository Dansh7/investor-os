import { NextRequest, NextResponse } from 'next/server'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function POST(req: NextRequest) {
  const { text, chat_id } = await req.json()

  const chatId = chat_id ?? process.env.TELEGRAM_CHAT_ID

  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    return NextResponse.json({ error: 'Missing Telegram config' }, { status: 500 })
  }

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })

  const data = await res.json()

  if (!data.ok) {
    return NextResponse.json({ error: data.description }, { status: 400 })
  }

  return NextResponse.json({ ok: true, message_id: data.result.message_id })
}
