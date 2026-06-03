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
// 2. A public URL (not localhost)
// 3. CURRENTLY DISABLED: x402.org/facilitator only supports Base Sepolia testnet,
//    not Base mainnet. To enable for production, use CDP facilitator:
//    https://docs.cdp.coinbase.com/x402/welcome
//    Set CDP_API_KEY_ID + CDP_API_KEY_SECRET and switch to createCdpFacilitator()
const isX402Enabled = false

const x402Handler = isX402Enabled
  ? paymentMiddleware(
      PAYMENT_WALLET as `0x${string}`,
      {
        '/api/swap/execute': {
          price: '$0.10',
          // x402.org/facilitator only supports base-sepolia.
          // For Base mainnet, use CDP facilitator:
          //   import { createCdpFacilitator } from 'x402-next'
          //   and set CDP_API_KEY_ID + CDP_API_KEY_SECRET env vars
          network: 'base-sepolia',
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
