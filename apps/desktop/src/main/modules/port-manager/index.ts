import { ipcMain } from 'electron'
import { PortScanner, isProtectedPid } from './scanner'
import { logger } from '../../logger'
import { isValidPort, COMMON_PORTS } from '@dev-tool-kit/shared'
import type { PortInfo, ProcessInfo } from '@dev-tool-kit/shared'

export type { PortInfo, ProcessInfo }
export { COMMON_PORTS }

const portScanner = new PortScanner()

function isValidPid(pid: number): boolean {
  return Number.isInteger(pid) && pid > 0
}

export function setupPortManagerIPC(): void {
  logger.info('Setting up Port Manager IPC handlers')

  ipcMain.handle('port-manager:getPorts', async () => {
    try {
      return await portScanner.getAllPorts()
    } catch (error) {
      logger.error('Failed to get ports:', error)
      return []
    }
  })

  ipcMain.handle('port-manager:getPort', async (_, port: number) => {
    if (!isValidPort(port)) return null
    try {
      return await portScanner.getPort(port)
    } catch (error) {
      logger.error(`Failed to get port ${port}:`, error)
      return null
    }
  })

  ipcMain.handle('port-manager:scanRange', async (_, startPort: number, endPort: number) => {
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

  ipcMain.handle('port-manager:getProcess', async (_, pid: number) => {
    if (!isValidPid(pid)) return null
    try {
      return await portScanner.getProcessInfo(pid)
    } catch (error) {
      logger.error(`Failed to get process ${pid}:`, error)
      return null
    }
  })

  ipcMain.handle('port-manager:killProcess', async (_, pid: number, force = false) => {
    if (!isValidPid(pid)) return { success: false, errorCode: 'invalid_pid' as const }
    if (isProtectedPid(pid)) {
      logger.warn(`Blocked kill attempt on protected PID ${pid}`)
      return { success: false, errorCode: 'protected_pid' as const }
    }
    try {
      return await portScanner.killProcess(pid, force)
    } catch (error) {
      logger.error(`Failed to kill process ${pid}:`, error)
      return { success: false, errorCode: 'unknown' as const }
    }
  })

  ipcMain.handle('port-manager:getCommonPorts', () => COMMON_PORTS)

  ipcMain.handle('port-manager:scanCommonPorts', async () => {
    try {
      const allPorts = await portScanner.getAllPorts()
      const commonPortNumbers = new Set(COMMON_PORTS.map(p => p.port))

      return allPorts.filter(p => commonPortNumbers.has(p.port))
        .map(p => ({
          ...p,
          service: COMMON_PORTS.find(c => c.port === p.port)?.service
        }))
    } catch (error) {
      logger.error('Failed to scan common ports:', error)
      return []
    }
  })

  logger.info('Port Manager IPC handlers ready')
}
