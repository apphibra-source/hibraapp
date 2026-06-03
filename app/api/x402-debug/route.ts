/**
 * GET /api/x402-debug
 * Temporary endpoint to verify CDP auth is working.
 * DELETE after debugging.
 */
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  const keyId = process.env.CDP_API_KEY_ID ?? ''
  const rawSecret = process.env.CDP_API_KEY_SECRET ?? ''
  // Normalize newlines
  const secret = rawSecret.replace(/\\n/g, '\n')

  const hasKeyId = keyId.length > 0
  const hasSecret = rawSecret.length > 0
  const hasPaymentWallet = (process.env.PAYMENT_WALLET_ADDRESS ?? '').length > 0
  const hasAppUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').length > 0

  // Check if PEM looks valid
  const pemValid = secret.includes('-----BEGIN') && secret.includes('-----END')
  const pemHasRealNewlines = secret.includes('\n')
  const secretLength = secret.length
  const firstLine = secret.split('\n')[0]

  let jwtTest: string
  try {
    const { SignJWT, importPKCS8 } = await import('jose')
    const privateKey = await importPKCS8(secret, 'ES256')
    const jwt = await new SignJWT({ sub: keyId, iss: 'cdp', uris: ['POST api.cdp.coinbase.com/platform/v2/x402/verify'] })
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(privateKey)
    jwtTest = `OK (${jwt.length} chars)`
  } catch (e) {
    jwtTest = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  // Test actual CDP facilitator call
  let facilitatorTest: string
  try {
    const { SignJWT, importPKCS8 } = await import('jose')
    const nonce = Math.random().toString(36).slice(2)
    const privateKey = await importPKCS8(secret, 'ES256')
    const jwt = await new SignJWT({
      sub: keyId, iss: 'cdp',
      uris: ['GET api.cdp.coinbase.com/platform/v2/x402/supported']
    })
      .setProtectedHeader({ alg: 'ES256', kid: keyId, nonce })
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(privateKey)

    const res = await fetch('https://api.cdp.coinbase.com/platform/v2/x402/supported', {
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }
    })
    const body = await res.text()
    facilitatorTest = `HTTP ${res.status}: ${body.slice(0, 200)}`
  } catch (e) {
    facilitatorTest = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    env: {
      hasKeyId,
      keyIdLength: keyId.length,
      keyIdPrefix: keyId.slice(0, 8) + '...',
      hasSecret,
      secretLength,
      pemValid,
      pemHasRealNewlines,
      firstLine,
      hasPaymentWallet,
      hasAppUrl,
    },
    jwtTest,
    facilitatorTest,
  })
}
