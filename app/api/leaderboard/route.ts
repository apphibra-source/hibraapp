import { type NextRequest } from 'next/server'
import { supabase, type UserScoreRow } from '@/lib/supabase'
import type { LeaderboardResponse, LeaderboardUser } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  // Get total count
  const { count } = await supabase
    .from('user_scores')
    .select('*', { count: 'exact', head: true })

  // Get paginated leaderboard sorted by score desc
  const { data, error } = await supabase
    .from('user_scores')
    .select('*')
    .order('score', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !data) {
    return Response.json({ users: [], total: 0 })
  }

  const users: LeaderboardUser[] = (data as UserScoreRow[]).map((row, i) => ({
    rank: offset + i + 1,
    address: row.address,
    score: row.score,
    swapCount: row.swap_count,
    volumeUSD: Number(row.volume_usd),
    lastActivity: row.last_activity,
  }))

  const response: LeaderboardResponse = {
    users,
    total: count ?? 0,
  }

  return Response.json(response)
}
