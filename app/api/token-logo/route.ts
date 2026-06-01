import { type NextRequest } from 'next/server'

// Known overrides for tokens whose logos aren't in standard repos
const LOGO_OVERRIDES: Record<string, string> = {
  // ETH native — zero address
  '0x0000000000000000000000000000000000000000':
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  // crvUSD on Base — use Curve's GitHub
  '0xdbfefd2e8460a6ee4955a68582f85708baea60a3':
    'https://raw.githubusercontent.com/curvefi/curve-assets/main/images/assets/0xf939e0a03fb07f59a73314e73794be0e57ac1b4e.png',
  // ENA on Base — use Ethereum chain address in Trust Wallet
  '0x58538e6a46e07434d7e7375bc268d3cb839c0133':
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x57e114B691Db790C35207b2e685D4A43181e6061/logo.png',
  // LINK on Base — use Ethereum chain address
  '0x88fb150bdc53a65fe94dea0c9ba0a6daf8c6e196':
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
  // WETH on Base — use Ethereum WETH
  '0x4200000000000000000000000000000000000006':
    'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
}

function buildSources(address: string): string[] {
  const lower = address.toLowerCase()

  // Check override first
  if (LOGO_OVERRIDES[lower]) {
    return [LOGO_OVERRIDES[lower]]
  }

  return [
    // 1. Trust Wallet Base chain
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${address}/logo.png`,
    // 2. Trust Wallet Ethereum chain (bridged tokens)
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`,
    // 3. Uniswap assets Base
    `https://raw.githubusercontent.com/Uniswap/assets/master/blockchains/base/assets/${address}/logo.png`,
  ]
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const address = searchParams.get('address')

  if (!address) {
    return new Response('Missing address', { status: 400 })
  }

  const sources = buildSources(address)

  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'BaseAgg/1.0' },
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const contentType = res.headers.get('content-type') ?? 'image/png'
        if (contentType.startsWith('image/') || contentType.includes('octet-stream')) {
          const buffer = await res.arrayBuffer()
          return new Response(buffer, {
            headers: {
              'Content-Type': contentType.startsWith('image/') ? contentType : 'image/png',
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
            },
          })
        }
      }
    } catch {
      // Try next source
    }
  }

  return new Response('Logo not found', { status: 404 })
}
