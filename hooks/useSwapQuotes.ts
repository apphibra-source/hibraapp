'use client'

import { useQuery } from '@tanstack/react-query'
import { formatUnits } from 'viem'
import type { Token, QuoteResult } from '@/types'
import { DEX_NAMES } from '@/constants'
import { parseTokenAmount } from '@/lib/utils'

interface UseSwapQuotesParams {
  tokenIn: Token | null
  tokenOut: Token | null
  amountIn: string
  enabled: boolean
}

async function fetchQuotes(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string
): Promise<QuoteResult[]> {
  const parsedAmount = parseTokenAmount(amountIn, tokenIn.decimals)
  if (parsedAmount === 0n) return []

  const response = await fetch('/api/quotes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: parsedAmount.toString(),
      decimalsOut: tokenOut.decimals,
    }),
  })

  if (!response.ok) throw new Error('Failed to fetch quotes')

  const data = await response.json() as {
    quotes: Array<{
      dex: string
      amountOut: string
      fee: string
      priceImpact: number
    }>
  }

  if (!data.quotes || data.quotes.length === 0) return []

  // Sort by amountOut descending
  const sorted = [...data.quotes].sort(
    (a, b) => BigInt(b.amountOut) - BigInt(a.amountOut) > 0n ? 1 : -1
  )

  return sorted.map((q, i) => ({
    dex: q.dex as QuoteResult['dex'],
    dexName: q.dex === 'wrap'
      ? (tokenIn.address === '0x0000000000000000000000000000000000000000' ? 'Wrap ETH → WETH' : 'Unwrap WETH → ETH')
      : (DEX_NAMES[q.dex] ?? q.dex),
    amountOut: BigInt(q.amountOut),
    amountOutFormatted: formatUnits(BigInt(q.amountOut), tokenOut.decimals),
    fee: q.fee,
    priceImpact: q.priceImpact,
    isBest: i === 0,
  }))
}

export function useSwapQuotes({ tokenIn, tokenOut, amountIn, enabled }: UseSwapQuotesParams) {
  return useQuery({
    queryKey: ['swapQuotes', tokenIn?.address, tokenOut?.address, amountIn],
    queryFn: () => fetchQuotes(tokenIn!, tokenOut!, amountIn),
    enabled: enabled && !!tokenIn && !!tokenOut && !!amountIn && amountIn !== '0',
    refetchInterval: 10_000,
    staleTime: 8_000,
    retry: 1,
  })
}
