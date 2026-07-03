import { existsSync, statSync } from 'fs'
import { resolve } from 'path'
import type {
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions
} from '@dev-tool-kit/shared'

const OPEN_DIALOG_PROPERTIES = new Set([
  'openFile', 'openDirectory', 'multiSelections', 'showHiddenFiles',
  'createDirectory', 'promptToCreate', 'noResolveAliases',
  'treatPackageAsDirectory', 'dontAddToRecent'
])

const SAVE_DIALOG_PROPERTIES = new Set([
  'createDirectory', 'showHiddenFiles', 'treatPackageAsDirectory',
  'showOverwriteConfirmation', 'dontAddToRecent'
])

function sanitizeFilters(
  filters: OpenDialogOptions['filters'] | SaveDialogOptions['filters']
): { name: string; extensions: string[] }[] | undefined {
  if (!Array.isArray(filters)) return undefined
  return filters
    .filter(f => f && typeof f.name === 'string' && Array.isArray(f.extensions))
    .map(f => ({
      name: f.name.slice(0, 100),
      extensions: f.extensions
        .filter(ext => typeof ext === 'string')
        .map(ext => ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20))
        .filter(Boolean)
    }))
    .filter(f => f.extensions.length > 0)
}

export function sanitizeOpenDialogOptions(
  options: unknown
): OpenDialogOptions {
  if (!options || typeof options !== 'object') return {}
  const o = options as Record<string, unknown>
  const result: OpenDialogOptions = {}

  if (typeof o.title === 'string') result.title = o.title.slice(0, 200)
  if (typeof o.defaultPath === 'string') result.defaultPath = o.defaultPath.slice(0, 1024)
  if (typeof o.buttonLabel === 'string') result.buttonLabel = o.buttonLabel.slice(0, 50)
  if (typeof o.message === 'string') result.message = o.message.slice(0, 500)

  const filters = sanitizeFilters(o.filters as OpenDialogOptions['filters'])
  if (filters?.length) result.filters = filters

  if (Array.isArray(o.properties)) {
    result.properties = o.properties.filter(
      (p): p is NonNullable<OpenDialogOptions['properties']>[number] =>
        typeof p === 'string' && OPEN_DIALOG_PROPERTIES.has(p)
    ) as OpenDialogOptions['properties']
  }

  return result
}

export function sanitizeSaveDialogOptions(
  options: unknown
): SaveDialogOptions {
  if (!options || typeof options !== 'object') return {}
  const o = options as Record<string, unknown>
  const result: SaveDialogOptions = {}

  if (typeof o.title === 'string') result.title = o.title.slice(0, 200)
  if (typeof o.defaultPath === 'string') result.defaultPath = o.defaultPath.slice(0, 1024)
  if (typeof o.buttonLabel === 'string') result.buttonLabel = o.buttonLabel.slice(0, 50)
  if (typeof o.message === 'string') result.message = o.message.slice(0, 500)

  const filters = sanitizeFilters(o.filters as SaveDialogOptions['filters'])
  if (filters?.length) result.filters = filters

  if (Array.isArray(o.properties)) {
    result.properties = o.properties.filter(
      (p): p is NonNullable<SaveDialogOptions['properties']>[number] =>
        typeof p === 'string' && SAVE_DIALOG_PROPERTIES.has(p)
    ) as SaveDialogOptions['properties']
  }

  return result
}

export function sanitizeMessageBoxOptions(
  options: unknown
): MessageBoxOptions | null {
  if (!options || typeof options !== 'object') return null
  const o = options as Record<string, unknown>
  if (typeof o.message !== 'string' || !o.message.trim()) return null

  const result: MessageBoxOptions = {
    message: o.message.slice(0, 2000)
  }

  const allowedTypes = new Set(['none', 'info', 'error', 'question', 'warning'])
  if (typeof o.type === 'string' && allowedTypes.has(o.type)) {
    result.type = o.type as MessageBoxOptions['type']
  }
  if (typeof o.title === 'string') result.title = o.title.slice(0, 200)
  if (typeof o.detail === 'string') result.detail = o.detail.slice(0, 2000)
  if (Array.isArray(o.buttons)) {
    result.buttons = o.buttons
      .filter(b => typeof b === 'string')
      .map(b => b.slice(0, 100))
      .slice(0, 10)
  }
  if (typeof o.defaultId === 'number') result.defaultId = o.defaultId
  if (typeof o.cancelId === 'number') result.cancelId = o.cancelId

  return result
}

export function isSafeLocalPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false
  const trimmed = path.trim()
  if (!trimmed) return false

  try {
    const resolved = resolve(trimmed)
    if (!existsSync(resolved)) return false
    statSync(resolved)
    return true
  } catch {
    return false
  }
}
