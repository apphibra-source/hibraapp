'use client'

import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import type { UserScore } from '@/types'
import { NFT_TIERS } from '@/constants'
import type { TierInfo } from '@/types'

export function useUserScore(address?: string) {
  const { address: connectedAddress } = useAccount()
  const targetAddress = address ?? connectedAddress

  return useQuery({
    queryKey: ['userScore', targetAddress],
    queryFn: async (): Promise<UserScore | null> => {
      if (!targetAddress) return null
      const res = await fetch(`/api/score?address=${targetAddress}`)
      if (!res.ok) return null
      return res.json() as Promise<UserScore>
    },
    enabled: !!targetAddress,
    staleTime: 30_000,
  })
}

export function getTierForScore(score: number): TierInfo {
  for (let i = NFT_TIERS.length - 1; i >= 0; i--) {
    if (score >= NFT_TIERS[i].minScore) return NFT_TIERS[i]
  }
  return NFT_TIERS[0]
}

export function getNextTier(score: number): TierInfo | null {
  const current = getTierForScore(score)
  const nextIndex = NFT_TIERS.findIndex((t) => t.tier === current.tier) + 1
  return nextIndex < NFT_TIERS.length ? NFT_TIERS[nextIndex] : null
}
