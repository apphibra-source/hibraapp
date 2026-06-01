import { createPublicClient, http } from 'viem'
import { base } from 'wagmi/chains'
import { ADDRESSES, TOKEN_ADDRESSES } from '@/lib/contracts/addresses'
import { AERODROME_ROUTER_ABI } from '@/lib/contracts/abis/aerodromeRouter'

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
 * Try a single route (stable or volatile) and return amountOut or null.
 */
async function tryRoute(
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  stable: boolean
): Promise<bigint | null> {
  try {
    const amounts = await publicClient.readContract({
      address: ADDRESSES.AERODROME_ROUTER,
      abi: AERODROME_ROUTER_ABI,
      functionName: 'getAmountsOut',
      args: [
        amountIn,
        [
          {
            from: tokenIn,
            to: tokenOut,
            stable,
            factory: ADDRESSES.AERODROME_FACTORY,
          },
        ],
      ],
    })
    const amountsArr = amounts as bigint[]
    return amountsArr[amountsArr.length - 1] ?? null
  } catch {
    return null
  }
}

/**
 * Get the best Aerodrome quote (stable vs volatile pool).
 */
export async function getAerodromeQuote(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
): Promise<bigint | null> {
  const resolvedIn = resolveAddress(tokenIn)
  const resolvedOut = resolveAddress(tokenOut)

  if (resolvedIn === resolvedOut) return null
  if (amountIn === 0n) return null

  const [stableResult, volatileResult] = await Promise.allSettled([
    tryRoute(resolvedIn, resolvedOut, amountIn, true),
    tryRoute(resolvedIn, resolvedOut, amountIn, false),
  ])

  const stable =
    stableResult.status === 'fulfilled' ? stableResult.value : null
  const volatile =
    volatileResult.status === 'fulfilled' ? volatileResult.value : null

  if (stable === null && volatile === null) return null
  if (stable === null) return volatile
  if (volatile === null) return stable
  return stable > volatile ? stable : volatile
}
