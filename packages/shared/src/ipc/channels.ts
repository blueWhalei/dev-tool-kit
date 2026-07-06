/** IPC channel names — single source of truth for preload whitelist and documentation */

export const IPC_RECEIVE_CHANNELS = [
  'app:ready',
  'theme:changed',
  'language:changed'
] as const

export type IpcReceiveChannel = (typeof IPC_RECEIVE_CHANNELS)[number]

export const IPC_INVOKE_CHANNELS = [
  // Window
  'window:minimize',
  'window:maximize',
  'window:close',
  'window:isMaximized',
  'window:resetState',
  // App
  'app:getVersion',
  'app:getName',
  'app:getPlatform',
  'app:getRuntimeInfo',
  'app:getPath',
  // Shell
  'shell:openExternal',
  'shell:openPath',
  // Dialog
  'dialog:showOpenDialog',
  'dialog:showSaveDialog',
  'dialog:showMessageBox',
  // Port Manager
  'port-manager:getPorts',
  'port-manager:getPort',
  'port-manager:scanRange',
  'port-manager:getProcess',
  'port-manager:killProcess',
  'port-manager:getCommonPorts',
  'port-manager:scanCommonPorts',
  // Env Manager
  'env-manager:getSupport',
  'env-manager:getAll',
  'env-manager:get',
  'env-manager:set',
  'env-manager:delete',
  'env-manager:getPath',
  'env-manager:setPath',
  'env-manager:createBackup',
  'env-manager:listBackups',
  'env-manager:restoreBackup',
  'env-manager:deleteBackup',
  'env-manager:export',
  'env-manager:import',
  // Hosts Editor
  'hosts:getAll',
  'hosts:add',
  'hosts:update',
  'hosts:delete',
  'hosts:toggle',
  'hosts:getGroups',
  'hosts:setGroup',
  'hosts:saveScheme',
  'hosts:listSchemes',
  'hosts:loadScheme',
  'hosts:deleteScheme',
  'hosts:getScheme',
  'hosts:exportSchemes',
  'hosts:importSchemes',
  'hosts:flushDNS',
  // File Renamer
  'file-renamer:selectFolder',
  'file-renamer:selectFiles',
  'file-renamer:listFiles',
  'file-renamer:preview',
  'file-renamer:execute',
  'file-renamer:saveRule',
  'file-renamer:listRules',
  'file-renamer:deleteRule',
  // Regex Tester
  'regex:test',
  'regex:replace',
  'regex:getCommon',
  // Hash Generator
  'hash-generator:selectFile',
  'hash-generator:computeFileHash',
  // Text Diff
  'text-diff:readFile',
  // Certificate Parser
  'cert-parser:readFile',
  'cert-parser:parsePem',
] as const

export type IpcInvokeChannel = (typeof IPC_INVOKE_CHANNELS)[number]

export const ELECTRON_PATH_NAMES = [
  'home',
  'appData',
  'userData',
  'temp',
  'desktop',
  'documents'
] as const

export function isValidInvokeChannel(channel: string): channel is IpcInvokeChannel {
  return (IPC_INVOKE_CHANNELS as readonly string[]).includes(channel)
}

export function isValidReceiveChannel(channel: string): channel is IpcReceiveChannel {
  return (IPC_RECEIVE_CHANNELS as readonly string[]).includes(channel)
}

export function isValidElectronPathName(name: unknown): name is (typeof ELECTRON_PATH_NAMES)[number] {
  return typeof name === 'string' && (ELECTRON_PATH_NAMES as readonly string[]).includes(name)
}
