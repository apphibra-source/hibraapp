'use client'

import { useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { toast } from 'sonner'
import { useUserScore, getTierForScore, getNextTier } from '@/hooks/useUserScore'
import { NFT_TIERS } from '@/constants'
import { ADDRESSES } from '@/lib/contracts/addresses'
import { TRADER_NFT_ABI } from '@/lib/contracts/abis/traderNFT'
import type { TierInfo } from '@/types'

const NFT_ADDRESSES: Record<number, `0x${string}`> = {
  0: ADDRESSES.NFT_BRONZE,
  1: ADDRESSES.NFT_SILVER,
  2: ADDRESSES.NFT_GOLD,
  3: ADDRESSES.NFT_DIAMOND,
}

export function MintCard() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync } = useWriteContract()
  const { data: score, isLoading, refetch: refetchScore } = useUserScore()
  const [isMinting, setIsMinting] = useState(false)
  const [minted, setMinted] = useState(false)

  const currentScore = score?.score ?? 0
  const eligibleTier = getEligibleTier(currentScore)
  const nextTier = eligibleTier ? getNextTier(eligibleTier.minScore) : NFT_TIERS[0]

  const progressToNext =
    eligibleTier && nextTier
      ? Math.min(
          ((currentScore - eligibleTier.minScore) /
            (nextTier.minScore - eligibleTier.minScore)) *
            100,
          100
        )
      : 0

  const handleMint = async () => {
    if (!address || !eligibleTier || !publicClient) return
    setIsMinting(true)

    try {
      const contractAddress = NFT_ADDRESSES[eligibleTier.tier]

      // Check if already minted
      const alreadyMinted = await publicClient.readContract({
        address: contractAddress,
        abi: TRADER_NFT_ABI,
        functionName: 'hasMinted',
        args: [address],
      })

      if (alreadyMinted) {
        toast.error('You already minted this NFT tier.')
        setMinted(true)
        return
      }

      toast.loading('Minting NFT...', { id: 'mint' })

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: TRADER_NFT_ABI,
        functionName: 'mint',
      })

      await publicClient.waitForTransactionReceipt({ hash })

      // Award +100 pts
      await fetch('/api/score/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress: address, tier: eligibleTier.tier }),
      })

      setMinted(true)
      refetchScore()

      toast.success(`${eligibleTier.name} NFT minted!`, {
        id: 'mint',
        description: '+100 pts awarded',
        action: {
          label: 'View',
          onClick: () =>
            window.open(`https://basescan.org/tx/${hash}`, '_blank'),
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Mint failed'
      toast.error('Mint failed', { id: 'mint', description: msg.slice(0, 100) })
    } finally {
      setIsMinting(false)
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Current tier card */}
      <div
        className="card"
        style={{ padding: '20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: eligibleTier?.color ?? '#7c5cfc',
            opacity: 0.06,
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />

        {/* NFT Preview */}
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '16px',
            background: eligibleTier?.gradient ?? 'linear-gradient(135deg, #2a2a55, #1a1a35)',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '42px',
            boxShadow: `0 8px 32px ${eligibleTier?.color ?? '#7c5cfc'}40`,
          }}
        >
          {eligibleTier ? getTierEmoji(eligibleTier.tier) : '🔒'}
        </div>

        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700 }}>
          {eligibleTier ? eligibleTier.name : 'No Tier Yet'}
        </h2>
        <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
          {isConnected
            ? `Your score: ${currentScore.toLocaleString()} pts`
            : 'Connect wallet to see your tier'}
        </p>

        {/* Progress to next tier */}
        {isConnected && nextTier && eligibleTier && (
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '6px',
              }}
            >
              <span>{eligibleTier.name}</span>
              <span>
                {nextTier.name} ({nextTier.minScore.toLocaleString()} pts)
              </span>
            </div>
            <div
              style={{
                height: '6px',
                borderRadius: '3px',
                background: 'var(--bg-input)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressToNext}%`,
                  background: eligibleTier.gradient,
                  borderRadius: '3px',
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Mint button */}
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={openConnectModal}
                className="btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '15px' }}
              >
                Connect Wallet to Mint
              </button>
            )}
          </ConnectButton.Custom>
        ) : minted ? (
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: 'var(--green)',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            ✅ NFT Minted Successfully
          </div>
        ) : !eligibleTier ? (
          <div
            style={{
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            🔒 Reach 500 pts to unlock Bronze NFT
            <div style={{ marginTop: '6px', fontSize: '12px' }}>
              {500 - currentScore} pts to go — keep swapping!
            </div>
          </div>
        ) : (
          <button
            onClick={handleMint}
            disabled={isMinting || isLoading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isMinting ? (
              <>
                <span
                  className="animate-spin"
                  style={{
                    display: 'inline-block',
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                  }}
                />
                Minting...
              </>
            ) : (
              `Mint ${eligibleTier.name} NFT`
            )}
          </button>
        )}
      </div>

      {/* All tiers */}
      <div className="card" style={{ padding: '14px' }}>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            marginBottom: '10px',
          }}
        >
          ALL TIERS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NFT_TIERS.map((tier) => {
            const isEligible = currentScore >= tier.minScore
            const isCurrent = eligibleTier?.tier === tier.tier

            return (
              <div
                key={tier.tier}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  border: `1px solid ${isCurrent ? 'var(--purple)' : 'var(--border)'}`,
                  background: isCurrent ? 'rgba(124, 92, 252, 0.06)' : 'transparent',
                  opacity: isEligible ? 1 : 0.45,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: tier.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  {getTierEmoji(tier.tier)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{tier.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {tier.minScore.toLocaleString()}+ pts required
                  </div>
                </div>
                {isCurrent && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, #7c5cfc, #a855f7)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}
                  >
                    ELIGIBLE
                  </span>
                )}
                {isEligible && !isCurrent && (
                  <span style={{ color: 'var(--green)', fontSize: '14px' }}>✓</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Returns the highest tier the user is eligible for, or null if below 500 */
function getEligibleTier(score: number): TierInfo | null {
  for (let i = NFT_TIERS.length - 1; i >= 0; i--) {
    if (score >= NFT_TIERS[i].minScore) return NFT_TIERS[i]
  }
  return null
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
