import { execFile } from 'child_process'
import { promisify } from 'util'
import { logger } from '../../logger'
import { platform } from 'os'
import type { PortInfo, ProcessInfo } from '@dev-tool-kit/shared'
import { parseWindowsNetstat } from './netstat-parser'

const execFileAsync = promisify(execFile)

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
  private processNameCache = new Map<number, string>()

  private async getCachedPorts(): Promise<PortInfo[]> {
    const now = Date.now()
    if (this.portsCache && now < this.portsCache.expiresAt) {
      return this.portsCache.data
    }
    const data = await this.scanAllPortsRaw()
    this.portsCache = { data, expiresAt: now + PORTS_CACHE_TTL_MS }
    return data
  }

  invalidateCache(): void {
    this.portsCache = null
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
        logger.warn(`Unsupported platform: ${this.platform}`)
        return []
    }
  }

  private async getWindowsPorts(): Promise<PortInfo[]> {
    try {
      const { stdout } = await execFileAsync('netstat', ['-ano'], {
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 10
      })
      const ports = parseWindowsNetstat(stdout)
      return this.enrichWithProcessNames(ports)
    } catch (error) {
      logger.error('netstat command failed:', error)
      return []
    }
  }

  private async getMacPorts(): Promise<PortInfo[]> {
    try {
      const { stdout } = await execFileAsync('lsof', ['-i', '-P', '-n'])
      const ports = this.parseMacLsof(stdout)
      return this.enrichWithProcessNames(ports)
    } catch (error) {
      logger.error('lsof command failed:', error)
      return []
    }
  }

  private parseMacLsof(output: string): PortInfo[] {
    const ports: PortInfo[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 9) continue

      const name = parts[parts.length - 1]
      if (!name.includes('->')) {
        // LISTENING
        const match = line.match(/(?:TCP|UDP)\s+(\S+):(\d+)\s+\(LISTEN\)/)
        if (match) {
          ports.push({
            port: parseInt(match[2]),
            pid: parseInt(parts[1]) || 0,
            protocol: match[1].toUpperCase() as 'TCP' | 'UDP',
            state: 'LISTENING',
            localAddress: match[1]
          })
        }
      }
    }

    return ports
  }

  private async getLinuxPorts(): Promise<PortInfo[]> {
    try {
      const { stdout } = await execFileAsync('ss', ['-tulnp'])
      const ports = this.parseLinuxSS(stdout)
      return this.enrichWithProcessNames(ports)
    } catch (error) {
      logger.error('ss command failed:', error)
      // Fallback to netstat
      try {
        const { stdout } = await execFileAsync('netstat', ['-tulnp'])
        const ports = this.parseLinuxNetstat(stdout)
        return this.enrichWithProcessNames(ports)
      } catch {
        return []
      }
    }
  }

  private parseLinuxSS(output: string): PortInfo[] {
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

      const state = parts[1] || 'UNKNOWN'
      const pidMatch = line.match(/pid=(\d+)/)
      const pid = pidMatch ? parseInt(pidMatch[1]) : 0

      ports.push({
        port,
        pid,
        protocol,
        state,
        localAddress: localAddr.substring(0, lastColon)
      })
    }

    return ports
  }

  private parseLinuxNetstat(output: string): PortInfo[] {
    const ports: PortInfo[] = []
    const lines = output.split('\n')

    for (const line of lines) {
      if (line.startsWith('Active') || line.startsWith('Proto')) continue
      
      const parts = line.trim().split(/\s+/)
      if (parts.length < 4) continue

      const protocol = parts[0].toUpperCase() as 'TCP' | 'UDP'
      const localAddress = parts[3]
      const state = parts.length > 5 ? parts[5] : 'UNKNOWN'
      
      const lastColon = localAddress.lastIndexOf(':')
      if (lastColon === -1) continue

      const port = parseInt(localAddress.substring(lastColon + 1))
      if (isNaN(port)) continue

      const pidProgram = parts.length > 6 ? parts[6] : ''
      const pid = parseInt(pidProgram.split('/')[0]) || 0

      ports.push({
        port,
        pid,
        protocol,
        state: state || 'UNKNOWN',
        localAddress: localAddress.substring(0, lastColon)
      })
    }

    return ports
  }

  async getPort(port: number): Promise<PortInfo | null> {
    const ports = await this.getCachedPorts()
    return ports.find(p => p.port === port) || null
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
      const { stdout } = await execFileAsync('tasklist', ['/FI', `PID eq ${pidStr}`, '/FO', 'CSV', '/NH'], {
        windowsHide: true
      })

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

  async killProcess(pid: number, force = false): Promise<{ success: boolean; error?: string }> {
    if (!Number.isInteger(pid) || pid <= 0) {
      return { success: false, error: 'Invalid PID' }
    }
    if (isProtectedPid(pid)) {
      return { success: false, error: '无法终止系统关键进程' }
    }

    const pidStr = String(pid)
    logger.info(`Killing process ${pid} (force: ${force})`)

    try {
      if (this.platform === 'win32') {
        const args = force ? ['/F', '/PID', pidStr] : ['/PID', pidStr]
        await execFileAsync('taskkill', args, { windowsHide: true })
      } else {
        const signal = force ? 'SIGKILL' : 'SIGTERM'
        await execFileAsync('kill', [`-${signal}`, pidStr])
      }

      this.processNameCache.delete(pid)
      this.invalidateCache()
      logger.info(`Process ${pid} terminated successfully`)
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error(`Failed to kill process ${pid}:`, errorMsg)

      if (!force && this.platform !== 'win32') {
        logger.info('Trying SIGKILL...')
        return await this.killProcess(pid, true)
      }

      return { success: false, error: errorMsg }
    }
  }

  private async batchResolveProcessNames(pids: number[]): Promise<Map<number, string>> {
    const result = new Map<number, string>()
    const uncached = pids.filter(pid => !this.processNameCache.has(pid))

    for (const pid of pids) {
      const cached = this.processNameCache.get(pid)
      if (cached) result.set(pid, cached)
    }

    if (uncached.length === 0) return result

    if (this.platform === 'win32') {
      try {
        const { stdout } = await execFileAsync(
          'tasklist',
          ['/FO', 'CSV', '/NH'],
          { windowsHide: true, maxBuffer: 1024 * 1024 * 10 }
        )
        for (const line of stdout.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed) continue
          const parts = trimmed.split('","').map(p => p.replace(/"/g, ''))
          const pid = parseInt(parts[1], 10)
          const name = parts[0]
          if (pid > 0 && name) {
            this.processNameCache.set(pid, name)
            if (uncached.includes(pid)) result.set(pid, name)
          }
        }
      } catch (error) {
        logger.error('Batch tasklist failed:', error)
      }
    } else {
      const batchSize = 20
      for (let i = 0; i < uncached.length; i += batchSize) {
        const batch = uncached.slice(i, i + batchSize)
        await Promise.all(batch.map(async pid => {
          try {
            const info = await this.getProcessInfo(pid)
            if (info?.name) {
              this.processNameCache.set(pid, info.name)
              result.set(pid, info.name)
            }
          } catch {
            // skip
          }
        }))
      }
    }

    return result
  }

  private async enrichWithProcessNames(ports: PortInfo[]): Promise<PortInfo[]> {
    const pidSet = Array.from(new Set(ports.map(p => p.pid).filter(pid => pid > 0)))
    const pidNameMap = await this.batchResolveProcessNames(pidSet)

    return ports.map(p => ({
      ...p,
      service: pidNameMap.get(p.pid) || p.service
    }))
  }
}
