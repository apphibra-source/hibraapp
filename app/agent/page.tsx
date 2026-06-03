import { AgentChat } from '@/components/agent/AgentChat'

export const metadata = {
  title: 'AI Agent — Hibra',
  description: 'Natural language DeFi trading powered by Claude AI on Base network.',
}

export default function AgentPage() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      padding: '32px 16px 0',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>
          <span className="text-gradient">AI Agent</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
          Describe what you want to swap in plain language.
        </p>
      </div>
      <AgentChat />
    </div>
  )
}
