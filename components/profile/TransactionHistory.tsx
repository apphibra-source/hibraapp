'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SwapRecord } from '@/types'
import { DEX_NAMES } from '@/constants'

const PAGE_SIZE = 5

interface TransactionHistoryProps {
  address: string
}

async function fetchSwapHistory(address: string): Promise<SwapRecord[]> {
  const res = await fetch(`/api/history?address=${address}`)
  if (!res.ok) return []
  const data = await res.json() as { history: SwapRecord[] }
  return data.history ?? []
}

const DEX_LOGOS: Record<string, string> = {
  uniswapV3:     'https://coin-images.coingecko.com/coins/images/12504/small/uniswap-uni.png',
  aerodrome:     'https://coin-images.coingecko.com/coins/images/31745/small/token.png',
  sushiswap:     'https://coin-images.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
  pancakeswapV3: 'https://coin-images.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png',
  wrap:          '',
}

function DexIcon({ dex }: { dex: string }) {
  const [failed, setFailed] = useState(false)
  const src = DEX_LOGOS[dex]

  if (!src || failed) {
    const emojis: Record<string, string> = {
      uniswapV3: '🦄', aerodrome: '✈️', sushiswap: '🍣',
      pancakeswapV3: '🥞', wrap: '🔄',
    }
    return (
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: 'rgba(124, 92, 252, 0.12)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px', flexShrink: 0,
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
      width={36}
      height={36}
      style={{ borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  )
}

/** Compact page number list with ellipsis */
function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  const around = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total))
  let prev = 0
  for (const p of [...around].sort((a, b) => a - b)) {
    if (p - prev > 1) pages.push('...')
    pages.push(p)
    prev = p
  }
  return pages
}

export function TransactionHistory({ address }: TransactionHistoryProps) {
  const [page, setPage] = useState(1)

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['swapHistory', address],
    queryFn: () => fetchSwapHistory(address),
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  const totalPages = Math.ceil(history.length / PAGE_SIZE)
  const offset = (page - 1) * PAGE_SIZE
  const pageItems = history.slice(offset, offset + PAGE_SIZE)

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
          Transaction History
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: '52px',
              borderRadius: '10px',
              background: 'var(--bg-input)',
              marginBottom: '6px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '15px', fontWeight: 700 }}>Transaction History</div>
        {history.length > 0 && (
          <span style={{
            fontSize: '11px', color: 'var(--text-muted)',
            background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '20px',
          }}>
            {history.length} swap{history.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📊</div>
          <div>No swap history yet.</div>
          <div style={{ marginTop: '4px' }}>Start swapping to see your transactions here.</div>
        </div>
      ) : (
        <>
          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {pageItems.map((tx) => (
              <a
                key={tx.id}
                href={`https://basescan.org/tx/${tx.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px', borderRadius: '10px',
                  textDecoration: 'none', color: 'var(--text-main)',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-input)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <DexIcon dex={tx.dex} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {tx.tokenIn} → {tx.tokenOut}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '6px' }}>
                    <span>{DEX_NAMES[tx.dex] ?? tx.dex}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{formatRelativeTime(tx.timestamp)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>
                    {parseFloat(tx.amountIn).toLocaleString('en-US', { maximumFractionDigits: 6 })}{' '}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{tx.tokenIn}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '2px' }}>
                    +{tx.scoreEarned} pts
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--bg-card2)', color: page === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                  cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '12px',
                  opacity: page === 1 ? 0.4 : 1,
                }}
              >‹ Prev</button>

              {buildPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '0 2px' }}>…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    style={{
                      width: '30px', height: '30px', borderRadius: '8px', border: '1px solid',
                      borderColor: p === page ? 'var(--purple)' : 'var(--border)',
                      background: p === page ? 'rgba(124, 92, 252, 0.20)' : 'var(--bg-card2)',
                      color: p === page ? 'var(--purple-light)' : 'var(--text-main)',
                      cursor: 'pointer', fontSize: '12px', fontWeight: p === page ? 700 : 400,
                    }}
                  >{p}</button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--bg-card2)', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '12px',
                  opacity: page === totalPages ? 0.4 : 1,
                }}
              >Next ›</button>
            </div>
          )}

          {/* Page info */}
          <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, history.length)} of {history.length}
          </div>
        </>
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
