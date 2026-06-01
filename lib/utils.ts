import { formatUnits, parseUnits } from 'viem'

/**
 * Format a bigint token amount to a human-readable string.
 */
export function formatTokenAmount(amount: bigint, decimals: number, maxDecimals = 6): string {
  const formatted = formatUnits(amount, decimals)
  const num = parseFloat(formatted)
  if (num === 0) return '0'
  if (num < 0.000001) return '<0.000001'
  return num.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  })
}

/**
 * Parse a human-readable string to a bigint token amount.
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  try {
    if (!amount || amount === '.' || amount === '') return 0n
    return parseUnits(amount, decimals)
  } catch {
    return 0n
  }
}

/**
 * Shorten an Ethereum address for display.
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Calculate minimum amount out after slippage.
 * @param amountOut - expected output amount
 * @param slippageBps - slippage in basis points (e.g. 50 = 0.5%)
 */
export function applySlippage(amountOut: bigint, slippageBps: number): bigint {
  return (amountOut * BigInt(10000 - slippageBps)) / 10000n
}

/**
 * Get swap deadline as unix timestamp.
 * @param minutes - minutes from now
 */
export function getDeadline(minutes = 20): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60)
}

/**
 * Format USD value.
 */
export function formatUSD(value: number): string {
  if (value === 0) return '$0.00'
  if (value < 0.01) return '<$0.01'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format large numbers with K/M/B suffixes.
 */
export function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(0)
}

/**
 * Calculate price impact percentage.
 */
export function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  spotPrice: number,
  decimalsIn: number,
  decimalsOut: number
): number {
  if (amountIn === 0n || amountOut === 0n || spotPrice === 0) return 0
  const inFloat = parseFloat(formatUnits(amountIn, decimalsIn))
  const outFloat = parseFloat(formatUnits(amountOut, decimalsOut))
  const expectedOut = inFloat * spotPrice
  if (expectedOut === 0) return 0
  return Math.abs((expectedOut - outFloat) / expectedOut) * 100
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
