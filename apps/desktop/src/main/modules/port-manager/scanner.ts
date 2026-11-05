import { execFile } from 'child_process'
import { promisify } from 'util'
import { logger } from '../../logger'
import { platform } from 'os'
import type {
  PortInfo,
  ProcessInfo,
  OperationResult,
  ListenerIdentity,
  PortDiagnosis,
  PortTarget
} from '@dev-tool-kit/shared'
import { inspectInstances, terminateInstance } from './process-instance'
import { matchesAddress, probeAvailability } from './bind-probe'
import { join } from 'node:path'
import { parseMacLsof, parseLinuxNetstat } from './unix-parser'
import { parseWindowsNetstat } from './netstat-parser'

const execute = promisify(execFile)
const execFileAsync = (file: string, args: string[], options = {}) =>
  execute(file, args, { timeout: 10000, windowsHide: true, ...options })

const PORTS_CACHE_TTL_MS = 3000

/** PIDs that must not be killed (system / self) */
const PROTECTED_PIDS_WIN = new Set([0, 4])
const PROTECTED_PIDS_UNIX = new Set([0, 1])

export function isProtectedPid(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return true
  if (pid === process.pid) return true
  if (process.platform === 'win32') {
    return PROTECTED_PIDS_WIN.has(pid)
  }
  return PROTECTED_PIDS_UNIX.has(pid)
}

export class PortScanner {
  private platform = platform()
  private portsCache: { data: PortInfo[]; expiresAt: number } | null = null
  private scanInFlight: Promise<PortInfo[]> | null = null
  private cacheGeneration = 0

  private async getCachedPorts(): Promise<PortInfo[]> {
    const now = Date.now()
    if (this.portsCache && now < this.portsCache.expiresAt) {
      return this.portsCache.data
    }
    if (this.scanInFlight) return this.scanInFlight
    const generation = this.cacheGeneration
    const pending = this.scanAllPortsRaw()
      .then(ports => this.enrichWithProcessNames(ports))
      .then(data => {
        if (generation === this.cacheGeneration) {
          this.portsCache = { data, expiresAt: Date.now() + PORTS_CACHE_TTL_MS }
        }
        return data
      })
      .finally(() => {
        if (this.scanInFlight === pending) this.scanInFlight = null
      })
    this.scanInFlight = pending
    return pending
  }

  invalidateCache(): void {
    this.cacheGeneration++
    this.portsCache = null
    this.scanInFlight = null
  }

  async getAllPorts(): Promise<PortInfo[]> {
    logger.info('Scanning all ports')
    return this.getCachedPorts()
  }

  private async scanAllPortsRaw(): Promise<PortInfo[]> {
    switch (this.platform) {
      case 'win32':
        return await this.getWindowsPorts()
      case 'darwin':
        return await this.getMacPorts()
      case 'linux':
        return await this.getLinuxPorts()
      default:
        throw new Error(`Unsupported platform: ${this.platform}`)
    }
  }

  private async getWindowsPorts(): Promise<PortInfo[]> {
    const { stdout } = await execFileAsync(
      join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'netstat.exe'),
      ['-ano'],
      { maxBuffer: 10 * 1024 * 1024 }
    )
    return parseWindowsNetstat(stdout)
  }

  private async getMacPorts(): Promise<PortInfo[]> {
    const { stdout } = await execFileAsync('/usr/sbin/lsof', ['-i', '-P', '-n'])
    return parseMacLsof(stdout)
  }

  private async getLinuxPorts(): Promise<PortInfo[]> {
    try {
      const snapshots = await Promise.all(
        ['-4', '-6'].map(async family => {
          const { stdout } = await execFileAsync('ss', [family, '-tulnp'])
          return this.parseLinuxSS(stdout, family === '-4' ? '0.0.0.0' : '::')
        })
      )
      return snapshots.flat()
    } catch (error) {
      logger.warn('ss failed, trying netstat', error)
      const { stdout } = await execFileAsync('netstat', ['-tulnp'])
      return parseLinuxNetstat(stdout)
    }
  }

  private parseLinuxSS(output: string, wildcard: string): PortInfo[] {
    const ports: PortInfo[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.startsWith('State') || line.startsWith('Netid')) continue

      const parts = line.trim().split(/\s+/)
      if (parts.length < 6) continue

      const protocol = parts[0].toUpperCase().replace('6', '') as 'TCP' | 'UDP'
      const localAddr = parts[4]

      const lastColon = localAddr.lastIndexOf(':')
      if (lastColon === -1) continue

      const port = parseInt(localAddr.substring(lastColon + 1))
      if (isNaN(port)) continue

      const state = parts[1] === 'LISTEN' ? 'LISTENING' : parts[1]
      const pids = new Set(
        Array.from(line.matchAll(/,pid=(\d+),fd=\d+\)/g), match => Number(match[1]))
      )
      if (!pids.size) pids.add(0)
      for (const pid of pids) {
        ports.push({
          port,
          pid,
          protocol,
          state,
          localAddress: localAddr.startsWith('*:') ? wildcard : localAddr.substring(0, lastColon)
        })
      }
    }

    return ports
  }

  private async scanListeners(port: number): Promise<PortInfo[]> {
    // Bypass both cached and in-flight scans for ownership checks and post-kill verification.
    return (await this.scanAllPortsRaw()).filter(
      row => row.port === port && row.protocol === 'TCP' && row.state === 'LISTENING'
    )
  }

  async diagnose(target: PortTarget): Promise<PortDiagnosis> {
    const rows = (await this.scanListeners(target.port)).filter(row =>
      matchesAddress(target.address, row.localAddress)
    )
    const listeners = await this.enrichWithProcessNames(rows)
    return { listeners, status: listeners.length ? 'listening' : await probeAvailability(target) }
  }

  async scanRange(startPort: number, endPort: number): Promise<PortInfo[]> {
    logger.info(`Scanning port range ${startPort}-${endPort}`)
    const ports = await this.getCachedPorts()
    return ports.filter(p => p.port >= startPort && p.port <= endPort)
  }

  async getProcessInfo(pid: number): Promise<ProcessInfo | null> {
    if (pid <= 0) return null

    try {
      switch (this.platform) {
        case 'win32':
          return await this.getWindowsProcessInfo(pid)
        case 'darwin':
          return await this.getMacProcessInfo(pid)
        case 'linux':
          return await this.getLinuxProcessInfo(pid)
        default:
          return { pid, name: `Process ${pid}` }
      }
    } catch (error) {
      logger.error(`Failed to get process info for PID ${pid}:`, error)
      return { pid, name: `Process ${pid}` }
    }
  }

  private async getWindowsProcessInfo(pid: number): Promise<ProcessInfo> {
    try {
      const pidStr = String(Math.floor(pid))
      const { stdout } = await execFileAsync(
        'tasklist',
        ['/FI', `PID eq ${pidStr}`, '/FO', 'CSV', '/NH'],
        {
          windowsHide: true
        }
      )

      const line = stdout.trim()
      if (line) {
        const parts = line.split('","').map((p: string) => p.replace(/"/g, ''))
        const memMatch = parts[4]?.match(/([\d,]+)\s*KB/)
        const memoryKB = memMatch ? parseInt(memMatch[1].replace(/,/g, '')) : 0

        return {
          pid,
          name: parts[0] || `Process ${pid}`,
          command: parts[0],
          memory: Math.round(memoryKB / 1024), // Convert to MB
          memoryMB: Math.round(memoryKB / 1024),
          user: parts[6] || undefined
        }
      }
    } catch (error) {
      logger.error('tasklist failed:', error)
    }

    return {
      pid,
      name: `Process ${pid}`
    }
  }

  private async getMacProcessInfo(pid: number): Promise<ProcessInfo> {
    const pidStr = String(Math.floor(pid))
    try {
      const { stdout } = await execFileAsync('ps', ['-p', pidStr, '-o', 'comm='])
      const name = stdout.trim() || `Process ${pid}`

      const { stdout: argsStdout } = await execFileAsync('ps', ['-p', pidStr, '-o', 'args='])

      return {
        pid,
        name,
        command: argsStdout.trim()
      }
    } catch {
      return { pid, name: `Process ${pid}` }
    }
  }

  private async getLinuxProcessInfo(pid: number): Promise<ProcessInfo> {
    const pidStr = String(Math.floor(pid))
    try {
      const { stdout: nameStdout } = await execFileAsync('ps', ['-p', pidStr, '-o', 'comm='])

      const { stdout: cmdStdout } = await execFileAsync('ps', ['-p', pidStr, '-o', 'args='])

      const { stdout: rssStdout } = await execFileAsync('ps', ['-p', pidStr, '-o', 'rss='])
      const memoryKB = parseInt(rssStdout.trim()) || 0

      const { stdout: userStdout } = await execFileAsync('ps', ['-p', pidStr, '-o', 'user='])

      return {
        pid,
        name: nameStdout.trim(),
        command: cmdStdout.trim(),
        memory: Math.round(memoryKB / 1024),
        memoryMB: Math.round(memoryKB / 1024),
        user: userStdout.trim()
      }
    } catch {
      return { pid, name: `Process ${pid}` }
    }
  }

  async killProcess(listener: ListenerIdentity): Promise<OperationResult> {
    const { port, pid, localAddress, instanceId } = listener
    if (!/^[0-9]{1,20}$/.test(instanceId)) return { success: false, errorCode: 'owner_changed' }
    if (!Number.isInteger(pid) || pid <= 0) {
      return { success: false, errorCode: 'invalid_pid' }
    }
    if (isProtectedPid(pid)) {
      return { success: false, errorCode: 'protected_pid' }
    }

    try {
      const owners = await this.scanListeners(port)
      if (!owners.some(row => row.pid === pid && row.localAddress === localAddress)) {
        return { success: false, errorCode: 'owner_changed' }
      }
    } catch {
      return { success: false, errorCode: 'scan_failed' }
    }
    const result = await terminateInstance(listener)
    this.invalidateCache()
    return result
  }

  private async enrichWithProcessNames(ports: PortInfo[]): Promise<PortInfo[]> {
    const pids = [...new Set(ports.map(row => row.pid).filter(pid => !isProtectedPid(pid)))]
    try {
      const instances = await inspectInstances(pids)
      return ports.map(row => {
        const instance = instances.get(row.pid)
        return instance ? { ...row, service: instance.name, instanceId: instance.instanceId } : row
      })
    } catch (error) {
      logger.warn('Process identities unavailable; listeners are read-only', error)
      return ports
    }
  }
}
