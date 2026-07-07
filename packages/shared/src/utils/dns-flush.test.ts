import { describe, it, expect } from 'vitest'
import { getDnsFlushPlatformInfo } from './dns-flush'

describe('getDnsFlushPlatformInfo', () => {
  it('returns ipconfig for Windows', () => {
    const info = getDnsFlushPlatformInfo('win32')
    expect(info.platform).toBe('win32')
    expect(info.methods[0]?.method).toBe('ipconfig')
    expect(info.manualCommands).toContain('ipconfig /flushdns')
  })

  it('returns dscacheutil for macOS', () => {
    const info = getDnsFlushPlatformInfo('darwin')
    expect(info.platform).toBe('darwin')
    expect(info.methods[0]?.method).toBe('dscacheutil')
  })

  it('returns multiple Linux flush methods', () => {
    const info = getDnsFlushPlatformInfo('linux')
    expect(info.platform).toBe('linux')
    expect(info.methods.map(m => m.method)).toEqual([
      'systemd-resolve',
      'resolvectl',
      'nscd'
    ])
  })
})
