import { type NextRequest } from 'next/server'
import { supabase, type SwapRecordRow } from '@/lib/supabase'
import type { SwapRecord } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const address = searchParams.get('address')

  if (!address) {
    return Response.json({ error: 'Address required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('swap_records')
    .select('*')
    .eq('user_address', address.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return Response.json({ history: [] })
  }

  const history: SwapRecord[] = (data as SwapRecordRow[]).map((row) => ({
    id: row.id,
    userAddress: row.user_address,
    tokenIn: row.token_in,
    tokenOut: row.token_out,
    amountIn: row.amount_in,
    amountOut: row.amount_out,
    dex: row.dex as SwapRecord['dex'],
    txHash: row.tx_hash,
    timestamp: row.created_at,
    volumeUSD: Number(row.volume_usd),
    scoreEarned: row.score_earned,
  }))

  return Response.json({ history })
}
