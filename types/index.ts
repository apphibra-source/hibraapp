// ─── Token ────────────────────────────────────────────────────────────────────
export interface Token {
  address: string
  decimals: number
  symbol: string
  name: string
  logoURI?: string
}

// ─── Quote / Route ─────────────────────────────────────────────────────────────
export type DexId = 'uniswapV3' | 'aerodrome' | 'sushiswap' | 'pancakeswapV3' | 'wrap'

export interface QuoteResult {
  dex: DexId
  dexName: string
  amountOut: bigint
  amountOutFormatted: string
  fee: string
  priceImpact: number
  isBest: boolean
  gasEstimate?: bigint
}

export interface SwapParams {
  tokenIn: Token
  tokenOut: Token
  amountIn: string
  slippage: number // basis points, e.g. 50 = 0.5%
  deadline?: number // unix timestamp
}

// ─── Score / Leaderboard ───────────────────────────────────────────────────────
export interface UserScore {
  address: string
  score: number
  swapCount: number
  volumeUSD: number
  consecutiveDays: number
  lastActivity: string
}

export interface LeaderboardUser {
  rank: number
  address: string
  score: number
  swapCount: number
  volumeUSD: number
  lastActivity: string
}

export interface LeaderboardResponse {
  users: LeaderboardUser[]
  total: number
}

// ─── NFT Tier ──────────────────────────────────────────────────────────────────
export type NftTier = 0 | 1 | 2 | 3

export interface TierInfo {
  tier: NftTier
  name: string
  minScore: number
  maxScore: number
  color: string
  gradient: string
}

// ─── Swap History ──────────────────────────────────────────────────────────────
export interface SwapRecord {
  id: string
  userAddress: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  dex: DexId
  txHash: string
  timestamp: string
  volumeUSD: number
  scoreEarned: number
}

// ─── Portfolio ─────────────────────────────────────────────────────────────────
export interface TokenBalance {
  token: Token
  balance: bigint
  balanceFormatted: string
  valueUSD?: number
}
