import { describe, it, expect } from 'vitest'
import { parseKillError, buildKillCommand, buildKillFailureResult } from './process-kill'

describe('parseKillError', () => {
  it('detects process not found (ESRCH)', () => {
    expect(parseKillError('kill: 1234: No such process', 'linux')).toEqual({
      code: 'process_not_found',
      needSudo: false
    })
  })

  it('detects permission denied on Unix', () => {
    expect(parseKillError('kill: Operation not permitted', 'darwin')).toEqual({
      code: 'permission_denied',
      needSudo: true
    })
  })

  it('detects permission denied on Windows without sudo hint', () => {
    expect(parseKillError('ERROR: Access is denied.', 'win32')).toEqual({
      code: 'access_denied',
      needSudo: false
    })
  })

  it('falls back to unknown', () => {
    expect(parseKillError('something unexpected', 'linux')).toEqual({
      code: 'unknown',
      needSudo: false
    })
  })
})

describe('buildKillCommand', () => {
  it('builds sudo kill -9 on Unix', () => {
    expect(buildKillCommand(42, { force: true, sudo: true, platform: 'linux' })).toBe(
      'sudo kill -9 42'
    )
  })

  it('builds kill -15 without sudo', () => {
    expect(buildKillCommand(42, { force: false, platform: 'darwin' })).toBe('kill -15 42')
  })

  it('builds taskkill on Windows', () => {
    expect(buildKillCommand(99, { force: true, platform: 'win32' })).toBe('taskkill /F /PID 99')
  })
})

describe('buildKillFailureResult', () => {
  it('includes kill command when permission denied', () => {
    const result = buildKillFailureResult({
      errorMsg: 'kill: Operation not permitted',
      pid: 8080,
      platform: 'linux'
    })
    expect(result.success).toBe(false)
    expect(result.errorCode).toBe('permission_denied')
    expect(result.needSudo).toBe(true)
    expect(result.killCommand).toBe('sudo kill -9 8080')
  })

  it('omits kill command for process not found', () => {
    const result = buildKillFailureResult({
      errorMsg: 'No such process',
      pid: 1,
      platform: 'darwin'
    })
    expect(result.errorCode).toBe('process_not_found')
    expect(result.killCommand).toBeUndefined()
  })
})
