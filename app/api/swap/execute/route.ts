/**
 * POST /api/swap/execute
 *
 * x402-protected endpoint — charges $0.10 USDC per request via withX402.
 * withX402 is the correct wrapper for API routes: it only settles payment
 * after a successful (status < 400) response, preventing charges on failures.
 *
 * Receives swap parameters, builds transaction calldata, returns it to the
 * frontend so wagmi can send the actual on-chain transaction.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { withX402 } from 'x402-next'
import { createFacilitatorConfig } from '@coinbase/x402'
import { encodeFunctionData, type Hex } from 'viem'
import { ADDRESSES, TOKEN_ADDRESSES } from '@/lib/contracts/addresses'
import { UNISWAP_V3_ROUTER_ABI } from '@/lib/contracts/abis/uniswapV3Router'
import { AERODROME_ROUTER_ABI } from '@/lib/contracts/abis/aerodromeRouter'
import { SUSHISWAP_ROUTER_ABI } from '@/lib/contracts/abis/sushiswapRouter'
import { PANCAKESWAP_V3_ROUTER_ABI } from '@/lib/contracts/abis/pancakeswapV3Router'
import { WETH_ABI } from '@/lib/contracts/abis/weth'
import { applySlippage, getDeadline } from '@/lib/utils'

// ── ERC-8021 Builder Code attribution appended via wagmi config (lib/wagmi.ts) ─

interface ExecuteRequest {
  tokenIn: string
  tokenOut: string
  tokenInDecimals: number
  amountInRaw: string    // bigint as string
  amountOutRaw: string   // bigint as string (from quote)
  dex: string
  fee: string
  slippage: number       // basis points, e.g. 50 = 0.5%
  userAddress: string
}

function parseFee(feeStr: string): number {
  const num = parseFloat(feeStr.replace('%', ''))
  return Math.round(num * 10000)
}

async function executeHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ExecuteRequest
    const { tokenIn, tokenOut, amountInRaw, amountOutRaw, dex, fee, slippage, userAddress } = body

    if (!tokenIn || !tokenOut || !amountInRaw || !amountOutRaw || !dex || !userAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const amountInParsed = BigInt(amountInRaw)
    const amountOut = BigInt(amountOutRaw)
    const amountOutMin = applySlippage(amountOut, slippage ?? 50)
    const deadline = getDeadline(20)
    const user = userAddress as `0x${string}`

    const isETHIn = tokenIn.toLowerCase() === TOKEN_ADDRESSES.ETH.toLowerCase()
    const isETHOut = tokenOut.toLowerCase() === TOKEN_ADDRESSES.ETH.toLowerCase()

    let to: `0x${string}`
    let data: Hex
    let value = '0'

    if (dex === 'wrap') {
      if (isETHIn) {
        to = TOKEN_ADDRESSES.WETH
        data = encodeFunctionData({ abi: WETH_ABI, functionName: 'deposit' })
        value = amountInParsed.toString()
      } else {
        to = TOKEN_ADDRESSES.WETH
        data = encodeFunctionData({ abi: WETH_ABI, functionName: 'withdraw', args: [amountInParsed] })
      }

    } else if (dex === 'uniswapV3') {
      const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn as `0x${string}`
      const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut as `0x${string}`
      const feeBps = parseFee(fee)
      to = ADDRESSES.UNISWAP_V3_ROUTER

      if (isETHOut) {
        const swapCalldata = encodeFunctionData({
          abi: UNISWAP_V3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: ADDRESSES.UNISWAP_V3_ROUTER, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
        })
        const unwrapCalldata = encodeFunctionData({
          abi: UNISWAP_V3_ROUTER_ABI,
          functionName: 'unwrapWETH9',
          args: [amountOutMin, user],
        })
        data = encodeFunctionData({
          abi: UNISWAP_V3_ROUTER_ABI,
          functionName: 'multicall',
          args: [deadline, [swapCalldata, unwrapCalldata]],
        })
      } else {
        data = encodeFunctionData({
          abi: UNISWAP_V3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: user, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
        })
        if (isETHIn) value = amountInParsed.toString()
      }

    } else if (dex === 'pancakeswapV3') {
      const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn as `0x${string}`
      const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut as `0x${string}`
      const feeBps = parseFee(fee)
      to = ADDRESSES.PANCAKESWAP_V3_SMART_ROUTER

      if (isETHOut) {
        const swapCalldata = encodeFunctionData({
          abi: PANCAKESWAP_V3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: ADDRESSES.PANCAKESWAP_V3_SMART_ROUTER, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
        })
        const unwrapCalldata = encodeFunctionData({
          abi: PANCAKESWAP_V3_ROUTER_ABI,
          functionName: 'unwrapWETH9',
          args: [amountOutMin, user],
        })
        data = encodeFunctionData({
          abi: PANCAKESWAP_V3_ROUTER_ABI,
          functionName: 'multicall',
          args: [deadline, [swapCalldata, unwrapCalldata]],
        })
      } else {
        data = encodeFunctionData({
          abi: PANCAKESWAP_V3_ROUTER_ABI,
          functionName: 'exactInputSingle',
          args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: user, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
        })
        if (isETHIn) value = amountInParsed.toString()
      }

    } else if (dex === 'aerodrome') {
      const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn as `0x${string}`
      const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut as `0x${string}`
      const route = [{ from: resolvedIn, to: resolvedOut, stable: false, factory: ADDRESSES.AERODROME_FACTORY }]
      to = ADDRESSES.AERODROME_ROUTER

      if (isETHIn) {
        data = encodeFunctionData({ abi: AERODROME_ROUTER_ABI, functionName: 'swapExactETHForTokens', args: [amountOutMin, route, user, deadline] })
        value = amountInParsed.toString()
      } else if (isETHOut) {
        data = encodeFunctionData({ abi: AERODROME_ROUTER_ABI, functionName: 'swapExactTokensForETH', args: [amountInParsed, amountOutMin, route, user, deadline] })
      } else {
        data = encodeFunctionData({ abi: AERODROME_ROUTER_ABI, functionName: 'swapExactTokensForTokens', args: [amountInParsed, amountOutMin, route, user, deadline] })
      }

    } else {
      // SushiSwap
      const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn as `0x${string}`
      const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut as `0x${string}`
      to = ADDRESSES.SUSHISWAP_ROUTER

      if (isETHIn) {
        data = encodeFunctionData({ abi: SUSHISWAP_ROUTER_ABI, functionName: 'swapExactETHForTokens', args: [amountOutMin, [resolvedIn, resolvedOut], user, deadline] })
        value = amountInParsed.toString()
      } else if (isETHOut) {
        data = encodeFunctionData({ abi: SUSHISWAP_ROUTER_ABI, functionName: 'swapExactTokensForETH', args: [amountInParsed, amountOutMin, [resolvedIn, resolvedOut], user, deadline] })
      } else {
        data = encodeFunctionData({ abi: SUSHISWAP_ROUTER_ABI, functionName: 'swapExactTokensForTokens', args: [amountInParsed, amountOutMin, [resolvedIn, resolvedOut], user, deadline] })
      }
    }

    return NextResponse.json({
      to: to!,
      data: data!,
      value,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── x402 protection ────────────────────────────────────────────────────────────
// withX402 wraps the handler and charges $0.10 USDC on Base mainnet.
// Payment is only settled after a successful (status < 400) response.

const PAYMENT_WALLET = (process.env.PAYMENT_WALLET_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`

// Vercel stores multi-line PEM keys with literal \n — restore real newlines
// so @coinbase/cdp-sdk can parse the EC private key correctly
const cdpKeyId = process.env.CDP_API_KEY_ID ?? ''
const cdpKeySecret = (process.env.CDP_API_KEY_SECRET ?? '').replace(/\\n/g, '\n')

const cdpFacilitator = createFacilitatorConfig(
  cdpKeyId || undefined,
  cdpKeySecret || undefined
)

export const POST = withX402(
  executeHandler,
  PAYMENT_WALLET,
  {
    price: '$0.10',
    network: 'base',
    config: {
      description: 'Hibra AI Swap — best route on Base network',
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cdpFacilitator as any
)
