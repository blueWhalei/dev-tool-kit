import { ipcMain, app } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../../logger'
import type { EnvVariable, PathEntry } from '@dev-tool-kit/shared'

const execFileAsync = promisify(execFile)

const IS_WINDOWS = process.platform === 'win32'
const UNSUPPORTED_PLATFORM_ERROR = '环境变量管理仅支持 Windows 系统'

const ENV_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
const DANGEROUS_VALUE_CHARS = /[\x00\r\n]/
const SETX_MAX_LENGTH = 1024

function isValidEnvName(name: unknown): name is string {
  return typeof name === 'string' && ENV_NAME_REGEX.test(name)
}

function isValidEnvValue(value: unknown): value is string {
  return typeof value === 'string' && !DANGEROUS_VALUE_CHARS.test(value)
}

export interface EnvBackup {
  timestamp: string
  name: string
  variables: EnvVariable[]
}

// Get config directory path
async function getConfigPath(filename: string): Promise<string> {
  const userDataPath = app.getPath('userData')
  const configDir = join(userDataPath, 'config')
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true })
  }
  return join(configDir, filename)
}

// Read environment variables from Windows registry
async function getRegistryEnv(type: 'User' | 'Machine'): Promise<EnvVariable[]> {
  const variables: EnvVariable[] = []
  const regPath = type === 'User' ? 'HKCU\\Environment' : 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'
  
  try {
    const { stdout } = await execFileAsync(
      'reg',
      ['query', regPath],
      { windowsHide: true }
    )
    
    const lines = stdout.split('\n')
    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '')
      const match = line.match(/^\s+(\S+)\s+(REG_\w+)\s+(.*)$/i)
      if (match) {
        const [, name, , value] = match
        if (name && value) {
          variables.push({
            name: name.trim(),
            value: value.trim(),
            type: type === 'User' ? 'user' : 'system'
          })
        }
      }
    }
    
    logger.info(`[EnvManager] Parsed ${variables.length} variables from ${type}`)
  } catch (error) {
    logger.error(`[EnvManager] Failed to read ${type} environment variables:`, error)
  }
  
  return variables
}

// Broadcast environment change via WM_SETTINGCHANGE
async function broadcastEnvChange(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      await execFileAsync(
        'powershell',
        ['-Command', 'Add-Type -TypeDefinition \'using System;using System.Runtime.InteropServices;public class Win{[DllImport(\"user32.dll\",SetLastError=true,CharSet=CharSet.Auto)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,UIntPtr w,string l,uint f,uint t,out IntPtr r);}\'; $r=[IntPtr]::Zero; [Win]::SendMessageTimeout([IntPtr]0xffff,0x1a,[UIntPtr]::Zero,"Environment",0x2,5000,[ref]$r) | Out-Null'],
        { windowsHide: true, timeout: 10000 }
      )
    }
    logger.info('Environment change broadcasted')
  } catch (error) {
    logger.warn('Failed to broadcast environment change:', error)
  }
}

function unsupportedPlatformResult(): { success: false; error: string } {
  return { success: false, error: UNSUPPORTED_PLATFORM_ERROR }
}

export function setupEnvManagerIPC(): void {
  logger.info('Setting up Environment Manager IPC handlers')

  ipcMain.handle('env-manager:getSupport', () => ({
    supported: IS_WINDOWS,
    platform: process.platform
  }))

  // Get all environment variables
  ipcMain.handle('env-manager:getAll', async () => {
    if (!IS_WINDOWS) return []
    try {
      const userVars = await getRegistryEnv('User')
      const systemVars = await getRegistryEnv('Machine')
      return [...userVars, ...systemVars].sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      logger.error('Failed to get environment variables:', error)
      return []
    }
  })

  // Get specific variable
  ipcMain.handle('env-manager:get', async (_, name: string) => {
    if (!IS_WINDOWS) return null
    try {
      const userVars = await getRegistryEnv('User')
      const systemVars = await getRegistryEnv('Machine')
      const all = [...userVars, ...systemVars]
      return all.find(v => v.name === name) || null
    } catch (error) {
      logger.error(`Failed to get env var ${name}:`, error)
      return null
    }
  })

  // Set variable
  ipcMain.handle('env-manager:set', async (_, name: string, value: string) => {
    if (!IS_WINDOWS) return unsupportedPlatformResult()
    if (!isValidEnvName(name) || !isValidEnvValue(value)) {
      return { success: false, error: '无效的环境变量名或值' }
    }
    if (value.length > SETX_MAX_LENGTH) {
      return { success: false, error: `值长度超过 setx 限制 (${SETX_MAX_LENGTH} 字符)` }
    }
    try {
      await execFileAsync('setx', [name, value], { windowsHide: true })
      await broadcastEnvChange()
      logger.info(`Environment variable ${name} set successfully`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to set env var ${name}:`, error)
      return { success: false, error: '设置环境变量失败' }
    }
  })

  // Delete variable
  ipcMain.handle('env-manager:delete', async (_, name: string) => {
    if (!IS_WINDOWS) return unsupportedPlatformResult()
    if (!isValidEnvName(name)) {
      return { success: false, error: '无效的环境变量名' }
    }
    try {
      await execFileAsync('reg', ['delete', 'HKCU\\Environment', '/v', name, '/f'], { windowsHide: true })
      await broadcastEnvChange()
      logger.info(`Environment variable ${name} deleted successfully`)
      return { success: true }
    } catch (error) {
      logger.error(`Failed to delete env var ${name}:`, error)
      return { success: false, error: '删除环境变量失败' }
    }
  })

  // Get PATH variable with details
  ipcMain.handle('env-manager:getPath', async () => {
    if (!IS_WINDOWS) return []
    try {
      const all = await getRegistryEnv('User')
      const pathVar = all.find(v => v.name.toLowerCase() === 'path')
      
      if (!pathVar) {
        return []
      }

      const paths = pathVar.value.split(';').filter(p => p.trim())
      return paths.map((p, index) => ({
        path: p,
        exists: existsSync(p),
        index
      })) as PathEntry[]
    } catch (error) {
      logger.error('Failed to get PATH:', error)
      return []
    }
  })

  // Set PATH variable
  ipcMain.handle('env-manager:setPath', async (_, paths: string[]) => {
    if (!IS_WINDOWS) return unsupportedPlatformResult()
    if (!Array.isArray(paths) || paths.some(p => typeof p !== 'string' || DANGEROUS_VALUE_CHARS.test(p))) {
      return { success: false, error: '无效的 PATH 条目' }
    }
    try {
      const value = paths.filter(p => p.trim()).join(';')
      if (value.length > SETX_MAX_LENGTH) {
        return { success: false, error: `PATH 总长度超过 setx 限制 (${SETX_MAX_LENGTH} 字符)，请减少条目` }
      }
      await execFileAsync('setx', ['Path', value], { windowsHide: true })
      await broadcastEnvChange()
      logger.info('PATH variable updated successfully')
      return { success: true }
    } catch (error) {
      logger.error('Failed to set PATH:', error)
      return { success: false, error: '更新 PATH 失败' }
    }
  })

  // Create backup
  ipcMain.handle('env-manager:createBackup', async (_, name: string) => {
    if (!IS_WINDOWS) return unsupportedPlatformResult()
    if (typeof name !== 'string' || !name.trim()) {
      return { success: false, error: '无效的备份名称' }
    }
    try {
      const variables = await getRegistryEnv('User')
      const backup: EnvBackup = {
        timestamp: new Date().toISOString(),
        name,
        variables
      }

      const backups = await getBackups()
      backups.push(backup)

      // Keep only last 10 backups
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

  // List backups
  ipcMain.handle('env-manager:listBackups', async () => {
    const backups = await getBackups()
    return backups.map(b => ({
      name: b.name,
      timestamp: b.timestamp,
      count: b.variables.length
    }))
  })

  // Restore backup
  ipcMain.handle('env-manager:restoreBackup', async (_, timestamp: string) => {
    if (!IS_WINDOWS) return unsupportedPlatformResult()
    if (typeof timestamp !== 'string') {
      return { success: false, error: '无效的时间戳' }
    }
    try {
      const backups = await getBackups()
      const backup = backups.find(b => b.timestamp === timestamp)

      if (!backup) {
        return { success: false, error: '未找到备份' }
      }

      for (const v of backup.variables) {
        if (isValidEnvName(v.name) && isValidEnvValue(v.value)) {
          await execFileAsync('setx', [v.name, v.value], { windowsHide: true })
        }
      }

      await broadcastEnvChange()
      logger.info(`Backup "${backup.name}" restored successfully`)
      return { success: true }
    } catch (error) {
      logger.error('Failed to restore backup:', error)
      return { success: false, error: '恢复备份失败' }
    }
  })

  // Delete backup
  ipcMain.handle('env-manager:deleteBackup', async (_, timestamp: string) => {
    if (typeof timestamp !== 'string') {
      return { success: false, error: '无效的时间戳' }
    }
    try {
      let backups = await getBackups()
      backups = backups.filter(b => b.timestamp !== timestamp)
      await saveBackups(backups)
      return { success: true }
    } catch (error) {
      return { success: false, error: '删除备份失败' }
    }
  })

  // Export to .env format
  ipcMain.handle('env-manager:export', async (_, variables: EnvVariable[]) => {
    const content = variables.map(v => `${v.name}=${v.value}`).join('\n')
    return content
  })

  // Import from .env format
  ipcMain.handle('env-manager:import', async (_, content: string) => {
    if (!IS_WINDOWS) return []
    if (typeof content !== 'string') return []
    const lines = content.split('\n')
    const results: { success: boolean; name: string; error?: string }[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue

      const name = trimmed.substring(0, eqIndex).trim()
      const value = trimmed.substring(eqIndex + 1).trim()

      if (name && isValidEnvName(name) && isValidEnvValue(value)) {
        try {
          await execFileAsync('setx', [name, value], { windowsHide: true })
          results.push({ success: true, name })
        } catch (error) {
          results.push({ success: false, name, error: '导入失败' })
        }
      }
    }

    if (results.some(r => r.success)) {
      await broadcastEnvChange()
    }

    return results
  })

  logger.info('Environment Manager IPC handlers ready')
}

// Backup file helpers
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


