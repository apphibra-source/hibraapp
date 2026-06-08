'use client'

import { useState, useCallback } from 'react'
import { useAccount, usePublicClient, useSendTransaction, useWalletClient } from 'wagmi'
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
// Wagmi 3.x doesn't support dataSuffix in createConfig, so we append manually.
const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: [process.env.NEXT_PUBLIC_BUILDER_CODE ?? 'bc_480ypir7'],
}) as Hex

/** Append ERC-8021 suffix to swap calldata */
function withAttribution(data: Hex): Hex {
  return concat([data, DATA_SUFFIX])
}

interface SwapExecutionParams {
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  quote: QuoteResult
  slippage: number
  /** Override the execute endpoint. Defaults to /api/swap/execute (x402 paid). */
  executeUrl?: string
}

type SwapStatus = 'idle' | 'approving' | 'swapping' | 'success' | 'error'

export function useSwapExecution() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { sendTransactionAsync } = useSendTransaction()
  const { data: walletClient } = useWalletClient()
  const invalidateBalances = useInvalidateBalances()
  const [status, setStatus] = useState<SwapStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)

  // Approve helper
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

    // Coinbase Smart Wallet (Base App) returns a UserOperation hash, not a regular
    // ETH tx hash — waitForTransactionReceipt may never resolve.
    // We wait up to 20s; if it times out we assume approval went through and continue.
    try {
      await Promise.race([
        publicClient.waitForTransactionReceipt({ hash }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('receipt_timeout')), 20_000)
        ),
      ])
    } catch (err) {
      if (err instanceof Error && err.message === 'receipt_timeout') {
        // Smart wallet: approval was submitted, give the chain 3s to index it
        await new Promise(r => setTimeout(r, 3_000))
      } else {
        throw err
      }
    }

    toast.success('Token approved', { id: 'approve' })
  }, [address, publicClient, sendTransactionAsync])

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
        // ── Step 1: Approve ───────────────────────────────────────────────────
        if (!isETHIn && quote.dex !== 'wrap') {
          setStatus('approving')
          const routerAddress = getRouterAddress(quote.dex)
          await approveToken(tokenIn.address as `0x${string}`, routerAddress, amountInParsed)
        }

        // ── Step 2: Get calldata ──────────────────────────────────────────────
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

        // First call without payment header — server responds 402 with JSON requirements.
        // Must send Accept: application/json to prevent x402 middleware returning HTML paywall.
        const x402Headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }

        let calldataRes = await fetch(executeUrl, {
          method: 'POST',
          headers: x402Headers,
          body: executeBody,
        })

        // ── x402 payment flow ─────────────────────────────────────────────────
        if (calldataRes.status === 402) {
          // walletClient may still be loading — wait up to 3s for it
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

          // Parse the 402 response body to get payment requirements
          const paymentRequiredBody = await calldataRes.json() as {
            x402Version: number
            accepts: unknown[]
            error?: string
          }

          // Select the best matching payment requirement (USDC on Base Sepolia)
          const requirements = paymentRequiredBody.accepts as Parameters<typeof selectPaymentRequirements>[0]
          const selected = selectPaymentRequirements(requirements)
          if (!selected) {
            toast.error('No compatible payment method found')
            setStatus('error')
            return
          }

          toast.loading('Approving $0.10 USDC payment…', { id: 'swap' })

          // Build and sign the payment header using the user's wallet
          // walletClient satisfies x402's SignerWallet at runtime (has chain, transport, signTypedData)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const paymentHeader = await createPaymentHeader(
            wc as unknown as Parameters<typeof createPaymentHeader>[0],
            paymentRequiredBody.x402Version,
            selected
          )

          // Retry with the signed X-PAYMENT header
          calldataRes = await fetch(executeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-PAYMENT': paymentHeader,
            },
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

        const { to, data, value: valueStr } = await calldataRes.json() as {
          to: `0x${string}`
          data: Hex
          value: string
        }

        // ── Step 3: Send the actual on-chain swap transaction ─────────────────
        toast.loading('Sending swap transaction...', { id: 'swap' })

        const hash = await sendTransactionAsync({
          to,
          data: withAttribution(data),  // append ERC-8021 builder code suffix
          value: BigInt(valueStr ?? '0'),
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

        // ── Protocol fee removed ──────────────────────────────────────────────

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
    [address, publicClient, sendTransactionAsync, walletClient, approveToken, invalidateBalances]
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
