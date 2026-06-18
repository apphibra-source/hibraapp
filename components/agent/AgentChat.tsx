'use client'

import { useState, useRef, useEffect } from 'react'
import { SwapIntentCard } from './SwapIntentCard'
import type { DexId } from '@/types'

// Serialized (wire) shape — amountOut/gasEstimate are strings because bigint can't round-trip JSON
interface SerializedQuoteResult {
  dex: DexId
  dexName: string
  amountOut: string
  amountOutFormatted: string
  fee: string
  priceImpact: number
  isBest: boolean
  gasEstimate?: string | null
}

interface SwapIntentInput {
  tokenIn: string
  tokenInSymbol: string
  tokenOut: string
  tokenOutSymbol: string
  tokenInDecimals: number
  tokenOutDecimals: number
  amountIn: string
  amountInRaw: string
  dex: string
  amountOut: string
  fee: string
  quoteRaw?: SerializedQuoteResult
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  swapIntent?: SwapIntentInput | null
}

const SUGGESTIONS = [
  'Swap 5 USDC to ETH',
  'Swap 0.005 ETH to ZORA',
]

export function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dismissedIntents, setDismissedIntents] = useState<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text?: string) => {
    const messageText = (text ?? input).trim()
    if (!messageText || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      })

      const data = await res.json() as {
        message?: string
        swapIntent?: SwapIntentInput | null
        error?: string
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.error
          ? `Sorry, something went wrong: ${data.error}`
          : data.message ?? 'I processed your request.',
        swapIntent: data.swapIntent ?? null,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Network error. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 220px)', minHeight: '500px',
      maxWidth: '720px', margin: '0 auto',
    }}>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}>

        {/* Welcome state */}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤖</div>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
              Hibra AI Agent
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Ask me to find the best swap route on Base network.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    padding: '8px 14px', borderRadius: '20px', fontSize: '13px',
                    background: 'var(--bg-card2)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--purple)'
                    e.currentTarget.style.color = 'var(--purple-light)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div key={msg.id}>
            <div style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #7c5cfc, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', marginRight: '8px', alignSelf: 'flex-end',
                }}>
                  🤖
                </div>
              )}

              <div style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #7c5cfc, #a855f7)'
                  : 'var(--bg-card2)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
            </div>

            {/* Swap intent card */}
            {msg.swapIntent && !dismissedIntents.has(msg.id) && (
              <div style={{ marginLeft: '36px', marginTop: '4px' }}>
                <SwapIntentCard
                  intent={msg.swapIntent}
                  onDismiss={() => setDismissedIntents((prev) => new Set([...prev, msg.id]))}
                />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c5cfc, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
            }}>
              🤖
            </div>
            <div style={{
              padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
              background: 'var(--bg-card2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Thinking</span>
              <LoadingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '12px 16px 24px 16px',
        borderTop: '1px solid var(--border)',
        background: 'rgba(13, 13, 26, 0.8)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about swaps on Base…"
            disabled={loading}
            rows={1}
            className="input-field"
            style={{
              flex: 1, padding: '10px 14px', fontSize: '14px', resize: 'none',
              maxHeight: '120px', overflowY: 'auto', lineHeight: '1.5',
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="btn-primary"
            style={{
              padding: '10px 16px', fontSize: '14px', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {loading ? (
              <span style={{
                width: '16px', height: '16px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                display: 'inline-block', animation: 'spin 0.8s linear infinite',
              }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
            )}
            Send
          </button>
        </div>
        <div style={{
          fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px',
          paddingLeft: '2px', display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <span style={{ color: 'var(--purple-light)', fontWeight: 500 }}>ⓘ</span>
          A fee of 0.1 USDC will be charged for each approved transaction.
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

function LoadingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: 'var(--text-muted)',
            animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </span>
  )
}
