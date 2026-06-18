import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable'

export const metadata = {
  title: 'Leaderboard — Hibra',
  description: 'Top traders on Hibra ranked by swap score.',
}

const SCORING_RULES = [
  { label: 'Every Swap', points: '+50 pts', icon: '⇄', color: '#7c5cfc' },
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
          Top traders ranked by score
        </p>
      </div>

      {/* Scoring rules */}
      <div
        className="card"
        style={{ padding: '20px 24px', marginBottom: '24px' }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          HOW TO EARN POINTS
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '12px',
          }}
        >
          {SCORING_RULES.map((rule) => (
            <div
              key={rule.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '16px',
                borderRadius: '14px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(124, 92, 252, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  color: rule.color,
                }}
              >
                {rule.icon}
              </div>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: rule.color,
                  lineHeight: 1,
                }}
              >
                {rule.points}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                {rule.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table + Your Rank */}
      <LeaderboardTable />
    </div>
  )
}
