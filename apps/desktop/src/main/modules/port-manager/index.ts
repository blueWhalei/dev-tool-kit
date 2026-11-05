import { app } from 'electron'
import { handleIpc } from '../../typed-ipc'
import { PortScanner, isProtectedPid } from './scanner'
import { logger } from '../../logger'
import { isValidPort, COMMON_PORTS, normalizePortAddress } from '@dev-tool-kit/shared'
import type { PortInfo, ProcessInfo } from '@dev-tool-kit/shared'

export type { PortInfo, ProcessInfo }
export { COMMON_PORTS }

const portScanner = new PortScanner()
const pendingTerminations = new Set<number>()

function isValidPid(pid: number): boolean {
  return Number.isInteger(pid) && pid > 0
}

export function setupPortManagerIPC(): void {
  logger.info('Setting up Port Manager IPC handlers')

  handleIpc('port-manager:getPorts', async () => {
    return portScanner.getAllPorts()
  })

  handleIpc('port-manager:diagnose', async (_, target) => {
    if (
      !target ||
      !isValidPort(target.port) ||
      (target.address !== undefined &&
        (typeof target.address !== 'string' ||
          normalizePortAddress(target.address) !== target.address))
    )
      throw new Error('Invalid TCP endpoint')
    return portScanner.diagnose(target)
  })

  handleIpc('port-manager:scanRange', async (_, startPort: number, endPort: number) => {
    if (!isValidPort(startPort) || !isValidPort(endPort) || startPort > endPort) {
      return []
    }
    try {
      return await portScanner.scanRange(startPort, endPort)
    } catch (error) {
      logger.error(`Failed to scan port range ${startPort}-${endPort}:`, error)
      return []
    }
  })

  handleIpc('port-manager:getProcess', async (_, pid: number) => {
    if (!isValidPid(pid)) return null
    try {
      return await portScanner.getProcessInfo(pid)
    } catch (error) {
      logger.error(`Failed to get process ${pid}:`, error)
      return null
    }
  })

  handleIpc('port-manager:killProcess', async (_, listener) => {
    if (
      !listener ||
      !isValidPort(listener.port) ||
      !isValidPid(listener.pid) ||
      typeof listener.localAddress !== 'string' ||
      typeof listener.instanceId !== 'string' ||
      !/^\d{1,20}$/.test(listener.instanceId)
    )
      return { success: false, errorCode: 'invalid_pid' as const }
    const { pid } = listener
    if (isProtectedPid(pid) || app.getAppMetrics().some(metric => metric.pid === pid)) {
      logger.warn(`Blocked kill attempt on protected PID ${pid}`)
      return { success: false, errorCode: 'protected_pid' as const }
    }
    if (pendingTerminations.has(pid))
      return { success: false, errorCode: 'termination_pending' as const }
    pendingTerminations.add(pid)
    try {
      return await portScanner.killProcess(listener)
    } catch (error) {
      logger.error(`Failed to kill process ${pid}:`, error)
      return { success: false, errorCode: 'unknown' as const }
    } finally {
      pendingTerminations.delete(pid)
    }
  })

  handleIpc('port-manager:getCommonPorts', () => COMMON_PORTS)

  handleIpc('port-manager:scanCommonPorts', async () => {
    try {
      const allPorts = await portScanner.getAllPorts()
      const commonPortNumbers = new Set(COMMON_PORTS.map(p => p.port))

      return allPorts.filter(p => commonPortNumbers.has(p.port))
    } catch (error) {
      logger.error('Failed to scan common ports:', error)
      throw error
    }
  })

  logger.info('Port Manager IPC handlers ready')
}
