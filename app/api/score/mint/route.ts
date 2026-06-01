import { type NextRequest } from 'next/server'
import { supabase, type UserScoreRow } from '@/lib/supabase'

const MINT_BONUS = 100

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      userAddress: string
      tier: number
    }

    const { userAddress, tier } = body
    if (!userAddress) {
      return Response.json({ error: 'userAddress required' }, { status: 400 })
    }

    const normalizedAddress = userAddress.toLowerCase()

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

    const updated: UserScoreRow = {
      ...current,
      address: normalizedAddress,
      score: current.score + MINT_BONUS,
      last_activity: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('user_scores')
      .upsert(updated, { onConflict: 'address' })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      scoreEarned: MINT_BONUS,
      newScore: updated.score,
      tier,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
