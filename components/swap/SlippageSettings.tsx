'use client'

import { useState } from 'react'

interface SlippageSettingsProps {
  slippage: number // basis points
  onChange: (bps: number) => void
}

const PRESETS = [
  { label: '0.1%', bps: 10 },
  { label: '0.5%', bps: 50 },
  { label: '1%', bps: 100 },
]

export function SlippageSettings({ slippage, onChange }: SlippageSettingsProps) {
  const [open, setOpen] = useState(false)
  const [customInput, setCustomInput] = useState('')

  const currentLabel = PRESETS.find((p) => p.bps === slippage)?.label ?? `${(slippage / 100).toFixed(2)}%`
  const isHigh = slippage > 100

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'var(--bg-input)',
          border: `1px solid ${isHigh ? '#f59e0b' : 'var(--border)'}`,
          borderRadius: '20px',
          color: isHigh ? '#f59e0b' : 'var(--text-muted)',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        </svg>
        Slippage: {currentLabel}
      </button>

      {open && (
        <div
          className="card animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '240px',
            padding: '16px',
            zIndex: 20,
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
            SLIPPAGE TOLERANCE
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.bps}
                onClick={() => {
                  onChange(preset.bps)
                  setCustomInput('')
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: `1px solid ${slippage === preset.bps ? 'var(--purple)' : 'var(--border)'}`,
                  background: slippage === preset.bps ? 'rgba(124, 92, 252, 0.15)' : 'var(--bg-input)',
                  color: slippage === preset.bps ? 'var(--purple-light)' : 'var(--text-muted)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              placeholder="Custom"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value)
                const val = parseFloat(e.target.value)
                if (!isNaN(val) && val > 0 && val <= 50) {
                  onChange(Math.round(val * 100))
                }
              }}
              className="input-field"
              style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              min="0.01"
              max="50"
              step="0.1"
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>%</span>
          </div>

          {isHigh && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                fontSize: '12px',
                color: '#f59e0b',
              }}
            >
              ⚠️ High slippage — your transaction may be frontrun
            </div>
          )}
        </div>
      )}
    </div>
  )
}
