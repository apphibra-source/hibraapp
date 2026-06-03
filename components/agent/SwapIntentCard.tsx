'use client'

import { useState, useEffect } from 'react'
import { useSwapExecution } from '@/hooks/useSwapExecution'
import { useAccount } from 'wagmi'
import type { Token, QuoteResult, DexId } from '@/types'

// Serialized version of QuoteResult — amountOut/gasEstimate are strings over the wire
interface SerializedQuoteResult {
  dex: DexId
  dexName: string
  amountOut: string        // bigint serialized as string
  amountOutFormatted: string
  fee: string
  priceImpact: number
  isBest: boolean
  gasEstimate?: string | null
}

interface SwapIntentInput {
  tokenIn: string
  tokenInSymbol: string
  tokenOut: string
  tokenOutSymbol: string
  tokenInDecimals: number
  tokenOutDecimals: number
  amountIn: string
  amountInRaw: string
  dex: string
  amountOut: string
  fee: string
  quoteRaw?: SerializedQuoteResult
}

/** Reconstruct a proper QuoteResult with bigint amountOut */
function deserializeQuote(q: SerializedQuoteResult): QuoteResult {
  return {
    ...q,
    amountOut: BigInt(q.amountOut),
    gasEstimate: q.gasEstimate ? BigInt(q.gasEstimate) : undefined,
  }
}

/**
 * Get a human-readable output amount.
 * Priority: quoteRaw.amountOutFormatted → numeric intent.amountOut → fallback "—"
 */
function formatAmountOut(intent: SwapIntentInput): string {
  // Best source: the formatted string directly from the quote result
  const fromQuote = intent.quoteRaw?.amountOutFormatted
  if (fromQuote && fromQuote !== '' && !isNaN(parseFloat(fromQuote))) {
    return parseFloat(fromQuote).toLocaleString('en-US', { maximumFractionDigits: 6 })
  }
  // Fallback: Claude-provided amountOut field (may be numeric string)
  const n = parseFloat(intent.amountOut)
  if (!isNaN(n)) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 6 })
  }
  return '—'
}

interface SwapIntentCardProps {
  intent: SwapIntentInput
  onDismiss: () => void
}

export function SwapIntentCard({ intent, onDismiss }: SwapIntentCardProps) {
  const { isConnected } = useAccount()
  const { executeSwap, status } = useSwapExecution()
  const [done, setDone] = useState(false)

  const isProcessing = status === 'approving' || status === 'swapping'

  // Only show success state when the transaction was actually confirmed on-chain
  useEffect(() => {
    if (status === 'success') {
      setDone(true)
    }
  }, [status])

  const handleConfirm = async () => {
    if (!intent.quoteRaw) return

    const tokenIn: Token = {
      address: intent.tokenIn,
      symbol: intent.tokenInSymbol,
      name: intent.tokenInSymbol,
      decimals: intent.tokenInDecimals,
    }
    const tokenOut: Token = {
      address: intent.tokenOut,
      symbol: intent.tokenOutSymbol,
      name: intent.tokenOutSymbol,
      decimals: intent.tokenOutDecimals,
    }

    // Reconstruct bigint fields that were serialized as strings over JSON
    const quote = deserializeQuote(intent.quoteRaw)

    await executeSwap({
      tokenIn,
      tokenOut,
      amountIn: intent.amountIn,
      quote,
      slippage: 50, // 0.5% default
    })

    // Don't mark done here — wait for status to become 'success' (see effect below)
  }

  if (done) {
    return (
      <div
        className="card2"
        style={{ padding: '16px', marginTop: '8px', textAlign: 'center' }}
      >
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--green)' }}>
          Swap submitted!
        </div>
        <button
          onClick={onDismiss}
          style={{
            marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)',
            background: 'none', border: 'none', cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    )
  }

  return (
    <div
      className="card2"
      style={{
        padding: '16px',
        marginTop: '8px',
        border: '1px solid var(--purple)',
        background: 'rgba(124, 92, 252, 0.06)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple-light)' }}>
          🔄 Swap Preview
        </div>
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* Token flow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{
          flex: 1, padding: '10px 12px', borderRadius: '10px',
          background: 'var(--bg-input)', textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>You pay</div>
          <div style={{ fontWeight: 700, fontSize: '15px' }}>
            {intent.amountIn} {intent.tokenInSymbol}
          </div>
        </div>

        <div style={{ color: 'var(--text-muted)', fontSize: '18px' }}>→</div>

        <div style={{
          flex: 1, padding: '10px 12px', borderRadius: '10px',
          background: 'var(--bg-input)', textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>You receive</div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--green)' }}>
            ≈{formatAmountOut(intent)} {intent.tokenOutSymbol}
          </div>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {[
          { label: 'Best route', value: intent.dex },
          { label: 'Fee', value: intent.fee },
          { label: 'Slippage', value: '0.5%' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontWeight: 500 }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onDismiss}
          disabled={isProcessing}
          className="btn-secondary"
          style={{ flex: 1, padding: '10px', fontSize: '13px' }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={isProcessing || !isConnected || !intent.quoteRaw}
          className="btn-primary"
          style={{
            flex: 2, padding: '10px', fontSize: '13px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          }}
        >
          {isProcessing ? (
            <>
              <span
                style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                  display: 'inline-block', animation: 'spin 0.8s linear infinite',
                }}
              />
              {status === 'approving' ? 'Approving…' : 'Swapping…'}
            </>
          ) : !isConnected ? (
            'Connect Wallet'
          ) : (
            'Confirm Swap'
          )}
        </button>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
