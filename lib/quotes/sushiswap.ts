import { createPublicClient, http } from 'viem'
import { base } from 'wagmi/chains'
import { ADDRESSES, TOKEN_ADDRESSES } from '@/lib/contracts/addresses'
import { SUSHISWAP_ROUTER_ABI } from '@/lib/contracts/abis/sushiswapRouter'

const publicClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'
  ),
})

function resolveAddress(address: string): `0x${string}` {
  if (address === TOKEN_ADDRESSES.ETH) return TOKEN_ADDRESSES.WETH
  return address as `0x${string}`
}

/**
 * Get a SushiSwap quote via getAmountsOut.
 */
export async function getSushiswapQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
): Promise<bigint | null> {
  const resolvedIn = resolveAddress(tokenIn)
  const resolvedOut = resolveAddress(tokenOut)

  if (resolvedIn === resolvedOut) return null
  if (amountIn === 0n) return null

  try {
    const amounts = await publicClient.readContract({
      address: ADDRESSES.SUSHISWAP_ROUTER,
      abi: SUSHISWAP_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [amountIn, [resolvedIn, resolvedOut]],
    })
    const amountsArr = amounts as bigint[]
    return amountsArr[amountsArr.length - 1] ?? null
  } catch {
    // Try routing through WETH as intermediate
    try {
      const weth = TOKEN_ADDRESSES.WETH
      if (resolvedIn !== weth && resolvedOut !== weth) {
        const amounts = await publicClient.readContract({
          address: ADDRESSES.SUSHISWAP_ROUTER,
          abi: SUSHISWAP_ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountIn, [resolvedIn, weth, resolvedOut]],
        })
        const amountsArr = amounts as bigint[]
        return amountsArr[amountsArr.length - 1] ?? null
      }
    } catch {
      // ignore
    }
    return null
  }
}
