/**
 * proxy.ts — x402 Payment Proxy
 *
 * This file is intentionally minimal. x402 protection is applied directly
 * on the API route via withX402 in app/api/swap/execute/route.ts.
 *
 * Keeping proxy.ts because Next.js 16 requires it if a proxy file exists,
 * but all payment logic lives in the route handler.
 */
import { type NextRequest, NextResponse } from 'next/server'

export default function proxy(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
