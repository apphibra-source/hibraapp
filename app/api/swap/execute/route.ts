/**
 * POST /api/swap/execute
 *
 * x402-protected endpoint — charges $0.10 USDC per request via withX402.
 * Used exclusively by the AI Agent (/agent page).
 *
 * For free swaps from the /swap page, use /api/swap/execute-free.
 */

import { withX402 } from 'x402-next'
import { executeSwapHandler } from '@/lib/swap/executeSwapHandler'

// ── CDP Facilitator with SEC1→PKCS8 key conversion ───────────────────────────

const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402' as const

async function importCdpKey(rawSecret: string) {
  const { importPKCS8 } = await import('jose')
  const { createPrivateKey } = await import('crypto')
  const pem = rawSecret.replace(/\\n/g, '\n')
  if (pem.includes('BEGIN EC PRIVATE KEY')) {
    const keyObj = createPrivateKey(pem)
    const pkcs8 = keyObj.export({ type: 'pkcs8', format: 'pem' }) as string
    return importPKCS8(pkcs8, 'ES256')
  }
  return importPKCS8(pem, 'ES256')
}

async function makeCdpJwt(apiKeyId: string, apiKeySecret: string, method: string, path: string): Promise<string> {
  const { SignJWT } = await import('jose')
  const privateKey = await importCdpKey(apiKeySecret)
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ sub: apiKeyId, iss: 'cdp', uris: [`${method} api.cdp.coinbase.com${path}`] })
    .setProtectedHeader({ alg: 'ES256', kid: apiKeyId, nonce })
    .setIssuedAt(now)
    .setExpirationTime(now + 120)
    .sign(privateKey)
}

function buildCdpFacilitator() {
  const keyId = process.env.CDP_API_KEY_ID ?? ''
  const keySecret = process.env.CDP_API_KEY_SECRET ?? ''
  if (!keyId || !keySecret) return null
  return {
    url: CDP_FACILITATOR_URL,
    createAuthHeaders: async () => {
      const [v, s, sup] = await Promise.all([
        makeCdpJwt(keyId, keySecret, 'POST', '/platform/v2/x402/verify'),
        makeCdpJwt(keyId, keySecret, 'POST', '/platform/v2/x402/settle'),
        makeCdpJwt(keyId, keySecret, 'GET',  '/platform/v2/x402/supported'),
      ])
      return {
        verify:    { Authorization: `Bearer ${v}` },
        settle:    { Authorization: `Bearer ${s}` },
        supported: { Authorization: `Bearer ${sup}` },
      }
    },
  }
}

const PAYMENT_WALLET = (process.env.PAYMENT_WALLET_ADDRESS ?? '0x0000000000000000000000000000000000000000') as `0x${string}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const POST = withX402(
  executeSwapHandler,
  PAYMENT_WALLET,
  {
    price: '$0.10',
    network: 'base',
    config: { description: 'Hibra AI Swap — best route on Base network' },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (buildCdpFacilitator() ?? undefined) as any
)
