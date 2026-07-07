import { describe, it, expect } from 'vitest'
import { parseCertificatePem } from './parse'
import { SAMPLE_CERT_PEM } from './fixture'

describe('parseCertificatePem', () => {
  it('parses a valid self-signed PEM certificate', () => {
    const result = parseCertificatePem(SAMPLE_CERT_PEM)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.certificates).toHaveLength(1)
    const cert = result.certificates[0]

    expect(cert.subject.some((attr) => attr.shortName === 'CN' && attr.value === 'agent1')).toBe(true)
    expect(cert.issuer.some((attr) => attr.shortName === 'CN' && attr.value === 'ca1')).toBe(true)
    expect(cert.serialNumber).toBe('147D36C1C2F74206DE9FAB5F2226D78ADB00A426')
    expect(cert.publicKey.type).toBe('rsa')
    expect(cert.publicKey.bits).toBe(2048)
    expect(cert.publicKeyPem).toContain('BEGIN PUBLIC KEY')
    expect(cert.signatureAlgorithm).toBe('sha256WithRSAEncryption')
    expect(cert.fingerprint256).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2}){31}$/)
    expect(cert.validFrom).toBeTruthy()
    expect(cert.validTo).toBeTruthy()
    expect(typeof cert.daysUntilExpiry).toBe('number')
    expect(cert.isNotYetValid).toBe(false)
  })

  it('returns error for empty input', () => {
    const result = parseCertificatePem('   ')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('请输入 PEM 证书内容')
  })

  it('returns error when no PEM block is found', () => {
    const result = parseCertificatePem('not a certificate')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('未找到有效的 PEM 证书块')
  })

  it('returns error for invalid PEM content', () => {
    const result = parseCertificatePem(`-----BEGIN CERTIFICATE-----
invalid
-----END CERTIFICATE-----`)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBeTruthy()
  })

  it('parses multiple certificates in a chain', () => {
    const chain = `${SAMPLE_CERT_PEM}\n${SAMPLE_CERT_PEM}`
    const result = parseCertificatePem(chain)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.certificates).toHaveLength(2)
  })
})
