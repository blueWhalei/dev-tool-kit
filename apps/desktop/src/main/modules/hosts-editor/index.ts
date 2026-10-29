import { TOOL_ERROR_CODES } from '@dev-tool-kit/shared'
import { handleIpc } from '../../typed-ipc'
import { isHostsSchemeArray, isHostsEntry, isHostsText } from '@dev-tool-kit/shared'
import { readJsonFile, updateJsonFile } from '../../store/atomic-json'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  readdir,
  unlink,
  access,
  constants
} from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { logger } from '../../logger'
import {
  isValidIP,
  isValidHostname,
  getDnsFlushPlatformInfo,
  type DnsFlushResult
} from '@dev-tool-kit/shared'
import type {
  HostsEntry,
  HostsGroup,
  HostsScheme,
  HostsOperationResult
} from '@dev-tool-kit/shared'
import {
  splitHostsFile,
  composeHostsFile,
  stableEntryId,
  type ParsedHostsFile
} from './hosts-parser'
import { flushDNS } from './dns'

export type { HostsEntry, HostsGroup, HostsScheme }

const HOSTS_PATH =
  process.platform === 'win32'
    ? join(process.env.SystemRoot || 'C:\\Windows', 'System32\\drivers\\etc\\hosts')
    : '/etc/hosts'

const MAX_HOSTS_BACKUPS = 20
const HOSTS_PERMISSION_ERROR = TOOL_ERROR_CODES.permissionDenied

export interface HostsWriteAccess {
  writable: boolean
  path: string
  sudoHint?: string
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
  const resolvedBackup = backupPath ?? (await getLatestBackupPath())
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
  const pending = writeQueue.then(operation)
  writeQueue = pending.catch(error => {
    logger.error('Hosts write failed', error)
  })
  return pending
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
  try {
    const flushResult = await flushDNS()
    return { ...writeResult, dnsFlushed: flushResult.success }
  } catch {
    return { ...writeResult, dnsFlushed: false }
  }
}

export function setupHostsEditorIPC(): void {
  logger.info('Setting up Hosts Editor IPC handlers')

  handleIpc('hosts:checkWriteAccess', async () => {
    try {
      return await checkHostsWriteAccess()
    } catch (error) {
      logger.error('Failed to check hosts write access:', error)
      return { writable: false, path: HOSTS_PATH }
    }
  })

  handleIpc('hosts:getAll', async () => {
    try {
      return await readHostsEntries()
    } catch (error) {
      logger.error('Failed to read hosts file:', error)
      throw error
    }
  })

  handleIpc('hosts:add', async (_, entry: Omit<HostsEntry, 'id'>) => {
    if (!entry || !isHostsEntry({ ...entry, id: 'pending' })) {
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
        const writeResult = await writeEntriesAndFlush([
          ...entries,
          { ...entry, id: stableEntryId(entry.ip, entry.hostname) }
        ])
        result = writeResult
      })
      return result
    } catch (error) {
      logger.error('Failed to add hosts entry:', error)
      return { success: false, error: '添加条目失败' }
    }
  })

  handleIpc('hosts:update', async (_, id: string, updates: Partial<HostsEntry>) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的条目 ID' }
    }
    if (!updates || typeof updates !== 'object') {
      return { success: false, error: '无效的更新数据' }
    }
    // 显式字段白名单：仅允许更新可编辑字段，防止任意字段/控制字符注入
    const sanitized: Partial<HostsEntry> = {}
    if (updates.ip !== undefined) {
      if (!isValidIP(updates.ip)) return { success: false, error: '无效的 IP 地址' }
      sanitized.ip = updates.ip
    }
    if (updates.hostname !== undefined) {
      if (!isValidHostname(updates.hostname)) return { success: false, error: '无效的主机名' }
      sanitized.hostname = updates.hostname
    }
    if (updates.comment !== undefined) {
      if (!isHostsText(updates.comment, 500)) return { success: false, error: '无效的备注' }
      sanitized.comment = updates.comment
    }
    if (updates.enabled !== undefined) {
      if (typeof updates.enabled !== 'boolean') return { success: false, error: '无效的启用状态' }
      sanitized.enabled = updates.enabled
    }
    if (updates.group !== undefined) {
      if (!isHostsText(updates.group, 200)) return { success: false, error: '无效的分组' }
      sanitized.group = updates.group
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
        const updated = { ...entries[index], ...sanitized }
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

  handleIpc('hosts:delete', async (_, id: string) => {
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

  handleIpc('hosts:toggle', async (_, id: string) => {
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
        result = await writeEntriesAndFlush(
          entries.map((e, i) => (i === index ? { ...e, enabled: !e.enabled } : e))
        )
      })
      return result
    } catch (error) {
      logger.error('Failed to toggle hosts entry:', error)
      return { success: false, error: '切换条目失败' }
    }
  })

  handleIpc('hosts:getGroups', () => DEFAULT_GROUPS)

  handleIpc('hosts:setGroup', async (_, id: string, group: string | undefined) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的条目 ID' }
    }
    if (group !== undefined && !isHostsText(group, 200)) {
      return { success: false, error: '无效的分组' }
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
        const sanitizedGroup = group
        result = await writeEntriesAndFlush(
          entries.map((e, i) => (i === index ? { ...e, group: sanitizedGroup } : e))
        )
      })
      return result
    } catch (error) {
      logger.error('Failed to set hosts group:', error)
      return { success: false, error: '设置分组失败' }
    }
  })

  handleIpc('hosts:saveScheme', async (_, name: string) => {
    if (!isHostsText(name, 100) || !name.trim()) {
      return { success: false, error: '无效的方案名称' }
    }
    const sanitizedName = name.trim()
    if (!sanitizedName) {
      return { success: false, error: '无效的方案名称' }
    }
    try {
      const entries = await readHostsEntries()
      const scheme: HostsScheme = {
        id: generateId(),
        name: sanitizedName,
        timestamp: new Date().toISOString(),
        entries: entries.map(e => ({ ...e }))
      }

      await saveSchemes(schemes => [...schemes, scheme])

      return { success: true }
    } catch (error) {
      logger.error('Failed to save scheme:', error)
      return { success: false, error: '保存方案失败' }
    }
  })

  handleIpc('hosts:listSchemes', async () => {
    const schemes = await getSchemes()
    return schemes.map(s => ({
      id: s.id,
      name: s.name,
      timestamp: s.timestamp,
      count: s.entries.length
    }))
  })

  handleIpc('hosts:loadScheme', async (_, id: string) => {
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
        result = await writeEntriesAndFlush(
          scheme.entries.map(e => ({
            ...e,
            id: stableEntryId(e.ip, e.hostname)
          }))
        )
      })
      return result
    } catch (error) {
      logger.error('Failed to load scheme:', error)
      return { success: false, error: '加载方案失败' }
    }
  })

  handleIpc('hosts:deleteScheme', async (_, id: string) => {
    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: '无效的方案 ID' }
    }
    try {
      await saveSchemes(schemes => schemes.filter(s => s.id !== id))
      return { success: true }
    } catch (error) {
      logger.error('Failed to delete scheme:', error)
      return { success: false, error: '删除方案失败' }
    }
  })

  handleIpc('hosts:getScheme', async (_, id: string) => {
    if (typeof id !== 'string' || !id.trim()) return null
    try {
      const schemes = await getSchemes()
      return schemes.find(scheme => scheme.id === id) ?? null
    } catch (error) {
      logger.error('Failed to get scheme:', error)
      return null
    }
  })

  handleIpc('hosts:exportSchemes', async () => {
    try {
      return await getSchemes()
    } catch (error) {
      logger.error('Failed to export schemes:', error)
      return []
    }
  })

  handleIpc(
    'hosts:importSchemes',
    async (_, payload: HostsScheme[], mode: 'merge' | 'replace' = 'merge') => {
      if (!isHostsSchemeArray(payload) || (mode !== 'merge' && mode !== 'replace')) {
        return { success: false, error: '无效的方案数据' }
      }
      try {
        const sanitized = payload

        if (sanitized.length === 0) {
          return { success: false, error: '没有可导入的方案' }
        }

        await saveSchemes(existing => {
          const merged = mode === 'replace' ? [] : [...existing]

          for (const scheme of sanitized) {
            const index = merged.findIndex(item => item.name === scheme.name)
            if (index >= 0) {
              merged[index] = { ...scheme, id: merged[index].id }
            } else {
              merged.push(scheme)
            }
          }

          return merged
        })
        return { success: true, count: sanitized.length }
      } catch (error) {
        logger.error('Failed to import schemes:', error)
        return { success: false, error: '导入方案失败' }
      }
    }
  )

  handleIpc('hosts:flushDNS', async (): Promise<DnsFlushResult> => {
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

async function getSchemes(): Promise<HostsScheme[]> {
  const value = await readJsonFile(
    await getConfigPath('hosts-schemes.json'),
    [],
    isHostsSchemeArray
  )
  return value
}

async function saveSchemes(update: (items: HostsScheme[]) => HostsScheme[]): Promise<void> {
  await updateJsonFile<HostsScheme[]>(
    await getConfigPath('hosts-schemes.json'),
    [],
    update,
    isHostsSchemeArray
  )
}
