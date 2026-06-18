'use client'

import { TokenIcon } from '@/components/swap/TokenSelector'
import { useTokenBalances } from '@/hooks/useTokenBalances'

interface PortfolioTableProps {
  address: string
}

export function PortfolioTable({ address }: PortfolioTableProps) {
  // Use the shared hook which includes custom tokens
  const { data: allBalances = [], isLoading } = useTokenBalances()

  // Filter to non-zero balances, sort by balance descending
  const balances = allBalances
    .filter((b) => b.balance > 0n)
    .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0))

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Portfolio</div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ height: '52px', borderRadius: '10px', background: 'var(--bg-input)', marginBottom: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>Portfolio</div>

      {balances.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
          No token balances found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {balances.map((b) => (
            <div
              key={b.token.address}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px 10px', borderRadius: '10px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-input)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <TokenIcon token={b.token} size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.token.symbol}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.token.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.balanceFormatted}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
