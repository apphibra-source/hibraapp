import { paymentMiddleware } from 'x402-next'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * x402 Payment Proxy — CDP Facilitator (Base mainnet)
 *
 * Charges $0.10 USDC per swap via x402 protocol.
 * Uses Coinbase CDP facilitator (supports Base mainnet).
 *
 * Required env vars (Vercel dashboard → Settings → Environment Variables):
 *   CDP_API_KEY_ID         — Key ID from portal.cdp.coinbase.com
 *   CDP_API_KEY_SECRET     — PEM EC private key from portal.cdp.coinbase.com
 *   PAYMENT_WALLET_ADDRESS — EIP-55 checksummed address to receive USDC
 *   NEXT_PUBLIC_APP_URL    — Production HTTPS URL (e.g. https://hibra.app)
 */

const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402' as const

/**
 * Build a CDP-authenticated JWT for a single request.
 * Uses jose (Edge + Node.js compatible).
 */
async function generateCdpJwt(
  apiKeyId: string,
  apiKeySecret: string,
  method: string,
  path: string
): Promise<string> {
  const { SignJWT, importPKCS8 } = await import('jose')

  const nonce = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    b => b.toString(16).padStart(2, '0')
  ).join('')

  const now = Math.floor(Date.now() / 1000)
  // Vercel stores multi-line PEM as literal \n — restore real newlines
  const pemKey = apiKeySecret.replace(/\\n/g, '\n')
  const privateKey = await importPKCS8(pemKey, 'ES256')

  return new SignJWT({
    sub: apiKeyId,
    iss: 'cdp',
    uris: [`${method} api.cdp.coinbase.com${path}`],
  })
    .setProtectedHeader({ alg: 'ES256', kid: apiKeyId, nonce })
    .setIssuedAt(now)
    .setExpirationTime(now + 120)
    .sign(privateKey)
}

function buildCdpFacilitator(apiKeyId: string, apiKeySecret: string) {
  return {
    url: CDP_FACILITATOR_URL,
    createAuthHeaders: async () => {
      const [verifyJwt, settleJwt, supportedJwt] = await Promise.all([
        generateCdpJwt(apiKeyId, apiKeySecret, 'POST', '/platform/v2/x402/verify'),
        generateCdpJwt(apiKeyId, apiKeySecret, 'POST', '/platform/v2/x402/settle'),
        generateCdpJwt(apiKeyId, apiKeySecret, 'GET',  '/platform/v2/x402/supported'),
      ])
      return {
        verify:    { Authorization: `Bearer ${verifyJwt}` },
        settle:    { Authorization: `Bearer ${settleJwt}` },
        supported: { Authorization: `Bearer ${supportedJwt}` },
      }
    },
  }
}

function buildX402Handler() {
  const paymentWallet = process.env.PAYMENT_WALLET_ADDRESS ?? ''
  const appUrl        = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const cdpKeyId      = process.env.CDP_API_KEY_ID ?? ''
  const cdpKeySecret  = process.env.CDP_API_KEY_SECRET ?? ''

  const isValidWallet = /^0x[0-9a-fA-F]{40}$/.test(paymentWallet)
  const isPublicUrl   = appUrl.startsWith('https://') && !appUrl.includes('localhost')
  const hasCdpKeys    = cdpKeyId.length > 0 && cdpKeySecret.length > 0

  if (!isValidWallet || !isPublicUrl || !hasCdpKeys) {
    return null
  }

  return paymentMiddleware(
    paymentWallet as `0x${string}`,
    {
      '/api/swap/execute': {
        price: '$0.10',
        network: 'base',
        config: {
          description: 'Hibra AI Swap — best route on Base network',
        },
      },
    },
    buildCdpFacilitator(cdpKeyId, cdpKeySecret)
  )
}

// Lazy-init: evaluated at runtime so env vars are always available
let _handler: ReturnType<typeof paymentMiddleware> | null | undefined = undefined

function getHandler() {
  if (_handler === undefined) {
    _handler = buildX402Handler()
  }
  return _handler
}

export default async function proxy(request: NextRequest) {
  const handler = getHandler()
  if (handler) {
    return handler(request)
  }
  // x402 not configured — pass through
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/swap/execute'],
}
