import { SwapWidget } from '@/components/swap/SwapWidget'

export const metadata = {
  title: 'Swap — Hibra',
  description: 'Swap tokens at the best rates across Uniswap V3, Aerodrome, SushiSwap and PancakeSwap on Base.',
}

export default function SwapPage() {
  return (
    <div
      className="swap-page-wrapper"
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 16px 40px',
      }}
    >
      <SwapWidget />
    </div>
  )
}
