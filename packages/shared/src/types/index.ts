// Module System Types
export type ModuleCategory = 'system' | 'developer' | 'utility' | 'network'

export interface ModuleRoute {
  path: string
  name: string
  component: string
  meta?: Record<string, unknown>
}

export interface ModuleSetting {
  key: string
  label: string
  type: 'text' | 'number' | 'boolean' | 'select'
  default?: unknown
  options?: { label: string; value: unknown }[]
}

export interface ModuleContext {
  electronAPI: ElectronAPI
  storage: StorageAPI
  logger: LoggerAPI
  eventBus: EventBusAPI
}

export interface ModuleInterface {
  name: string
  displayName: string
  description: string
  icon: string
  category: ModuleCategory
  version: string
  getRoutes?: () => ModuleRoute[]
  getSettings?: () => ModuleSetting[]
  permissions?: string[]
}

// Electron Path Types
export type ElectronPathName = 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents'

// Electron Dialog Types (simplified for shared package)
export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate' | 'noResolveAliases' | 'treatPackageAsDirectory' | 'dontAddToRecent'>
  message?: string
  securityScopedBookmarks?: boolean
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: Array<{ name: string; extensions: string[] }>
  message?: string
  nameFieldLabel?: string
  showsTagField?: boolean
  properties?: Array<'createDirectory' | 'showHiddenFiles' | 'treatPackageAsDirectory' | 'showOverwriteConfirmation' | 'dontAddToRecent'>
  securityScopedBookmarks?: boolean
  titleFieldLabel?: string
}

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning'
  buttons?: string[]
  defaultId?: number
  title?: string
  message: string
  detail?: string
  checkboxLabel?: string
  checkboxChecked?: boolean
  icon?: unknown
  cancelId?: number
  noLink?: boolean
  normalizeAccessKeys?: boolean
}

export interface OpenDialogReturnValue {
  canceled: boolean
  filePaths: string[]
  bookmarks?: string[]
}

export interface SaveDialogReturnValue {
  canceled: boolean
  filePath?: string
  bookmark?: string
}

export interface MessageBoxReturnValue {
  response: number
  checkboxChecked: boolean
}

// Electron API Types
export interface ElectronAPI {
  // Window controls
  minimize: () => Promise<void>
  maximize: () => Promise<boolean>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>

  // App info
  getVersion: () => Promise<string>
  getName: () => Promise<string>
  getPlatform: () => Promise<string>
  getPath: (name: ElectronPathName) => Promise<string>

  // Shell
  openExternal: (url: string) => Promise<boolean>
  openPath: (path: string) => Promise<boolean>

  // Dialog
  showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>
  showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>
  showMessageBox: (options: MessageBoxOptions) => Promise<MessageBoxReturnValue>

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
  once: (channel: string, callback: (...args: unknown[]) => void) => void
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

// Storage API
export interface StorageAPI {
  get: <T>(key: string, defaultValue?: T) => T | undefined
  set: <T>(key: string, value: T) => void
  remove: (key: string) => void
  clear: () => void
}

// Logger API
export interface LoggerAPI {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

// Event Bus API
export interface EventBusAPI {
  emit: (event: string, ...args: unknown[]) => void
  on: (event: string, callback: (...args: unknown[]) => void) => () => void
  once: (event: string, callback: (...args: unknown[]) => void) => void
}

// Module-specific types (shared between main process and renderer)

// Port Manager
export interface PortInfo {
  port: number
  pid: number
  protocol: 'TCP' | 'UDP'
  state: string
  localAddress: string
  service?: string
}

export interface ProcessInfo {
  pid: number
  name: string
  command?: string
  cpu?: number
  memory?: number
  memoryMB?: number
  user?: string
  path?: string
  startTime?: string
}

export interface CommonPort {
  port: number
  service: string
}

// Env Manager
export interface EnvVariable {
  name: string
  value: string
  type: 'user' | 'system'
}

export interface PathEntry {
  path: string
  exists: boolean
  index: number
}

// Hosts Editor
export interface HostsEntry {
  id: string
  ip: string
  hostname: string
  comment?: string
  enabled: boolean
  group?: string
}

export interface HostsGroup {
  id: string
  name: string
  color: string
  order: number
}

export interface HostsScheme {
  id: string
  name: string
  timestamp: string
  entries: HostsEntry[]
}

// File Renamer
export interface FileEntry {
  name: string
  path: string
  size: number
  isDirectory: boolean
  modifiedTime: string
}

export interface RenamePreview {
  original: string
  preview: string
  path: string
  conflict?: string
}

export interface SavedRenameRule {
  name: string
  rule: {
    type: 'prefix' | 'suffix' | 'replace' | 'regex' | 'number' | 'case' | 'date'
    value?: string
    replaceWith?: string
    pattern?: string
    startNumber?: number
    padding?: number
    caseType?: 'upper' | 'lower' | 'title'
  }
}

export interface RenameResult {
  success: boolean
  original: string
  renamed: string
  error?: string
  oldPath?: string
  newPath?: string
}

// Regex Tester
export interface RegexMatch {
  match: string
  index: number
  groups: string[]
}

export interface RegexResult {
  isValid: boolean
  matches: RegexMatch[]
  error?: string
}

// Common result types
export interface BackupInfo {
  name: string
  timestamp: string
  count: number
}

export interface SchemeInfo {
  id: string
  name: string
  timestamp: string
  count: number
}

export type KillProcessErrorCode =
  | 'invalid_pid'
  | 'protected_pid'
  | 'permission_denied'
  | 'process_not_found'
  | 'access_denied'
  | 'unknown'

export interface OperationResult {
  success: boolean
  error?: string
  needSudo?: boolean
  errorCode?: KillProcessErrorCode
  killCommand?: string
}

export * from './certificate'
export * from './key-pair'
