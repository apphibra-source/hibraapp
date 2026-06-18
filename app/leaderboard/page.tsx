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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>
          <span className="text-gradient">Leaderboard</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          Top traders ranked by score
        </p>
      </div>

      {/* Scoring rules */}
      <div
        className="card"
        style={{ padding: '14px 18px', marginBottom: '16px' }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          HOW TO EARN POINTS
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '8px',
          }}
        >
          {SCORING_RULES.map((rule) => (
            <div
              key={rule.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: 'rgba(124, 92, 252, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  color: rule.color,
                  flexShrink: 0,
                }}
              >
                {rule.icon}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: rule.color, lineHeight: 1 }}>
                  {rule.points}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {rule.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table + Your Rank */}
      <LeaderboardTable />
    </div>
  )
}
