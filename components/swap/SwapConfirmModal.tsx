'use client'

import type { Token, QuoteResult } from '@/types'
import { TokenIcon } from './TokenSelector'
import { applySlippage } from '@/lib/utils'
import { formatUnits } from 'viem'

interface SwapConfirmModalProps {
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  quote: QuoteResult
  slippage: number
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

export function SwapConfirmModal({
  tokenIn,
  tokenOut,
  amountIn,
  quote,
  slippage,
  onConfirm,
  onCancel,
  isLoading,
}: SwapConfirmModalProps) {
  const minAmountOut = applySlippage(quote.amountOut, slippage)
  const minAmountOutFormatted = parseFloat(
    formatUnits(minAmountOut, tokenOut.decimals)
  ).toLocaleString('en-US', { maximumFractionDigits: 6 })

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div
        className="card animate-fade-in"
        style={{ width: '100%', maxWidth: '400px', padding: '24px' }}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700 }}>
          Confirm Swap
        </h3>

        {/* Token flow */}
        <div
          style={{
            background: 'var(--bg-input)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <TokenIcon token={tokenIn} size={28} />
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>{amountIn}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{tokenIn.symbol}</div>
            </div>
          </div>

          <div style={{ color: 'var(--text-muted)', marginBottom: '12px', paddingLeft: '4px' }}>↓</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TokenIcon token={tokenOut} size={28} />
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>
                {parseFloat(quote.amountOutFormatted).toLocaleString('en-US', { maximumFractionDigits: 6 })}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{tokenOut.symbol}</div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Route', value: quote.dexName },
            { label: 'Fee', value: quote.fee },
            { label: 'Slippage', value: `${(slippage / 100).toFixed(2)}%` },
            { label: 'Min. received', value: `${minAmountOutFormatted} ${tokenOut.symbol}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary"
            style={{ flex: 1, padding: '14px' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="btn-primary"
            style={{ flex: 2, padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isLoading ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                Swapping...
              </>
            ) : (
              'Confirm Swap'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
