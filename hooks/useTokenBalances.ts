'use client'

import { useAccount, usePublicClient } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { erc20Abi } from 'viem'
import { TOKENS } from '@/lib/tokens'
import { TOKEN_ADDRESSES } from '@/lib/contracts/addresses'
import { formatTokenAmount } from '@/lib/utils'
import type { Token, TokenBalance } from '@/types'

// ── Custom token registry ─────────────────────────────────────────────────────
const customTokenRegistry: Token[] = []

function loadCustomTokens(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem('baseagg_custom_tokens')
    if (raw) {
      const parsed = JSON.parse(raw) as Token[]
      parsed.forEach((t) => {
        if (!customTokenRegistry.some((r) => r.address.toLowerCase() === t.address.toLowerCase())) {
          customTokenRegistry.push(t)
        }
      })
    }
  } catch { /* ignore */ }
}

export function addCustomToken(token: Token): void {
  if (!customTokenRegistry.some((t) => t.address.toLowerCase() === token.address.toLowerCase())) {
    customTokenRegistry.push(token)
  }
  if (typeof window !== 'undefined') {
    try {
      const existing = JSON.parse(sessionStorage.getItem('baseagg_custom_tokens') ?? '[]') as Token[]
      if (!existing.some((t) => t.address.toLowerCase() === token.address.toLowerCase())) {
        sessionStorage.setItem('baseagg_custom_tokens', JSON.stringify([...existing, token]))
      }
    } catch { /* ignore */ }
  }
}

function getAllTokens(): Token[] {
  loadCustomTokens()
  return [
    ...TOKENS,
    ...customTokenRegistry.filter(
      (ct) => !TOKENS.some((t) => t.address.toLowerCase() === ct.address.toLowerCase())
    ),
  ]
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useTokenBalances() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()

  return useQuery({
    queryKey: ['tokenBalances', address],
    queryFn: async (): Promise<TokenBalance[]> => {
      if (!address || !publicClient) return []

      const allTokens = getAllTokens()
      const erc20Tokens = allTokens.filter((t) => t.address !== TOKEN_ADDRESSES.ETH)

      // ── Fetch ETH balance ────────────────────────────────────────────────────
      const ethBalance = await publicClient.getBalance({ address })

      // ── Fetch ERC20 balances individually (not multicall) ────────────────────
      // Multicall fails for EIP7702 proxy wallets (Coinbase Smart Wallet).
      // Individual eth_call is more reliable.
      const balanceResults = await Promise.allSettled(
        erc20Tokens.map((token) =>
          publicClient.readContract({
            address: token.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          })
        )
      )

      const balances: TokenBalance[] = []

      // ETH
      const ethToken = allTokens.find((t) => t.address === TOKEN_ADDRESSES.ETH)!
      balances.push({
        token: ethToken,
        balance: ethBalance,
        balanceFormatted: formatTokenAmount(ethBalance, 18),
      })

      // ERC20s
      erc20Tokens.forEach((token, i) => {
        const result = balanceResults[i]
        const balance = result.status === 'fulfilled' ? (result.value as bigint) : 0n
        balances.push({
          token,
          balance,
          balanceFormatted: formatTokenAmount(balance, token.decimals),
        })
      })

      return balances
    },
    enabled: isConnected && !!address && !!publicClient,
    refetchInterval: 10_000,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function useTokenBalance(tokenAddress: string) {
  const { data: balances } = useTokenBalances()
  return balances?.find(
    (b) => b.token.address.toLowerCase() === tokenAddress.toLowerCase()
  )
}

export function useInvalidateBalances() {
  const queryClient = useQueryClient()
  const { address } = useAccount()
  return () => {
    queryClient.refetchQueries({ queryKey: ['tokenBalances', address] })
    setTimeout(() => {
      queryClient.refetchQueries({ queryKey: ['tokenBalances', address] })
    }, 3000)
  }
}
