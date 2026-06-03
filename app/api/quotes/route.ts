import { type NextRequest } from 'next/server'
import { getUniswapV3Quote } from '@/lib/quotes/uniswapV3'
import { getAerodromeQuote } from '@/lib/quotes/aerodrome'
import { getSushiswapQuote } from '@/lib/quotes/sushiswap'
import { getPancakeSwapV3Quote } from '@/lib/quotes/pancakeswapV3'

// Native ETH address (zero address convention)
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'

function isWrapPair(tokenIn: string, tokenOut: string): boolean {
  const a = tokenIn.toLowerCase()
  const b = tokenOut.toLowerCase()
  return (
    (a === ETH_ADDRESS && b === WETH_ADDRESS) ||
    (a === WETH_ADDRESS && b === ETH_ADDRESS)
  )
}

interface QuoteRequest {
  tokenIn: string
  tokenOut: string
  amountIn: string
  decimalsOut: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuoteRequest
    const { tokenIn, tokenOut, amountIn } = body

    if (!tokenIn || !tokenOut || !amountIn) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const amountInBigInt = BigInt(amountIn)

    // ── ETH ↔ WETH: wrap/unwrap, 1:1, no DEX needed ──────────────────────────
    if (isWrapPair(tokenIn, tokenOut)) {
      const isWrap = tokenIn.toLowerCase() === ETH_ADDRESS
      return Response.json({
        quotes: [
          {
            dex: 'wrap',
            amountOut: amountInBigInt.toString(),
            fee: '0%',
            priceImpact: 0,
          },
        ],
        isWrap,
        isUnwrap: !isWrap,
      })
    }

    // ── Normal DEX quotes ─────────────────────────────────────────────────────
    const [uniResult, aeroResult, sushiResult, pancakeResult] = await Promise.allSettled([
      getUniswapV3Quote(tokenIn, tokenOut, amountInBigInt),
      getAerodromeQuote(tokenIn, tokenOut, amountInBigInt),
      getSushiswapQuote(tokenIn, tokenOut, amountInBigInt),
      getPancakeSwapV3Quote(tokenIn, tokenOut, amountInBigInt),
    ])

    const quotes: Array<{
      dex: string
      dexName: string
      amountOut: string
      amountOutFormatted: string
      fee: string
      priceImpact: number
      isBest: boolean
    }> = []

    const decimalsOut = (body as QuoteRequest & { decimalsOut?: number }).decimalsOut ?? 18

    function formatAmount(raw: bigint, decimals: number): string {
      const divisor = BigInt(10 ** decimals)
      const whole = raw / divisor
      const frac = raw % divisor
      const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '')
      return fracStr.length > 0 ? `${whole}.${fracStr.slice(0, 6)}` : whole.toString()
    }

    if (uniResult.status === 'fulfilled' && uniResult.value !== null) {
      const { amountOut, fee } = uniResult.value
      quotes.push({
        dex: 'uniswapV3',
        dexName: 'Uniswap V3',
        amountOut: amountOut.toString(),
        amountOutFormatted: formatAmount(amountOut, decimalsOut),
        fee: `${(fee / 10000).toFixed(2)}%`,
        priceImpact: 0,
        isBest: false,
      })
    }

    if (aeroResult.status === 'fulfilled' && aeroResult.value !== null) {
      const raw = aeroResult.value
      quotes.push({
        dex: 'aerodrome',
        dexName: 'Aerodrome',
        amountOut: raw.toString(),
        amountOutFormatted: formatAmount(raw, decimalsOut),
        fee: '0.02%',
        priceImpact: 0,
        isBest: false,
      })
    }

    if (sushiResult.status === 'fulfilled' && sushiResult.value !== null) {
      const raw = sushiResult.value
      quotes.push({
        dex: 'sushiswap',
        dexName: 'SushiSwap',
        amountOut: raw.toString(),
        amountOutFormatted: formatAmount(raw, decimalsOut),
        fee: '0.30%',
        priceImpact: 0,
        isBest: false,
      })
    }

    if (pancakeResult.status === 'fulfilled' && pancakeResult.value !== null) {
      const { amountOut, fee } = pancakeResult.value
      quotes.push({
        dex: 'pancakeswapV3',
        dexName: 'PancakeSwap V3',
        amountOut: amountOut.toString(),
        amountOutFormatted: formatAmount(amountOut, decimalsOut),
        fee: `${(fee / 10000).toFixed(2)}%`,
        priceImpact: 0,
        isBest: false,
      })
    }

    // Mark the best (highest amountOut) quote
    if (quotes.length > 0) {
      quotes.sort((a, b) => (BigInt(b.amountOut) > BigInt(a.amountOut) ? 1 : -1))
      quotes[0].isBest = true
    }

    return Response.json({ quotes })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
