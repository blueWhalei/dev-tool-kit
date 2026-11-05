import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import type { ListenerIdentity, OperationResult } from '@dev-tool-kit/shared'
import windowsScript from './process-windows.ps1?raw'
import unixScript from './process-unix.py?raw'

const execute = promisify(execFile)
interface Instance {
  pid: number
  instanceId: string
  name: string
}
type Request = { action: 'inspect'; pids: number[] } | ({ action: 'terminate' } & ListenerIdentity)

async function run(request: Request) {
  const options = {
    timeout: 10000,
    windowsHide: true,
    env: { ...process.env, DEV_TOOLKIT_PROCESS_REQUEST: JSON.stringify(request) }
  }
  if (process.platform === 'win32') {
    const shell = join(
      process.env.SystemRoot || 'C:\\Windows',
      'System32/WindowsPowerShell/v1.0/powershell.exe'
    )
    return execute(
      shell,
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', windowsScript],
      options
    )
  }
  return execute('/usr/bin/python3', ['-I', '-S', '-c', unixScript], options)
}

export async function inspectInstances(pids: number[]): Promise<Map<number, Instance>> {
  const instances = new Map<number, Instance>()
  if (!pids.length) return instances
  const { stdout } = await run({ action: 'inspect', pids })
  const rows: unknown = JSON.parse(stdout)
  if (!Array.isArray(rows)) throw new Error('Invalid process table')
  for (const row of rows) {
    if (
      row &&
      Number.isSafeInteger(row.pid) &&
      typeof row.name === 'string' &&
      typeof row.instanceId === 'string' &&
      /^\d{1,20}$/.test(row.instanceId)
    )
      instances.set(row.pid, row)
  }
  return instances
}

export async function terminateInstance(listener: ListenerIdentity): Promise<OperationResult> {
  try {
    await run({ ...listener, action: 'terminate' })
    return { success: true }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code
    switch (Number(code)) {
      case 3:
        return { success: false, errorCode: 'owner_changed' }
      case 4:
        return { success: false, errorCode: 'permission_denied' }
      default:
        return { success: false, errorCode: 'scan_failed' }
    }
  }
}
