import { type NextRequest } from 'next/server'
import { supabase, type UserScoreRow, type SwapRecordRow } from '@/lib/supabase'
import { getTokenByAddress } from '@/lib/tokens'

/**
 * Scoring rules:
 * - Every swap:        +50 pts
 * - Mint Bronze NFT:  +250 pts  (triggered separately via /api/score/mint)
 * - Mint Silver NFT:  +500 pts
 * - Mint Gold NFT:    +750 pts
 * - Mint Diamond NFT: +1000 pts
 */
const SWAP_POINTS = 50

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const address = searchParams.get('address')

  if (!address) {
    return Response.json({ error: 'Address required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_scores')
    .select('*')
    .eq('address', address.toLowerCase())
    .single()

  if (error || !data) {
    return Response.json({
      address,
      score: 0,
      swapCount: 0,
      volumeUSD: 0,
      consecutiveDays: 0,
      lastActivity: new Date().toISOString(),
    })
  }

  const row = data as UserScoreRow
  return Response.json({
    address: row.address,
    score: row.score,
    swapCount: row.swap_count,
    volumeUSD: Number(row.volume_usd),
    consecutiveDays: row.consecutive_days,
    lastActivity: row.last_activity,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      userAddress: string
      tokenIn: string
      tokenOut: string
      tokenInSymbol?: string
      tokenOutSymbol?: string
      amountIn: string
      amountOut: string
      dex: string
      txHash: string
      volumeUSD?: number
    }

    const {
      userAddress,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      dex,
      txHash,
      volumeUSD = 0,
    } = body

    const normalizedAddress = userAddress.toLowerCase()

    const tokenInSymbol =
      body.tokenInSymbol ?? getTokenByAddress(tokenIn)?.symbol ?? tokenIn.slice(0, 6)
    const tokenOutSymbol =
      body.tokenOutSymbol ?? getTokenByAddress(tokenOut)?.symbol ?? tokenOut.slice(0, 6)

    // ── Get or create user score ───────────────────────────────────────────────
    const { data: existing } = await supabase
      .from('user_scores')
      .select('*')
      .eq('address', normalizedAddress)
      .single()

    const current = (existing as UserScoreRow | null) ?? {
      address: normalizedAddress,
      score: 0,
      swap_count: 0,
      volume_usd: 0,
      consecutive_days: 1,
      last_activity: new Date().toISOString(),
    }

    // Flat 50 pts per swap
    const earned = SWAP_POINTS

    const updated: UserScoreRow = {
      address: normalizedAddress,
      score: current.score + earned,
      swap_count: current.swap_count + 1,
      volume_usd: Number(current.volume_usd) + volumeUSD,
      consecutive_days: Math.max(current.consecutive_days, 1),
      last_activity: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('user_scores')
      .upsert(updated, { onConflict: 'address' })

    if (upsertError) {
      console.error('[score POST] upsert error:', upsertError)
      return Response.json({ error: upsertError.message }, { status: 500 })
    }

    // ── Insert swap record ─────────────────────────────────────────────────────
    const swapRecord: Omit<SwapRecordRow, 'id' | 'created_at'> = {
      user_address: normalizedAddress,
      token_in: tokenInSymbol,
      token_out: tokenOutSymbol,
      amount_in: amountIn,
      amount_out: amountOut,
      dex,
      tx_hash: txHash,
      volume_usd: volumeUSD,
      score_earned: earned,
    }

    const { error: insertError } = await supabase.from('swap_records').insert(swapRecord)

    if (insertError) {
      console.error('[score POST] insert error:', insertError)
      // Don't fail the whole request — score was already saved
    }

    return Response.json({
      success: true,
      scoreEarned: earned,
      newScore: updated.score,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
