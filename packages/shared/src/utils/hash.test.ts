import { describe, it, expect } from 'vitest'
import { md5, digestSha, computeHash } from './hash'

describe('md5', () => {
  it('hashes empty string', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })

  it('hashes hello', () => {
    expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592')
  })
})

describe('digestSha', () => {
  it('SHA-256 of hello', async () => {
    const hash = await digestSha('SHA-256', 'hello')
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })
})

describe('computeHash', () => {
  it('routes MD5', async () => {
    expect(await computeHash('MD5', 'test')).toBe(md5('test'))
  })

  it('routes SHA-256', async () => {
    expect(await computeHash('SHA-256', 'test')).toBe(await digestSha('SHA-256', 'test'))
  })
})
