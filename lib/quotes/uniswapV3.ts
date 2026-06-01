import { createPublicClient, http } from 'viem'
import { base } from 'wagmi/chains'
import { ADDRESSES } from '@/lib/contracts/addresses'
import { UNISWAP_V3_QUOTER_ABI } from '@/lib/contracts/abis/uniswapV3Quoter'
import { UNISWAP_FEE_TIERS } from '@/constants'
import { TOKEN_ADDRESSES } from '@/lib/contracts/addresses'

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'
  ),
})

/**
 * Resolve ETH address to WETH for on-chain calls.
 */
function resolveAddress(address: string): `0x${string}` {
  if (address === TOKEN_ADDRESSES.ETH) return TOKEN_ADDRESSES.WETH
  return address as `0x${string}`
}

/**
 * Try a single fee tier and return the amountOut, or null on failure.
 */
async function tryFeeTier(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  fee: number
): Promise<{ amountOut: bigint; gasEstimate: bigint } | null> {
  try {
    const result = await publicClient.simulateContract({
      address: ADDRESSES.UNISWAP_V3_QUOTER,
      abi: UNISWAP_V3_QUOTER_ABI,
      functionName: 'quoteExactInputSingle',
      args: [
        {
          tokenIn,
          tokenOut,
          amountIn,
          fee,
          sqrtPriceLimitX96: 0n,
        },
      ],
    })
    const [amountOut, , , gasEstimate] = result.result as [bigint, bigint, number, bigint]
    return { amountOut, gasEstimate }
  } catch {
    return null
  }
}

export interface UniswapV3QuoteResult {
  amountOut: bigint
  fee: number
  gasEstimate: bigint
}

/**
 * Get the best Uniswap V3 quote by trying all fee tiers.
 */
export async function getUniswapV3Quote(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
): Promise<UniswapV3QuoteResult | null> {
  const resolvedIn = resolveAddress(tokenIn)
  const resolvedOut = resolveAddress(tokenOut)

  if (resolvedIn === resolvedOut) return null
  if (amountIn === 0n) return null

  const results = await Promise.allSettled(
    UNISWAP_FEE_TIERS.map((fee) => tryFeeTier(resolvedIn, resolvedOut, amountIn, fee))
  )

  let best: UniswapV3QuoteResult | null = null

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled' && result.value !== null) {
      const { amountOut, gasEstimate } = result.value
      if (best === null || amountOut > best.amountOut) {
        best = { amountOut, fee: UNISWAP_FEE_TIERS[i], gasEstimate }
      }
    }
  }

  return best
}
