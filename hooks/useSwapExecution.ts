'use client'

import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useSendTransaction, useWalletClient, useSendCalls } from 'wagmi'
import { maxUint256, encodeFunctionData, type Hex, concat } from 'viem'
import { toast } from 'sonner'
import type { Token, QuoteResult } from '@/types'
import { ADDRESSES, TOKEN_ADDRESSES } from '@/lib/contracts/addresses'
import { ERC20_ABI } from '@/lib/contracts/abis/erc20'
import { parseTokenAmount } from '@/lib/utils'
import { addCustomToken, useInvalidateBalances } from './useTokenBalances'
import {
  createPaymentHeader,
  selectPaymentRequirements,
} from 'x402/client'
import { Attribution } from 'ox/erc8021'

// ── ERC-8021 Builder Code attribution ────────────────────────────────────────
// Builder code is hardcoded as fallback — attribution works even if env var is missing
const BUILDER_CODE = process.env.NEXT_PUBLIC_BUILDER_CODE || 'bc_480ypir7'

// Compute suffix once at module load — avoids repeated computation per swap
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [BUILDER_CODE],
}) as Hex

// Verify attribution is active (visible in browser console / Vercel logs)
if (typeof window !== 'undefined') {
  console.log('[Hibra] Builder code attribution active:', BUILDER_CODE)
}

function withAttribution(data: Hex): Hex {
  return concat([data, DATA_SUFFIX])
}

interface SwapExecutionParams {
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  quote: QuoteResult
  slippage: number
  executeUrl?: string
}

type SwapStatus = 'idle' | 'approving' | 'swapping' | 'success' | 'error'

/** Smart wallet connector IDs that support wallet_sendCalls */
const SMART_WALLET_IDS = new Set([
  'baseAccount',
  'coinbaseWalletSDK',
  'smartWallet',
  'com.coinbase.wallet',
  'coinbaseWallet',
  'CoinbaseWallet',
])

export function useSwapExecution() {
  const { address, connector } = useAccount()
  const publicClient = usePublicClient()
  const { sendTransactionAsync } = useSendTransaction()
  const { data: walletClient } = useWalletClient()
  const { sendCallsAsync } = useSendCalls()
  const invalidateBalances = useInvalidateBalances()
  const [status, setStatus] = useState<SwapStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)

  /** True if the connected wallet is a smart wallet supporting wallet_sendCalls */
  const isSmartWallet = connector?.id
    ? SMART_WALLET_IDS.has(connector.id) || SMART_WALLET_IDS.has(connector.name ?? '')
    : false

  const executeSwap = useCallback(
    async (params: SwapExecutionParams) => {
      if (!address || !publicClient) {
        toast.error('Wallet not connected')
        return
      }

      const { tokenIn, tokenOut, amountIn, quote, slippage, executeUrl: customExecuteUrl } = params
      const amountInParsed = parseTokenAmount(amountIn, tokenIn.decimals)
      const isETHIn = tokenIn.address === TOKEN_ADDRESSES.ETH

      try {
        // ── Step 1: Get swap calldata ─────────────────────────────────────────
        setStatus('swapping')
        toast.loading('Preparing swap…', { id: 'swap' })

        const executeUrl = customExecuteUrl ?? '/api/swap/execute'
        const executeBody = JSON.stringify({
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          tokenInDecimals: tokenIn.decimals,
          amountInRaw: amountInParsed.toString(),
          amountOutRaw: quote.amountOut.toString(),
          dex: quote.dex,
          fee: quote.fee,
          slippage,
          userAddress: address,
        })

        let calldataRes = await fetch(executeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: executeBody,
        })

        // ── x402 payment flow ─────────────────────────────────────────────────
        if (calldataRes.status === 402) {
          let wc = walletClient
          if (!wc) {
            for (let i = 0; i < 15; i++) {
              await new Promise(r => setTimeout(r, 200))
              if (walletClient) { wc = walletClient; break }
            }
          }
          if (!wc) {
            toast.error('Wallet not ready for x402 payment')
            setStatus('error')
            return
          }

          const paymentRequiredBody = await calldataRes.json() as {
            x402Version: number
            accepts: unknown[]
            error?: string
          }
          const requirements = paymentRequiredBody.accepts as Parameters<typeof selectPaymentRequirements>[0]
          const selected = selectPaymentRequirements(requirements)
          if (!selected) {
            toast.error('No compatible payment method found')
            setStatus('error')
            return
          }

          toast.loading('Approving $0.10 USDC payment…', { id: 'swap' })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const paymentHeader = await createPaymentHeader(
            wc as unknown as Parameters<typeof createPaymentHeader>[0],
            paymentRequiredBody.x402Version,
            selected
          )

          calldataRes = await fetch(executeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-PAYMENT': paymentHeader },
            body: executeBody,
          })

          if (!calldataRes.ok) {
            const err = await calldataRes.json() as { error?: string }
            throw new Error(err.error ?? `Execute endpoint returned ${calldataRes.status}`)
          }
        } else if (!calldataRes.ok) {
          const err = await calldataRes.json() as { error?: string }
          throw new Error(err.error ?? `Execute endpoint returned ${calldataRes.status}`)
        }

        const { to, data, value: valueStr, skipAttribution } = await calldataRes.json() as {
          to: `0x${string}`
          data: Hex
          value: string
          skipAttribution?: boolean
        }
        const swapValue = BigInt(valueStr ?? '0')
        // WETH wrap/unwrap: don't append suffix — WETH contract reverts on unknown calldata
        const swapData = skipAttribution ? data : withAttribution(data)

        // ── Step 2: Build calls array ─────────────────────────────────────────
        // If token needs approval, check allowance first
        const needsApproval = !isETHIn && quote.dex !== 'wrap'
        let hasAllowance = true
        let routerAddress: `0x${string}` | null = null

        if (needsApproval) {
          routerAddress = getRouterAddress(quote.dex)
          const allowance = await publicClient.readContract({
            address: tokenIn.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, routerAddress],
          }) as bigint
          hasAllowance = allowance >= amountInParsed
        }

        // ── Step 3: Try wallet_sendCalls (Base App / smart wallet) ────────────
        // Use connector ID to detect smart wallet — no RPC call needed, avoids popup
        const supportsBatch = isSmartWallet
        let localTxHash = ''

        if (supportsBatch) {
          // Single popup for everything — approve + swap atomically
          const calls: Array<{ to: `0x${string}`; data: Hex; value?: bigint }> = []

          if (needsApproval && !hasAllowance && routerAddress) {
            const approveData = encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [routerAddress, maxUint256],
            })
            calls.push({ to: tokenIn.address as `0x${string}`, data: approveData })
          }

          calls.push({ to, data: swapData, value: swapValue > 0n ? swapValue : undefined })

          toast.loading('Confirm in wallet…', { id: 'swap' })
          // Use wagmi's sendCallsAsync — properly handles Base Account's EIP-5792
          const batchResult = await sendCallsAsync({
            calls: calls.map(c => ({
              to: c.to,
              data: c.data,
              ...(c.value && c.value > 0n ? { value: c.value } : {}),
            })),
          })
          const batchId = typeof batchResult === 'string' ? batchResult : batchResult.id
          setTxHash(batchId)
          localTxHash = batchId

          setStatus('success')
          toast.success('Swap submitted!', {
            id: 'swap',
            description: `Batch: ${batchId.slice(0, 10)}...`,
          })

        } else {
          // ── Fallback: sequential sendTransaction (MetaMask / EOA) ─────────────
          if (needsApproval && !hasAllowance && routerAddress) {
            setStatus('approving')
            toast.loading('Approving token...', { id: 'approve' })
            const approveData = encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [routerAddress, maxUint256],
            })
            const approveHash = await sendTransactionAsync({
              to: tokenIn.address as `0x${string}`,
              data: approveData,
            })
            // Wait for approval receipt with timeout (some wallets don't confirm quickly)
            await Promise.race([
              publicClient.waitForTransactionReceipt({ hash: approveHash }),
              new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('Approval confirmation timeout — please try again')), 30_000)
              ),
            ])
            toast.success('Token approved', { id: 'approve' })
          }

          setStatus('swapping')
          toast.loading('Sending swap transaction...', { id: 'swap' })
          const hash = await sendTransactionAsync({ to, data: swapData, value: swapValue })
          setTxHash(hash)
          localTxHash = hash

          setStatus('success')
          toast.success('Swap submitted!', {
            id: 'swap',
            description: `Tx: ${hash.slice(0, 10)}...`,
            action: { label: 'View', onClick: () => window.open(`https://basescan.org/tx/${hash}`, '_blank') },
          })

          // Background receipt check for reverts on EOA wallets
          publicClient.waitForTransactionReceipt({ hash })
            .then(receipt => {
              if (receipt.status === 'reverted') {
                setStatus('error')
                toast.error('Swap reverted on-chain', {
                  description: 'Check Basescan for details.',
                  action: { label: 'View', onClick: () => window.open(`https://basescan.org/tx/${hash}`, '_blank') },
                })
              }
            })
            .catch(() => { /* ignore */ })
        }

        addCustomToken(tokenOut)
        setTimeout(() => invalidateBalances(), 3000)

        // Use local hash variables (not txHash state — React state may not be updated yet)
        recordSwap({
          userAddress: address,
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          tokenInSymbol: tokenIn.symbol,
          tokenOutSymbol: tokenOut.symbol,
          amountIn,
          amountOut: quote.amountOutFormatted,
          dex: quote.dex,
          txHash: localTxHash,
          volumeUSD: estimateVolumeUSD(tokenIn.symbol, tokenOut.symbol, amountIn, quote.amountOutFormatted),
        })

      } catch (err: unknown) {
        setStatus('error')
        const message = err instanceof Error ? err.message : 'Swap failed'
        toast.error('Swap failed', { id: 'swap', description: message.slice(0, 100) })
      }
    },
    [address, publicClient, sendTransactionAsync, sendCallsAsync, invalidateBalances, isSmartWallet]
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
