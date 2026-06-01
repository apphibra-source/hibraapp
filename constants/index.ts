import type { TierInfo } from '@/types'

export const CHAIN_IDS = {
  BASE_MAINNET: 8453,
  BASE_SEPOLIA: 84532,
} as const

export const DEFAULT_SLIPPAGE = 50 // 0.5% in basis points
export const SWAP_DEADLINE_MINUTES = 20

export const NFT_TIERS: TierInfo[] = [
  {
    tier: 0,
    name: 'Bronze Trader',
    minScore: 500,
    maxScore: 999,
    color: '#cd7f32',
    gradient: 'linear-gradient(135deg, #cd7f32, #a0522d)',
  },
  {
    tier: 1,
    name: 'Silver Trader',
    minScore: 1000,
    maxScore: 1499,
    color: '#c0c0c0',
    gradient: 'linear-gradient(135deg, #c0c0c0, #808080)',
  },
  {
    tier: 2,
    name: 'Gold Trader',
    minScore: 1500,
    maxScore: 1999,
    color: '#ffd700',
    gradient: 'linear-gradient(135deg, #ffd700, #ffa500)',
  },
  {
    tier: 3,
    name: 'Diamond Trader',
    minScore: 2000,
    maxScore: Infinity,
    color: '#b9f2ff',
    gradient: 'linear-gradient(135deg, #b9f2ff, #7c5cfc)',
  },
]

export const DEX_NAMES: Record<string, string> = {
  uniswapV3: 'Uniswap V3',
  aerodrome: 'Aerodrome',
  sushiswap: 'SushiSwap',
  pancakeswapV3: 'PancakeSwap V3',
  wrap: 'Wrap / Unwrap',
}

export const UNISWAP_FEE_TIERS = [100, 500, 3000, 10000] as const
