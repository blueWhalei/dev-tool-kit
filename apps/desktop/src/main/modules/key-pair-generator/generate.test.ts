import { describe, it, expect } from 'vitest'
import { generateKeyPairPem } from './generate'

describe('generateKeyPairPem', () => {
  it('generates RSA 2048 PEM key pair', async () => {
    const result = await generateKeyPairPem('rsa-2048')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.publicKey).toContain('BEGIN PUBLIC KEY')
    expect(result.privateKey).toContain('BEGIN PRIVATE KEY')
    expect(result.algorithm).toBe('rsa-2048')
  })

  it('generates EC P-256 PEM key pair', async () => {
    const result = await generateKeyPairPem('ec-p256')
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.publicKey).toContain('BEGIN PUBLIC KEY')
    expect(result.privateKey).toContain('BEGIN PRIVATE KEY')
    expect(result.keyType).toBe('EC P-256')
  })

  it('rejects invalid algorithm', async () => {
    const result = await generateKeyPairPem('ed25519')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error).toBe('invalid_algorithm')
  })
})
