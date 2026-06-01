'use client'

import { useQuery } from '@tanstack/react-query'
import type { LeaderboardResponse } from '@/types'

interface UseLeaderboardParams {
  limit?: number
  offset?: number
}

export function useLeaderboard({ limit = 50, offset = 0 }: UseLeaderboardParams = {}) {
  return useQuery({
    queryKey: ['leaderboard', limit, offset],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const res = await fetch(`/api/leaderboard?limit=${limit}&offset=${offset}`)
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      return res.json() as Promise<LeaderboardResponse>
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}
