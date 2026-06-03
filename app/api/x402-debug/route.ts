/**
 * GET /api/x402-debug
 * Temporary endpoint to verify CDP auth is working.
 * DELETE after debugging.
 */
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  const keyId = process.env.CDP_API_KEY_ID ?? ''
  const rawSecret = process.env.CDP_API_KEY_SECRET ?? ''
  const secret = rawSecret.replace(/\\n/g, '\n')

  const hasKeyId = keyId.length > 0
  const hasSecret = rawSecret.length > 0
  const hasPaymentWallet = (process.env.PAYMENT_WALLET_ADDRESS ?? '').length > 0
  const hasAppUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').length > 0
  const pemValid = secret.includes('-----BEGIN') && secret.includes('-----END')
  const isECKey = secret.includes('EC PRIVATE KEY')
  const isPKCS8 = secret.includes('BEGIN PRIVATE KEY')
  const secretLength = secret.length
  const firstChars = secret.slice(0, 40)

  // Try to import the key and sign a JWT
  let jwtTest: string
  let facilitatorTest: string

  async function importKey(pem: string) {
    const { importPKCS8 } = await import('jose')
    const { createPrivateKey } = await import('crypto')
    if (pem.includes('BEGIN EC PRIVATE KEY')) {
      const keyObj = createPrivateKey(pem)
      const pkcs8 = keyObj.export({ type: 'pkcs8', format: 'pem' }) as string
      return importPKCS8(pkcs8, 'ES256')
    }
    return importPKCS8(pem, 'ES256')
  }

  try {
    const { SignJWT } = await import('jose')
    const privateKey = await importKey(secret)
    const jwt = await new SignJWT({
      sub: keyId, iss: 'cdp',
      uris: ['POST api.cdp.coinbase.com/platform/v2/x402/verify']
    })
      .setProtectedHeader({ alg: 'ES256', kid: keyId, nonce: 'test' })
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(privateKey)
    jwtTest = `OK (${jwt.length} chars)`
  } catch (e) {
    jwtTest = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  try {
    const { SignJWT } = await import('jose')
    const privateKey = await importKey(secret)
    const nonce = Math.random().toString(36).slice(2)
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
    facilitatorTest = `HTTP ${res.status}: ${body.slice(0, 300)}`
  } catch (e) {
    facilitatorTest = `FAIL: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    env: { hasKeyId, keyIdLength: keyId.length, hasSecret, secretLength, pemValid, isECKey, isPKCS8, firstChars, hasPaymentWallet, hasAppUrl },
    jwtTest,
    facilitatorTest,
  })
}
