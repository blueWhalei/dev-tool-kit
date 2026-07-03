import { describe, it, expect } from 'vitest'
import { generateMockRecords } from './mock-data'

describe('generateMockRecords', () => {
  it('generates requested count', () => {
    const fields = [
      { name: 'id', type: 'uuid' as const },
      { name: 'name', type: 'name' as const },
      { name: 'email', type: 'email' as const }
    ]
    const records = generateMockRecords(fields, 5)
    expect(records).toHaveLength(5)
    records.forEach(record => {
      expect(record.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(typeof record.name).toBe('string')
      expect(String(record.email)).toContain('@')
    })
  })

  it('caps count at 1000', () => {
    const records = generateMockRecords([{ name: 'n', type: 'number' }], 5000)
    expect(records).toHaveLength(1000)
  })

  it('generates all field types', () => {
    const fields = [
      { name: 'name', type: 'name' as const },
      { name: 'phone', type: 'phone' as const },
      { name: 'num', type: 'number' as const },
      { name: 'date', type: 'date' as const },
      { name: 'flag', type: 'boolean' as const }
    ]
    const [record] = generateMockRecords(fields, 1)
    expect(typeof record.name).toBe('string')
    expect(typeof record.phone).toBe('string')
    expect(typeof record.num).toBe('number')
    expect(typeof record.date).toBe('string')
    expect(typeof record.flag).toBe('boolean')
  })
})

describe('recordsToCsv', () => {
  it('exports csv with headers', async () => {
    const { recordsToCsv } = await import('./mock-data')
    const csv = recordsToCsv([{ id: 1, name: 'test' }])
    expect(csv).toContain('id,name')
    expect(csv).toContain('1,test')
  })
})
