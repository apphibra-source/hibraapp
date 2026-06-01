'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export default function ProfileRedirectPage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (isConnected && address) {
      router.replace(`/profile/${address}`)
    }
  }, [isConnected, address, router])

  if (!isConnected) {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '40px 16px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px' }}>👤</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Connect your wallet</h2>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Connect your wallet to view your profile and trading stats.
        </p>
        <ConnectButton />
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ color: 'var(--text-muted)' }}>Redirecting...</div>
    </div>
  )
}
