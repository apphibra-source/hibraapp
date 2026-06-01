'use client'

import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { shortenAddress, formatUSD, formatCompact } from '@/lib/utils'
import { getTierForScore } from '@/hooks/useUserScore'

export function LeaderboardTable() {
  const { data, isLoading, error } = useLeaderboard({ limit: 50 })
  const { address: connectedAddress } = useAccount()

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        {Array.from({ length: 10 }).map((_, i) => (
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
    )
  }

  if (error) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Failed to load leaderboard. Please try again.
      </div>
    )
  }

  const users = data?.users ?? []

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Table header */}
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
      {users.map((user) => {
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
      })}
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
