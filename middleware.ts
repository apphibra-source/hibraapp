import { paymentMiddleware } from 'x402-next'
import { type NextRequest, NextResponse } from 'next/server'
import { generateJwt } from '@coinbase/cdp-sdk/auth'

/**
 * x402 Payment Middleware — CDP Facilitator (Base mainnet)
 *
 * Protects POST /api/swap/execute with a $0.10 USDC payment.
 * Uses Coinbase CDP facilitator which supports Base mainnet.
 *
 * Required env vars (set in Vercel dashboard):
 *   CDP_API_KEY_ID         — from portal.cdp.coinbase.com
 *   CDP_API_KEY_SECRET     — from portal.cdp.coinbase.com
 *   PAYMENT_WALLET_ADDRESS — EIP-55 checksummed address to receive USDC
 *   NEXT_PUBLIC_APP_URL    — public HTTPS URL (not localhost)
 */

const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402' as const

const PAYMENT_WALLET = process.env.PAYMENT_WALLET_ADDRESS
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET

// Only activate when all required vars are present and URL is public HTTPS
const isPublicUrl =
  APP_URL.startsWith('https://') &&
  !APP_URL.includes('localhost') &&
  !APP_URL.includes('127.0.0.1')

const isX402Enabled =
  typeof PAYMENT_WALLET === 'string' &&
  /^0x[0-9a-fA-F]{40}$/.test(PAYMENT_WALLET) &&
  isPublicUrl &&
  typeof CDP_API_KEY_ID === 'string' &&
  CDP_API_KEY_ID.length > 0 &&
  typeof CDP_API_KEY_SECRET === 'string' &&
  CDP_API_KEY_SECRET.length > 0

/** Build a CDP-authenticated facilitator object for x402 */
function createCdpFacilitator() {
  return {
    url: CDP_FACILITATOR_URL,
    createAuthHeaders: async () => {
      // Generate a short-lived JWT signed with CDP API key
      const makeJwt = async (method: string, path: string) =>
        generateJwt({
          apiKeyId: CDP_API_KEY_ID!,
          apiKeySecret: CDP_API_KEY_SECRET!,
          requestMethod: method,
          requestHost: 'api.cdp.coinbase.com',
          requestPath: path,
        })

      const [verifyJwt, settleJwt, supportedJwt] = await Promise.all([
        makeJwt('POST', '/platform/v2/x402/verify'),
        makeJwt('POST', '/platform/v2/x402/settle'),
        makeJwt('GET',  '/platform/v2/x402/supported'),
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
