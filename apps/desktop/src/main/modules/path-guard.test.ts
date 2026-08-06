import { describe, it, expect } from 'vitest'
import { authorizePath, isPathAuthorized } from './path-guard'

describe('path-guard', () => {
  it('rejects paths that were never authorized', () => {
    expect(isPathAuthorized('C:\\secret\\file.txt')).toBe(false)
  })

  it('accepts an explicitly authorized path', () => {
    authorizePath('C:\\Users\\test\\photo.png')
    expect(isPathAuthorized('C:\\Users\\test\\photo.png')).toBe(true)
  })

  it('normalizes paths before comparison', () => {
    authorizePath('C:\\Users\\test\\file.txt')
    expect(isPathAuthorized('C:\\Users\\test\\file.txt')).toBe(true)
  })

  it('does not auto-authorize siblings or children (exact-match semantics)', () => {
    authorizePath('C:\\Users\\test\\dir\\file.txt')
    expect(isPathAuthorized('C:\\Users\\test\\dir\\file2.txt')).toBe(false)
    expect(isPathAuthorized('C:\\Users\\test\\dir\\file.txt\\..\\file2.txt')).toBe(false)
  })

  it('rejects non-string and blank input', () => {
    expect(isPathAuthorized(undefined)).toBe(false)
    expect(isPathAuthorized(null)).toBe(false)
    expect(isPathAuthorized(123)).toBe(false)
    expect(isPathAuthorized('   ')).toBe(false)
    expect(isPathAuthorized('')).toBe(false)
  })
})
