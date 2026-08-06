import { describe, it, expect } from 'vitest'
import { sanitizeHostsText, sanitizeHostsEntry } from './sanitize'

describe('sanitizeHostsText', () => {
  it('removes newlines and null characters', () => {
    expect(sanitizeHostsText('abc\r\ndef\0ghi', 500)).toBe('abcdefghi')
  })

  it('truncates to max length', () => {
    expect(sanitizeHostsText('1234567890', 4)).toBe('1234')
  })

  it('keeps normal text unchanged', () => {
    expect(sanitizeHostsText('开发环境 #1', 500)).toBe('开发环境 #1')
  })
})

describe('sanitizeHostsEntry', () => {
  it('sanitizes comment and group, keeps id/ip/hostname', () => {
    const result = sanitizeHostsEntry({
      id: 'abc',
      ip: '127.0.0.1',
      hostname: 'localhost',
      comment: 'note\r\n0.0.0.0 evil.com',
      enabled: true,
      group: 'dev\nx'
    })
    expect(result).toEqual({
      id: 'abc',
      ip: '127.0.0.1',
      hostname: 'localhost',
      comment: 'note0.0.0.0 evil.com',
      enabled: true,
      group: 'devx'
    })
  })

  it('defaults missing enabled to true and drops non-string comment', () => {
    const result = sanitizeHostsEntry({
      id: 'abc',
      ip: '127.0.0.1',
      hostname: 'localhost',
      enabled: false
    })
    expect(result.enabled).toBe(false)
    expect(result.comment).toBeUndefined()

    const withDefaults = sanitizeHostsEntry({
      id: 'abc',
      ip: '127.0.0.1',
      hostname: 'localhost',
      comment: 123 as unknown as string,
      enabled: 'yes' as unknown as boolean
    })
    expect(withDefaults.enabled).toBe(true)
    expect(withDefaults.comment).toBeUndefined()
  })
})
