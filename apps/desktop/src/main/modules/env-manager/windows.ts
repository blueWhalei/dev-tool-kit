import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { logger } from '../../logger'
import type { EnvVariable, PathEntry } from '@dev-tool-kit/shared'
import { isValidEnvName, isValidEnvValue, SETX_MAX_LENGTH } from './validation'

const execFileAsync = promisify(execFile)

export async function getRegistryEnv(type: 'User' | 'Machine'): Promise<EnvVariable[]> {
  const variables: EnvVariable[] = []
  const regPath =
    type === 'User'
      ? 'HKCU\\Environment'
      : 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'

  try {
    const { stdout } = await execFileAsync('reg', ['query', regPath], { windowsHide: true })

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

export async function broadcastEnvChange(): Promise<void> {
  try {
    await execFileAsync(
      'powershell',
      [
        '-Command',
        'Add-Type -TypeDefinition \'using System;using System.Runtime.InteropServices;public class Win{[DllImport(\"user32.dll\",SetLastError=true,CharSet=CharSet.Auto)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,UIntPtr w,string l,uint f,uint t,out IntPtr r);}\'; $r=[IntPtr]::Zero; [Win]::SendMessageTimeout([IntPtr]0xffff,0x1a,[UIntPtr]::Zero,"Environment",0x2,5000,[ref]$r) | Out-Null'
      ],
      { windowsHide: true, timeout: 10000 }
    )
    logger.info('Environment change broadcasted')
  } catch (error) {
    logger.warn('Failed to broadcast environment change:', error)
  }
}

export async function getAllWindowsEnv(): Promise<EnvVariable[]> {
  const userVars = await getRegistryEnv('User')
  const systemVars = await getRegistryEnv('Machine')
  return [...userVars, ...systemVars].sort((a, b) => a.name.localeCompare(b.name))
}

export async function getWindowsEnv(name: string): Promise<EnvVariable | null> {
  const all = await getAllWindowsEnv()
  return all.find((v) => v.name === name) || null
}

export async function setWindowsEnv(
  name: string,
  value: string
): Promise<{ success: boolean; error?: string }> {
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
}

export async function deleteWindowsEnv(
  name: string
): Promise<{ success: boolean; error?: string }> {
  if (!isValidEnvName(name)) {
    return { success: false, error: '无效的环境变量名' }
  }
  try {
    await execFileAsync('reg', ['delete', 'HKCU\\Environment', '/v', name, '/f'], {
      windowsHide: true
    })
    await broadcastEnvChange()
    logger.info(`Environment variable ${name} deleted successfully`)
    return { success: true }
  } catch (error) {
    logger.error(`Failed to delete env var ${name}:`, error)
    return { success: false, error: '删除环境变量失败' }
  }
}

export async function getWindowsPath(): Promise<PathEntry[]> {
  const all = await getRegistryEnv('User')
  const pathVar = all.find((v) => v.name.toLowerCase() === 'path')

  if (!pathVar) {
    return []
  }

  const paths = pathVar.value.split(';').filter((p) => p.trim())
  return paths.map((p, index) => ({
    path: p,
    exists: existsSync(p),
    index
  }))
}

export async function setWindowsPath(
  paths: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!Array.isArray(paths) || paths.some((p) => typeof p !== 'string' || /[\x00\r\n]/.test(p))) {
    return { success: false, error: '无效的 PATH 条目' }
  }
  try {
    const value = paths.filter((p) => p.trim()).join(';')
    if (value.length > SETX_MAX_LENGTH) {
      return {
        success: false,
        error: `PATH 总长度超过 setx 限制 (${SETX_MAX_LENGTH} 字符)，请减少条目`
      }
    }
    await execFileAsync('setx', ['Path', value], { windowsHide: true })
    await broadcastEnvChange()
    logger.info('PATH variable updated successfully')
    return { success: true }
  } catch (error) {
    logger.error('Failed to set PATH:', error)
    return { success: false, error: '更新 PATH 失败' }
  }
}

export async function importWindowsEnv(
  content: string
): Promise<{ success: boolean; name: string; error?: string }[]> {
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
      } catch {
        results.push({ success: false, name, error: '导入失败' })
      }
    }
  }

  if (results.some((r) => r.success)) {
    await broadcastEnvChange()
  }

  return results
}

export async function restoreWindowsBackup(
  variables: EnvVariable[]
): Promise<{ success: boolean; error?: string }> {
  for (const v of variables) {
    if (isValidEnvName(v.name) && isValidEnvValue(v.value)) {
      await execFileAsync('setx', [v.name, v.value], { windowsHide: true })
    }
  }
  await broadcastEnvChange()
  return { success: true }
}

export async function getWindowsUserVarsForBackup(): Promise<EnvVariable[]> {
  return getRegistryEnv('User')
}
