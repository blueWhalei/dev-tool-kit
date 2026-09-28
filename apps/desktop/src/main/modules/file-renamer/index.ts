import { isRenameRule } from '@dev-tool-kit/shared/types'
import { handleIpc } from '../../typed-ipc'
import { readJsonFile, updateJsonFile } from '../../store/atomic-json'
import { dialog, app } from 'electron'
import { readdir, realpath, stat } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname, basename, resolve, sep } from 'path'
import { logger } from '../../logger'
import type {
  FileEntry,
  RenamePreview,
  RenameResult,
  SavedRenameRule,
  RenameRule
} from '@dev-tool-kit/shared'

import { isValidFilename, moveWithoutOverwrite } from './safe-move'
import { runWorkerTask } from '../worker-task'

export type { FileEntry, RenamePreview, RenameResult, RenameRule }

function isPathWithin(childPath: string, parentDir: string): boolean {
  const resolved = resolve(childPath)
  const resolvedDir = resolve(parentDir)
  return resolved.startsWith(resolvedDir + sep) || resolved.startsWith(resolvedDir + '/')
}

/** Directories the user explicitly selected via dialog */
const allowedFolderRoots = new Set<string>()

async function registerAllowedRoot(folderPath: string): Promise<void> {
  allowedFolderRoots.add(await realpath(folderPath))
}

async function isAllowedFolder(folderPath: string): Promise<boolean> {
  let resolved: string
  try {
    resolved = await realpath(folderPath)
  } catch {
    return false
  }

  for (const root of allowedFolderRoots) {
    if (resolved === root || isPathWithin(resolved, root)) {
      return true
    }
  }
  return false
}

async function getRulesPath(): Promise<string> {
  const configDir = join(app.getPath('userData'), 'config')
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }
  return join(configDir, 'rename-rules.json')
}

async function readSavedRules(): Promise<SavedRenameRule[]> {
  const rulesPath = await getRulesPath()
  const parsed = await readJsonFile<SavedRenameRule[]>(rulesPath, [])
  if (!parsed.every(item => item && typeof item.name === 'string' && isRenameRule(item.rule))) {
    throw new Error('invalidRule')
  }
  return parsed
}

function detectPreviewConflicts(previews: RenamePreview[]): RenamePreview[] {
  const targetNames = new Map<string, number>()

  return previews.map(preview => {
    const dir = dirname(preview.path)
    const newPath = join(dir, preview.preview)
    const resolvedNew = resolve(newPath)
    const resolvedOld = resolve(preview.path)

    if (preview.conflict || preview.original === preview.preview) {
      return preview
    }

    if (!isValidFilename(preview.preview)) {
      return { ...preview, conflict: 'invalidFilename' }
    }

    if (resolvedNew !== resolvedOld && existsSync(newPath)) {
      return { ...preview, conflict: 'targetExists' }
    }

    // 按目录分组统计，避免跨目录批量重命名时误报重复
    const key = process.platform === 'win32' ? resolvedNew.toLowerCase() : resolvedNew
    const count = targetNames.get(key) ?? 0
    targetNames.set(key, count + 1)
    if (count > 0) {
      return { ...preview, conflict: 'duplicateTarget' }
    }

    return preview
  })
}

export function setupFileRenamerIPC(): void {
  logger.info('Setting up File Renamer IPC handlers')

  // Open folder dialog
  handleIpc('file-renamer:selectFolder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return null
      }
      await registerAllowedRoot(result.filePaths[0])
      return result.filePaths[0]
    } catch (error) {
      logger.error('Failed to select folder:', error)
      return null
    }
  })

  // Open files dialog (multi-select)
  handleIpc('file-renamer:selectFiles', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return []
      }

      const entries: FileEntry[] = []
      for (const filePath of result.filePaths) {
        try {
          const fileStat = await stat(filePath)
          await registerAllowedRoot(dirname(filePath))
          entries.push({
            name: basename(filePath),
            path: filePath,
            size: fileStat.size,
            isDirectory: fileStat.isDirectory(),
            modifiedTime: fileStat.mtime.toISOString()
          })
        } catch {
          // Skip files we can't stat
        }
      }

      return entries.sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      logger.error('Failed to select files:', error)
      return []
    }
  })

  // List files in folder
  handleIpc('file-renamer:listFiles', async (_, folderPath: string) => {
    if (typeof folderPath !== 'string' || !folderPath.trim()) return []
    if (!(await isAllowedFolder(folderPath))) {
      logger.warn('Blocked listFiles for unauthorized path:', folderPath)
      return []
    }
    try {
      if (!existsSync(folderPath)) {
        return []
      }

      const files = await readdir(folderPath)
      const entries: FileEntry[] = []

      for (const file of files) {
        const fullPath = join(folderPath, file)
        try {
          const fileStat = await stat(fullPath)
          entries.push({
            name: file,
            path: fullPath,
            size: fileStat.size,
            isDirectory: fileStat.isDirectory(),
            modifiedTime: fileStat.mtime.toISOString()
          })
        } catch {
          // Skip files we can't stat
        }
      }

      return entries.filter(f => !f.isDirectory).sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      logger.error('Failed to list files:', error)
      return []
    }
  })

  // Only name calculation runs in the worker; filesystem checks stay here.
  handleIpc('file-renamer:preview', async (_, files: FileEntry[], rules: RenameRule[]) => {
    if (
      !Array.isArray(files) ||
      !files.every(file => file && typeof file.name === 'string' && typeof file.path === 'string')
    )
      return []
    try {
      const previews = await runWorkerTask<RenamePreview[]>(
        join(__dirname, 'modules/file-renamer/rename-worker.js'),
        { files, rules }
      )
      return detectPreviewConflicts(previews)
    } catch (error) {
      const conflict =
        error instanceof Error && error.message === 'workerTimeout'
          ? 'workerTimeout'
          : 'workerFailed'
      return files.map(file => ({
        original: file.name,
        preview: file.name,
        path: file.path,
        conflict
      }))
    }
  })

  handleIpc('file-renamer:execute', async (_, previews: RenamePreview[]) => {
    if (!Array.isArray(previews)) return []
    const results: RenameResult[] = []
    for (const preview of previews) {
      if (!preview || typeof preview.path !== 'string' || typeof preview.preview !== 'string') {
        results.push({ success: false, original: '', renamed: '', error: 'invalidFilename' })
        continue
      }
      const failure = { success: false, original: basename(preview.path), renamed: preview.preview }
      if (preview.conflict) {
        results.push({ ...failure, error: preview.conflict })
      } else if (!isValidFilename(preview.preview)) {
        results.push({ ...failure, error: 'invalidFilename' })
      } else if (!(await isAllowedFolder(dirname(preview.path)))) {
        results.push({ ...failure, error: 'unauthorizedPath' })
      } else {
        results.push(
          await moveWithoutOverwrite(preview.path, join(dirname(preview.path), preview.preview))
        )
      }
    }
    return results
  })

  handleIpc('file-renamer:undo', async (_, ops: { oldPath: string; newPath: string }[]) => {
    if (!Array.isArray(ops)) return []
    const results: RenameResult[] = []
    for (const op of ops) {
      if (!op || typeof op.oldPath !== 'string' || typeof op.newPath !== 'string') {
        results.push({ success: false, original: '', renamed: '', error: 'unauthorizedPath' })
        continue
      }
      if (
        !(await isAllowedFolder(dirname(op.oldPath))) ||
        !(await isAllowedFolder(dirname(op.newPath)))
      ) {
        results.push({
          success: false,
          original: basename(op.newPath),
          renamed: basename(op.oldPath),
          error: 'unauthorizedPath'
        })
        continue
      }
      results.push(await moveWithoutOverwrite(op.newPath, op.oldPath))
    }
    return results
  })

  // Save rename rules
  handleIpc('file-renamer:saveRule', async (_, name: string, rule: RenameRule) => {
    if (!isRenameRule(rule)) return { success: false, error: 'invalidRule' }
    if (typeof name !== 'string' || !name.trim()) {
      return { success: false, error: '无效的规则名称' }
    }
    try {
      await updateJsonFile<SavedRenameRule[]>(await getRulesPath(), [], rules => {
        const trimmedName = name.trim()
        const existingIndex = rules.findIndex(item => item.name === trimmedName)
        const nextRule: SavedRenameRule = { name: trimmedName, rule }
        if (existingIndex >= 0) {
          rules[existingIndex] = nextRule
        } else {
          rules.push(nextRule)
        }
        return rules
      })
      return { success: true }
    } catch (error) {
      logger.error('Failed to save rename rule:', error)
      return { success: false, error: '保存规则失败' }
    }
  })

  handleIpc('file-renamer:listRules', async () => {
    try {
      return await readSavedRules()
    } catch (error) {
      logger.error('Failed to list rename rules:', error)
      return []
    }
  })

  handleIpc('file-renamer:deleteRule', async (_, name: string) => {
    if (typeof name !== 'string' || !name.trim()) {
      return { success: false, error: '无效的规则名称' }
    }
    try {
      await updateJsonFile<SavedRenameRule[]>(await getRulesPath(), [], rules =>
        rules.filter(item => item.name !== name.trim())
      )
      return { success: true }
    } catch (error) {
      logger.error('Failed to delete rename rule:', error)
      return { success: false, error: '删除规则失败' }
    }
  })

  logger.info('File Renamer IPC handlers ready')
}
