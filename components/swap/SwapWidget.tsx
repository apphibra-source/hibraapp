'use client'

import { useState, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import type { Token, QuoteResult } from '@/types'
import { ETH_TOKEN, USDC_TOKEN } from '@/lib/tokens'
import { useSwapQuotes } from '@/hooks/useSwapQuotes'
import { useSwapExecution } from '@/hooks/useSwapExecution'
import { useTokenBalance } from '@/hooks/useTokenBalances'
import { TokenSelector } from './TokenSelector'
import { RouteDisplay } from './RouteDisplay'
import { SlippageSettings } from './SlippageSettings'
import { SwapConfirmModal } from './SwapConfirmModal'
import { DEFAULT_SLIPPAGE } from '@/constants'
import { parseTokenAmount } from '@/lib/utils'

export function SwapWidget() {
  const { isConnected } = useAccount()

  const [tokenIn, setTokenIn] = useState<Token>(ETH_TOKEN)
  const [tokenOut, setTokenOut] = useState<Token>(USDC_TOKEN)
  const [amountIn, setAmountIn] = useState('')
  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)
  const [selectedDex, setSelectedDex] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const tokenInBalance = useTokenBalance(tokenIn.address)
  const tokenOutBalance = useTokenBalance(tokenOut.address)

  const { data: quotes = [], isLoading: quotesLoading } = useSwapQuotes({
    tokenIn,
    tokenOut,
    amountIn,
    enabled: !!amountIn && parseFloat(amountIn) > 0,
  })

  const { executeSwap, status, reset } = useSwapExecution()

  const bestQuote = quotes.find((q) => q.isBest) ?? null
  const selectedQuote = quotes.find((q) => q.dex === selectedDex) ?? bestQuote

  const handleSwapTokens = useCallback(() => {
    setTokenIn(tokenOut)
    setTokenOut(tokenIn)
    setAmountIn('')
    setSelectedDex(null)
    reset()
  }, [tokenIn, tokenOut, reset])

  const handlePercentage = useCallback(
    (pct: number) => {
      if (!tokenInBalance) return
      const balance = tokenInBalance.balance
      const amount = (balance * BigInt(pct)) / 100n
      const formatted = (Number(amount) / 10 ** tokenIn.decimals).toFixed(6)
      setAmountIn(formatted)
    },
    [tokenInBalance, tokenIn.decimals]
  )

  const handleConfirmSwap = useCallback(async () => {
    if (!selectedQuote) return
    setShowConfirm(false)
    await executeSwap({
      tokenIn,
      tokenOut,
      amountIn,
      quote: selectedQuote,
      slippage,
      executeUrl: '/api/swap/execute-free', // /swap page: no x402 fee
    })
  }, [selectedQuote, executeSwap, tokenIn, tokenOut, amountIn, slippage])

  const isSwapping = status === 'approving' || status === 'swapping'
  const hasAmount = !!amountIn && parseFloat(amountIn) > 0
  const hasQuote = !!selectedQuote

  const insufficientBalance =
    hasAmount &&
    tokenInBalance &&
    parseTokenAmount(amountIn, tokenIn.decimals) > tokenInBalance.balance

  return (
    <div style={{ width: '100%', maxWidth: '460px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Swap</h2>
        <SlippageSettings slippage={slippage} onChange={setSlippage} />
      </div>

      {/* Input card */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You pay</span>
          {tokenInBalance && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Balance: {tokenInBalance.balanceFormatted}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="number"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text-main)',
              minWidth: 0,
              MozAppearance: 'textfield',
            } as React.CSSProperties}
            className="no-spinner"
            min="0"
          />
          <TokenSelector
            selected={tokenIn}
            onSelect={(t) => { setTokenIn(t); setSelectedDex(null) }}
            excludeAddress={tokenOut.address}
          />
        </div>

        {/* Percentage buttons */}
        {isConnected && tokenInBalance && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentage(pct)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--purple)'
                  e.currentTarget.style.color = 'var(--purple-light)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                {pct === 100 ? 'MAX' : `${pct}%`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Swap direction button */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
        <button
          onClick={handleSwapTokens}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'var(--bg-card2)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            zIndex: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--purple)'
            e.currentTarget.style.color = 'var(--purple-light)'
            e.currentTarget.style.transform = 'rotate(180deg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
            e.currentTarget.style.transform = 'rotate(0deg)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Output card */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>You receive</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {tokenOutBalance && (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Balance: {tokenOutBalance.balanceFormatted}
              </span>
            )}
            {quotesLoading && hasAmount && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fetching best rate...</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              flex: 1,
              fontSize: '28px',
              fontWeight: 700,
              color: selectedQuote ? 'var(--text-main)' : 'var(--text-muted)',
            }}
          >
            {selectedQuote
              ? parseFloat(selectedQuote.amountOutFormatted).toLocaleString('en-US', { maximumFractionDigits: 6 })
              : '0.0'}
          </div>
          <TokenSelector
            selected={tokenOut}
            onSelect={(t) => { setTokenOut(t); setSelectedDex(null) }}
            excludeAddress={tokenIn.address}
          />
        </div>
      </div>

      {/* Swap button */}
      {!isConnected ? (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '16px' }}
            >
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={!hasAmount || !hasQuote || !!insufficientBalance || isSwapping}
          className="btn-primary"
          style={{ width: '100%', padding: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {isSwapping ? (
            <>
              <span className="animate-spin" style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
              {status === 'approving' ? 'Approving...' : 'Swapping...'}
            </>
          ) : insufficientBalance ? (
            `Insufficient ${tokenIn.symbol} balance`
          ) : !hasAmount ? (
            'Enter an amount'
          ) : !hasQuote ? (
            'No route found'
          ) : (
            'Swap'
          )}
        </button>
      )}

      {/* Route comparison */}
      {(quotes.length > 0 || (quotesLoading && hasAmount)) && (
        <RouteDisplay
          quotes={quotes}
          selectedDex={selectedDex ?? bestQuote?.dex ?? null}
          onSelect={setSelectedDex}
          isLoading={quotesLoading && quotes.length === 0}
        />
      )}

      {/* Confirm modal */}
      {showConfirm && selectedQuote && (
        <SwapConfirmModal
          tokenIn={tokenIn}
          tokenOut={tokenOut}
          amountIn={amountIn}
          quote={selectedQuote}
          slippage={slippage}
          onConfirm={handleConfirmSwap}
          onCancel={() => setShowConfirm(false)}
          isLoading={isSwapping}
        />
      )}
    </div>
  )
}
