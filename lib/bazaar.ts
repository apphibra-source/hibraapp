/**
 * Coinbase x402 Bazaar Discovery API client.
 * All endpoints are public — no API key required.
 * Docs: https://docs.cdp.coinbase.com/x402/bazaar
 */

const BAZAAR_BASE = 'https://api.cdp.coinbase.com/platform/v2/x402/discovery'
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const BASE_NETWORK = 'eip155:8453'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BazaarPaymentAccept {
  scheme: string
  network: string
  amount: string        // smallest token unit
  asset: string         // token contract address
  payTo: string         // merchant wallet
}

export interface BazaarAgent {
  resource: string      // agent API URL (unique ID)
  type: string          // "http"
  x402Version: number
  accepts: BazaarPaymentAccept[]
  lastUpdated: string
  metadata?: {
    description?: string
    name?: string
    input?: Record<string, unknown>
    output?: Record<string, unknown>
  }
}

export interface BazaarCatalogResponse {
  x402Version: number
  items: BazaarAgent[]
  pagination: { limit: number; offset: number; total: number }
}

export interface BazaarSearchResponse {
  resources: BazaarAgent[]
  partialResults: boolean
  searchMethod: string
  x402Version: number
}

// ── Normalised agent shape used throughout the app ─────────────────────────────

export interface NormalisedAgent {
  resource: string
  name: string
  description: string
  priceRaw: string      // smallest unit
  priceUsd: string      // human-readable e.g. "0.001000"
  payTo: string
  network: string       // "Base Mainnet"
  networkId: string     // "eip155:8453"
  asset: string
  scheme: string
  lastUpdated: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Convert USDC smallest-unit amount to USD display string.
 * USDC has 6 decimals: 1000 → "0.001000"
 */
export function priceRawToUsd(raw: string): string {
  const num = Number(raw)
  if (isNaN(num)) return '0.000000'
  return (num / 1_000_000).toFixed(6)
}

/**
 * Map EIP-155 chain ID to human-readable name.
 */
export function networkToLabel(eipChainId: string): string {
  switch (eipChainId) {
    case 'eip155:8453':  return 'Base Mainnet'
    case 'eip155:84532': return 'Base Sepolia'
    case 'eip155:1':     return 'Ethereum'
    default:             return eipChainId
  }
}

/**
 * Pick the USDC Base payment from an agent's accepts array.
 * Returns null if no matching payment option found.
 */
function pickBaseUsdcPayment(accepts: BazaarPaymentAccept[]): BazaarPaymentAccept | null {
  return accepts.find(
    (a) =>
      a.network === BASE_NETWORK &&
      a.asset.toLowerCase() === BASE_USDC.toLowerCase()
  ) ?? accepts[0] ?? null
}

/**
 * Normalise a raw BazaarAgent into the app's NormalisedAgent shape.
 */
export function normaliseAgent(raw: BazaarAgent): NormalisedAgent {
  const payment = pickBaseUsdcPayment(raw.accepts)
  const priceRaw = payment?.amount ?? '0'
  const networkId = payment?.network ?? BASE_NETWORK

  return {
    resource: raw.resource,
    name: raw.metadata?.name ?? new URL(raw.resource).hostname,
    description: raw.metadata?.description ?? 'AI trading agent via x402',
    priceRaw,
    priceUsd: priceRawToUsd(priceRaw),
    payTo: payment?.payTo ?? '',
    network: networkToLabel(networkId),
    networkId,
    asset: payment?.asset ?? BASE_USDC,
    scheme: payment?.scheme ?? 'exact',
    lastUpdated: raw.lastUpdated,
  }
}

// ── API calls ──────────────────────────────────────────────────────────────────

/**
 * Fetch paginated catalog of x402 agents.
 */
export async function fetchCatalog(
  limit = 100,
  offset = 0
): Promise<BazaarCatalogResponse> {
  const url = new URL(`${BAZAAR_BASE}/resources`)
  url.searchParams.set('limit', String(Math.min(limit, 1000)))
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('network', BASE_NETWORK)

  const res = await fetch(url.toString(), {
    next: { revalidate: 300 }, // 5 min Next.js cache
  })

  if (!res.ok) {
    throw new Error(`Bazaar catalog fetch failed: ${res.status}`)
  }

  return res.json() as Promise<BazaarCatalogResponse>
}

/**
 * Semantic search for agents matching a natural-language query.
 */
export async function searchAgents(
  query: string,
  maxUsdPrice?: string,
  limit = 20
): Promise<NormalisedAgent[]> {
  const url = new URL(`${BAZAAR_BASE}/search`)
  url.searchParams.set('query', query.slice(0, 400))
  url.searchParams.set('network', BASE_NETWORK)
  url.searchParams.set('asset', BASE_USDC)
  url.searchParams.set('limit', String(Math.min(limit, 20)))

  if (maxUsdPrice) {
    // Convert USD → smallest unit for the API param
    const raw = Math.round(parseFloat(maxUsdPrice) * 1_000_000)
    url.searchParams.set('maxUsdPrice', maxUsdPrice) // API accepts USD
  }

  const res = await fetch(url.toString())

  if (!res.ok) {
    throw new Error(`Bazaar search failed: ${res.status}`)
  }

  const data = (await res.json()) as BazaarSearchResponse
  return (data.resources ?? []).map(normaliseAgent)
}

/**
 * Look up all agents by a specific merchant payTo address.
 */
export async function fetchMerchantAgents(
  payTo: string,
  limit = 25
): Promise<NormalisedAgent[]> {
  const url = new URL(`${BAZAAR_BASE}/merchant`)
  url.searchParams.set('payTo', payTo)
  url.searchParams.set('limit', String(Math.min(limit, 100)))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Bazaar merchant fetch failed: ${res.status}`)

  const data = (await res.json()) as BazaarCatalogResponse
  return (data.items ?? []).map(normaliseAgent)
}
