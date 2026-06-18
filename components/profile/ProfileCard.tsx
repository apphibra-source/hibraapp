'use client'

import { useUserScore, getTierForScore } from '@/hooks/useUserScore'
import { shortenAddress, formatUSD, formatCompact } from '@/lib/utils'

interface ProfileCardProps {
  address: string
}

export function ProfileCard({ address }: ProfileCardProps) {
  const { data: score, isLoading } = useUserScore(address)
  const tier = score ? getTierForScore(score.score) : null

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ height: '20px', width: '60%', borderRadius: '8px', background: 'var(--bg-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '14px', width: '40%', borderRadius: '8px', background: 'var(--bg-input)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '16px' }}>
      {/* Avatar + address */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: tier?.gradient ?? 'linear-gradient(135deg, #7c5cfc, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
          }}
        >
          {tier ? getTierEmoji(tier.tier) : '👤'}
        </div>
        <div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-main)',
              marginBottom: '4px',
            }}
          >
            {shortenAddress(address, 6)}
          </div>
          {tier && (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '20px',
                background: tier.gradient,
                color: 'white',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {tier.name}
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
        }}
      >
        {[
          { label: 'Score', value: score ? formatCompact(score.score) : '0' },
          { label: 'Swaps', value: score ? score.swapCount.toString() : '0' },
          { label: 'Volume', value: score ? formatUSD(score.volumeUSD) : '$0' },
          { label: 'Streak', value: score ? `${score.consecutiveDays}d` : '0d' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="card2"
            style={{ padding: '10px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
          </div>
        ))}
      </div>
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
