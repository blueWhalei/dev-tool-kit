import { describe, it, expect } from 'vitest'
import {
  parseJsonValue,
  parseJsonSchema,
  validateAgainstSchema,
  formatSchemaErrorLine
} from './json-schema'

describe('parseJsonValue', () => {
  it('parses valid JSON', () => {
    const result = parseJsonValue('{"a":1}')
    expect(result.success).toBe(true)
    expect(result.result).toEqual({ a: 1 })
  })

  it('fails on invalid JSON', () => {
    const result = parseJsonValue('{bad}')
    expect(result.success).toBe(false)
  })

  it('fails on empty input', () => {
    expect(parseJsonValue('').success).toBe(false)
  })
})

describe('parseJsonSchema', () => {
  it('parses valid schema object', () => {
    const result = parseJsonSchema('{"type":"object"}')
    expect(result.success).toBe(true)
    expect(result.result).toEqual({ type: 'object' })
  })

  it('rejects non-object schema', () => {
    expect(parseJsonSchema('"string"').success).toBe(false)
    expect(parseJsonSchema('[]').success).toBe(false)
  })

  it('rejects invalid JSON', () => {
    expect(parseJsonSchema('{').success).toBe(false)
  })
})

describe('validateAgainstSchema', () => {
  const schema = JSON.stringify({
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string' },
      age: { type: 'number' }
    },
    additionalProperties: false
  })

  it('passes valid data', () => {
    const data = { email: 'a@b.com', age: 30 }
    const result = validateAgainstSchema(data, schema)
    expect(result.success).toBe(true)
    expect(result.valid).toBe(true)
  })

  it('reports type errors with path', () => {
    const data = { email: 123 }
    const result = validateAgainstSchema(data, schema)
    expect(result.success).toBe(true)
    expect(result.valid).toBe(false)
    expect(result.errors?.some((e) => e.path === '/email' && e.message.includes('string'))).toBe(true)
  })

  it('reports missing required property', () => {
    const data = { age: 1 }
    const result = validateAgainstSchema(data, schema)
    expect(result.valid).toBe(false)
    expect(result.errors?.some((e) => e.message.includes('email'))).toBe(true)
  })

  it('reports additional properties', () => {
    const data = { email: 'a@b.com', extra: true }
    const result = validateAgainstSchema(data, schema)
    expect(result.valid).toBe(false)
    expect(result.errors?.some((e) => e.message.includes('extra'))).toBe(true)
  })

  it('fails on invalid schema text', () => {
    const result = validateAgainstSchema({}, '{')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('formatSchemaErrorLine', () => {
  it('formats path and message', () => {
    expect(formatSchemaErrorLine({ path: '/user/email', message: 'must be string' })).toBe(
      '/user/email: must be string'
    )
  })
})
