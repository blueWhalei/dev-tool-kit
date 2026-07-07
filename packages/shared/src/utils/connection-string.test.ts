import { describe, it, expect } from 'vitest'
import { parseConnectionString, parsedConnectionToJson } from './connection-string'

describe('parseConnectionString', () => {
  it('parses MySQL URI', () => {
    const result = parseConnectionString('mysql://root:secret@localhost:3306/mydb?charset=utf8mb4')
    expect(result.success).toBe(true)
    expect(result.result).toEqual({
      protocol: 'mysql',
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'secret',
      database: 'mydb',
      queryParams: { charset: 'utf8mb4' }
    })
  })

  it('parses PostgreSQL URI with default port', () => {
    const result = parseConnectionString('postgresql://app:pass@db.example.com/app_db')
    expect(result.success).toBe(true)
    expect(result.result?.protocol).toBe('postgresql')
    expect(result.result?.port).toBe(5432)
    expect(result.result?.database).toBe('app_db')
  })

  it('parses postgres alias protocol', () => {
    const result = parseConnectionString('postgres://user@host/db')
    expect(result.success).toBe(true)
    expect(result.result?.protocol).toBe('postgres')
    expect(result.result?.port).toBe(5432)
  })

  it('parses Redis URI with db index', () => {
    const result = parseConnectionString('redis://:password@127.0.0.1:6379/2')
    expect(result.success).toBe(true)
    expect(result.result).toMatchObject({
      protocol: 'redis',
      host: '127.0.0.1',
      port: 6379,
      password: 'password',
      database: '2'
    })
  })

  it('parses rediss with default port', () => {
    const result = parseConnectionString('rediss://user:pass@cache.local')
    expect(result.success).toBe(true)
    expect(result.result?.protocol).toBe('rediss')
    expect(result.result?.port).toBe(6380)
  })

  it('parses MongoDB URI', () => {
    const result = parseConnectionString(
      'mongodb://admin:secret@mongo1:27017/mydb?authSource=admin&replicaSet=rs0'
    )
    expect(result.success).toBe(true)
    expect(result.result).toMatchObject({
      protocol: 'mongodb',
      host: 'mongo1',
      port: 27017,
      user: 'admin',
      password: 'secret',
      database: 'mydb',
      queryParams: { authSource: 'admin', replicaSet: 'rs0' }
    })
  })

  it('parses MongoDB SRV URI', () => {
    const result = parseConnectionString('mongodb+srv://user:pass@cluster.example.net/prod')
    expect(result.success).toBe(true)
    expect(result.result).toMatchObject({
      protocol: 'mongodb+srv',
      host: 'cluster.example.net',
      port: 27017,
      database: 'prod'
    })
  })

  it('rejects empty input', () => {
    expect(parseConnectionString('').success).toBe(false)
    expect(parseConnectionString('   ').error).toBe('empty')
  })

  it('rejects unsupported protocol', () => {
    const result = parseConnectionString('ftp://user@host/db')
    expect(result.success).toBe(false)
    expect(result.error).toBe('unsupported_protocol')
  })

  it('rejects invalid format', () => {
    const result = parseConnectionString('not a connection string')
    expect(result.success).toBe(false)
    expect(result.error).toBe('invalid_format')
  })
})

describe('parsedConnectionToJson', () => {
  it('serializes parsed result', () => {
    const parsed = parseConnectionString('redis://localhost/0')
    expect(parsed.success).toBe(true)
    const json = parsedConnectionToJson(parsed.result!)
    expect(JSON.parse(json)).toMatchObject({ protocol: 'redis', host: 'localhost' })
  })
})
