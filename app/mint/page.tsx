import { MintCard } from '@/components/mint/MintCard'

export const metadata = {
  title: 'Mint NFT — BaseAgg',
  description: 'Mint your Trader NFT based on your swap score on BaseAgg.',
}

export default function MintPage() {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '480px', marginBottom: '16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>
          Mint Your{' '}
          <span className="text-gradient">Trader NFT</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
          Earn points by swapping and mint an NFT that reflects your trading tier.
        </p>
      </div>
      <MintCard />
    </div>
  )
}
