import { describe, expect, it } from 'vitest'
import { xmlFormat, xmlMinify, sqlFormat, sqlMinify, isSqlKeyword } from './xml-sql'

describe('xmlFormat', () => {
  it('indents nested tags', () => {
    const result = xmlFormat('<root><item>text</item></root>')
    expect(result.success).toBe(true)
    expect(result.result).toContain('<root>')
    expect(result.result).toContain('<item>')
  })

  it('fails on empty input', () => {
    expect(xmlFormat('').success).toBe(false)
  })
})

describe('xmlMinify', () => {
  it('removes whitespace between tags', () => {
    const result = xmlMinify('<root>\n  <item>text</item>\n</root>')
    expect(result.success).toBe(true)
    expect(result.result).toBe('<root><item>text</item></root>')
  })
})

describe('sqlFormat', () => {
  it('uppercases keywords and adds line breaks', () => {
    const result = sqlFormat('select id, name from users where id = 1 order by id')
    expect(result.success).toBe(true)
    expect(result.result).toContain('SELECT')
    expect(result.result).toContain('FROM')
  })
})

describe('sqlMinify', () => {
  it('collapses whitespace', () => {
    const result = sqlMinify('SELECT  *\n  FROM   users')
    expect(result.result).toBe('SELECT * FROM users')
  })
})

describe('isSqlKeyword', () => {
  it('recognizes SELECT', () => {
    expect(isSqlKeyword('select')).toBe(true)
    expect(isSqlKeyword('foo')).toBe(false)
  })
})
