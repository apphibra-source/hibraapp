/**
 * Shared swap execution logic.
 * Used by both /api/swap/execute (x402-paid, AI agent)
 * and /api/swap/execute-free (free, /swap page).
 */

import { type NextRequest, NextResponse } from 'next/server'
import { encodeFunctionData, type Hex } from 'viem'
import { ADDRESSES, TOKEN_ADDRESSES } from '@/lib/contracts/addresses'
import { UNISWAP_V3_ROUTER_ABI } from '@/lib/contracts/abis/uniswapV3Router'
import { AERODROME_ROUTER_ABI } from '@/lib/contracts/abis/aerodromeRouter'
import { SUSHISWAP_ROUTER_ABI } from '@/lib/contracts/abis/sushiswapRouter'
import { PANCAKESWAP_V3_ROUTER_ABI } from '@/lib/contracts/abis/pancakeswapV3Router'
import { WETH_ABI } from '@/lib/contracts/abis/weth'
import { applySlippage, getDeadline } from '@/lib/utils'

export interface ExecuteRequest {
  tokenIn: string
  tokenOut: string
  tokenInDecimals: number
  amountInRaw: string
  amountOutRaw: string
  dex: string
  fee: string
  slippage: number
  userAddress: string
}

function parseFee(feeStr: string): number {
  return Math.round(parseFloat(feeStr.replace('%', '')) * 10000)
}

export async function executeSwapHandler(request: NextRequest): Promise<NextResponse> {
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
      to = TOKEN_ADDRESSES.WETH
      if (isETHIn) {
        data = encodeFunctionData({ abi: WETH_ABI, functionName: 'deposit' })
        value = amountInParsed.toString()
      } else {
        data = encodeFunctionData({ abi: WETH_ABI, functionName: 'withdraw', args: [amountInParsed] })
      }

    } else if (dex === 'uniswapV3') {
      const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn as `0x${string}`
      const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut as `0x${string}`
      const feeBps = parseFee(fee)
      to = ADDRESSES.UNISWAP_V3_ROUTER
      if (isETHOut) {
        const swapCalldata = encodeFunctionData({ abi: UNISWAP_V3_ROUTER_ABI, functionName: 'exactInputSingle', args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: ADDRESSES.UNISWAP_V3_ROUTER, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }] })
        const unwrapCalldata = encodeFunctionData({ abi: UNISWAP_V3_ROUTER_ABI, functionName: 'unwrapWETH9', args: [amountOutMin, user] })
        data = encodeFunctionData({ abi: UNISWAP_V3_ROUTER_ABI, functionName: 'multicall', args: [deadline, [swapCalldata, unwrapCalldata]] })
      } else {
        data = encodeFunctionData({ abi: UNISWAP_V3_ROUTER_ABI, functionName: 'exactInputSingle', args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: user, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }] })
        if (isETHIn) value = amountInParsed.toString()
      }

    } else if (dex === 'pancakeswapV3') {
      const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn as `0x${string}`
      const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut as `0x${string}`
      const feeBps = parseFee(fee)
      to = ADDRESSES.PANCAKESWAP_V3_SMART_ROUTER
      if (isETHOut) {
        const swapCalldata = encodeFunctionData({ abi: PANCAKESWAP_V3_ROUTER_ABI, functionName: 'exactInputSingle', args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: ADDRESSES.PANCAKESWAP_V3_SMART_ROUTER, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }] })
        const unwrapCalldata = encodeFunctionData({ abi: PANCAKESWAP_V3_ROUTER_ABI, functionName: 'unwrapWETH9', args: [amountOutMin, user] })
        data = encodeFunctionData({ abi: PANCAKESWAP_V3_ROUTER_ABI, functionName: 'multicall', args: [deadline, [swapCalldata, unwrapCalldata]] })
      } else {
        data = encodeFunctionData({ abi: PANCAKESWAP_V3_ROUTER_ABI, functionName: 'exactInputSingle', args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: user, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }] })
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
      // WETH wrap/unwrap: do NOT append ERC-8021 suffix — WETH reverts on unknown calldata
      skipAttribution: dex === 'wrap',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
