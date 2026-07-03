import { describe, it, expect } from 'vitest'
import { decodeJwt, getJwtTimeInfo, formatJwtJson } from './jwt'

// HS256 test token: header {"alg":"HS256","typ":"JWT"} payload {"sub":"1234567890","name":"John Doe","iat":1516239022}
const TEST_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

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
