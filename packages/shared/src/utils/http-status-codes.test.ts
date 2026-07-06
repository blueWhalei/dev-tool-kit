import { describe, it, expect } from 'vitest'
import {
  HTTP_STATUS_CODES,
  filterHttpStatusCodes,
  filterAndGroupHttpStatusCodes,
  formatHttpStatusLine,
  getHttpStatusCategory,
  groupHttpStatusCodes
} from './http-status-codes'

describe('getHttpStatusCategory', () => {
  it('maps codes to category', () => {
    expect(getHttpStatusCategory(100)).toBe('1xx')
    expect(getHttpStatusCategory(200)).toBe('2xx')
    expect(getHttpStatusCategory(404)).toBe('4xx')
    expect(getHttpStatusCategory(503)).toBe('5xx')
  })
})

describe('formatHttpStatusLine', () => {
  it('formats code and name', () => {
    expect(formatHttpStatusLine({ code: 404, name: 'Not Found', descriptionEn: '', descriptionZh: '' })).toBe(
      '404 Not Found'
    )
  })
})

describe('filterHttpStatusCodes', () => {
  it('returns all codes when query is empty', () => {
    expect(filterHttpStatusCodes()).toHaveLength(HTTP_STATUS_CODES.length)
  })

  it('filters by code number', () => {
    const result = filterHttpStatusCodes(HTTP_STATUS_CODES, { query: '404' })
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe(404)
  })

  it('filters by English name keyword', () => {
    const result = filterHttpStatusCodes(HTTP_STATUS_CODES, { query: 'gateway' })
    expect(result.map(e => e.code)).toEqual(expect.arrayContaining([502, 504]))
  })

  it('filters by Chinese description', () => {
    const result = filterHttpStatusCodes(HTTP_STATUS_CODES, { query: '不存在', locale: 'zh' })
    expect(result.some(e => e.code === 404)).toBe(true)
  })

  it('filters by category', () => {
    const result = filterHttpStatusCodes(HTTP_STATUS_CODES, { category: '2xx' })
    expect(result.every(e => e.code >= 200 && e.code < 300)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('combines query and category', () => {
    const result = filterHttpStatusCodes(HTTP_STATUS_CODES, { query: 'not', category: '4xx' })
    expect(result.map(e => e.code)).toEqual(expect.arrayContaining([404, 406]))
    expect(result.every(e => e.code >= 400 && e.code < 500)).toBe(true)
  })
})

describe('groupHttpStatusCodes', () => {
  it('groups all codes by category', () => {
    const groups = groupHttpStatusCodes()
    const total = Object.values(groups).reduce((sum, list) => sum + list.length, 0)
    expect(total).toBe(HTTP_STATUS_CODES.length)
    expect(groups['4xx'].some(e => e.code === 404)).toBe(true)
  })
})

describe('filterAndGroupHttpStatusCodes', () => {
  it('groups filtered results', () => {
    const groups = filterAndGroupHttpStatusCodes({ query: 'timeout' })
    const flat = Object.values(groups).flat()
    expect(flat.map(e => e.code)).toEqual(expect.arrayContaining([408, 504]))
    expect(flat.every(e => e.name.toLowerCase().includes('timeout') || e.descriptionEn.toLowerCase().includes('timeout'))).toBe(
      true
    )
  })
})
