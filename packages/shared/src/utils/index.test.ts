import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatBytes,
  formatDuration,
  formatDate,
  isValidPort,
  isValidIP,
  isValidHostname,
  truncate,
  capitalize,
  kebabCase,
  camelCase,
  unique,
  groupBy,
  chunk,
  debounce,
  throttle
} from '../utils'

// --- formatBytes ---
describe('formatBytes', () => {
  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('returns "0 B" for negative numbers', () => {
    expect(formatBytes(-1)).toBe('0 B')
    expect(formatBytes(-1024)).toBe('0 B')
  })

  it('returns "0 B" for NaN and Infinity', () => {
    expect(formatBytes(NaN)).toBe('0 B')
    expect(formatBytes(Infinity)).toBe('0 B')
  })

  it('formats bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(1073741824)).toBe('1 GB')
  })

  it('respects decimals parameter', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB')
    expect(formatBytes(1536, 1)).toBe('1.5 KB')
  })

  it('handles very large values without overflow', () => {
    const pb = 1024 ** 5
    expect(formatBytes(pb)).toBe('1 PB')
    expect(formatBytes(pb * 1000)).toBe('1000 PB')
  })
})

// --- formatDuration ---
describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(5000)).toBe('5s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2m 5s')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(3725000)).toBe('1h 2m')
  })
})

// --- formatDate ---
describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2024-01-15T10:30:45.000Z', 'YYYY-MM-DD HH:mm:ss')
    expect(result).toContain('2024')
    expect(result).toContain('01')
    expect(result).toContain('15')
  })

  it('returns empty string for invalid date', () => {
    expect(formatDate('invalid')).toBe('')
    expect(formatDate('not-a-date')).toBe('')
  })

  it('handles Date object input', () => {
    const d = new Date(2024, 5, 15, 10, 30, 0)
    const result = formatDate(d)
    expect(result).toContain('2024')
    expect(result).toContain('06')
    expect(result).toContain('15')
  })
})

// --- isValidPort ---
describe('isValidPort', () => {
  it('accepts valid ports', () => {
    expect(isValidPort(1)).toBe(true)
    expect(isValidPort(80)).toBe(true)
    expect(isValidPort(65535)).toBe(true)
  })

  it('rejects invalid ports', () => {
    expect(isValidPort(0)).toBe(false)
    expect(isValidPort(-1)).toBe(false)
    expect(isValidPort(65536)).toBe(false)
    expect(isValidPort(1.5)).toBe(false)
  })
})

// --- isValidIP ---
describe('isValidIP', () => {
  it('accepts valid IPv4', () => {
    expect(isValidIP('192.168.1.1')).toBe(true)
    expect(isValidIP('0.0.0.0')).toBe(true)
    expect(isValidIP('255.255.255.255')).toBe(true)
  })

  it('rejects invalid IPv4', () => {
    expect(isValidIP('256.0.0.0')).toBe(false)
    expect(isValidIP('192.168.1')).toBe(false)
    expect(isValidIP('')).toBe(false)
    expect(isValidIP('abc')).toBe(false)
  })

  it('accepts valid IPv6', () => {
    expect(isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true)
  })
})

// --- isValidHostname ---
describe('isValidHostname', () => {
  it('accepts valid hostnames', () => {
    expect(isValidHostname('localhost')).toBe(true)
    expect(isValidHostname('example.com')).toBe(true)
    expect(isValidHostname('sub.domain.example.com')).toBe(true)
  })

  it('rejects invalid hostnames', () => {
    expect(isValidHostname('')).toBe(false)
    expect(isValidHostname('-invalid.com')).toBe(false)
    expect(isValidHostname('a'.repeat(64) + '.com')).toBe(false)
  })
})

// --- truncate ---
describe('truncate', () => {
  it('returns original string if shorter than length', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('truncates and adds ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('handles length shorter than ellipsis', () => {
    expect(truncate('hello world', 2)).toBe('he')
    expect(truncate('hello', 3)).toBe('hel')
  })

  it('respects custom ellipsis', () => {
    expect(truncate('hello world', 8, '--')).toBe('hello --')
  })
})

// --- capitalize ---
describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('HELLO')).toBe('Hello')
    expect(capitalize('h')).toBe('H')
  })
})

// --- kebabCase ---
describe('kebabCase', () => {
  it('converts camelCase', () => {
    expect(kebabCase('fooBar')).toBe('foo-bar')
  })

  it('converts spaces', () => {
    expect(kebabCase('foo bar')).toBe('foo-bar')
  })

  it('converts underscores', () => {
    expect(kebabCase('foo_bar')).toBe('foo-bar')
  })
})

// --- camelCase ---
describe('camelCase', () => {
  it('converts kebab-case', () => {
    expect(camelCase('foo-bar')).toBe('fooBar')
  })

  it('converts snake_case', () => {
    expect(camelCase('foo_bar')).toBe('fooBar')
  })

  it('converts spaces', () => {
    expect(camelCase('foo bar')).toBe('fooBar')
  })
})

// --- unique ---
describe('unique', () => {
  it('removes duplicates', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
  })

  it('preserves order', () => {
    expect(unique([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
  })

  it('handles strings', () => {
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
  })
})

// --- groupBy ---
describe('groupBy', () => {
  it('groups by key', () => {
    const items = [
      { type: 'a', value: 1 },
      { type: 'b', value: 2 },
      { type: 'a', value: 3 }
    ]
    const result = groupBy(items, 'type')
    expect(result.a).toHaveLength(2)
    expect(result.b).toHaveLength(1)
  })
})

// --- chunk ---
describe('chunk', () => {
  it('splits into chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns single chunk when size >= length', () => {
    expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]])
  })

  it('returns whole array as single chunk for size <= 0', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]])
    expect(chunk([1, 2, 3], -1)).toEqual([[1, 2, 3]])
  })

  it('handles empty array', () => {
    expect(chunk([], 3)).toEqual([])
  })
})

// --- debounce ---
describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('delays function call', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('only calls once for rapid invocations', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    debounced()
    debounced()
    debounced()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

// --- throttle ---
describe('throttle', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('calls function immediately on first call', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('ignores calls within throttle period', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)
    throttled()
    throttled()
    throttled()
    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    throttled()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
