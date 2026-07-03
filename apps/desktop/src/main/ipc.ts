import { ipcMain, BrowserWindow, app, shell, dialog } from 'electron'
import { resolve } from 'path'
import { isValidElectronPathName } from '@dev-tool-kit/shared'
import { logger } from './logger'
import { resetWindowState } from './store/window-state'
import { DEFAULT_STATE } from './window'
import {
  sanitizeOpenDialogOptions,
  sanitizeSaveDialogOptions,
  sanitizeMessageBoxOptions,
  isSafeLocalPath
} from './ipc-validation'

export function setupIpcHandlers(): void {
  logger.info('Setting up IPC handlers')

  ipcMain.handle('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
    return true
  })

  ipcMain.handle('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window?.isMaximized()) {
      window.unmaximize()
    } else {
      window?.maximize()
    }
    return window?.isMaximized() ?? false
  })

  ipcMain.handle('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.close()
    return true
  })

  ipcMain.handle('window:isMaximized', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return window?.isMaximized() ?? false
  })

  ipcMain.handle('window:resetState', async (event) => {
    await resetWindowState()
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize()
      }
      window.setSize(DEFAULT_STATE.width, DEFAULT_STATE.height)
      window.center()
    }
    return DEFAULT_STATE
  })

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('app:getName', () => app.getName())

  ipcMain.handle('app:getPlatform', () => process.platform)

  ipcMain.handle('app:getRuntimeInfo', () => ({
    electron: process.versions.electron ?? '—',
    node: process.versions.node ?? '—',
    chrome: process.versions.chrome ?? '—'
  }))

  ipcMain.handle('app:getPath', (_, name: unknown) => {
    if (!isValidElectronPathName(name)) {
      logger.warn('Blocked app:getPath with invalid name:', name)
      throw new Error('Invalid path name')
    }
    return app.getPath(name)
  })

  ipcMain.handle('shell:openExternal', (_, url: string) => {
    if (typeof url !== 'string' || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      logger.warn('Blocked openExternal with invalid URL:', url)
      return false
    }
    shell.openExternal(url)
    return true
  })

  ipcMain.handle('shell:openPath', (_, path: string) => {
    if (!isSafeLocalPath(path)) {
      logger.warn('Blocked openPath with invalid or missing path:', path)
      return false
    }
    shell.openPath(resolve(path))
    return true
  })

  ipcMain.handle('dialog:showOpenDialog', async (event, options: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { canceled: true, filePaths: [] }
    return await dialog.showOpenDialog(window, sanitizeOpenDialogOptions(options))
  })

  ipcMain.handle('dialog:showSaveDialog', async (event, options: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { canceled: true, filePath: undefined }
    return await dialog.showSaveDialog(window, sanitizeSaveDialogOptions(options))
  })

  ipcMain.handle('dialog:showMessageBox', async (event, options: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { response: 0, checkboxChecked: false }
    const sanitized = sanitizeMessageBoxOptions(options)
    if (!sanitized) return { response: 0, checkboxChecked: false }
    return await dialog.showMessageBox(window, sanitized as Electron.MessageBoxOptions)
  })

  logger.info('IPC handlers setup complete')
}
