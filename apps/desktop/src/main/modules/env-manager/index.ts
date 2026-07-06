import { ipcMain, app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../../logger'
import type { EnvVariable } from '@dev-tool-kit/shared'
import * as windows from './windows'
import * as unix from './unix'

const IS_WINDOWS = process.platform === 'win32'
const IS_UNIX = process.platform === 'darwin' || process.platform === 'linux'

export interface EnvBackup {
  timestamp: string
  name: string
  variables: EnvVariable[]
}

export function setupEnvManagerIPC(): void {
  logger.info('Setting up Environment Manager IPC handlers')

  ipcMain.handle('env-manager:getSupport', () => {
    if (IS_WINDOWS) {
      return { supported: true, platform: process.platform, readOnly: false, writeMode: 'registry' }
    }
    if (IS_UNIX) {
      return unix.getUnixSupportInfo()
    }
    return { supported: false, platform: process.platform, readOnly: true, writeMode: 'none' }
  })

  ipcMain.handle('env-manager:getAll', async () => {
    try {
      if (IS_WINDOWS) return await windows.getAllWindowsEnv()
      if (IS_UNIX) return await unix.getAllUnixEnv()
      return []
    } catch (error) {
      logger.error('Failed to get environment variables:', error)
      return []
    }
  })

  ipcMain.handle('env-manager:get', async (_, name: string) => {
    try {
      if (IS_WINDOWS) return await windows.getWindowsEnv(name)
      if (IS_UNIX) return await unix.getUnixEnv(name)
      return null
    } catch (error) {
      logger.error(`Failed to get env var ${name}:`, error)
      return null
    }
  })

  ipcMain.handle('env-manager:set', async (_, name: string, value: string) => {
    if (IS_WINDOWS) return windows.setWindowsEnv(name, value)
    if (IS_UNIX) return unix.setUnixEnv(name, value)
    return { success: false, error: '当前平台不支持环境变量管理' }
  })

  ipcMain.handle('env-manager:delete', async (_, name: string) => {
    if (IS_WINDOWS) return windows.deleteWindowsEnv(name)
    if (IS_UNIX) return unix.deleteUnixEnv(name)
    return { success: false, error: '当前平台不支持环境变量管理' }
  })

  ipcMain.handle('env-manager:getPath', async () => {
    try {
      if (IS_WINDOWS) return await windows.getWindowsPath()
      if (IS_UNIX) return await unix.getUnixPath()
      return []
    } catch (error) {
      logger.error('Failed to get PATH:', error)
      return []
    }
  })

  ipcMain.handle('env-manager:setPath', async (_, paths: string[]) => {
    if (IS_WINDOWS) return windows.setWindowsPath(paths)
    if (IS_UNIX) return unix.setUnixPath(paths)
    return { success: false, error: '当前平台不支持环境变量管理' }
  })

  ipcMain.handle('env-manager:previewSet', async (_, name: string, value: string) => {
    if (IS_UNIX) return unix.previewUnixEnvSet(name, value)
    return { success: false, error: '当前平台不支持预览' }
  })

  ipcMain.handle('env-manager:previewDelete', async (_, name: string) => {
    if (IS_UNIX) return unix.previewUnixEnvDelete(name)
    return { success: false, error: '当前平台不支持预览' }
  })

  ipcMain.handle('env-manager:previewPath', async (_, paths: string[]) => {
    if (IS_UNIX) return unix.previewUnixPath(paths)
    return { success: false, error: '当前平台不支持预览' }
  })

  ipcMain.handle('env-manager:createBackup', async (_, name: string) => {
    if (typeof name !== 'string' || !name.trim()) {
      return { success: false, error: '无效的备份名称' }
    }
    try {
      let variables: EnvVariable[] = []
      if (IS_WINDOWS) {
        variables = await windows.getWindowsUserVarsForBackup()
      } else if (IS_UNIX) {
        variables = await unix.getUnixUserVarsForBackup()
      } else {
        return { success: false, error: '当前平台不支持环境变量管理' }
      }

      const backup: EnvBackup = {
        timestamp: new Date().toISOString(),
        name,
        variables
      }

      const backups = await getBackups()
      backups.push(backup)

      if (backups.length > 10) {
        backups.splice(0, backups.length - 10)
      }

      await saveBackups(backups)
      logger.info(`Backup "${name}" created successfully`)
      return { success: true }
    } catch (error) {
      logger.error('Failed to create backup:', error)
      return { success: false, error: '创建备份失败' }
    }
  })

  ipcMain.handle('env-manager:listBackups', async () => {
    const backups = await getBackups()
    return backups.map((b) => ({
      name: b.name,
      timestamp: b.timestamp,
      count: b.variables.length
    }))
  })

  ipcMain.handle('env-manager:restoreBackup', async (_, timestamp: string) => {
    if (typeof timestamp !== 'string') {
      return { success: false, error: '无效的时间戳' }
    }
    try {
      const backups = await getBackups()
      const backup = backups.find((b) => b.timestamp === timestamp)

      if (!backup) {
        return { success: false, error: '未找到备份' }
      }

      if (IS_WINDOWS) {
        await windows.restoreWindowsBackup(backup.variables)
        logger.info(`Backup "${backup.name}" restored successfully`)
        return { success: true }
      }
      if (IS_UNIX) {
        return unix.restoreUnixBackup(backup.variables)
      }
      return { success: false, error: '当前平台不支持环境变量管理' }
    } catch (error) {
      logger.error('Failed to restore backup:', error)
      return { success: false, error: '恢复备份失败' }
    }
  })

  ipcMain.handle('env-manager:deleteBackup', async (_, timestamp: string) => {
    if (typeof timestamp !== 'string') {
      return { success: false, error: '无效的时间戳' }
    }
    try {
      let backups = await getBackups()
      backups = backups.filter((b) => b.timestamp !== timestamp)
      await saveBackups(backups)
      return { success: true }
    } catch {
      return { success: false, error: '删除备份失败' }
    }
  })

  ipcMain.handle('env-manager:export', async (_, variables: EnvVariable[]) => {
    const content = variables.map((v) => `${v.name}=${v.value}`).join('\n')
    return content
  })

  ipcMain.handle('env-manager:import', async (_, content: string) => {
    if (IS_UNIX) return []
    if (!IS_WINDOWS) return []
    if (typeof content !== 'string') return []
    return windows.importWindowsEnv(content)
  })

  logger.info('Environment Manager IPC handlers ready')
}

async function getConfigPath(filename: string): Promise<string> {
  const userDataPath = app.getPath('userData')
  const configDir = join(userDataPath, 'config')
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true })
  }
  return join(configDir, filename)
}

async function getBackups(): Promise<EnvBackup[]> {
  const backupFile = await getConfigPath('env-backups.json')
  try {
    if (existsSync(backupFile)) {
      const content = await readFile(backupFile, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    logger.warn('Failed to load backups:', error)
  }
  return []
}

async function saveBackups(backups: EnvBackup[]): Promise<void> {
  const backupFile = await getConfigPath('env-backups.json')
  await writeFile(backupFile, JSON.stringify(backups, null, 2))
}
