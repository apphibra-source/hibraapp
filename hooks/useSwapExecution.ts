'use client'

import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useSendTransaction } from 'wagmi'
import { maxUint256, encodeFunctionData, concat, type Hex } from 'viem'
import { Attribution } from 'ox/erc8021'
import { toast } from 'sonner'
import type { Token, QuoteResult } from '@/types'
import { ADDRESSES, TOKEN_ADDRESSES } from '@/lib/contracts/addresses'
import { ERC20_ABI } from '@/lib/contracts/abis/erc20'
import { WETH_ABI } from '@/lib/contracts/abis/weth'
import { UNISWAP_V3_ROUTER_ABI } from '@/lib/contracts/abis/uniswapV3Router'
import { AERODROME_ROUTER_ABI } from '@/lib/contracts/abis/aerodromeRouter'
import { SUSHISWAP_ROUTER_ABI } from '@/lib/contracts/abis/sushiswapRouter'
import { PANCAKESWAP_V3_ROUTER_ABI } from '@/lib/contracts/abis/pancakeswapV3Router'
import { applySlippage, getDeadline, parseTokenAmount } from '@/lib/utils'
import { addCustomToken, useInvalidateBalances } from './useTokenBalances'

// ── Builder Code attribution suffix (ERC-8021) ────────────────────────────
const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE ?? 'bc_480ypir7'
const DATA_SUFFIX = Attribution.toDataSuffix({ codes: [BUILDER_CODE] }) as Hex

/** Append ERC-8021 attribution suffix to calldata */
function withSuffix(data: Hex): Hex {
  return concat([data, DATA_SUFFIX])
}

interface SwapExecutionParams {
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  quote: QuoteResult
  slippage: number
}

type SwapStatus = 'idle' | 'approving' | 'swapping' | 'success' | 'error'

export function useSwapExecution() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { sendTransactionAsync } = useSendTransaction()
  const invalidateBalances = useInvalidateBalances()
  const [status, setStatus] = useState<SwapStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)

  // Approve helper — uses raw sendTransaction with no suffix (approval doesn't need it)
  const approveToken = useCallback(async (
    tokenAddress: `0x${string}`,
    spender: `0x${string}`,
    amount: bigint
  ) => {
    if (!address || !publicClient) return
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [address, spender],
    }) as bigint
    if (allowance >= amount) return

    toast.loading('Approving token...', { id: 'approve' })
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, maxUint256],
    })
    const hash = await sendTransactionAsync({ to: tokenAddress, data })
    await publicClient.waitForTransactionReceipt({ hash })
    toast.success('Token approved', { id: 'approve' })
  }, [address, publicClient, sendTransactionAsync])

  const executeSwap = useCallback(
    async (params: SwapExecutionParams) => {
      if (!address || !publicClient) {
        toast.error('Wallet not connected')
        return
      }

      const { tokenIn, tokenOut, amountIn, quote, slippage } = params
      const amountInParsed = parseTokenAmount(amountIn, tokenIn.decimals)
      const amountOutMin = applySlippage(quote.amountOut, slippage)
      const deadline = getDeadline(20)
      const isETHIn = tokenIn.address === TOKEN_ADDRESSES.ETH
      const isETHOut = tokenOut.address === TOKEN_ADDRESSES.ETH

      try {
        // ── Step 1: Approve ───────────────────────────────────────────────────
        if (!isETHIn && quote.dex !== 'wrap') {
          setStatus('approving')
          const routerAddress = getRouterAddress(quote.dex)
          await approveToken(tokenIn.address as `0x${string}`, routerAddress, amountInParsed)
        }

        // ── Step 2: Build calldata + append attribution suffix ────────────────
        setStatus('swapping')
        toast.loading('Sending swap transaction...', { id: 'swap' })

        let to: `0x${string}`
        let data: Hex
        let value: bigint = 0n

        if (quote.dex === 'wrap') {
          if (isETHIn) {
            to = TOKEN_ADDRESSES.WETH
            data = encodeFunctionData({ abi: WETH_ABI, functionName: 'deposit' })
            value = amountInParsed
          } else {
            to = TOKEN_ADDRESSES.WETH
            data = encodeFunctionData({ abi: WETH_ABI, functionName: 'withdraw', args: [amountInParsed] })
          }

        } else if (quote.dex === 'uniswapV3') {
          const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn.address as `0x${string}`
          const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut.address as `0x${string}`
          const feeBps = parseFee(quote.fee)
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
              args: [amountOutMin, address],
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
              args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: address, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
            })
            if (isETHIn) value = amountInParsed
          }

        } else if (quote.dex === 'pancakeswapV3') {
          const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn.address as `0x${string}`
          const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut.address as `0x${string}`
          const feeBps = parseFee(quote.fee)
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
              args: [amountOutMin, address],
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
              args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: address, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
            })
            if (isETHIn) value = amountInParsed
          }

        } else if (quote.dex === 'aerodrome') {
          const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn.address as `0x${string}`
          const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut.address as `0x${string}`
          const route = [{ from: resolvedIn, to: resolvedOut, stable: false, factory: ADDRESSES.AERODROME_FACTORY }]
          to = ADDRESSES.AERODROME_ROUTER

          if (isETHIn) {
            data = encodeFunctionData({ abi: AERODROME_ROUTER_ABI, functionName: 'swapExactETHForTokens', args: [amountOutMin, route, address, deadline] })
            value = amountInParsed
          } else if (isETHOut) {
            data = encodeFunctionData({ abi: AERODROME_ROUTER_ABI, functionName: 'swapExactTokensForETH', args: [amountInParsed, amountOutMin, route, address, deadline] })
          } else {
            data = encodeFunctionData({ abi: AERODROME_ROUTER_ABI, functionName: 'swapExactTokensForTokens', args: [amountInParsed, amountOutMin, route, address, deadline] })
          }

        } else {
          // SushiSwap
          const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn.address as `0x${string}`
          const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut.address as `0x${string}`
          to = ADDRESSES.SUSHISWAP_ROUTER

          if (isETHIn) {
            data = encodeFunctionData({ abi: SUSHISWAP_ROUTER_ABI, functionName: 'swapExactETHForTokens', args: [amountOutMin, [resolvedIn, resolvedOut], address, deadline] })
            value = amountInParsed
          } else if (isETHOut) {
            data = encodeFunctionData({ abi: SUSHISWAP_ROUTER_ABI, functionName: 'swapExactTokensForETH', args: [amountInParsed, amountOutMin, [resolvedIn, resolvedOut], address, deadline] })
          } else {
            data = encodeFunctionData({ abi: SUSHISWAP_ROUTER_ABI, functionName: 'swapExactTokensForTokens', args: [amountInParsed, amountOutMin, [resolvedIn, resolvedOut], address, deadline] })
          }
        }

        // ── Append ERC-8021 attribution suffix to calldata ────────────────────
        const dataWithSuffix = withSuffix(data!)

        const hash = await sendTransactionAsync({
          to: to!,
          data: dataWithSuffix,
          value,
        })

        setTxHash(hash)
        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        if (receipt.status === 'reverted') {
          setStatus('error')
          toast.error('Swap reverted on-chain', {
            id: 'swap',
            description: 'Transaction was mined but failed. Check Basescan for details.',
            action: { label: 'View', onClick: () => window.open(`https://basescan.org/tx/${hash}`, '_blank') },
          })
          return
        }

        setStatus('success')
        toast.success('Swap successful!', {
          id: 'swap',
          description: `Tx: ${hash.slice(0, 10)}...`,
          action: { label: 'View', onClick: () => window.open(`https://basescan.org/tx/${hash}`, '_blank') },
        })

        addCustomToken(tokenOut)
        setTimeout(() => invalidateBalances(), 2000)

        recordSwap({
          userAddress: address,
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          tokenInSymbol: tokenIn.symbol,
          tokenOutSymbol: tokenOut.symbol,
          amountIn,
          amountOut: quote.amountOutFormatted,
          dex: quote.dex,
          txHash: hash,
          volumeUSD: estimateVolumeUSD(tokenIn.symbol, tokenOut.symbol, amountIn, quote.amountOutFormatted),
        })
      } catch (err: unknown) {
        setStatus('error')
        const message = err instanceof Error ? err.message : 'Swap failed'
        toast.error('Swap failed', { id: 'swap', description: message.slice(0, 100) })
      }
    },
    [address, publicClient, sendTransactionAsync, approveToken, invalidateBalances]
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(null)
  }, [])

  return { executeSwap, status, txHash, reset }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRouterAddress(dex: string): `0x${string}` {
  switch (dex) {
    case 'uniswapV3':      return ADDRESSES.UNISWAP_V3_ROUTER
    case 'pancakeswapV3':  return ADDRESSES.PANCAKESWAP_V3_SMART_ROUTER
    case 'aerodrome':      return ADDRESSES.AERODROME_ROUTER
    case 'sushiswap':      return ADDRESSES.SUSHISWAP_ROUTER
    default:               return ADDRESSES.UNISWAP_V3_ROUTER
  }
}

function parseFee(feeStr: string): number {
  const num = parseFloat(feeStr.replace('%', ''))
  return Math.round(num * 10000)
}

function estimateVolumeUSD(
  tokenInSymbol: string,
  tokenOutSymbol: string,
  amountIn: string,
  amountOut: string
): number {
  const stables = ['USDC', 'USDT', 'DAI', 'USDS', 'USDe', 'EURC', 'crvUSD', 'USDbC', 'USD+']
  const ethLike = ['ETH', 'WETH']
  const outUpper = tokenOutSymbol.toUpperCase()
  const inUpper = tokenInSymbol.toUpperCase()
  if (stables.map(s => s.toUpperCase()).includes(outUpper)) return Math.max(parseFloat(amountOut) || 0, 0.01)
  if (stables.map(s => s.toUpperCase()).includes(inUpper)) return Math.max(parseFloat(amountIn) || 0, 0.01)
  if (ethLike.includes(inUpper)) return Math.max((parseFloat(amountIn) || 0) * 2500, 0.01)
  if (ethLike.includes(outUpper)) return Math.max((parseFloat(amountOut) || 0) * 2500, 0.01)
  return 0
}

async function recordSwap(data: {
  userAddress: string
  tokenIn: string
  tokenOut: string
  tokenInSymbol: string
  tokenOutSymbol: string
  amountIn: string
  amountOut: string
  dex: string
  txHash: string
  volumeUSD: number
}) {
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[recordSwap] API error:', err)
    }
  } catch (err) {
    console.error('[recordSwap] fetch error:', err)
  }
}
