import { createPublicClient, http } from 'viem'
import { base } from 'wagmi/chains'
import { ADDRESSES, TOKEN_ADDRESSES } from '@/lib/contracts/addresses'
import { PANCAKESWAP_V3_QUOTER_ABI } from '@/lib/contracts/abis/pancakeswapV3Quoter'

// PancakeSwap V3 fee tiers — uses 2500 instead of Uniswap's 3000
const PANCAKE_FEE_TIERS = [100, 500, 2500, 10000] as const

// Separate client with shorter timeout for PancakeSwap
const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org',
    { timeout: 5_000 }
  ),
})

function resolveAddress(address: string): `0x${string}` {
  if (address === TOKEN_ADDRESSES.ETH) return TOKEN_ADDRESSES.WETH
  return address as `0x${string}`
}

async function tryFeeTier(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  fee: number
): Promise<{ amountOut: bigint; gasEstimate: bigint } | null> {
  try {
    const result = await publicClient.simulateContract({
      address: ADDRESSES.PANCAKESWAP_V3_QUOTER,
      abi: PANCAKESWAP_V3_QUOTER_ABI,
      functionName: 'quoteExactInputSingle',
      args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
    })
    const [amountOut, , , gasEstimate] = result.result as [bigint, bigint, number, bigint]
    if (!amountOut || amountOut === 0n) return null
    return { amountOut, gasEstimate }
  } catch {
    return null
  }
}

export interface PancakeSwapV3QuoteResult {
  amountOut: bigint
  fee: number
  gasEstimate: bigint
}

export async function getPancakeSwapV3Quote(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
): Promise<PancakeSwapV3QuoteResult | null> {
  const resolvedIn = resolveAddress(tokenIn)
  const resolvedOut = resolveAddress(tokenOut)

  if (resolvedIn === resolvedOut) return null
  if (amountIn === 0n) return null

  // Race against a 4s timeout — PancakeSwap has limited liquidity on Base
  const quotePromise = Promise.allSettled(
    PANCAKE_FEE_TIERS.map((fee) => tryFeeTier(resolvedIn, resolvedOut, amountIn, fee))
  )
  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4_000))

  const raceResult = await Promise.race([quotePromise, timeoutPromise])
  if (!raceResult) return null // timed out

  let best: PancakeSwapV3QuoteResult | null = null

  for (let i = 0; i < raceResult.length; i++) {
    const result = raceResult[i]
    if (result.status === 'fulfilled' && result.value !== null) {
      const { amountOut, gasEstimate } = result.value
      if (best === null || amountOut > best.amountOut) {
        best = { amountOut, fee: PANCAKE_FEE_TIERS[i], gasEstimate }
      }
    }
  }

  return best
}
