import type {
  ElectronPathName,
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions,
  OpenDialogReturnValue,
  SaveDialogReturnValue,
  PortInfo,
  ProcessInfo,
  OperationResult,
  EnvVariable,
  PathEntry,
  ShellEnvDiffLine,
  HostsEntry,
  HostsGroup,
  HostsScheme,
  DnsFlushResult,
  FileEntry,
  RenameRule,
  RenamePreview,
  RenameResult,
  SavedRenameRule,
  RegexResult,
  FileHashResults,
  ImageInfo,
  CompressOptions,
  ProcessedImage,
  ResizeOptions,
  ImageConvertOptions,
  SvgOptimizeOptions,
  SvgOptimizeResult,
  ExtractedColor,
  IconGenerateResult,
  CertificateFileReadResult,
  CertificateParseResult,
  SchemaValidationResult,
  KeyPairAlgorithm,
  KeyPairGenerateResult
} from '../index'
import type { BatchTaskRequest, BatchTaskResult } from '../types/image'

export interface IpcContracts {
  'window:minimize': { args: []; result: boolean }
  'window:maximize': { args: []; result: boolean }
  'window:close': { args: []; result: boolean }
  'window:isMaximized': { args: []; result: boolean }
  'window:resetState': {
    args: []
    result: { width: number; height: number; x?: number; y?: number; isMaximized: boolean }
  }
  'app:getVersion': { args: []; result: string }
  'app:getName': { args: []; result: string }
  'app:getPlatform': { args: []; result: string }
  'app:getRuntimeInfo': { args: []; result: { electron: string; node: string; chrome: string } }
  'app:getPath': { args: [name: ElectronPathName]; result: string }
  'shell:openExternal': { args: [url: string]; result: boolean }
  'shell:openPath': { args: [path: string]; result: boolean }
  'dialog:showOpenDialog': { args: [options: OpenDialogOptions]; result: OpenDialogReturnValue }
  'dialog:showSaveDialog': {
    args: [options: SaveDialogOptions]
    result: SaveDialogReturnValue | { canceled: boolean; filePath: undefined }
  }
  'dialog:showMessageBox': {
    args: [options: MessageBoxOptions]
    result: { response: number; checkboxChecked: boolean }
  }
  'port-manager:getPorts': { args: []; result: PortInfo[] }
  'port-manager:getPort': { args: [port: number]; result: PortInfo | null }
  'port-manager:scanRange': { args: [startPort: number, endPort: number]; result: PortInfo[] }
  'port-manager:getProcess': { args: [pid: number]; result: ProcessInfo | null }
  'port-manager:killProcess': { args: [pid: number, force?: boolean]; result: OperationResult }
  'port-manager:getCommonPorts': { args: []; result: { port: number; service: string }[] }
  'port-manager:scanCommonPorts': {
    args: []
    result: {
      service: string | undefined
      port: number
      pid: number
      protocol: 'TCP' | 'UDP'
      state: string
      localAddress: string
    }[]
  }
  'env-manager:getSupport': {
    args: []
    result:
      | {
          supported: boolean
          platform: string
          readOnly: boolean
          writeMode: 'shell'
          shellConfigFile: string
        }
      | { supported: boolean; platform: string; readOnly: boolean; writeMode: string }
  }
  'env-manager:getAll': { args: []; result: EnvVariable[] }
  'env-manager:get': { args: [name: string]; result: EnvVariable | null }
  'env-manager:set': {
    args: [name: string, value: string]
    result: { success: boolean; error?: string | undefined }
  }
  'env-manager:delete': {
    args: [name: string]
    result: { success: boolean; error?: string | undefined }
  }
  'env-manager:getPath': { args: []; result: PathEntry[] }
  'env-manager:setPath': {
    args: [paths: string[]]
    result: { success: boolean; error?: string | undefined }
  }
  'env-manager:previewSet': {
    args: [name: string, value: string]
    result:
      | {
          success: true
          preview: { configFile: string; before: string; after: string; diff: ShellEnvDiffLine[] }
        }
      | { success: boolean; error: string }
  }
  'env-manager:previewDelete': {
    args: [name: string]
    result:
      | {
          success: true
          preview: { configFile: string; before: string; after: string; diff: ShellEnvDiffLine[] }
        }
      | { success: boolean; error: string }
  }
  'env-manager:previewPath': {
    args: [paths: string[]]
    result:
      | {
          success: true
          preview: { configFile: string; before: string; after: string; diff: ShellEnvDiffLine[] }
        }
      | { success: boolean; error: string }
  }
  'env-manager:createBackup': {
    args: [name: string]
    result: { success: boolean; error: string } | { success: boolean; error?: undefined }
  }
  'env-manager:listBackups': {
    args: []
    result: { name: string; timestamp: string; count: number }[]
  }
  'env-manager:restoreBackup': {
    args: [timestamp: string]
    result: { success: boolean; error?: string | undefined }
  }
  'env-manager:deleteBackup': {
    args: [timestamp: string]
    result: { success: boolean; error: string } | { success: boolean; error?: undefined }
  }
  'env-manager:export': { args: [variables: EnvVariable[]]; result: string }
  'env-manager:import': {
    args: [content: string]
    result: { success: boolean; name: string; error?: string | undefined }[]
  }
  'hosts:checkWriteAccess': {
    args: []
    result: { writable: boolean; path: string; sudoHint?: string }
  }
  'hosts:getAll': { args: []; result: HostsEntry[] }
  'hosts:add': {
    args: [entry: Omit<HostsEntry, 'id'>]
    result: { success: boolean; error?: string; sudoCommand?: string; backupPath?: string }
  }
  'hosts:update': {
    args: [id: string, updates: Partial<HostsEntry>]
    result: { success: boolean; error?: string; sudoCommand?: string; backupPath?: string }
  }
  'hosts:delete': {
    args: [id: string]
    result: { success: boolean; error?: string; sudoCommand?: string; backupPath?: string }
  }
  'hosts:toggle': {
    args: [id: string]
    result: { success: boolean; error?: string; sudoCommand?: string; backupPath?: string }
  }
  'hosts:getGroups': { args: []; result: HostsGroup[] }
  'hosts:setGroup': {
    args: [id: string, group: string | undefined]
    result: { success: boolean; error?: string; sudoCommand?: string; backupPath?: string }
  }
  'hosts:saveScheme': {
    args: [name: string]
    result: { success: boolean; error: string } | { success: boolean; error?: undefined }
  }
  'hosts:listSchemes': {
    args: []
    result: { id: string; name: string; timestamp: string; count: number }[]
  }
  'hosts:loadScheme': {
    args: [id: string]
    result: { success: boolean; error?: string; sudoCommand?: string; backupPath?: string }
  }
  'hosts:deleteScheme': {
    args: [id: string]
    result: { success: boolean; error: string } | { success: boolean; error?: undefined }
  }
  'hosts:getScheme': { args: [id: string]; result: HostsScheme | null }
  'hosts:exportSchemes': { args: []; result: HostsScheme[] }
  'hosts:importSchemes': {
    args: [payload: HostsScheme[], mode?: 'merge' | 'replace']
    result:
      | { success: boolean; error: string; count?: undefined }
      | { success: boolean; count: number; error?: undefined }
  }
  'hosts:flushDNS': { args: []; result: DnsFlushResult }
  'file-renamer:selectFolder': { args: []; result: string | null }
  'file-renamer:selectFiles': { args: []; result: FileEntry[] }
  'file-renamer:listFiles': { args: [folderPath: string]; result: FileEntry[] }
  'file-renamer:preview': {
    args: [files: FileEntry[], rules: RenameRule[]]
    result: RenamePreview[]
  }
  'file-renamer:execute': { args: [previews: RenamePreview[]]; result: RenameResult[] }
  'file-renamer:undo': {
    args: [ops: { oldPath: string; newPath: string }[]]
    result: RenameResult[]
  }
  'file-renamer:saveRule': {
    args: [name: string, rule: RenameRule]
    result: { success: boolean; error: string } | { success: boolean; error?: undefined }
  }
  'file-renamer:listRules': { args: []; result: SavedRenameRule[] }
  'file-renamer:deleteRule': {
    args: [name: string]
    result: { success: boolean; error: string } | { success: boolean; error?: undefined }
  }
  'regex:test': { args: [pattern: string, flags: string, testString: string]; result: RegexResult }
  'regex:replace': {
    args: [pattern: string, flags: string, testString: string, replacement: string]
    result:
      | { success: boolean; error: string; result?: undefined }
      | { success: boolean; result: string; error?: undefined }
  }
  'regex:getCommon': { args: []; result: { name: string; pattern: string; description: string }[] }
  'hash-generator:selectFile': { args: []; result: string | null }
  'hash-generator:computeFileHash': { args: [filePath: string]; result: FileHashResults | null }
  'image-tools:pickImage': {
    args: []
    result: {
      fileName: string
      filePath: string
      mimeType: string
      base64: string
      size: number
    } | null
  }
  'image-tools:pickImages': {
    args: []
    result: { fileName: string; filePath: string; mimeType: string; size: number }[]
  }
  'image-tools:getInfo': { args: [filePath: string]; result: ImageInfo | null }
  'image-tools:compress': {
    args: [filePath: string, options: CompressOptions]
    result: ProcessedImage | null
  }
  'image-tools:resize': {
    args: [filePath: string, options: ResizeOptions]
    result: ProcessedImage | null
  }
  'image-tools:convert': {
    args: [filePath: string, options: ImageConvertOptions]
    result: ProcessedImage | null
  }
  'image-tools:saveImage': {
    args: [data: string, fileName: string, _mimeType: string]
    result:
      | { success: boolean; error: string; path?: undefined }
      | { success: boolean; path: string; error?: undefined }
  }
  'image-tools:saveImages': {
    args: [images: { data: string; fileName: string }[], targetDir?: string | undefined]
    result:
      | { success: boolean; error: string; results?: undefined; outputDir?: undefined }
      | {
          success: boolean
          results: (
            | { fileName: string; path: string; success: boolean; error: string }
            | { fileName: string; path: string; success: boolean; error?: undefined }
          )[]
          outputDir: string
          error?: undefined
        }
  }
  'image-tools:pickSvgFile': {
    args: []
    result: { fileName: string; filePath: string; content: string; size: number } | null
  }
  'image-tools:optimizeSvg': {
    args: [svgText: string, options: SvgOptimizeOptions]
    result: SvgOptimizeResult | null
  }
  'image-tools:extractColors': {
    args: [filePath: string, maxColors?: number]
    result: ExtractedColor[] | null
  }
  'image-tools:readClipboardImage': {
    args: []
    result: { base64: string; width: number; height: number; size: number; mimeType: string } | null
  }
  'image-tools:generateIcons': {
    args: [filePath: string, sizes: number[], includeIco: boolean]
    result: IconGenerateResult | null
  }
  'text-diff:readFile': {
    args: [filePath: string]
    result: { content: string; fileName: string } | null
  }
  'cert-parser:readFile': { args: []; result: CertificateFileReadResult | null }
  'cert-parser:parsePem': { args: [pemText: string]; result: CertificateParseResult }
  'json-schema:validate': {
    args: [payload: { data: unknown; schemaText: string }]
    result: SchemaValidationResult
  }
  'key-pair-generator:generate': {
    args: [algorithm: KeyPairAlgorithm]
    result: KeyPairGenerateResult
  }
  'image-tools:batchRetry': { args: [taskId: string]; result: BatchTaskResult }
  'image-tools:batchStart': { args: [request: BatchTaskRequest]; result: BatchTaskResult }
  'image-tools:batchCancel': { args: [taskId: string]; result: BatchTaskResult }
  'image-tools:batchRelease': { args: [taskId: string]; result: BatchTaskResult }
  'image-tools:batchSave': {
    args: [taskId: string]
    result: BatchTaskResult & { saved?: number; failed?: number; cancelled?: boolean }
  }
}
export type TypedIpcChannel = keyof IpcContracts
export type IpcArgs<C extends TypedIpcChannel> = IpcContracts[C]['args']
export type IpcResult<C extends TypedIpcChannel> = IpcContracts[C]['result']
