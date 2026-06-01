'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { erc20Abi, isAddress } from 'viem'
import type { Token } from '@/types'
import { TOKENS } from '@/lib/tokens'
import { useTokenBalance, useTokenBalances } from '@/hooks/useTokenBalances'

interface TokenSelectorProps {
  selected: Token | null
  onSelect: (token: Token) => void
  excludeAddress?: string
}

// ── Token row ──────────────────────────────────────────────────────────────────
function TokenRow({ token, onSelect }: { token: Token; onSelect: (t: Token) => void }) {
  const balance = useTokenBalance(token.address)
  return (
    <button
      onClick={() => onSelect(token)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
        borderRadius: '10px', transition: 'background 0.12s ease', color: 'var(--text-main)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-input)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >
      <TokenIcon token={token} size={34} />
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{token.symbol}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{token.name}</div>
      </div>
      {balance && balance.balance > 0n && (
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', flexShrink: 0 }}>
          {balance.balanceFormatted}
        </div>
      )}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function TokenSelector({ selected, onSelect, excludeAddress }: TokenSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customToken, setCustomToken] = useState<Token | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const publicClient = usePublicClient()
  const { data: balances } = useTokenBalances()

  // Filter known tokens — non-zero balance first, then alphabetical
  const filtered = TOKENS.filter((t) => {
    if (excludeAddress && t.address.toLowerCase() === excludeAddress.toLowerCase()) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q)
    )
  }).sort((a, b) => {
    const getBalance = (addr: string) =>
      balances?.find((bl) => bl.token.address.toLowerCase() === addr.toLowerCase())?.balance ?? 0n
    const balA = getBalance(a.address)
    const balB = getBalance(b.address)
    if (balA > 0n && balB === 0n) return -1
    if (balA === 0n && balB > 0n) return 1
    return a.symbol.localeCompare(b.symbol)
  })

  // On-chain lookup when user pastes a contract address not in the list
  const lookupCustomToken = useCallback(async (addr: string) => {
    if (!publicClient || !isAddress(addr)) return
    // Already in list?
    const known = TOKENS.find(t => t.address.toLowerCase() === addr.toLowerCase())
    if (known) return
    setLookingUp(true)
    setLookupError('')
    setCustomToken(null)
    try {
      const [symbol, name, decimals] = await Promise.all([
        publicClient.readContract({ address: addr as `0x${string}`, abi: erc20Abi, functionName: 'symbol' }),
        publicClient.readContract({ address: addr as `0x${string}`, abi: erc20Abi, functionName: 'name' }),
        publicClient.readContract({ address: addr as `0x${string}`, abi: erc20Abi, functionName: 'decimals' }),
      ])
      setCustomToken({
        address: addr,
        symbol: symbol as string,
        name: name as string,
        decimals: decimals as number,
        // Use our proxy for custom tokens — it tries multiple sources
        logoURI: `/api/token-logo?address=${addr}`,
      })
    } catch {
      setLookupError('Token not found. Make sure the address is correct.')
    } finally {
      setLookingUp(false)
    }
  }, [publicClient])

  useEffect(() => {
    const trimmed = search.trim()
    if (isAddress(trimmed)) {
      lookupCustomToken(trimmed)
    } else {
      setCustomToken(null)
      setLookupError('')
    }
  }, [search, lookupCustomToken])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (token: Token) => {
    onSelect(token)
    setOpen(false)
    setSearch('')
    setCustomToken(null)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '7px 12px',
          background: selected ? 'var(--bg-card2)' : 'linear-gradient(135deg, #7c5cfc, #a855f7)',
          border: '1px solid var(--border)', borderRadius: '20px',
          cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '14px',
          transition: 'all 0.15s ease', flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        {selected ? (
          <>
            <TokenIcon token={selected} size={18} />
            {selected.symbol}
          </>
        ) : 'Select token'}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 8L1 3h10L6 8z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '16px',
        }}>
          <div
            ref={modalRef}
            className="card animate-fade-in"
            style={{ width: '100%', maxWidth: '420px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 18px 14px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Select Token</h3>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 5L5 15M5 5l10 10" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '12px 14px' }}>
              <input
                type="text"
                placeholder="Search name, symbol or paste address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                className="input-field"
                style={{ width: '100%', padding: '10px 14px', fontSize: '14px' }}
              />
            </div>

            {/* Token list */}
            <div style={{ overflowY: 'auto', padding: '0 6px 12px' }}>
              {/* Custom token from address lookup */}
              {lookingUp && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Looking up token...
                </div>
              )}
              {lookupError && (
                <div style={{ padding: '12px 14px', color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
                  {lookupError}
                </div>
              )}
              {customToken && (
                <>
                  <div style={{ padding: '6px 14px 4px', fontSize: '11px', fontWeight: 700, color: 'var(--purple-light)', letterSpacing: '0.05em' }}>
                    CUSTOM TOKEN
                  </div>
                  <TokenRow token={customToken} onSelect={handleSelect} />
                  <div style={{ height: '1px', background: 'var(--border)', margin: '8px 14px' }} />
                </>
              )}

              {/* Known tokens */}
              {filtered.length === 0 && !customToken && !lookingUp && !lookupError && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  No tokens found
                </div>
              )}
              {filtered.map((token) => (
                <TokenRow key={token.address} token={token} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Token Icon ─────────────────────────────────────────────────────────────────
export function TokenIcon({ token, size = 24 }: { token: Token; size?: number }) {
  const [srcIndex, setSrcIndex] = useState(0)

  // Reset srcIndex when token changes — prevents stale error state
  useEffect(() => {
    setSrcIndex(0)
  }, [token.address])

  const sources = buildSources(token)

  const handleError = () => {
    setSrcIndex((i) => i + 1)
  }

  // All sources exhausted — show colored initials
  if (srcIndex >= sources.length) {
    return <TokenInitials symbol={token.symbol} size={size} />
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${token.address}-${srcIndex}`}
      src={sources[srcIndex]}
      alt={token.symbol}
      width={size}
      height={size}
      style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
      onError={handleError}
    />
  )
}

function buildSources(token: Token): string[] {
  const addr = token.address
  const isNative = addr === '0x0000000000000000000000000000000000000000'
  const sources: string[] = []

  if (isNative) {
    // ETH — use multiple stable sources directly, skip proxy
    sources.push('https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png')
    sources.push('https://coin-images.coingecko.com/coins/images/279/small/ethereum.png')
    sources.push('https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png')
    return sources
  }

  // 1. Our proxy route (server-side fallback chain, cached 24h)
  sources.push(`/api/token-logo?address=${addr}`)

  // 2. Token's own logoURI as direct fallback
  if (token.logoURI) {
    sources.push(token.logoURI)
  }

  // Deduplicate
  return [...new Set(sources)]
}

function TokenInitials({ symbol, size }: { symbol: string; size: number }) {
  const colors = ['#7c5cfc', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  const colorIndex = symbol.charCodeAt(0) % colors.length
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: colors[colorIndex],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(size * 0.36, 8), fontWeight: 700, color: 'white', flexShrink: 0,
      userSelect: 'none',
    }}>
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  )
}
