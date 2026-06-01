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
      amountOut: string
      fee: string
      priceImpact: number
    }> = []

    if (uniResult.status === 'fulfilled' && uniResult.value !== null) {
      const { amountOut, fee } = uniResult.value
      quotes.push({
        dex: 'uniswapV3',
        amountOut: amountOut.toString(),
        fee: `${(fee / 10000).toFixed(2)}%`,
        priceImpact: 0,
      })
    }

    if (aeroResult.status === 'fulfilled' && aeroResult.value !== null) {
      quotes.push({
        dex: 'aerodrome',
        amountOut: aeroResult.value.toString(),
        fee: '0.02%',
        priceImpact: 0,
      })
    }

    if (sushiResult.status === 'fulfilled' && sushiResult.value !== null) {
      quotes.push({
        dex: 'sushiswap',
        amountOut: sushiResult.value.toString(),
        fee: '0.30%',
        priceImpact: 0,
      })
    }

    if (pancakeResult.status === 'fulfilled' && pancakeResult.value !== null) {
      const { amountOut, fee } = pancakeResult.value
      quotes.push({
        dex: 'pancakeswapV3',
        amountOut: amountOut.toString(),
        fee: `${(fee / 10000).toFixed(2)}%`,
        priceImpact: 0,
      })
    }

    return Response.json({ quotes })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
