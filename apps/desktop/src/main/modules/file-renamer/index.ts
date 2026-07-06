import { ipcMain, dialog, app } from 'electron'
import { readdir, rename, stat } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname, extname, basename, resolve, sep } from 'path'
import { logger } from '../../logger'
import type { FileEntry, RenamePreview, RenameResult, SavedRenameRule } from '@dev-tool-kit/shared'

export type { FileEntry, RenamePreview, RenameResult }

export interface RenameRule {
  type: 'prefix' | 'suffix' | 'replace' | 'regex' | 'number' | 'case' | 'date'
  value?: string
  replaceWith?: string
  pattern?: string
  startNumber?: number
  padding?: number
  caseType?: 'upper' | 'lower' | 'title'
}

export type RenameRuleInput = RenameRule | RenameRule[]

const ILLEGAL_FILENAME_CHARS = /[<>:"|?*\\/]/

function containsIllegalControlChars(name: string): boolean {
  return name.includes('\0') || name.includes('\r') || name.includes('\n')
}

function isValidFilename(name: string): boolean {
  if (!name || name === '.' || name === '..') return false
  if (ILLEGAL_FILENAME_CHARS.test(name) || containsIllegalControlChars(name)) return false
  return true
}

function isPathWithin(childPath: string, parentDir: string): boolean {
  const resolved = resolve(childPath)
  const resolvedDir = resolve(parentDir)
  return resolved.startsWith(resolvedDir + sep) || resolved.startsWith(resolvedDir + '/')
}

/** Directories the user explicitly selected via dialog */
const allowedFolderRoots = new Set<string>()

function registerAllowedRoot(folderPath: string): void {
  allowedFolderRoots.add(resolve(folderPath))
}

function isAllowedFolder(folderPath: string): boolean {
  const resolved = resolve(folderPath)
  if (!existsSync(resolved)) return false

  for (const root of allowedFolderRoots) {
    if (resolved === root || isPathWithin(resolved, root)) {
      return true
    }
  }
  return false
}

function applyRuleToName(original: string, rule: RenameRule, index: number): string {
  const ext = extname(original)
  const nameWithoutExt = basename(original, ext)

  let newName = nameWithoutExt

  switch (rule.type) {
    case 'prefix':
      newName = (rule.value || '') + nameWithoutExt
      break
    case 'suffix':
      newName = nameWithoutExt + (rule.value || '')
      break
    case 'replace':
      if (rule.value && rule.replaceWith !== undefined) {
        newName = nameWithoutExt.split(rule.value).join(rule.replaceWith)
      }
      break
    case 'regex': {
      if (rule.pattern) {
        try {
          const re = new RegExp(rule.pattern, 'g')
          newName = nameWithoutExt.replace(re, rule.replaceWith ?? '')
        } catch {
          // keep name on invalid regex
        }
      }
      break
    }
    case 'number': {
      const startNum = typeof rule.startNumber === 'string' ? parseInt(rule.startNumber, 10) : (rule.startNumber || 1)
      const paddingNum = typeof rule.padding === 'string' ? parseInt(rule.padding, 10) : (rule.padding || 3)
      const num = startNum + index
      const padded = String(num).padStart(paddingNum, '0')
      newName = `${padded}_${nameWithoutExt}`
      break
    }
    case 'case':
      if (rule.caseType === 'upper') {
        newName = nameWithoutExt.toUpperCase()
      } else if (rule.caseType === 'lower') {
        newName = nameWithoutExt.toLowerCase()
      } else if (rule.caseType === 'title') {
        newName = nameWithoutExt.replace(/\b\w/g, c => c.toUpperCase())
      }
      break
    case 'date': {
      const date = new Date()
      const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`
      newName = `${dateStr}_${nameWithoutExt}`
      break
    }
  }

  return newName + ext
}

function generateNewName(original: string, rules: RenameRuleInput, index: number): string {
  const ruleList = Array.isArray(rules) ? rules : [rules]
  let current = original
  for (const rule of ruleList) {
    current = applyRuleToName(current, rule, index)
  }
  return current
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
  if (!existsSync(rulesPath)) return []
  const { readFile } = await import('fs/promises')
  const parsed = JSON.parse(await readFile(rulesPath, 'utf-8'))
  return Array.isArray(parsed) ? parsed : []
}

async function writeSavedRules(rules: SavedRenameRule[]): Promise<void> {
  const { writeFile } = await import('fs/promises')
  await writeFile(await getRulesPath(), JSON.stringify(rules, null, 2))
}

function detectPreviewConflicts(previews: RenamePreview[]): RenamePreview[] {
  const targetNames = new Map<string, number>()

  return previews.map((preview) => {
    const dir = dirname(preview.path)
    const newPath = join(dir, preview.preview)
    const resolvedNew = resolve(newPath)
    const resolvedOld = resolve(preview.path)

    if (preview.original === preview.preview) {
      return preview
    }

    if (!isValidFilename(preview.preview)) {
      return { ...preview, conflict: '文件名包含非法字符' }
    }

    if (resolvedNew !== resolvedOld && existsSync(newPath)) {
      return { ...preview, conflict: '目标文件名已存在' }
    }

    const count = targetNames.get(preview.preview) ?? 0
    targetNames.set(preview.preview, count + 1)
    if (count > 0) {
      return { ...preview, conflict: '批量重命名后文件名重复' }
    }

    return preview
  })
}

export function setupFileRenamerIPC(): void {
  logger.info('Setting up File Renamer IPC handlers')

  // Open folder dialog
  ipcMain.handle('file-renamer:selectFolder', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return null
      }
      registerAllowedRoot(result.filePaths[0])
      return result.filePaths[0]
    } catch (error) {
      logger.error('Failed to select folder:', error)
      return null
    }
  })

  // Open files dialog (multi-select)
  ipcMain.handle('file-renamer:selectFiles', async () => {
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
          registerAllowedRoot(dirname(filePath))
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
  ipcMain.handle('file-renamer:listFiles', async (_, folderPath: string) => {
    if (typeof folderPath !== 'string' || !folderPath.trim()) return []
    if (!isAllowedFolder(folderPath)) {
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

  // Preview rename
  ipcMain.handle('file-renamer:preview', async (_, files: FileEntry[], rules: RenameRuleInput) => {
    if (!Array.isArray(files)) return []
    const previews = files.map((file, index) => ({
      original: file.name,
      preview: generateNewName(file.name, rules, index),
      path: file.path
    })) as RenamePreview[]
    return detectPreviewConflicts(previews)
  })

  // Execute rename
  ipcMain.handle('file-renamer:execute', async (_, previews: RenamePreview[]) => {
    if (!Array.isArray(previews)) return []
    const results: RenameResult[] = []

    for (const preview of previews) {
      if (preview.conflict) {
        results.push({
          success: false,
          original: preview.original,
          renamed: preview.preview,
          error: preview.conflict
        })
        continue
      }

      try {
        if (!isValidFilename(preview.preview)) {
          results.push({
            success: false,
            original: preview.original,
            renamed: preview.preview,
            error: '文件名包含非法字符'
          })
          continue
        }

        const dir = dirname(preview.path)
        const newPath = join(dir, preview.preview)

        if (!isPathWithin(newPath, dir)) {
          results.push({
            success: false,
            original: preview.original,
            renamed: preview.preview,
            error: '目标路径超出允许范围'
          })
          continue
        }

        if (resolve(newPath) === resolve(preview.path)) {
          results.push({
            success: true,
            original: preview.original,
            renamed: preview.preview
          })
          continue
        }

        await rename(preview.path, newPath)

        results.push({
          success: true,
          original: preview.original,
          renamed: preview.preview,
          oldPath: preview.path,
          newPath
        })
      } catch (error) {
        results.push({
          success: false,
          original: preview.original,
          renamed: preview.preview,
          error: '重命名失败'
        })
      }
    }

    return results
  })

  ipcMain.handle('file-renamer:undo', async (_, ops: { oldPath: string; newPath: string }[]) => {
    if (!Array.isArray(ops)) return []
    const results: RenameResult[] = []

    for (const op of ops) {
      if (!op?.oldPath || !op?.newPath) continue
      try {
        if (!existsSync(op.newPath)) {
          results.push({
            success: false,
            original: basename(op.newPath),
            renamed: basename(op.oldPath),
            error: '文件不存在，无法撤销'
          })
          continue
        }
        await rename(op.newPath, op.oldPath)
        results.push({
          success: true,
          original: basename(op.newPath),
          renamed: basename(op.oldPath),
          oldPath: op.newPath,
          newPath: op.oldPath
        })
      } catch {
        results.push({
          success: false,
          original: basename(op.newPath),
          renamed: basename(op.oldPath),
          error: '撤销失败'
        })
      }
    }

    return results
  })

  // Save rename rules
  ipcMain.handle('file-renamer:saveRule', async (_, name: string, rule: RenameRule) => {
    if (typeof name !== 'string' || !name.trim()) {
      return { success: false, error: '无效的规则名称' }
    }
    try {
      const rules = await readSavedRules()
      const trimmedName = name.trim()
      const existingIndex = rules.findIndex(item => item.name === trimmedName)
      const nextRule: SavedRenameRule = { name: trimmedName, rule }
      if (existingIndex >= 0) {
        rules[existingIndex] = nextRule
      } else {
        rules.push(nextRule)
      }
      await writeSavedRules(rules)
      return { success: true }
    } catch (error) {
      logger.error('Failed to save rename rule:', error)
      return { success: false, error: '保存规则失败' }
    }
  })

  ipcMain.handle('file-renamer:listRules', async () => {
    try {
      return await readSavedRules()
    } catch (error) {
      logger.error('Failed to list rename rules:', error)
      return []
    }
  })

  ipcMain.handle('file-renamer:deleteRule', async (_, name: string) => {
    if (typeof name !== 'string' || !name.trim()) {
      return { success: false, error: '无效的规则名称' }
    }
    try {
      const rules = await readSavedRules()
      const nextRules = rules.filter(item => item.name !== name.trim())
      await writeSavedRules(nextRules)
      return { success: true }
    } catch (error) {
      logger.error('Failed to delete rename rule:', error)
      return { success: false, error: '删除规则失败' }
    }
  })

  logger.info('File Renamer IPC handlers ready')
}
