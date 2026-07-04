import type {
  PortInfo,
  ProcessInfo,
  CommonPort,
  FileEntry,
  RenamePreview,
  RenameResult,
  EnvVariable,
  PathEntry,
  HostsEntry,
  HostsGroup,
  RegexMatch,
  RegexResult,
  BackupInfo,
  SchemeInfo,
  OperationResult
} from '@dev-tool-kit/shared'

export type {
  PortInfo,
  ProcessInfo,
  CommonPort,
  FileEntry,
  RenamePreview,
  RenameResult,
  EnvVariable,
  PathEntry,
  HostsEntry,
  HostsGroup,
  RegexMatch,
  RegexResult,
  BackupInfo,
  SchemeInfo,
  OperationResult
}

export function isArray<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every(guard)
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return isObject(obj) && key in obj
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isPortInfo(value: unknown): value is PortInfo {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'port') && isNumber(value.port) &&
    hasProperty(value, 'pid') && isNumber(value.pid) &&
    hasProperty(value, 'protocol') && isString(value.protocol) &&
    hasProperty(value, 'state') && isString(value.state) &&
    hasProperty(value, 'localAddress') && isString(value.localAddress)
  )
}

export function isPortInfoArray(value: unknown): value is PortInfo[] {
  return isArray(value, isPortInfo)
}

export function isProcessInfo(value: unknown): value is ProcessInfo {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'pid') && isNumber(value.pid) &&
    hasProperty(value, 'name') && isString(value.name)
  )
}

export function isCommonPort(value: unknown): value is CommonPort {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'port') && isNumber(value.port) &&
    hasProperty(value, 'service') && isString(value.service)
  )
}

export function isCommonPortArray(value: unknown): value is CommonPort[] {
  return isArray(value, isCommonPort)
}

export function isFileEntry(value: unknown): value is FileEntry {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'name') && isString(value.name) &&
    hasProperty(value, 'path') && isString(value.path) &&
    hasProperty(value, 'size') && isNumber(value.size) &&
    hasProperty(value, 'isDirectory') && isBoolean(value.isDirectory) &&
    hasProperty(value, 'modifiedTime') && isString(value.modifiedTime)
  )
}

export function isFileEntryArray(value: unknown): value is FileEntry[] {
  return isArray(value, isFileEntry)
}

export function isRenamePreview(value: unknown): value is RenamePreview {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'original') && isString(value.original) &&
    hasProperty(value, 'preview') && isString(value.preview) &&
    hasProperty(value, 'path') && isString(value.path)
  )
}

export function isRenamePreviewArray(value: unknown): value is RenamePreview[] {
  return isArray(value, isRenamePreview)
}

export function isRenameResult(value: unknown): value is RenameResult {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'success') && isBoolean(value.success) &&
    hasProperty(value, 'original') && isString(value.original) &&
    hasProperty(value, 'renamed') && isString(value.renamed)
  )
}

export function isRenameResultArray(value: unknown): value is RenameResult[] {
  return isArray(value, isRenameResult)
}

export function isEnvVariable(value: unknown): value is EnvVariable {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'name') && isString(value.name) &&
    hasProperty(value, 'value') && isString(value.value) &&
    hasProperty(value, 'type') && (value.type === 'user' || value.type === 'system')
  )
}

export function isEnvVariableArray(value: unknown): value is EnvVariable[] {
  return isArray(value, isEnvVariable)
}

export function isPathEntry(value: unknown): value is PathEntry {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'path') && isString(value.path) &&
    hasProperty(value, 'exists') && isBoolean(value.exists) &&
    hasProperty(value, 'index') && isNumber(value.index)
  )
}

export function isPathEntryArray(value: unknown): value is PathEntry[] {
  return isArray(value, isPathEntry)
}

export function isBackupInfo(value: unknown): value is BackupInfo {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'name') && isString(value.name) &&
    hasProperty(value, 'timestamp') && isString(value.timestamp) &&
    hasProperty(value, 'count') && isNumber(value.count)
  )
}

export function isBackupInfoArray(value: unknown): value is BackupInfo[] {
  return isArray(value, isBackupInfo)
}

export function isHostsEntry(value: unknown): value is HostsEntry {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'id') && isString(value.id) &&
    hasProperty(value, 'ip') && isString(value.ip) &&
    hasProperty(value, 'hostname') && isString(value.hostname) &&
    hasProperty(value, 'enabled') && isBoolean(value.enabled)
  )
}

export function isHostsEntryArray(value: unknown): value is HostsEntry[] {
  return isArray(value, isHostsEntry)
}

export function isHostsGroup(value: unknown): value is HostsGroup {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'id') && isString(value.id) &&
    hasProperty(value, 'name') && isString(value.name) &&
    hasProperty(value, 'color') && isString(value.color) &&
    hasProperty(value, 'order') && isNumber(value.order)
  )
}

export function isHostsGroupArray(value: unknown): value is HostsGroup[] {
  return isArray(value, isHostsGroup)
}

export function isSchemeInfo(value: unknown): value is SchemeInfo {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'id') && isString(value.id) &&
    hasProperty(value, 'name') && isString(value.name) &&
    hasProperty(value, 'timestamp') && isString(value.timestamp) &&
    hasProperty(value, 'count') && isNumber(value.count)
  )
}

export function isSchemeInfoArray(value: unknown): value is SchemeInfo[] {
  return isArray(value, isSchemeInfo)
}

export interface CommonRegex {
  name: string
  pattern: string
  description: string
}

export function isCommonRegex(value: unknown): value is CommonRegex {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'name') && isString(value.name) &&
    hasProperty(value, 'pattern') && isString(value.pattern) &&
    hasProperty(value, 'description') && isString(value.description)
  )
}

export function isCommonRegexArray(value: unknown): value is CommonRegex[] {
  return isArray(value, isCommonRegex)
}

export function isRegexMatch(value: unknown): value is RegexMatch {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'match') && isString(value.match) &&
    hasProperty(value, 'index') && isNumber(value.index) &&
    hasProperty(value, 'groups') && Array.isArray(value.groups) && value.groups.every(isString)
  )
}

export function isRegexMatchArray(value: unknown): value is RegexMatch[] {
  return isArray(value, isRegexMatch)
}

export function isRegexResult(value: unknown): value is RegexResult {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'isValid') && isBoolean(value.isValid) &&
    hasProperty(value, 'matches') && isRegexMatchArray(value.matches)
  )
}

export interface ReplaceResult {
  success: boolean
  result: string
}

export function isReplaceResult(value: unknown): value is ReplaceResult {
  if (!isObject(value)) return false
  return (
    hasProperty(value, 'success') && isBoolean(value.success) &&
    hasProperty(value, 'result') && isString(value.result)
  )
}

export function isOperationResult(value: unknown): value is OperationResult {
  if (!isObject(value)) return false
  if (!(hasProperty(value, 'success') && isBoolean(value.success))) return false
  if (hasProperty(value, 'needSudo') && !isBoolean(value.needSudo)) return false
  return true
}

export function validateArray<T>(
  data: unknown,
  guard: (value: unknown) => value is T[],
  context: string
): T[] {
  if (!guard(data)) {
    if (!Array.isArray(data)) {
      console.warn(`[${context}] Expected array but received ${typeof data}`)
    } else {
      console.warn(`[${context}] Array validation failed, ${data.length} items rejected`)
    }
    return []
  }
  return data
}

export function validateOptional<T>(
  data: unknown,
  guard: (value: unknown) => value is T,
  context: string
): T | null {
  if (data === null || data === undefined) {
    return null
  }
  if (!guard(data)) {
    console.warn(`[${context}] Validation failed for data:`, data)
    return null
  }
  return data
}
