import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json()
  const { shares, avg_buy_price } = body

  if (typeof shares !== 'number' || typeof avg_buy_price !== 'number' ||
      shares <= 0 || avg_buy_price <= 0) {
    return NextResponse.json({ error: 'shares and avg_buy_price must be positive numbers' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('holdings')
    .update({ shares, avg_buy_price })
    .eq('id', id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'Row not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
