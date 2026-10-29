import { TOOL_ERROR_CODES } from '@dev-tool-kit/shared'
import { handleIpc } from '../../typed-ipc'
import { readJsonFile, updateJsonFile } from '../../store/atomic-json'
import { app } from 'electron'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../../logger'
import type { EnvVariable } from '@dev-tool-kit/shared'
import * as windows from './windows'
import * as unix from './unix'
import { isValidRegistryEnvName, isValidShellEnvName, isValidEnvValue } from '@dev-tool-kit/shared'

import {
  type EnvBackup,
  isEnvBackupArray,
  isEnvVariableArray,
  isEnvScope
} from '@dev-tool-kit/shared'

const IS_WINDOWS = process.platform === 'win32'
const IS_UNIX = process.platform === 'darwin' || process.platform === 'linux'
const isValidEnvName = IS_WINDOWS ? isValidRegistryEnvName : isValidShellEnvName

export function setupEnvManagerIPC(): void {
  logger.info('Setting up Environment Manager IPC handlers')

  handleIpc('env-manager:getSupport', () => {
    if (IS_WINDOWS) {
      return { supported: true, platform: process.platform, readOnly: false, writeMode: 'registry' }
    }
    if (IS_UNIX) {
      return unix.getUnixSupportInfo()
    }
    return { supported: false, platform: process.platform, readOnly: true, writeMode: 'none' }
  })

  handleIpc('env-manager:getAll', async () => {
    try {
      if (IS_WINDOWS) return await windows.getAllWindowsEnv()
      if (IS_UNIX) return await unix.getAllUnixEnv()
      return []
    } catch (error) {
      logger.error('Failed to get environment variables:', error)
      return []
    }
  })

  handleIpc('env-manager:get', async (_, name: unknown) => {
    if (!isValidEnvName(name)) {
      return null
    }
    try {
      if (IS_WINDOWS) return await windows.getWindowsEnv(name)
      if (IS_UNIX) return await unix.getUnixEnv(name)
      return null
    } catch (error) {
      logger.error(`Failed to get env var ${name}:`, error)
      return null
    }
  })

  handleIpc('env-manager:set', async (_, name: unknown, value: unknown, scope) => {
    if (!isValidEnvName(name) || !isValidEnvValue(value) || !isEnvScope(scope)) {
      return { success: false, error: 'invalidEnv' }
    }
    if (IS_WINDOWS) return windows.setWindowsEnv(name, value, scope)
    if (IS_UNIX && scope === 'user') return unix.setUnixEnv(name, value)
    return { success: false, error: 'unsupported' }
  })

  handleIpc('env-manager:delete', async (_, name: unknown, scope) => {
    if (!isValidEnvName(name) || !isEnvScope(scope)) {
      return { success: false, error: 'invalidEnv' }
    }
    if (IS_WINDOWS) return windows.deleteWindowsEnv(name, scope)
    if (IS_UNIX && scope === 'user') return unix.deleteUnixEnv(name)
    return { success: false, error: 'unsupported' }
  })

  handleIpc('env-manager:getPath', async () => {
    try {
      if (IS_WINDOWS) return await windows.getWindowsPath()
      if (IS_UNIX) return await unix.getUnixPath()
      return []
    } catch (error) {
      logger.error('Failed to get PATH:', error)
      return []
    }
  })

  handleIpc('env-manager:setPath', async (_, paths: unknown) => {
    if (!Array.isArray(paths) || paths.some(p => typeof p !== 'string')) {
      return { success: false, error: 'invalidEnv' }
    }
    if (IS_WINDOWS) return windows.setWindowsPath(paths as string[])
    if (IS_UNIX) return unix.setUnixPath(paths as string[])
    return { success: false, error: 'unsupported' }
  })

  handleIpc('env-manager:previewSet', async (_, name: unknown, value: unknown) => {
    if (!isValidEnvName(name) || !isValidEnvValue(value)) {
      return { success: false, error: 'invalidEnv' }
    }
    if (IS_UNIX) return unix.previewUnixEnvSet(name, value)
    return { success: false, error: 'unsupported' }
  })

  handleIpc('env-manager:previewDelete', async (_, name: unknown) => {
    if (!isValidEnvName(name)) {
      return { success: false, error: 'invalidEnv' }
    }
    if (IS_UNIX) return unix.previewUnixEnvDelete(name)
    return { success: false, error: 'unsupported' }
  })

  handleIpc('env-manager:previewPath', async (_, paths: unknown) => {
    if (!Array.isArray(paths) || paths.some(p => typeof p !== 'string')) {
      return { success: false, error: 'invalidEnv' }
    }
    if (IS_UNIX) return unix.previewUnixPath(paths as string[])
    return { success: false, error: 'unsupported' }
  })

  handleIpc('env-manager:createBackup', async (_, name: string) => {
    if (typeof name !== 'string' || !name.trim()) {
      return { success: false, error: 'invalidConfig' }
    }
    try {
      let variables: EnvVariable[] = []
      if (IS_WINDOWS) {
        variables = await windows.getWindowsUserVarsForBackup()
      } else if (IS_UNIX) {
        variables = await unix.getUnixUserVarsForBackup()
      } else {
        return { success: false, error: 'unsupported' }
      }

      const backup: EnvBackup = {
        timestamp: new Date().toISOString(),
        name,
        variables
      }

      await saveBackups(backups => [...backups, backup].slice(-10))
      logger.info(`Backup "${name}" created successfully`)
      return { success: true }
    } catch (error) {
      logger.error('Failed to create backup:', error)
      return { success: false, error: 'backupFailed' }
    }
  })

  handleIpc('env-manager:listBackups', async () => {
    const backups = await getBackups()
    return backups.map(b => ({
      name: b.name,
      timestamp: b.timestamp,
      count: b.variables.length
    }))
  })

  handleIpc('env-manager:restoreBackup', async (_, timestamp: string) => {
    if (typeof timestamp !== 'string') {
      return { success: false, error: TOOL_ERROR_CODES.timestampInvalid }
    }
    try {
      const backups = await getBackups()
      const backup = backups.find(b => b.timestamp === timestamp)

      if (!backup) {
        return { success: false, error: 'backupNotFound' }
      }

      if (IS_WINDOWS) {
        return windows.restoreWindowsBackup(backup.variables)
      }
      if (IS_UNIX) {
        return unix.restoreUnixBackup(backup.variables)
      }
      return { success: false, error: 'unsupported' }
    } catch (error) {
      logger.error('Failed to restore backup:', error)
      return { success: false, error: 'restoreFailed' }
    }
  })

  handleIpc('env-manager:deleteBackup', async (_, timestamp: string) => {
    if (typeof timestamp !== 'string') {
      return { success: false, error: TOOL_ERROR_CODES.timestampInvalid }
    }
    try {
      await saveBackups(backups => backups.filter(b => b.timestamp !== timestamp))
      return { success: true }
    } catch {
      return { success: false, error: 'deleteFailed' }
    }
  })

  handleIpc('env-manager:export', async (_, variables: EnvVariable[]) => {
    if (!isEnvVariableArray(variables)) throw new Error('invalidConfig')
    const content = variables
      .filter(v => v && typeof v.name === 'string' && typeof v.value === 'string')
      .map(v => `${v.name}=${v.value}`)
      .join('\n')
    return content
  })

  handleIpc('env-manager:import', async (_, content: string) => {
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
  const value = await readJsonFile(await getConfigPath('env-backups.json'), [], isEnvBackupArray)
  return value
}

async function saveBackups(update: (items: EnvBackup[]) => EnvBackup[]): Promise<void> {
  await updateJsonFile<EnvBackup[]>(
    await getConfigPath('env-backups.json'),
    [],
    update,
    isEnvBackupArray
  )
}
