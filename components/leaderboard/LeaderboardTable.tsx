'use client'

import { useState } from 'react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { shortenAddress, formatUSD, formatCompact } from '@/lib/utils'
import { getTierForScore } from '@/hooks/useUserScore'

const PAGE_SIZE = 10

export function LeaderboardTable() {
  const [page, setPage] = useState(1)
  const { address: connectedAddress } = useAccount()

  const offset = (page - 1) * PAGE_SIZE
  const { data, isLoading, error } = useLeaderboard({ limit: PAGE_SIZE, offset })

  // Fetch user's own rank (search across all entries)
  const { data: myData } = useLeaderboard({ limit: 1000, offset: 0 })
  const myEntry = myData?.users.find(
    (u) => connectedAddress && u.address.toLowerCase() === connectedAddress.toLowerCase()
  )

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Your Rank Card ──────────────────────────────────────────────────────────
  const YourRankCard = () => {
    if (!connectedAddress) return null
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '48px 1fr 100px 100px 80px',
          gap: '12px',
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'rgba(124, 92, 252, 0.10)',
          border: '1px solid rgba(124, 92, 252, 0.35)',
          marginBottom: '8px',
          alignItems: 'center',
        }}
      >
        {/* Rank # */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your rank
          </span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--purple-light)', lineHeight: 1 }}>
            {myEntry ? `#${myEntry.rank}` : '—'}
          </span>
        </div>

        {/* Trader label (blank — keeps grid aligned) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(124, 92, 252, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            🏆
          </div>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple-light)', fontFamily: 'monospace' }}>
            {shortenAddress(connectedAddress)}
            <span
              style={{
                marginLeft: '6px',
                padding: '1px 6px',
                borderRadius: '20px',
                background: 'rgba(124, 92, 252, 0.2)',
                color: 'var(--purple-light)',
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'sans-serif',
              }}
            >
              YOU
            </span>
          </span>
        </div>

        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--purple-light)' }}>
            {myEntry ? formatCompact(myEntry.score) : '—'}
          </span>
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {myEntry ? formatUSD(myEntry.volumeUSD) : '—'}
          </span>
        </div>

        {/* Swaps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {myEntry ? myEntry.swapCount : '—'}
          </span>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div>
        <YourRankCard />
        <div className="card" style={{ padding: '20px' }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div
              key={i}
              style={{
                height: '56px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                marginBottom: '8px',
                opacity: 1 - i * 0.08,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Failed to load leaderboard. Please try again.
      </div>
    )
  }

  return (
    <div>
      {/* Your Rank */}
      <YourRankCard />

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 100px 100px 80px',
            gap: '12px',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>#</span>
          <span>Trader</span>
          <span style={{ textAlign: 'right' }}>Score</span>
          <span style={{ textAlign: 'right' }}>Volume</span>
          <span style={{ textAlign: 'right' }}>Swaps</span>
        </div>

        {/* Rows */}
        {users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No traders yet. Be the first to swap!
          </div>
        ) : (
          users.map((user) => {
            const isMe = connectedAddress?.toLowerCase() === user.address.toLowerCase()
            const tier = getTierForScore(user.score)

            return (
              <Link
                key={user.address}
                href={`/profile/${user.address}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 100px 100px 80px',
                  gap: '12px',
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border)',
                  textDecoration: 'none',
                  color: 'var(--text-main)',
                  background: isMe ? 'rgba(124, 92, 252, 0.06)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isMe) e.currentTarget.style.background = 'var(--bg-input)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isMe ? 'rgba(124, 92, 252, 0.06)' : 'transparent'
                }}
              >
                {/* Rank */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {user.rank <= 3 ? (
                    <span style={{ fontSize: '18px' }}>
                      {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {user.rank}
                    </span>
                  )}
                </div>

                {/* Address + tier */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: tier.gradient,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}
                  >
                    {getTierEmoji(tier.tier)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        fontWeight: isMe ? 700 : 500,
                        color: isMe ? 'var(--purple-light)' : 'var(--text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shortenAddress(user.address)}
                      {isMe && (
                        <span
                          style={{
                            marginLeft: '6px',
                            padding: '1px 6px',
                            borderRadius: '20px',
                            background: 'rgba(124, 92, 252, 0.2)',
                            color: 'var(--purple-light)',
                            fontSize: '10px',
                            fontWeight: 700,
                            fontFamily: 'sans-serif',
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tier.name}</div>
                  </div>
                </div>

                {/* Score */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--purple-light)' }}>
                    {formatCompact(user.score)}
                  </span>
                </div>

                {/* Volume */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {formatUSD(user.volumeUSD)}
                  </span>
                </div>

                {/* Swaps */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {user.swapCount}
                  </span>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '24px',
            flexWrap: 'wrap',
          }}
        >
          {/* Prev */}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card2)',
              color: page === 1 ? 'var(--text-muted)' : 'var(--text-main)',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: page === 1 ? 0.4 : 1,
              transition: 'all 0.15s',
            }}
          >
            ‹ Prev
          </button>

          {/* Page numbers */}
          {buildPageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span
                key={`ellipsis-${i}`}
                style={{ color: 'var(--text-muted)', fontSize: '14px', padding: '0 4px' }}
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: p === page ? 'var(--purple)' : 'var(--border)',
                  background: p === page ? 'rgba(124, 92, 252, 0.20)' : 'var(--bg-card2)',
                  color: p === page ? 'var(--purple-light)' : 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: p === page ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {p}
              </button>
            )
          )}

          {/* Next */}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--bg-card2)',
              color: page === totalPages ? 'var(--text-muted)' : 'var(--text-main)',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: page === totalPages ? 0.4 : 1,
              transition: 'all 0.15s',
            }}
          >
            Next ›
          </button>
        </div>
      )}

      {/* Page info */}
      {total > 0 && (
        <div
          style={{
            textAlign: 'center',
            marginTop: '12px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} traders
        </div>
      )}
    </div>
  )
}

function getTierEmoji(tier: number): string {
  switch (tier) {
    case 0: return '🥉'
    case 1: return '🥈'
    case 2: return '🥇'
    case 3: return '💎'
    default: return '👤'
  }
}

/** Build a compact page number list with ellipsis */
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
