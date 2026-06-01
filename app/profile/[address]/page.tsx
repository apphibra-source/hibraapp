import { ProfileCard } from '@/components/profile/ProfileCard'
import { PortfolioTable } from '@/components/profile/PortfolioTable'
import { TransactionHistory } from '@/components/profile/TransactionHistory'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = await params
  return {
    title: `${address.slice(0, 6)}...${address.slice(-4)} — BaseAgg Profile`,
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = await params

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <ProfileCard address={address} />
      <PortfolioTable address={address} />
      <TransactionHistory address={address} />
    </div>
  )
}
