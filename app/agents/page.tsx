'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { NormalisedAgent } from '@/lib/bazaar'
import { AgentCard, AgentCardSkeleton } from '@/components/agents/AgentCard'

const CACHE_DURATION_MS = 60_000 // 60s client-side refresh guard

export default function AgentsPage() {
  const [agents, setAgents] = useState<NormalisedAgent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [searching, setSearching] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<NormalisedAgent | null>(null)

  const lastFetchRef = useRef<number>(0)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load catalog
  const loadCatalog = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetchRef.current < CACHE_DURATION_MS) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agents/catalog?limit=50')
      const data = await res.json() as { agents: NormalisedAgent[]; total: number; error?: string }
      setAgents(data.agents ?? [])
      setTotal(data.total ?? 0)
      lastFetchRef.current = Date.now()
    } catch {
      setError('Failed to load agents. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCatalog(true) }, [loadCatalog])

  // Debounced search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    if (!search.trim() && !maxPrice) {
      loadCatalog()
      return
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ q: search })
        if (maxPrice) params.set('maxPrice', maxPrice)
        const res = await fetch(`/api/agents/search?${params}`)
        const data = await res.json() as { agents: NormalisedAgent[] }
        setAgents(data.agents ?? [])
      } catch {
        // keep existing results
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [search, maxPrice, loadCatalog])

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>🤖</span>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>
            <span className="text-gradient">AI Agent</span> Discovery
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
          Discover x402-powered AI trading agents. Pay per signal in USDC on Base.
          {total > 0 && <span style={{ color: 'var(--purple-light)', marginLeft: '8px' }}>{total} agents available</span>}
        </p>
      </div>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search agents: momentum, ETH, yield..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ width: '100%', padding: '10px 36px 10px 14px', fontSize: '14px' }}
          />
          {searching && (
            <div style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              width: '16px', height: '16px', borderRadius: '50%',
              border: '2px solid var(--purple)', borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Max price
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>$</span>
            <input
              type="number"
              placeholder="0.10"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="input-field no-spinner"
              style={{ width: '80px', padding: '8px 10px', fontSize: '13px' }}
              min="0"
              step="0.001"
            />
          </div>
        </div>

        <button
          onClick={() => { setSearch(''); setMaxPrice(''); loadCatalog(true) }}
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '13px' }}
        >
          Reset
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', marginBottom: '20px',
          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444', fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Agent grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {Array.from({ length: 6 }).map((_, i) => <AgentCardSkeleton key={i} />)}
        </div>
      ) : agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No agents found</div>
          <div style={{ fontSize: '14px' }}>Try a different search or check back later.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {agents.map((agent) => (
            <AgentCard
              key={agent.resource}
              agent={agent}
              onUse={(a) => setSelectedAgent(a)}
            />
          ))}
        </div>
      )}

      {/* Selected agent banner */}
      {selectedAgent && (
        <div
          className="card animate-fade-in"
          style={{
            position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
            padding: '16px 20px', zIndex: 60, maxWidth: '500px', width: 'calc(100% - 32px)',
            display: 'flex', alignItems: 'center', gap: '12px',
            borderColor: 'var(--purple)',
          }}
        >
          <span style={{ fontSize: '22px' }}>🤖</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedAgent.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              ${selectedAgent.priceUsd}/call · {selectedAgent.network}
            </div>
          </div>
          <button
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
            onClick={() => {
              // Future: open chat/intent panel
              alert(`Agent selected: ${selectedAgent.name}\nComing in Phase 2: Intent Chat`)
            }}
          >
            Chat with Agent →
          </button>
          <button
            onClick={() => setSelectedAgent(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            ✕
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
