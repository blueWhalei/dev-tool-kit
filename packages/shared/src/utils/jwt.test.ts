import { describe, it, expect } from 'vitest'
import {
  decodeJwt,
  getJwtTimeInfo,
  formatJwtJson,
  parseJwtPartJson,
  signJwtHmac,
  verifyJwtHmac
} from './jwt'

// HS256 test token: header {"alg":"HS256","typ":"JWT"} payload {"sub":"1234567890","name":"John Doe","iat":1516239022}
const TEST_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const TEST_SECRET = 'your-256-bit-secret'

const TEST_HEADER = { alg: 'HS256', typ: 'JWT' }
const TEST_PAYLOAD = { sub: '1234567890', name: 'John Doe', iat: 1516239022 }

describe('decodeJwt', () => {
  it('decodes valid JWT', () => {
    const result = decodeJwt(TEST_TOKEN)
    expect(result.success).toBe(true)
    expect(result.result?.header.alg).toBe('HS256')
    expect(result.result?.payload.sub).toBe('1234567890')
    expect(result.result?.payload.name).toBe('John Doe')
  })

  it('rejects invalid format', () => {
    expect(decodeJwt('invalid').success).toBe(false)
    expect(decodeJwt('').success).toBe(false)
  })
})

describe('getJwtTimeInfo', () => {
  it('extracts iat', () => {
    const decoded = decodeJwt(TEST_TOKEN)
    const info = getJwtTimeInfo(decoded.result!.payload)
    expect(info.iat).toBe(1516239022)
    expect(info.iatDate).toBeDefined()
  })

  it('detects expired token', () => {
    const info = getJwtTimeInfo({ exp: 1000 })
    expect(info.isExpired).toBe(true)
  })
})

describe('formatJwtJson', () => {
  it('formats JSON with indentation', () => {
    const formatted = formatJwtJson({ a: 1 })
    expect(formatted).toContain('\n')
  })
})

describe('parseJwtPartJson', () => {
  it('parses valid JSON object', () => {
    const result = parseJwtPartJson('{"typ":"JWT"}', 'Header')
    expect(result.success).toBe(true)
    expect(result.result?.typ).toBe('JWT')
  })

  it('rejects empty input', () => {
    expect(parseJwtPartJson('', 'Header').success).toBe(false)
  })

  it('rejects non-object JSON', () => {
    expect(parseJwtPartJson('["a"]', 'Header').success).toBe(false)
    expect(parseJwtPartJson('null', 'Payload').success).toBe(false)
  })

  it('rejects invalid JSON', () => {
    expect(parseJwtPartJson('{bad}', 'Header').success).toBe(false)
  })
})

describe('signJwtHmac', () => {
  it('generates HS256 token matching jwt.io sample', async () => {
    const result = await signJwtHmac(TEST_HEADER, TEST_PAYLOAD, TEST_SECRET, 'HS256')
    expect(result.success).toBe(true)
    expect(result.result).toBe(TEST_TOKEN)
  })

  it('round-trips with verifyJwtHmac', async () => {
    const signed = await signJwtHmac(TEST_HEADER, TEST_PAYLOAD, TEST_SECRET, 'HS256')
    expect(signed.success).toBe(true)

    const verified = await verifyJwtHmac(signed.result!, TEST_SECRET)
    expect(verified.success).toBe(true)
    expect(verified.result?.valid).toBe(true)
    expect(verified.result?.algorithm).toBe('HS256')
  })

  it('supports HS384 and HS512', async () => {
    for (const alg of ['HS384', 'HS512'] as const) {
      const signed = await signJwtHmac(TEST_HEADER, TEST_PAYLOAD, TEST_SECRET, alg)
      expect(signed.success).toBe(true)

      const verified = await verifyJwtHmac(signed.result!, TEST_SECRET)
      expect(verified.result?.valid).toBe(true)
      expect(verified.result?.algorithm).toBe(alg)
    }
  })

  it('overrides header alg with selected algorithm', async () => {
    const signed = await signJwtHmac({ typ: 'JWT' }, { sub: '1' }, TEST_SECRET, 'HS512')
    expect(signed.success).toBe(true)

    const decoded = decodeJwt(signed.result!)
    expect(decoded.result?.header.alg).toBe('HS512')
  })

  it('requires secret', async () => {
    const result = await signJwtHmac(TEST_HEADER, TEST_PAYLOAD, '  ', 'HS256')
    expect(result.success).toBe(false)
  })
})

describe('verifyJwtHmac', () => {
  it('verifies valid token', async () => {
    const result = await verifyJwtHmac(TEST_TOKEN, TEST_SECRET)
    expect(result.success).toBe(true)
    expect(result.result?.valid).toBe(true)
  })

  it('rejects wrong secret', async () => {
    const result = await verifyJwtHmac(TEST_TOKEN, 'wrong-secret')
    expect(result.result?.valid).toBe(false)
  })
})
