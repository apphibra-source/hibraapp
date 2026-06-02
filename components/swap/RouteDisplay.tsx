'use client'

import { useState } from 'react'
import type { QuoteResult } from '@/types'

interface RouteDisplayProps {
  quotes: QuoteResult[]
  selectedDex: string | null
  onSelect: (dex: string) => void
  isLoading: boolean
}

// Official logo URLs — tested and confirmed working
const DEX_LOGOS: Record<string, string> = {
  uniswapV3:     'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
  aerodrome:     'https://assets.coingecko.com/coins/images/31745/small/token.png',
  sushiswap:     'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
  pancakeswapV3: 'https://coin-images.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png',
  wrap:          '',
}

// Emoji fallback if all image sources fail
const DEX_EMOJI_FALLBACK: Record<string, string> = {
  uniswapV3:     '🦄',
  aerodrome:     '✈️',
  sushiswap:     '🍣',
  pancakeswapV3: '🥞',
  wrap:          '🔄',
}

function DexIcon({ dex }: { dex: string }) {
  const [failed, setFailed] = useState(false)

  if (dex === 'wrap') {
    return <span style={{ fontSize: '20px', lineHeight: 1 }}>🔄</span>
  }

  const src = DEX_LOGOS[dex]

  if (!src || failed) {
    return <span style={{ fontSize: '20px', lineHeight: 1 }}>{DEX_EMOJI_FALLBACK[dex] ?? '🔄'}</span>
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={dex}
      width={28}
      height={28}
      style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  )
}

export function RouteDisplay({ quotes, selectedDex, onSelect, isLoading }: RouteDisplayProps) {
  if (isLoading) {
    return (
      <div className="card2" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
          FETCHING ROUTES...
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: '56px', borderRadius: '12px', background: 'var(--bg-input)', opacity: 1 - i * 0.2, animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
      </div>
    )
  }

  if (quotes.length === 0) return null

  return (
    <div className="card2" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>
        AVAILABLE ROUTES
      </div>

      {quotes.map((quote) => {
        const isSelected = selectedDex === quote.dex
        const isBest = quote.isBest

        return (
          <button
            key={quote.dex}
            onClick={() => onSelect(quote.dex)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              border: `1px solid ${isBest ? 'var(--purple)' : isSelected ? 'var(--border-light)' : 'var(--border)'}`,
              background: isBest ? 'rgba(124, 92, 252, 0.08)' : isSelected ? 'var(--bg-input)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              width: '100%',
              color: 'var(--text-main)',
            }}
          >
            {/* DEX logo */}
            <DexIcon dex={quote.dex} />

            {/* DEX name + fee */}
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{quote.dexName}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Fee: {quote.fee}
                {quote.priceImpact > 0 && ` · Impact: ${quote.priceImpact.toFixed(2)}%`}
              </div>
            </div>

            {/* Amount out */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>
                {parseFloat(quote.amountOutFormatted).toLocaleString('en-US', { maximumFractionDigits: 6 })}
              </div>
            </div>

            {/* Best badge */}
            {isBest && (
              <span style={{
                padding: '2px 8px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #7c5cfc, #a855f7)',
                color: 'white', fontSize: '11px', fontWeight: 700, flexShrink: 0,
              }}>
                BEST
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
