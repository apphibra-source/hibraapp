'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SwapRecord } from '@/types'
import { DEX_NAMES } from '@/constants'

interface TransactionHistoryProps {
  address: string
}

async function fetchSwapHistory(address: string): Promise<SwapRecord[]> {
  const res = await fetch(`/api/history?address=${address}`)
  if (!res.ok) return []
  const data = await res.json() as { history: SwapRecord[] }
  return data.history ?? []
}

// Same logos as RouteDisplay — tested and confirmed working
const DEX_LOGOS: Record<string, string> = {
  uniswapV3:     'https://coin-images.coingecko.com/coins/images/12504/small/uniswap-uni.png',
  aerodrome:     'https://coin-images.coingecko.com/coins/images/31745/small/token.png',
  sushiswap:     'https://coin-images.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
  pancakeswapV3: 'https://tokens.pancakeswap.finance/images/symbol/cake.png',
  wrap:          '',
}

function DexIcon({ dex }: { dex: string }) {
  const [failed, setFailed] = useState(false)
  const src = DEX_LOGOS[dex]

  if (!src || failed) {
    // Emoji fallback
    const emojis: Record<string, string> = {
      uniswapV3: '🦄', aerodrome: '✈️', sushiswap: '🍣',
      pancakeswapV3: '🥞', wrap: '🔄',
    }
    return (
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'rgba(124, 92, 252, 0.12)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', flexShrink: 0,
      }}>
        {emojis[dex] ?? '🔄'}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={dex}
      width={40}
      height={40}
      style={{ borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  )
}

export function TransactionHistory({ address }: TransactionHistoryProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['swapHistory', address],
    queryFn: () => fetchSwapHistory(address),
    // Refetch every 10s so new swaps appear quickly
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
          Transaction History
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: '60px',
              borderRadius: '10px',
              background: 'var(--bg-input)',
              marginBottom: '8px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 700 }}>Transaction History</div>
        {history.length > 0 && (
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              background: 'var(--bg-input)',
              padding: '3px 10px',
              borderRadius: '20px',
            }}
          >
            {history.length} swap{history.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {history.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--text-muted)',
            fontSize: '14px',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div>No swap history yet.</div>
          <div style={{ marginTop: '4px' }}>Start swapping to see your transactions here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {history.map((tx) => (
            <a
              key={tx.id}
              href={`https://basescan.org/tx/${tx.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                textDecoration: 'none',
                color: 'var(--text-main)',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-input)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {/* DEX icon */}
              <DexIcon dex={tx.dex} />

              {/* Swap details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {tx.tokenIn} → {tx.tokenOut}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center',
                  }}
                >
                  <span>{DEX_NAMES[tx.dex] ?? tx.dex}</span>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>{formatRelativeTime(tx.timestamp)}</span>
                </div>
              </div>

              {/* Amounts */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                  {parseFloat(tx.amountIn).toLocaleString('en-US', { maximumFractionDigits: 6 })}{' '}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{tx.tokenIn}</span>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--green)',
                    marginTop: '2px',
                  }}
                >
                  +{tx.scoreEarned} pts
                </div>
              </div>

              {/* External link icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: 'var(--text-muted)', flexShrink: 0 }}
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
