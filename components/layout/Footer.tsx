import Link from 'next/link'

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '24px',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            © 2025 BaseAgg — DEX Aggregator on{' '}
            <a
              href="https://base.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--purple-light)', textDecoration: 'none' }}
            >
              Base
            </a>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { label: 'Swap', href: '/swap' },
            { label: 'Mint', href: '/mint' },
            { label: 'Leaderboard', href: '/leaderboard' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
