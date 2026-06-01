import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'

export const metadata = {
  title: 'Leaderboard — BaseAgg',
  description: 'Top traders on BaseAgg ranked by swap score.',
}

const SCORING_RULES = [
  { label: 'Every Swap', points: '+50 pts', icon: '🔄', color: '#7c5cfc' },
  { label: 'Mint Any NFT', points: '+100 pts', icon: '🎖️', color: '#a855f7' },
]

export default function LeaderboardPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px' }}>
          <span className="text-gradient">Leaderboard</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: 0 }}>
          Top traders ranked by score.
        </p>
      </div>

      {/* Scoring rules */}
      <div
        className="card"
        style={{ padding: '20px', marginBottom: '24px' }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.06em',
            marginBottom: '14px',
          }}
        >
          HOW TO EARN POINTS
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px',
          }}
        >
          {SCORING_RULES.map((rule) => (
            <div
              key={rule.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '14px',
                borderRadius: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '22px' }}>{rule.icon}</span>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: rule.color,
                }}
              >
                {rule.points}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                {rule.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <LeaderboardTable />
    </div>
  )
}
