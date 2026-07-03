import { describe, it, expect } from 'vitest'
import {
  base64Encode,
  base64Decode,
  urlEncode,
  urlDecode,
  jsonFormat,
  jsonMinify,
  htmlEncode,
  htmlDecode,
  toCamelCase,
  toSnakeCase,
  numberBaseConvert,
  timestampToDate
} from './converter'

describe('base64Encode/Decode', () => {
  it('round-trips ASCII text', () => {
    const encoded = base64Encode('hello')
    expect(encoded.success).toBe(true)
    expect(encoded.result).toBe('aGVsbG8=')

    const decoded = base64Decode(encoded.result!)
    expect(decoded.success).toBe(true)
    expect(decoded.result).toBe('hello')
  })

  it('encodes unicode', () => {
    const encoded = base64Encode('你好')
    expect(encoded.success).toBe(true)
    const decoded = base64Decode(encoded.result!)
    expect(decoded.result).toBe('你好')
  })
})

describe('urlEncode/Decode', () => {
  it('encodes and decodes URL', () => {
    const encoded = urlEncode('a b&c')
    expect(encoded.result).toBe('a%20b%26c')
    expect(urlDecode(encoded.result!).result).toBe('a b&c')
  })
})

describe('jsonFormat/Minify', () => {
  it('formats JSON', () => {
    const result = jsonFormat('{"a":1}')
    expect(result.success).toBe(true)
    expect(result.result).toContain('\n')
  })

  it('minifies JSON', () => {
    const result = jsonMinify('{\n  "a": 1\n}')
    expect(result.result).toBe('{"a":1}')
  })
})

describe('htmlEncode/Decode', () => {
  it('encodes HTML entities', () => {
    expect(htmlEncode('<div>&"\'</div>').result).toBe('&lt;div&gt;&amp;&quot;&#39;&lt;/div&gt;')
  })

  it('decodes HTML entities', () => {
    expect(htmlDecode('&lt;div&gt;&amp;').result).toBe('<div>&')
  })
})

describe('case converters', () => {
  it('converts to camelCase', () => {
    expect(toCamelCase('foo-bar').result).toBe('fooBar')
  })

  it('converts to snake_case', () => {
    expect(toSnakeCase('fooBar').result).toBe('foo_bar')
  })
})

describe('numberBaseConvert', () => {
  it('converts decimal to hex', () => {
    expect(numberBaseConvert(255, 10, 16).result).toBe('FF')
  })
})

describe('timestampToDate', () => {
  it('converts unix timestamp', () => {
    const result = timestampToDate(1704067200)
    expect(result.success).toBe(true)
    expect(result.result?.unix).toBe(1704067200)
    expect(result.result?.millis).toBe(1704067200000)
  })
})

describe('parseTimestampInput', () => {
  it('parses date string', async () => {
    const { parseTimestampInput } = await import('./converter')
    const result = parseTimestampInput('2024-01-01')
    expect(result.success).toBe(true)
    expect(result.result?.unix).toBeDefined()
  })

  it('parses millisecond timestamp', async () => {
    const { parseTimestampInput } = await import('./converter')
    const result = parseTimestampInput('1704067200000')
    expect(result.success).toBe(true)
    expect(result.result?.millis).toBe(1704067200000)
  })
})

describe('convertAllCaseFormats', () => {
  it('returns all naming formats', async () => {
    const { convertAllCaseFormats } = await import('./converter')
    const result = convertAllCaseFormats('foo-bar')
    expect(result.success).toBe(true)
    expect(result.result?.camelCase).toBe('fooBar')
    expect(result.result?.snakeCase).toBe('foo_bar')
    expect(result.result?.kebabCase).toBe('foo-bar')
  })
})

describe('getJsonParseError', () => {
  it('reports line and column', async () => {
    const { getJsonParseError } = await import('./converter')
    const err = getJsonParseError('{\n  "a": \n}')
    expect(err).not.toBeNull()
    expect(err!.line).toBeGreaterThan(0)
  })
})
