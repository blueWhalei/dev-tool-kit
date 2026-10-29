import type { TypedIpcChannel, IpcArgs, IpcResult } from '../ipc/contracts'
// Electron Path Types
export type ElectronPathName = 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents'

// Electron Dialog Types (simplified for shared package)
export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
    | 'dontAddToRecent'
  >
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
  properties?: Array<
    | 'createDirectory'
    | 'showHiddenFiles'
    | 'treatPackageAsDirectory'
    | 'showOverwriteConfirmation'
    | 'dontAddToRecent'
  >
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
  invoke: <C extends TypedIpcChannel>(channel: C, ...args: IpcArgs<C>) => Promise<IpcResult<C>>
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
export type EnvScope = 'user' | 'system'

export interface EnvBackup {
  timestamp: string
  name: string
  variables: EnvVariable[]
}

export interface EnvVariable {
  name: string
  value: string
  type: EnvScope
}

export interface PathEntry {
  path: string
  exists: boolean
  index: number
}

// Hosts Editor
export interface HostsOperationResult {
  success: boolean
  error?: string
  sudoCommand?: string
  backupPath?: string
  dnsFlushed?: boolean
}

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

export interface RenameRule {
  type: 'prefix' | 'suffix' | 'replace' | 'regex' | 'number' | 'case' | 'date'
  value?: string
  replaceWith?: string
  pattern?: string
  startNumber?: number
  padding?: number
  caseType?: 'upper' | 'lower' | 'title'
}

export interface SavedRenameRule {
  name: string
  rule: RenameRule
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
export * from './image'

export { isRenameRule } from './rename'
