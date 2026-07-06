import { describe, it, expect } from 'vitest'
import {
  chmodFromPermissions,
  parseChmodOctal,
  parseChmodSymbolic,
  permissionsToOctal,
  permissionsToSymbolic,
  DEFAULT_CHMOD_PERMISSIONS
} from './chmod'

describe('parseChmodOctal', () => {
  it('parses 3-digit octal 755', () => {
    const result = parseChmodOctal('755')
    expect(result.success).toBe(true)
    expect(result.result?.octal).toBe('755')
    expect(result.result?.symbolic).toBe('rwxr-xr-x')
    expect(result.result?.permissions.owner).toEqual({ read: true, write: true, execute: true })
    expect(result.result?.permissions.group).toEqual({ read: true, write: false, execute: true })
    expect(result.result?.permissions.other).toEqual({ read: true, write: false, execute: true })
    expect(result.result?.permissions.special).toEqual({ setuid: false, setgid: false, sticky: false })
  })

  it('parses 4-digit octal with setuid 4755', () => {
    const result = parseChmodOctal('4755')
    expect(result.success).toBe(true)
    expect(result.result?.octal).toBe('4755')
    expect(result.result?.symbolic).toBe('rwsr-xr-x')
    expect(result.result?.permissions.special.setuid).toBe(true)
  })

  it('parses sticky bit 1755', () => {
    const result = parseChmodOctal('1755')
    expect(result.success).toBe(true)
    expect(result.result?.symbolic).toBe('rwxr-xr-t')
    expect(result.result?.permissions.special.sticky).toBe(true)
  })

  it('parses setgid 2755', () => {
    const result = parseChmodOctal('2755')
    expect(result.success).toBe(true)
    expect(result.result?.symbolic).toBe('rwxr-sr-x')
    expect(result.result?.permissions.special.setgid).toBe(true)
  })

  it('rejects invalid octal', () => {
    expect(parseChmodOctal('').success).toBe(false)
    expect(parseChmodOctal('78').success).toBe(false)
    expect(parseChmodOctal('855').success).toBe(false)
    expect(parseChmodOctal('12').success).toBe(false)
  })
})

describe('parseChmodSymbolic', () => {
  it('parses rwxr-xr-x', () => {
    const result = parseChmodSymbolic('rwxr-xr-x')
    expect(result.success).toBe(true)
    expect(result.result?.octal).toBe('755')
    expect(result.result?.symbolic).toBe('rwxr-xr-x')
  })

  it('parses with leading file type dash', () => {
    const result = parseChmodSymbolic('-rwxr-xr-x')
    expect(result.success).toBe(true)
    expect(result.result?.octal).toBe('755')
  })

  it('parses setuid symbolic rwsr-xr-x', () => {
    const result = parseChmodSymbolic('rwsr-xr-x')
    expect(result.success).toBe(true)
    expect(result.result?.octal).toBe('4755')
  })

  it('parses setuid without execute rwSr-xr-x', () => {
    const result = parseChmodSymbolic('rwSr-xr-x')
    expect(result.success).toBe(true)
    expect(result.result?.octal).toBe('4655')
    expect(result.result?.permissions.owner.execute).toBe(false)
  })

  it('parses sticky rwxr-xr-t', () => {
    const result = parseChmodSymbolic('rwxr-xr-t')
    expect(result.success).toBe(true)
    expect(result.result?.octal).toBe('1755')
  })

  it('rejects invalid symbolic', () => {
    expect(parseChmodSymbolic('').success).toBe(false)
    expect(parseChmodSymbolic('rwx').success).toBe(false)
    expect(parseChmodSymbolic('rwxr-xr-xx').success).toBe(false)
    expect(parseChmodSymbolic('abcr-xr-x').success).toBe(false)
  })
})

describe('chmodFromPermissions', () => {
  it('round-trips default permissions', () => {
    const info = chmodFromPermissions(DEFAULT_CHMOD_PERMISSIONS)
    expect(info.octal).toBe('755')
    expect(info.symbolic).toBe('rwxr-xr-x')
  })

  it('omits leading zero special digit when none set', () => {
    expect(permissionsToOctal(DEFAULT_CHMOD_PERMISSIONS)).toBe('755')
    expect(permissionsToSymbolic(DEFAULT_CHMOD_PERMISSIONS)).toBe('rwxr-xr-x')
  })

  it('octal and symbolic stay in sync after bit changes', () => {
    const octal = parseChmodOctal('644')
    expect(octal.result?.symbolic).toBe('rw-r--r--')

    const symbolic = parseChmodSymbolic('rw-r--r--')
    expect(symbolic.result?.octal).toBe('644')
  })
})
