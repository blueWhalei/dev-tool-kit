import { ipcMain, app } from 'electron'
import { randomUUID } from 'crypto'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { readFile, writeFile, mkdir, copyFile, readdir, unlink, access, constants } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../../logger'
import { isValidIP, isValidHostname, getDnsFlushPlatformInfo, type DnsFlushResult } from '@dev-tool-kit/shared'
import type { HostsEntry, HostsGroup, HostsScheme } from '@dev-tool-kit/shared'
import {
  splitHostsFile,
  composeHostsFile,
  stableEntryId,
  type ParsedHostsFile
} from './hosts-parser'

const execFileAsync = promisify(execFile)

export type { HostsEntry, HostsGroup, HostsScheme }

const HOSTS_PATH = process.platform === 'win32'
  ? join(process.env.SystemRoot || 'C:\\Windows', 'System32\\drivers\\etc\\hosts')
  : '/etc/hosts'

const MAX_HOSTS_BACKUPS = 20
const HOSTS_PERMISSION_ERROR = 'HOSTS_PERMISSION_DENIED'

export interface HostsWriteAccess {
  writable: boolean
  path: string
  sudoHint?: string
}

export interface HostsOperationResult {
  success: boolean
  error?: string
  sudoCommand?: string
  backupPath?: string
}

const DEFAULT_GROUPS: HostsGroup[] = [
  { id: 'dev', name: '开发环境', color: '#007AFF', order: 0 },
  { id: 'test', name: '测试环境', color: '#5856D6', order: 1 },
  { id: 'prod', name: '生产环境', color: '#34C759', order: 2 },
  { id: 'local', name: '本地开发', color: '#FF9500', order: 3 }
]

function generateId(): string {
  return randomUUID()
}

async function getConfigPath(filename: string): Promise<string> {
  const userDataPath = app.getPath('userData')
  const configDir = join(userDataPath, 'config')
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true })
  }
  return join(configDir, filename)
}

async function getBackupDir(): Promise<string> {
  const backupDir = join(app.getPath('userData'), 'backups', 'hosts')
  if (!existsSync(backupDir)) {
    await mkdir(backupDir, { recursive: true })
  }
  return backupDir
}

async function getLatestBackupPath(): Promise<string | undefined> {
  try {
    const backupDir = await getBackupDir()
    const files = (await readdir(backupDir))
      .filter(f => f.startsWith('hosts-') && f.endsWith('.bak'))
      .sort()
    const latest = files.at(-1)
    return latest ? join(backupDir, latest) : undefined
  } catch {
    return undefined
  }
}

function buildHostsSudoCommand(backupPath?: string): string {
  if (process.platform === 'win32') {
    if (backupPath) {
      return `Copy-Item -Force "${backupPath}" "${HOSTS_PATH}"`
    }
    return `notepad "${HOSTS_PATH}"`
  }
  if (backupPath) {
    return `sudo cp "${backupPath}" "${HOSTS_PATH}"`
  }
  return `sudo sh -c 'cat > "${HOSTS_PATH}"' < your-edited-hosts.txt`
}

export async function checkHostsWriteAccess(): Promise<HostsWriteAccess> {
  try {
    await access(HOSTS_PATH, constants.W_OK)
    return { writable: true, path: HOSTS_PATH }
  } catch {
    return {
      writable: false,
      path: HOSTS_PATH,
      sudoHint: buildHostsSudoCommand()
    }
  }
}

function isPermissionError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error.code === 'EACCES' || error.code === 'EPERM')
  )
}

async function permissionDeniedResult(backupPath?: string): Promise<HostsOperationResult> {
  const resolvedBackup = backupPath ?? await getLatestBackupPath()
  return {
    success: false,
    error: HOSTS_PERMISSION_ERROR,
    sudoCommand: buildHostsSudoCommand(resolvedBackup),
    backupPath: resolvedBackup
  }
}

async function backupHostsFile(): Promise<string | undefined> {
  if (!existsSync(HOSTS_PATH)) return undefined

  const backupDir = await getBackupDir()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = join(backupDir, `hosts-${timestamp}.bak`)
  await copyFile(HOSTS_PATH, backupPath)

  try {
    const files = (await readdir(backupDir))
      .filter(f => f.startsWith('hosts-') && f.endsWith('.bak'))
      .sort()

    while (files.length > MAX_HOSTS_BACKUPS) {
      const oldest = files.shift()
      if (oldest) {
        await unlink(join(backupDir, oldest))
      }
    }
  } catch (error) {
    logger.warn('Failed to prune hosts backups:', error)
  }

  logger.info('Hosts file backed up to:', backupPath)
  return backupPath
}

// Write queue to prevent concurrent read-modify-write race conditions
let writeQueue: Promise<void> = Promise.resolve()

function enqueueWrite(operation: () => Promise<void>): Promise<void> {
  writeQueue = writeQueue.then(operation).catch((error) => {
    logger.error('Hosts write queue error:', error)
  })
  return writeQueue
}

async function readHostsFile(): Promise<ParsedHostsFile> {
  if (!existsSync(HOSTS_PATH)) {
    logger.warn('Hosts file not found:', HOSTS_PATH)
    return { prefix: '', entries: [], suffix: '' }
  }
  const content = await readFile(HOSTS_PATH, 'utf-8')
  return splitHostsFile(content)
}

async function readHostsEntries(): Promise<HostsEntry[]> {
  const parsed = await readHostsFile()
  return parsed.entries
}

async function writeHostsEntries(entries: HostsEntry[]): Promise<HostsOperationResult> {
  let backupPath: string | undefined
  try {
    backupPath = await backupHostsFile()
    const parsed = await readHostsFile()
    const content = composeHostsFile(parsed, entries)
    await writeFile(HOSTS_PATH, content, 'utf-8')
    return { success: true, backupPath }
  } catch (error) {
    if (isPermissionError(error)) {
      return await permissionDeniedResult(backupPath)
    }
    throw error
  }
}

async function writeEntriesAndFlush(entries: HostsEntry[]): Promise<HostsOperationResult> {
  const writeResult = await writeHostsEntries(entries)
  if (!writeResult.success) return writeResult
  const flushResult = await flushDNS()
  if (!flushResult.success) {
    logger.warn('[Hosts] DNS flush failed after write:', flushResult.errorCode ?? flushResult.error)
  }
  return writeResult
}

export function setupHostsEditorIPC(): void {
  logger.info('Setting up Hosts Editor IPC handlers')

  ipcMain.handle('hosts:checkWriteAccess', async () => {
    try {
      return await checkHostsWriteAccess()
    } catch (error) {
      logger.error('Failed to check hosts write access:', error)
      return { writable: false, path: HOSTS_PATH }
    }
  })

  ipcMain.handle('hosts:getAll', async () => {
    try {
      return await readHostsEntries()
    } catch (error) {
      logger.error('Failed to read hosts file:', error)
      return []
    }
  })

  ipcMain.handle('hosts:add', async (_, entry: Omit<HostsEntry, 'id'>) => {
    if (!entry || !isValidIP(entry.ip) || !isValidHostname(entry.hostname)) {
      return { success: false, error: '无效的 IP 地址或主机名' }
    }
    try {
      let result: HostsOperationResult = { success: false, error: '操作失败' }
      await enqueueWrite(async () => {
        const entries = await readHostsEntries()
        if (entries.some(e => e.hostname === entry.hostname)) {
          result = { success: false, error: '主机名已存在' }
          return
        }
        const writeResult = await writeEntriesAndFlush([...entries, { ...entry, id: stableEntryId(entry.ip, entry.hostname) }])
        result = writeResult.success
          ? { success: true, backupPath: writeResult.backupPath }
          : writeResult
      })
      return result
    } catch (error) {
      logger.error('Failed to add hosts entry:', error)
      return { success: false, error: '添加条目失败' }
    }
  })

  ipcMain.handle('hosts:update', async (_, id: string, updates: Partial<HostsEntry>) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的条目 ID' }
    }
    if (updates.ip !== undefined && !isValidIP(updates.ip)) {
      return { success: false, error: '无效的 IP 地址' }
    }
    if (updates.hostname !== undefined && !isValidHostname(updates.hostname)) {
      return { success: false, error: '无效的主机名' }
    }
    try {
      let result: HostsOperationResult = { success: false, error: '操作失败' }
      await enqueueWrite(async () => {
        const entries = await readHostsEntries()
        const index = entries.findIndex(e => e.id === id)
        if (index === -1) {
          result = { success: false, error: '未找到条目' }
          return
        }
        const updated = { ...entries[index], ...updates }
        updated.id = stableEntryId(updated.ip, updated.hostname)
        entries[index] = updated
        result = await writeEntriesAndFlush(entries)
      })
      return result
    } catch (error) {
      logger.error('Failed to update hosts entry:', error)
      return { success: false, error: '更新条目失败' }
    }
  })

  ipcMain.handle('hosts:delete', async (_, id: string) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的条目 ID' }
    }
    try {
      let result: HostsOperationResult = { success: false, error: '操作失败' }
      await enqueueWrite(async () => {
        const entries = await readHostsEntries()
        const index = entries.findIndex(e => e.id === id)
        if (index === -1) {
          result = { success: false, error: '未找到条目' }
          return
        }
        result = await writeEntriesAndFlush(entries.filter((_, i) => i !== index))
      })
      return result
    } catch (error) {
      logger.error('Failed to delete hosts entry:', error)
      return { success: false, error: '删除条目失败' }
    }
  })

  ipcMain.handle('hosts:toggle', async (_, id: string) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的条目 ID' }
    }
    try {
      let result: HostsOperationResult = { success: false, error: '操作失败' }
      await enqueueWrite(async () => {
        const entries = await readHostsEntries()
        const index = entries.findIndex(e => e.id === id)
        if (index === -1) {
          result = { success: false, error: '未找到条目' }
          return
        }
        result = await writeEntriesAndFlush(entries.map((e, i) => i === index ? { ...e, enabled: !e.enabled } : e))
      })
      return result
    } catch (error) {
      logger.error('Failed to toggle hosts entry:', error)
      return { success: false, error: '切换条目失败' }
    }
  })

  ipcMain.handle('hosts:getGroups', () => DEFAULT_GROUPS)

  ipcMain.handle('hosts:setGroup', async (_, id: string, group: string | undefined) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的条目 ID' }
    }
    try {
      let result: HostsOperationResult = { success: false, error: '操作失败' }
      await enqueueWrite(async () => {
        const entries = await readHostsEntries()
        const index = entries.findIndex(e => e.id === id)
        if (index === -1) {
          result = { success: false, error: '未找到条目' }
          return
        }
        result = await writeEntriesAndFlush(entries.map((e, i) => i === index ? { ...e, group } : e))
      })
      return result
    } catch (error) {
      logger.error('Failed to set hosts group:', error)
      return { success: false, error: '设置分组失败' }
    }
  })

  ipcMain.handle('hosts:saveScheme', async (_, name: string) => {
    if (typeof name !== 'string' || !name.trim()) {
      return { success: false, error: '无效的方案名称' }
    }
    try {
      const entries = await readHostsEntries()
      const scheme: HostsScheme = {
        id: generateId(),
        name,
        timestamp: new Date().toISOString(),
        entries: entries.map(e => ({ ...e }))
      }

      const schemes = await getSchemes()
      await saveSchemes([...schemes, scheme])

      return { success: true }
    } catch (error) {
      logger.error('Failed to save scheme:', error)
      return { success: false, error: '保存方案失败' }
    }
  })

  ipcMain.handle('hosts:listSchemes', async () => {
    const schemes = await getSchemes()
    return schemes.map(s => ({
      id: s.id,
      name: s.name,
      timestamp: s.timestamp,
      count: s.entries.length
    }))
  })

  ipcMain.handle('hosts:loadScheme', async (_, id: string) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的方案 ID' }
    }
    try {
      let result: HostsOperationResult = { success: false, error: '操作失败' }
      await enqueueWrite(async () => {
        const schemes = await getSchemes()
        const scheme = schemes.find(s => s.id === id)
        if (!scheme) {
          result = { success: false, error: '未找到方案' }
          return
        }
        result = await writeEntriesAndFlush(scheme.entries.map(e => ({
          ...e,
          id: stableEntryId(e.ip, e.hostname)
        })))
      })
      return result
    } catch (error) {
      logger.error('Failed to load scheme:', error)
      return { success: false, error: '加载方案失败' }
    }
  })

  ipcMain.handle('hosts:deleteScheme', async (_, id: string) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的方案 ID' }
    }
    try {
      let schemes = await getSchemes()
      schemes = schemes.filter(s => s.id !== id)
      await saveSchemes(schemes)
      return { success: true }
    } catch (error) {
      logger.error('Failed to delete scheme:', error)
      return { success: false, error: '删除方案失败' }
    }
  })

  ipcMain.handle('hosts:getScheme', async (_, id: string) => {
    if (typeof id !== 'string' || !id.trim()) return null
    try {
      const schemes = await getSchemes()
      return schemes.find(scheme => scheme.id === id) ?? null
    } catch (error) {
      logger.error('Failed to get scheme:', error)
      return null
    }
  })

  ipcMain.handle('hosts:exportSchemes', async () => {
    try {
      return await getSchemes()
    } catch (error) {
      logger.error('Failed to export schemes:', error)
      return []
    }
  })

  ipcMain.handle('hosts:importSchemes', async (_, payload: HostsScheme[], mode: 'merge' | 'replace' = 'merge') => {
    if (!Array.isArray(payload)) {
      return { success: false, error: '无效的方案数据' }
    }
    try {
      const sanitized = payload
        .filter(item => item && typeof item.name === 'string' && Array.isArray(item.entries))
        .map(item => ({
          id: typeof item.id === 'string' && item.id ? item.id : generateId(),
          name: item.name.trim(),
          timestamp: item.timestamp || new Date().toISOString(),
          entries: item.entries.map(entry => ({
            ...entry,
            id: stableEntryId(entry.ip, entry.hostname)
          }))
        }))
        .filter(item => item.name)

      if (sanitized.length === 0) {
        return { success: false, error: '没有可导入的方案' }
      }

      const existing = mode === 'replace' ? [] : await getSchemes()
      const merged = [...existing]

      for (const scheme of sanitized) {
        const index = merged.findIndex(item => item.name === scheme.name)
        if (index >= 0) {
          merged[index] = { ...scheme, id: merged[index].id }
        } else {
          merged.push(scheme)
        }
      }

      await saveSchemes(merged)
      return { success: true, count: sanitized.length }
    } catch (error) {
      logger.error('Failed to import schemes:', error)
      return { success: false, error: '导入方案失败' }
    }
  })

  ipcMain.handle('hosts:flushDNS', async (): Promise<DnsFlushResult> => {
    try {
      return await flushDNS()
    } catch (error) {
      logger.error('Failed to flush DNS:', error)
      const info = getDnsFlushPlatformInfo(process.platform)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorCode: 'flush_failed',
        manualCommands: info.manualCommands
      }
    }
  })

  logger.info('Hosts Editor IPC handlers ready')
}

async function flushDNS(): Promise<DnsFlushResult> {
  const platform = process.platform
  const info = getDnsFlushPlatformInfo(platform)

  if (info.platform === 'unknown') {
    return {
      success: false,
      errorCode: 'unsupported_platform',
      manualCommands: info.manualCommands
    }
  }

  if (platform === 'win32') {
    await execFileAsync('ipconfig', ['/flushdns'], { windowsHide: true })
    return { success: true, method: 'ipconfig' }
  }

  if (platform === 'darwin') {
    await execFileAsync('dscacheutil', ['-flushcache'], { windowsHide: true })
    return { success: true, method: 'dscacheutil' }
  }

  const attempts: Array<{ method: DnsFlushResult['method']; run: () => Promise<unknown> }> = [
    {
      method: 'systemd-resolve',
      run: async () => { await execFileAsync('systemd-resolve', ['--flush-caches'], { windowsHide: true }) }
    },
    {
      method: 'resolvectl',
      run: async () => { await execFileAsync('resolvectl', ['flush-caches'], { windowsHide: true }) }
    },
    {
      method: 'nscd',
      run: async () => { await execFileAsync('service', ['nscd', 'restart'], { windowsHide: true }) }
    }
  ]

  const errors: string[] = []
  for (const attempt of attempts) {
    try {
      await attempt.run()
      return { success: true, method: attempt.method }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  return {
    success: false,
    errorCode: 'no_flush_tool',
    error: errors.join('; '),
    manualCommands: info.manualCommands
  }
}

async function getSchemes(): Promise<HostsScheme[]> {
  const path = await getConfigPath('hosts-schemes.json')
  try {
    if (existsSync(path)) {
      const content = await readFile(path, 'utf-8')
      return JSON.parse(content)
    }
  } catch (error) {
    logger.warn('Failed to load schemes:', error)
  }
  return []
}

async function saveSchemes(schemes: HostsScheme[]): Promise<void> {
  const path = await getConfigPath('hosts-schemes.json')
  await writeFile(path, JSON.stringify(schemes, null, 2))
}
