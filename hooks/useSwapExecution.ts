'use client'

import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { maxUint256 } from 'viem'
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
  const { writeContractAsync } = useWriteContract()
  const invalidateBalances = useInvalidateBalances()
  const [status, setStatus] = useState<SwapStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)

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
        // ── Step 1: Approve if needed (skip for ETH input and wrap) ───────────
        if (!isETHIn && quote.dex !== 'wrap') {
          setStatus('approving')
          const routerAddress = getRouterAddress(quote.dex)
          const allowance = await publicClient.readContract({
            address: tokenIn.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, routerAddress],
          })
          if ((allowance as bigint) < amountInParsed) {
            toast.loading('Approving token...', { id: 'approve' })
            const approveTx = await writeContractAsync({
              address: tokenIn.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [routerAddress, maxUint256],
            })
            await publicClient.waitForTransactionReceipt({ hash: approveTx })
            toast.success('Token approved', { id: 'approve' })
          }
        }

        // ── Step 2: Execute swap ───────────────────────────────────────────────
        setStatus('swapping')
        toast.loading('Sending swap transaction...', { id: 'swap' })

        let hash: `0x${string}`

        if (quote.dex === 'wrap') {
          // ── ETH ↔ WETH wrap/unwrap ─────────────────────────────────────────
          if (isETHIn) {
            hash = await writeContractAsync({
              address: TOKEN_ADDRESSES.WETH,
              abi: WETH_ABI,
              functionName: 'deposit',
              value: amountInParsed,
            })
          } else {
            hash = await writeContractAsync({
              address: TOKEN_ADDRESSES.WETH,
              abi: WETH_ABI,
              functionName: 'withdraw',
              args: [amountInParsed],
            })
          }

        } else if (quote.dex === 'uniswapV3') {
          // ── Uniswap V3 ────────────────────────────────────────────────────────
          const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn.address as `0x${string}`
          const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut.address as `0x${string}`
          const feeBps = parseFee(quote.fee)

          if (isETHOut) {
            const { encodeFunctionData } = await import('viem')
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
            hash = await writeContractAsync({
              address: ADDRESSES.UNISWAP_V3_ROUTER,
              abi: UNISWAP_V3_ROUTER_ABI,
              functionName: 'multicall',
              args: [deadline, [swapCalldata, unwrapCalldata]],
            })
          } else {
            hash = await writeContractAsync({
              address: ADDRESSES.UNISWAP_V3_ROUTER,
              abi: UNISWAP_V3_ROUTER_ABI,
              functionName: 'exactInputSingle',
              args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: address, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
              value: isETHIn ? amountInParsed : 0n,
            })
          }

        } else if (quote.dex === 'pancakeswapV3') {
          // ── PancakeSwap V3 (identical interface to Uniswap V3) ────────────────
          const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn.address as `0x${string}`
          const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut.address as `0x${string}`
          const feeBps = parseFee(quote.fee)

          if (isETHOut) {
            const { encodeFunctionData } = await import('viem')
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
            hash = await writeContractAsync({
              address: ADDRESSES.PANCAKESWAP_V3_SMART_ROUTER,
              abi: PANCAKESWAP_V3_ROUTER_ABI,
              functionName: 'multicall',
              args: [deadline, [swapCalldata, unwrapCalldata]],
            })
          } else {
            hash = await writeContractAsync({
              address: ADDRESSES.PANCAKESWAP_V3_SMART_ROUTER,
              abi: PANCAKESWAP_V3_ROUTER_ABI,
              functionName: 'exactInputSingle',
              args: [{ tokenIn: resolvedIn, tokenOut: resolvedOut, fee: feeBps, recipient: address, amountIn: amountInParsed, amountOutMinimum: amountOutMin, sqrtPriceLimitX96: 0n }],
              value: isETHIn ? amountInParsed : 0n,
            })
          }

        } else if (quote.dex === 'aerodrome') {
          // ── Aerodrome ─────────────────────────────────────────────────────────
          const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn.address as `0x${string}`
          const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut.address as `0x${string}`
          const route = [{ from: resolvedIn, to: resolvedOut, stable: false, factory: ADDRESSES.AERODROME_FACTORY }]

          if (isETHIn) {
            hash = await writeContractAsync({
              address: ADDRESSES.AERODROME_ROUTER,
              abi: AERODROME_ROUTER_ABI,
              functionName: 'swapExactETHForTokens',
              args: [amountOutMin, route, address, deadline],
              value: amountInParsed,
            })
          } else if (isETHOut) {
            hash = await writeContractAsync({
              address: ADDRESSES.AERODROME_ROUTER,
              abi: AERODROME_ROUTER_ABI,
              functionName: 'swapExactTokensForETH',
              args: [amountInParsed, amountOutMin, route, address, deadline],
            })
          } else {
            hash = await writeContractAsync({
              address: ADDRESSES.AERODROME_ROUTER,
              abi: AERODROME_ROUTER_ABI,
              functionName: 'swapExactTokensForTokens',
              args: [amountInParsed, amountOutMin, route, address, deadline],
            })
          }

        } else {
          // ── SushiSwap (default) ───────────────────────────────────────────────
          const resolvedIn = isETHIn ? TOKEN_ADDRESSES.WETH : tokenIn.address as `0x${string}`
          const resolvedOut = isETHOut ? TOKEN_ADDRESSES.WETH : tokenOut.address as `0x${string}`

          if (isETHIn) {
            hash = await writeContractAsync({
              address: ADDRESSES.SUSHISWAP_ROUTER,
              abi: SUSHISWAP_ROUTER_ABI,
              functionName: 'swapExactETHForTokens',
              args: [amountOutMin, [resolvedIn, resolvedOut], address, deadline],
              value: amountInParsed,
            })
          } else if (isETHOut) {
            hash = await writeContractAsync({
              address: ADDRESSES.SUSHISWAP_ROUTER,
              abi: SUSHISWAP_ROUTER_ABI,
              functionName: 'swapExactTokensForETH',
              args: [amountInParsed, amountOutMin, [resolvedIn, resolvedOut], address, deadline],
            })
          } else {
            hash = await writeContractAsync({
              address: ADDRESSES.SUSHISWAP_ROUTER,
              abi: SUSHISWAP_ROUTER_ABI,
              functionName: 'swapExactTokensForTokens',
              args: [amountInParsed, amountOutMin, [resolvedIn, resolvedOut], address, deadline],
            })
          }
        }

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

        // Register output token so it appears in balance list
        addCustomToken(tokenOut)
        // Refresh balances immediately
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
    [address, publicClient, writeContractAsync, invalidateBalances]
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
