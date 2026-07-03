import { describe, it, expect } from 'vitest'
import {
  yamlToJson,
  jsonToYaml,
  tomlToJson,
  jsonToToml,
  yamlFormat
} from './yaml-toml'

describe('yamlToJson / jsonToYaml', () => {
  it('converts YAML to JSON', () => {
    const result = yamlToJson('name: test\nvalue: 42')
    expect(result.success).toBe(true)
    expect(JSON.parse(result.result!)).toEqual({ name: 'test', value: 42 })
  })

  it('converts JSON to YAML', () => {
    const result = jsonToYaml('{"name":"test","value":42}')
    expect(result.success).toBe(true)
    expect(result.result).toContain('name')
  })

  it('formats YAML', () => {
    const result = yamlFormat('name: test\nnested:\n  key: value')
    expect(result.success).toBe(true)
  })

  it('rejects invalid YAML', () => {
    expect(yamlToJson('{{invalid yaml').success).toBe(false)
  })
})

describe('tomlToJson / jsonToToml', () => {
  it('converts TOML to JSON', () => {
    const result = tomlToJson('title = "test"\ncount = 42')
    expect(result.success).toBe(true)
    expect(JSON.parse(result.result!)).toEqual({ title: 'test', count: 42 })
  })

  it('converts JSON to TOML', () => {
    const result = jsonToToml('{"title":"test","count":42}')
    expect(result.success).toBe(true)
    expect(result.result).toContain('title')
  })

  it('rejects invalid TOML', () => {
    expect(tomlToJson('[[').success).toBe(false)
  })
})
