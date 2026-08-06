import { describe, it, expect } from 'vitest'
import { serializeForIpc } from './useIpc'

describe('serializeForIpc', () => {
  it('passes through primitives untouched', () => {
    expect(serializeForIpc(undefined)).toBeUndefined()
    expect(serializeForIpc(null)).toBeNull()
    expect(serializeForIpc('str')).toBe('str')
    expect(serializeForIpc(42)).toBe(42)
    expect(serializeForIpc(true)).toBe(true)
    expect(serializeForIpc(123n)).toBe(123n)
  })

  it('deep-clones plain objects (strips reactive proxies)', () => {
    const value = { a: 1, nested: { b: 2 }, arr: [1, 2] }
    const out = serializeForIpc(value) as typeof value
    expect(out).toEqual(value)
    expect(out).not.toBe(value)
    expect(out.nested).not.toBe(value.nested)
  })

  it('throws a friendly error on circular references instead of leaking them', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() => serializeForIpc(circular)).toThrow(/序列化/)
  })
})
