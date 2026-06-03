'use client'

import { useState } from 'react'
import type { NormalisedAgent } from '@/lib/bazaar'

interface AgentCardProps {
  agent: NormalisedAgent
  onUse: (agent: NormalisedAgent) => void
}

export function AgentCard({ agent, onUse }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false)

  const priceColor = parseFloat(agent.priceUsd) < 0.01
    ? 'var(--green)'
    : parseFloat(agent.priceUsd) < 0.10
    ? '#f59e0b'
    : '#ef4444'

  return (
    <div
      className="card"
      style={{
        padding: '18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'border-color 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--purple)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {/* Robot avatar */}
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
          background: 'linear-gradient(135deg, #7c5cfc, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          🤖
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: '14px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {agent.name}
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px',
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
            cursor: 'pointer',
          }}
            onClick={() => setExpanded(!expanded)}
          >
            {agent.description}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Price */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '4px 10px', borderRadius: '20px',
          background: 'var(--bg-input)', border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Price/call</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: priceColor }}>
            ${agent.priceUsd}
          </span>
        </div>

        {/* Network */}
        <div style={{
          padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
          background: 'rgba(0, 82, 255, 0.1)', border: '1px solid rgba(0, 82, 255, 0.3)',
          color: '#6699ff', fontWeight: 600,
        }}>
          {agent.network}
        </div>

        {/* Last updated */}
        <div style={{
          padding: '4px 10px', borderRadius: '20px', fontSize: '10px',
          color: 'var(--text-muted)', background: 'var(--bg-input)',
        }}>
          {formatRelative(agent.lastUpdated)}
        </div>
      </div>

      {/* Resource URL (truncated) */}
      <div style={{
        fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {agent.resource}
      </div>

      {/* CTA */}
      <button
        onClick={() => onUse(agent)}
        className="btn-primary"
        style={{ width: '100%', padding: '10px', fontSize: '13px' }}
      >
        Use This Agent
      </button>
    </div>
  )
}

export function AgentCardSkeleton() {
  return (
    <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[38, 14, 28, 10, 36].map((h, i) => (
        <div key={i} style={{
          height: `${h}px`, borderRadius: '8px', width: i === 1 ? '60%' : '100%',
          background: 'var(--bg-input)', animation: 'pulse 1.5s ease-in-out infinite',
          opacity: 1 - i * 0.1,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:.3} }`}</style>
    </div>
  )
}

function formatRelative(isoDate: string): string {
  try {
    const diff = Date.now() - new Date(isoDate).getTime()
    const hours = Math.floor(diff / 3_600_000)
    const days = Math.floor(diff / 86_400_000)
    if (hours < 1) return 'just now'
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  } catch {
    return 'unknown'
  }
}
