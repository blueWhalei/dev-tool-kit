import { describe, expect, it } from 'vitest'
import { isEnvBackupArray, isHostsSchemeArray, isSavedRenameRuleArray } from './config-validation'
import { isValidIP } from './network-validation'

describe('stored configuration validation', () => {
  const entry = { id: 'entry', ip: '::1', hostname: 'localhost', enabled: true }
  const scheme = {
    id: 'scheme',
    name: 'Local',
    timestamp: '2026-10-29T00:00:00.000Z',
    entries: [entry]
  }
  it('rejects malformed records inside otherwise valid arrays', () => {
    for (const validate of [isEnvBackupArray, isHostsSchemeArray, isSavedRenameRuleArray]) {
      expect(validate([])).toBe(true)
      expect(validate([null])).toBe(false)
      expect(validate([{}])).toBe(false)
      expect(validate({})).toBe(false)
    }
  })
  it('validates imported hosts and rejects line injection and duplicate identifiers', () => {
    expect(isHostsSchemeArray([scheme])).toBe(true)
    for (const invalid of [
      { ip: '999.1.1.1' },
      { hostname: 'a\nb' },
      { comment: 'a\nb' },
      { group: 'a\nb' },
      { enabled: 'true' }
    ]) {
      expect(isHostsSchemeArray([{ ...scheme, entries: [{ ...entry, ...invalid }] }])).toBe(false)
    }
    expect(isHostsSchemeArray([scheme, scheme])).toBe(false)
    expect(isHostsSchemeArray([{ ...scheme, entries: [entry, entry] }])).toBe(false)
    expect(
      isHostsSchemeArray([{ ...scheme, entries: [entry, { ...entry, id: 'different-id' }] }])
    ).toBe(false)
  })
  it('accepts complete user variable backups and rejects invalid scope and timestamps', () => {
    const backup = {
      name: 'Backup',
      timestamp: scheme.timestamp,
      variables: [{ name: 'EXAMPLE', value: 'x'.repeat(2048), type: 'user' }]
    }
    expect(isEnvBackupArray([backup])).toBe(true)
    expect(isEnvBackupArray([{ ...backup, timestamp: 'bad' }])).toBe(false)
    expect(
      isEnvBackupArray([
        { ...backup, variables: [{ name: 'EXAMPLE', value: 'x', type: 'system' }] }
      ])
    ).toBe(false)
  })
  it('preserves separately identified schemes that share a display name', () => {
    expect(isHostsSchemeArray([scheme, { ...scheme, id: 'second' }])).toBe(true)
  })
  it('preserves valid Windows environment names in backups', () => {
    expect(
      isEnvBackupArray([
        {
          name: 'Windows',
          timestamp: scheme.timestamp,
          variables: [{ name: 'TOOL(x86)', value: 'C:\\Tools', type: 'user' }]
        }
      ])
    ).toBe(true)
  })
})

describe('IP syntax', () => {
  it.each(['::', '::1', '2001:db8::1', '::ffff:192.0.2.1', '1:2:3:4:5:6:7:8', '127.0.0.1'])(
    'accepts %s',
    value => expect(isValidIP(value)).toBe(true)
  )
  it.each([
    '1::2::3',
    ':1',
    '1:',
    '1:2:3:4:5:6:7:8::',
    '256.0.0.1',
    '::ffff:999.0.0.1',
    '12345::',
    '1:2:3'
  ])('rejects %s', value => expect(isValidIP(value)).toBe(false))
})
