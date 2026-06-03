import { paymentMiddleware } from 'x402-next'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * x402 Payment Middleware — CDP Facilitator (Base mainnet)
 *
 * Protects POST /api/swap/execute with a $0.10 USDC payment.
 * Uses Coinbase CDP facilitator which supports Base mainnet.
 *
 * Required env vars (Vercel dashboard):
 *   CDP_API_KEY_ID         — from portal.cdp.coinbase.com
 *   CDP_API_KEY_SECRET     — EC private key (PEM) from portal.cdp.coinbase.com
 *   PAYMENT_WALLET_ADDRESS — EIP-55 checksummed address to receive USDC
 *   NEXT_PUBLIC_APP_URL    — public HTTPS URL (not localhost)
 */

const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402' as const

const PAYMENT_WALLET = process.env.PAYMENT_WALLET_ADDRESS
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID ?? ''
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET ?? ''

const isPublicUrl =
  APP_URL.startsWith('https://') &&
  !APP_URL.includes('localhost') &&
  !APP_URL.includes('127.0.0.1')

const isX402Enabled =
  typeof PAYMENT_WALLET === 'string' &&
  /^0x[0-9a-fA-F]{40}$/.test(PAYMENT_WALLET) &&
  isPublicUrl &&
  CDP_API_KEY_ID.length > 0 &&
  CDP_API_KEY_SECRET.length > 0

/**
 * Generate a CDP-signed JWT for authenticating with the facilitator.
 * CDP uses ES256 (EC P-256) or Ed25519. We use jose which works in both
 * Node.js and Edge runtime.
 */
async function generateCdpJwt(method: string, path: string): Promise<string> {
  const { SignJWT, importPKCS8 } = await import('jose')

  const nonce = Array.from(
    crypto.getRandomValues(new Uint8Array(16)),
    b => b.toString(16).padStart(2, '0')
  ).join('')

  const now = Math.floor(Date.now() / 1000)

  // CDP API secret is a PEM EC private key — parse newlines escaped as \n
  const pemKey = CDP_API_KEY_SECRET.replace(/\\n/g, '\n')

  const privateKey = await importPKCS8(pemKey, 'ES256')

  const jwt = await new SignJWT({
    sub: CDP_API_KEY_ID,
    iss: 'cdp',
    uris: [`${method} api.cdp.coinbase.com${path}`],
  })
    .setProtectedHeader({ alg: 'ES256', kid: CDP_API_KEY_ID, nonce })
    .setIssuedAt(now)
    .setExpirationTime(now + 120)
    .sign(privateKey)

  return jwt
}

function createCdpFacilitator() {
  return {
    url: CDP_FACILITATOR_URL,
    createAuthHeaders: async () => {
      const [verifyJwt, settleJwt, supportedJwt] = await Promise.all([
        generateCdpJwt('POST', '/platform/v2/x402/verify'),
        generateCdpJwt('POST', '/platform/v2/x402/settle'),
        generateCdpJwt('GET',  '/platform/v2/x402/supported'),
      ])
      return {
        verify:    { Authorization: `Bearer ${verifyJwt}` },
        settle:    { Authorization: `Bearer ${settleJwt}` },
        supported: { Authorization: `Bearer ${supportedJwt}` },
      }
    },
  }
}

const x402Handler = isX402Enabled
  ? paymentMiddleware(
      PAYMENT_WALLET as `0x${string}`,
      {
        '/api/swap/execute': {
          price: '$0.10',
          network: 'base',
          config: {
            description: 'Hibra AI Swap — best route on Base network',
          },
        },
      },
      createCdpFacilitator()
    )
  : null

export default async function middleware(request: NextRequest) {
  if (x402Handler) {
    return x402Handler(request)
  }
  // x402 disabled — missing env vars or running on localhost
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/swap/execute'],
}
