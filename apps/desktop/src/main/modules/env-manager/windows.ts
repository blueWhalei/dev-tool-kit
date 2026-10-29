import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { logger } from '../../logger'
import {
  isEnvScope,
  isEnvVariableArray,
  type EnvScope,
  type EnvVariable,
  type PathEntry
} from '@dev-tool-kit/shared'
import { isValidRegistryEnvName as isValidEnvName, isValidEnvValue } from '@dev-tool-kit/shared'

const execFileAsync = promisify(execFile)
// Values are passed through child-only environment variables, never interpolated into code.
const REGISTRY_SCRIPT = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$machine = $env:DVT_ENV_SCOPE -eq 'system'
$hive = if ($machine) { [Microsoft.Win32.Registry]::LocalMachine } else { [Microsoft.Win32.Registry]::CurrentUser }
$path = if ($machine) { 'SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment' } else { 'Environment' }
$key = $hive.OpenSubKey($path, $env:DVT_ENV_ACTION -ne 'read')
if ($null -eq $key) { throw 'Registry key unavailable' }
try {
  $name = $env:DVT_ENV_NAME
  if ($env:DVT_ENV_ACTION -eq 'read') {
    $items = @($key.GetValueNames() | ForEach-Object { [pscustomobject]@{ name = $_; value = [string]$key.GetValue($_, '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); type = $env:DVT_ENV_SCOPE } })
    ConvertTo-Json -InputObject $items -Compress
  } elseif ($env:DVT_ENV_ACTION -eq 'delete') {
    $key.DeleteValue($name, $true)
    if ($key.GetValueNames() -contains $name) { throw 'Delete verification failed' }
  } else {
    $value = [string]$env:DVT_ENV_VALUE
    $kind = if ($key.GetValueNames() -contains $name) { $key.GetValueKind($name) } elseif ($value -match '%[^%]+%') { [Microsoft.Win32.RegistryValueKind]::ExpandString } else { [Microsoft.Win32.RegistryValueKind]::String }
    if ($kind -ne [Microsoft.Win32.RegistryValueKind]::String -and $kind -ne [Microsoft.Win32.RegistryValueKind]::ExpandString) { throw 'Unsupported value kind' }
    $key.SetValue($name, $value, $kind)
    if ($key.GetValue($name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) -cne $value) { throw 'Write verification failed' }
  }
} finally { $key.Dispose() }
`
async function registry(action: 'read' | 'set' | 'delete', scope: EnvScope, name = '', value = '') {
  return execFileAsync(
    'powershell',
    [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(REGISTRY_SCRIPT, 'utf16le').toString('base64')
    ],
    {
      windowsHide: true,
      timeout: 15000,
      maxBuffer: 4 * 1024 * 1024,
      env: {
        ...process.env,
        DVT_ENV_ACTION: action,
        DVT_ENV_SCOPE: scope,
        DVT_ENV_NAME: name,
        DVT_ENV_VALUE: value
      }
    }
  )
}
export async function getRegistryEnv(scope: EnvScope): Promise<EnvVariable[]> {
  const { stdout } = await registry('read', scope)
  const value: unknown = JSON.parse(stdout.replace(/^\uFEFF/, ''))
  if (
    !Array.isArray(value) ||
    !value.every(
      item =>
        item &&
        typeof item.name === 'string' &&
        typeof item.value === 'string' &&
        item.type === scope
    )
  )
    throw new Error('invalidRegistryResponse')
  return value
}
export async function broadcastEnvChange(): Promise<void> {
  try {
    await execFileAsync(
      'powershell',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Add-Type -TypeDefinition \'using System;using System.Runtime.InteropServices;public class Win{[DllImport("user32.dll",SetLastError=true,CharSet=CharSet.Auto)]public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,UIntPtr w,string l,uint f,uint t,out IntPtr r);}\'; $r=[IntPtr]::Zero; [Win]::SendMessageTimeout([IntPtr]0xffff,0x1a,[UIntPtr]::Zero,"Environment",0x2,5000,[ref]$r) | Out-Null'
      ],
      { windowsHide: true, timeout: 10000 }
    )
  } catch {
    logger.warn('Environment saved; broadcast failed. New processes may need a session restart.')
  }
}
export async function getAllWindowsEnv(): Promise<EnvVariable[]> {
  return (await Promise.all([getRegistryEnv('user'), getRegistryEnv('system')]))
    .flat()
    .sort((a, b) => a.name.localeCompare(b.name))
}
export async function getWindowsEnv(name: string): Promise<EnvVariable | null> {
  return (await getAllWindowsEnv()).find(v => v.name.toLowerCase() === name.toLowerCase()) ?? null
}
export async function setWindowsEnv(name: string, value: string, scope: EnvScope) {
  const result = await writeWindowsEnv(name, value, scope)
  if (result.success) await broadcastEnvChange()
  return result
}
async function writeWindowsEnv(name: string, value: string, scope: EnvScope) {
  if (!isValidEnvName(name) || !isValidEnvValue(value) || !isEnvScope(scope))
    return { success: false, error: 'invalidEnv' }
  try {
    await registry('set', scope, name, value)
    return { success: true }
  } catch {
    return { success: false, error: scope === 'system' ? 'systemWriteFailed' : 'saveFailed' }
  }
}
export async function deleteWindowsEnv(name: string, scope: EnvScope) {
  if (!isValidEnvName(name) || !isEnvScope(scope)) return { success: false, error: 'invalidEnv' }
  try {
    await registry('delete', scope, name)
    await broadcastEnvChange()
    return { success: true }
  } catch {
    return { success: false, error: scope === 'system' ? 'systemWriteFailed' : 'deleteFailed' }
  }
}
export async function getWindowsPath(): Promise<PathEntry[]> {
  const value =
    (await getRegistryEnv('user')).find(v => v.name.toLowerCase() === 'path')?.value ?? ''
  return value
    .split(';')
    .filter(Boolean)
    .map((path, index) => ({
      path,
      index,
      exists: existsSync(
        path.replace(/%([^%]+)%/g, (_, name: string) => process.env[name] ?? `%${name}%`)
      )
    }))
}
export async function setWindowsPath(paths: string[]) {
  if (!Array.isArray(paths) || paths.some(p => !isValidEnvValue(p) || p.includes(';') || !p.trim()))
    return { success: false, error: 'invalidEnv' }
  return setWindowsEnv('Path', paths.join(';'), 'user')
}
export async function importWindowsEnv(
  content: string
): Promise<{ success: boolean; name: string; error?: string }[]> {
  const entries = content
    .split(/\r?\n/)
    .filter(line => line.trim() && !line.trimStart().startsWith('#'))
    .map(line => {
      const eq = line.indexOf('=')
      return {
        name: eq < 0 ? line : line.slice(0, eq).trim(),
        value: eq < 0 ? null : line.slice(eq + 1)
      }
    })
  if (entries.some(item => !isValidEnvName(item.name) || !isValidEnvValue(item.value)))
    return entries.map(item => ({ success: false, name: item.name, error: 'invalidEnv' }))
  const results = []
  for (const item of entries) {
    if (item.value === null) throw new Error('invalidEnv')
    results.push({ name: item.name, ...(await writeWindowsEnv(item.name, item.value, 'user')) })
  }
  if (results.some(result => result.success)) await broadcastEnvChange()
  return results
}
export async function restoreWindowsBackup(variables: EnvVariable[]) {
  if (!isEnvVariableArray(variables) || variables.some(v => v.type !== 'user'))
    return { success: false, error: 'invalidEnv' }
  let changed = false
  try {
    for (const variable of variables) {
      const result = await writeWindowsEnv(variable.name, variable.value, 'user')
      if (!result.success) return result
      changed = true
    }
    return { success: true }
  } finally {
    if (changed) await broadcastEnvChange()
  }
}
export const getWindowsUserVarsForBackup = () => getRegistryEnv('user')
