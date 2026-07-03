import { contextBridge, ipcRenderer } from 'electron'
import type {
  ElectronAPI,
  ElectronPathName,
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions,
  OpenDialogReturnValue,
  SaveDialogReturnValue,
  MessageBoxReturnValue
} from '@dev-tool-kit/shared'
import {
  IPC_RECEIVE_CHANNELS,
  IPC_INVOKE_CHANNELS,
  isValidInvokeChannel
} from '@dev-tool-kit/shared/ipc'

export type {
  ElectronAPI,
  ElectronPathName,
  OpenDialogOptions,
  SaveDialogOptions,
  MessageBoxOptions,
  OpenDialogReturnValue,
  SaveDialogReturnValue,
  MessageBoxReturnValue
}

const logInvalidChannel = (channel: string, type: 'invoke' | 'send' | 'receive'): void => {
  console.warn(`[IPC Security] Blocked invalid ${type} channel: ${channel}`)
}

// Expose protected APIs to renderer
const electronAPI: ElectronAPI = {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getName: () => ipcRenderer.invoke('app:getName'),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  getPath: (name: ElectronPathName) => ipcRenderer.invoke('app:getPath', name),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  openPath: (path: string) => ipcRenderer.invoke('shell:openPath', path),

  // Dialog
  showOpenDialog: (options: OpenDialogOptions) => ipcRenderer.invoke('dialog:showOpenDialog', options),
  showSaveDialog: (options: SaveDialogOptions) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  showMessageBox: (options: MessageBoxOptions) => ipcRenderer.invoke('dialog:showMessageBox', options),

  // Event listeners - returns cleanup function
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    if ((IPC_RECEIVE_CHANNELS as readonly string[]).includes(channel)) {
      const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
        callback(...args)
      }
      ipcRenderer.on(channel, subscription)
      return () => {
        ipcRenderer.removeListener(channel, subscription)
      }
    }
    logInvalidChannel(channel, 'receive')
    return () => {}
  },

  once: (channel: string, callback: (...args: unknown[]) => void) => {
    if ((IPC_RECEIVE_CHANNELS as readonly string[]).includes(channel)) {
      ipcRenderer.once(channel, (_event, ...args) => callback(...args))
    } else {
      logInvalidChannel(channel, 'receive')
    }
  },

  invoke: (channel: string, ...args: unknown[]) => {
    if (isValidInvokeChannel(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    logInvalidChannel(channel, 'invoke')
    return Promise.reject(new Error(`[IPC Security] Channel "${channel}" is not allowed`))
  }
}

// Expose in main world
try {
  if (!process.contextIsolated) {
    throw new Error('Context isolation is disabled — the app cannot run safely')
  }
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
} catch (error) {
  console.error('Failed to expose electron API:', error)
}

// Re-export channel list for type-checking parity (tree-shaken in production)
void IPC_INVOKE_CHANNELS
