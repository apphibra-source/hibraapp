import { paymentMiddleware } from 'x402-next'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * x402 Payment Middleware
 *
 * Protects POST /api/swap/execute with a $0.10 USDC payment.
 * /api/quotes and all other routes remain free.
 *
 * Network: 'base' (Base mainnet) + https://x402.org/facilitator
 *
 * REQUIREMENTS to activate:
 * 1. PAYMENT_WALLET_ADDRESS — valid EIP-55 checksummed address in .env.local
 * 2. NEXT_PUBLIC_APP_URL — must be a public HTTPS URL (not localhost)
 *    The x402 facilitator must be able to reach your endpoint to verify payments.
 *    In development (localhost) x402 is automatically disabled.
 */

const PAYMENT_WALLET = process.env.PAYMENT_WALLET_ADDRESS
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

// x402 requires:
// 1. A valid wallet address
// 2. A public URL (not localhost) — facilitator must reach the resource
const isPublicUrl =
  APP_URL.startsWith('https://') &&
  !APP_URL.includes('localhost') &&
  !APP_URL.includes('127.0.0.1')

const isX402Enabled =
  typeof PAYMENT_WALLET === 'string' &&
  /^0x[0-9a-fA-F]{40}$/.test(PAYMENT_WALLET) &&
  isPublicUrl

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
      {
        url: 'https://x402.org/facilitator',
      }
    )
  : null

export default async function middleware(request: NextRequest) {
  if (x402Handler) {
    return x402Handler(request)
  }
  // x402 disabled in development or when wallet/URL not configured
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/swap/execute'],
}
