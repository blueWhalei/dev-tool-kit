import { describe, it, expect } from 'vitest'
import {
  generateMockRecords,
  recordsToCsv,
  recordsToSqlInsert,
  escapeSqlString,
  sqlLiteral,
  sanitizeSqlTableName
} from './mock-data'

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

  it('generates all original field types', () => {
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

  it('generates extended field types', () => {
    const fields = [
      { name: 'address', type: 'address' as const },
      { name: 'company', type: 'company' as const },
      { name: 'ip', type: 'ip' as const },
      { name: 'status', type: 'enum' as const, options: 'a,b,c' },
      { name: 'id', type: 'increment' as const },
      { name: 'note', type: 'text' as const }
    ]
    const records = generateMockRecords(fields, 3)
    records.forEach((record, index) => {
      expect(typeof record.address).toBe('string')
      expect(String(record.address).length).toBeGreaterThan(0)
      expect(typeof record.company).toBe('string')
      expect(record.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)
      expect(['a', 'b', 'c']).toContain(record.status)
      expect(record.id).toBe(index + 1)
      expect(typeof record.note).toBe('string')
    })
  })

  it('picks from enum options', () => {
    const fields = [{ name: 'level', type: 'enum' as const, options: 'low,high' }]
    const records = generateMockRecords(fields, 20)
    records.forEach(record => {
      expect(['low', 'high']).toContain(record.level)
    })
  })

  it('uses default enum options when empty', () => {
    const fields = [{ name: 'level', type: 'enum' as const }]
    const [record] = generateMockRecords(fields, 1)
    expect(['option1', 'option2', 'option3']).toContain(record.level)
  })
})

describe('recordsToCsv', () => {
  it('exports csv with headers', () => {
    const csv = recordsToCsv([{ id: 1, name: 'test' }])
    expect(csv).toContain('id,name')
    expect(csv).toContain('1,test')
  })
})

describe('sql export helpers', () => {
  it('escapes single quotes in strings', () => {
    expect(escapeSqlString("O'Brien")).toBe("O''Brien")
  })

  it('formats sql literals', () => {
    expect(sqlLiteral(null)).toBe('NULL')
    expect(sqlLiteral(undefined)).toBe('NULL')
    expect(sqlLiteral(true)).toBe('TRUE')
    expect(sqlLiteral(false)).toBe('FALSE')
    expect(sqlLiteral(42)).toBe('42')
    expect(sqlLiteral("it's")).toBe("'it''s'")
  })

  it('sanitizes table names', () => {
    expect(sanitizeSqlTableName('')).toBe('mock_data')
    expect(sanitizeSqlTableName('users')).toBe('users')
    expect(sanitizeSqlTableName('my-table!')).toBe('my_table_')
  })
})

describe('recordsToSqlInsert', () => {
  it('generates insert statements', () => {
    const sql = recordsToSqlInsert(
      [{ id: 1, name: 'Alice' }, { id: 2, name: "Bob's" }],
      'users'
    )
    expect(sql).toContain('INSERT INTO `users` (`id`, `name`) VALUES (1, \'Alice\');')
    expect(sql).toContain("INSERT INTO `users` (`id`, `name`) VALUES (2, 'Bob''s');")
  })

  it('defaults table name to mock_data', () => {
    const sql = recordsToSqlInsert([{ id: 1 }])
    expect(sql).toContain('INSERT INTO `mock_data`')
  })

  it('returns empty string for no records', () => {
    expect(recordsToSqlInsert([])).toBe('')
  })

  it('handles boolean and null values', () => {
    const sql = recordsToSqlInsert([{ active: true, note: null }], 't')
    expect(sql).toContain('TRUE')
    expect(sql).toContain('NULL')
  })
})
