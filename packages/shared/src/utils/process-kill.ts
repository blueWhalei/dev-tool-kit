import type { KillProcessErrorCode, OperationResult } from '../types'

export interface ParsedKillError {
  code: KillProcessErrorCode
  needSudo: boolean
}

export function parseKillError(errorMsg: string, platform: string): ParsedKillError {
  const msg = errorMsg.trim()

  if (/ESRCH|No such process|not found/i.test(msg)) {
    return { code: 'process_not_found', needSudo: false }
  }

  if (/EPERM|Permission denied|Operation not permitted|not permitted/i.test(msg)) {
    return { code: 'permission_denied', needSudo: platform !== 'win32' }
  }

  if (/Access is denied|access denied/i.test(msg)) {
    return { code: 'access_denied', needSudo: false }
  }

  return { code: 'unknown', needSudo: false }
}

export function buildKillCommand(
  pid: number,
  options: { force?: boolean; sudo?: boolean; platform?: string } = {}
): string {
  const { force = true, sudo = false, platform = 'linux' } = options
  const pidStr = String(Math.floor(pid))

  if (platform === 'win32') {
    return force ? `taskkill /F /PID ${pidStr}` : `taskkill /PID ${pidStr}`
  }

  const signal = force ? '-9' : '-15'
  const cmd = `kill ${signal} ${pidStr}`
  return sudo ? `sudo ${cmd}` : cmd
}

export interface KillFailureOptions {
  errorMsg: string
  pid: number
  platform: string
  force?: boolean
}

export function buildKillFailureResult(options: KillFailureOptions): OperationResult {
  const { errorMsg, pid, platform, force = true } = options
  const parsed = parseKillError(errorMsg, platform)
  const suggestCommand =
    parsed.code === 'permission_denied' ||
    parsed.code === 'access_denied' ||
    parsed.needSudo

  return {
    success: false,
    error: errorMsg,
    errorCode: parsed.code,
    ...(parsed.needSudo ? { needSudo: true } : {}),
    ...(suggestCommand
      ? { killCommand: buildKillCommand(pid, { force, sudo: parsed.needSudo, platform }) }
      : {})
  }
}
