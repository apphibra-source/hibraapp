'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const NAV_LINKS = [
  { href: '/swap',        label: 'Swap',        icon: <SwapIcon /> },
  { href: '/agent',       label: 'Agent',       icon: <AgentIcon /> },
  { href: '/mint',        label: 'Mint',        icon: <MintIcon /> },
  { href: '/leaderboard', label: 'Leaderboard', icon: <LeaderboardIcon /> },
  { href: '/profile',     label: 'Profile',     icon: <ProfileIcon /> },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        background: 'rgba(13, 13, 26, 0.95)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* ── Desktop: single row — Logo | Tabs (center) | Connect Wallet ──── */}
      {/* ── Mobile: two rows — Logo+Connect / Tab bar ───────────────────── */}

      {/* Top row */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {/* Logo */}
        <Link
          href="/swap"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
          }}
        >
          <HibraLogo />
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            Hibra
          </span>
        </Link>

        {/* Desktop center tabs — hidden on mobile */}
        <div className="desktop-tabs" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 18px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive
                    ? 'linear-gradient(135deg, #7c5cfc, #a855f7)'
                    : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Connect Wallet */}
        <div style={{ flexShrink: 0 }}>
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted
              const connected = ready && account && chain
              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                  })}
                >
                  {!connected ? (
                    <button
                      onClick={openConnectModal}
                      className="btn-primary"
                      style={{ padding: '9px 20px', fontSize: '14px', borderRadius: '20px', whiteSpace: 'nowrap' }}
                    >
                      Connect Wallet
                    </button>
                  ) : chain.unsupported ? (
                    <button
                      onClick={openChainModal}
                      style={{
                        padding: '8px 14px', borderRadius: '20px',
                        background: '#ef4444', color: 'white',
                        border: 'none', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 600,
                      }}
                    >
                      Wrong Network
                    </button>
                  ) : (
                    <button
                      onClick={openAccountModal}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '7px 14px', borderRadius: '20px',
                        background: 'var(--bg-card2)', border: '1px solid var(--border)',
                        color: 'var(--text-main)', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 500,
                        transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
                      {account.displayName}
                    </button>
                  )}
                </div>
              )
            }}
          </ConnectButton.Custom>
        </div>
      </div>

      {/* Mobile tab bar — hidden on desktop */}
      <div
        className="mobile-tabs"
        style={{
          display: 'none',
          padding: '0 12px 10px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'white' : 'var(--text-muted)',
                  background: isActive
                    ? 'linear-gradient(135deg, #7c5cfc, #a855f7)'
                    : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>

      <style>{`
        @media (min-width: 769px) {
          .desktop-tabs { display: flex !important; }
          .mobile-tabs  { display: none !important; }
        }
        @media (max-width: 768px) {
          .desktop-tabs { display: none !important; }
          .mobile-tabs  { display: block !important; }
          .mobile-tabs::-webkit-scrollbar { display: none; }
        }
      `}</style>
    </nav>
  )
}

// ── Mobile Bottom Nav (removed — tab bar replaces it) ─────────────────────────
export function MobileBottomNav() {
  return null
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function AgentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" strokeWidth="3" />
      <line x1="12" y1="16" x2="12" y2="16" strokeWidth="3" />
      <line x1="16" y1="16" x2="16" y2="16" strokeWidth="3" />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14M15 4l4 4-4 4" />
      <path d="M19 16H5M9 12l-4 4 4 4" />
    </svg>
  )
}

function MintIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="15.5" />
      <polyline points="22 8.5 12 15.5 2 8.5" />
    </svg>
  )
}

function LeaderboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function HibraLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/hibra_20260601_020811_0000.png"
      alt="Hibra"
      width={34}
      height={34}
      style={{
        display: 'block',
        flexShrink: 0,
        mixBlendMode: 'screen',
      }}
    />
  )
}
