import { execFile } from 'child_process'
import { promisify } from 'util'
import { getDnsFlushPlatformInfo, type DnsFlushResult } from '@dev-tool-kit/shared'
const execFileAsync = promisify(execFile)
export async function flushDNS(): Promise<DnsFlushResult> {
  const platform = process.platform
  const info = getDnsFlushPlatformInfo(platform)

  if (info.platform === 'unknown') {
    return {
      success: false,
      errorCode: 'unsupported_platform',
      manualCommands: info.manualCommands
    }
  }

  if (platform === 'win32') {
    await execFileAsync('ipconfig', ['/flushdns'], { windowsHide: true, timeout: 10000 })
    return { success: true, method: 'ipconfig' }
  }

  if (platform === 'darwin') {
    await execFileAsync('dscacheutil', ['-flushcache'], { windowsHide: true, timeout: 10000 })
    return { success: true, method: 'dscacheutil' }
  }

  const attempts: Array<{ method: DnsFlushResult['method']; run: () => Promise<unknown> }> = [
    {
      method: 'systemd-resolve',
      run: async () => {
        await execFileAsync('systemd-resolve', ['--flush-caches'], {
          windowsHide: true,
          timeout: 10000
        })
      }
    },
    {
      method: 'resolvectl',
      run: async () => {
        await execFileAsync('resolvectl', ['flush-caches'], { windowsHide: true, timeout: 10000 })
      }
    },
    {
      method: 'nscd',
      run: async () => {
        await execFileAsync('service', ['nscd', 'restart'], { windowsHide: true, timeout: 10000 })
      }
    }
  ]

  const errors: string[] = []
  for (const attempt of attempts) {
    try {
      await attempt.run()
      return { success: true, method: attempt.method }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  return {
    success: false,
    errorCode: 'no_flush_tool',
    error: errors.join('; '),
    manualCommands: info.manualCommands
  }
}
