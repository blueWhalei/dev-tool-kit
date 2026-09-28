import { handleIpc } from './typed-ipc'
import { BrowserWindow, app, shell, dialog } from 'electron'
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
import { authorizePath } from './modules/path-guard'

export function setupIpcHandlers(): void {
  logger.info('Setting up IPC handlers')

  handleIpc('window:minimize', event => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.minimize()
    return true
  })

  handleIpc('window:maximize', event => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window?.isMaximized()) {
      window.unmaximize()
    } else {
      window?.maximize()
    }
    return window?.isMaximized() ?? false
  })

  handleIpc('window:close', event => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.close()
    return true
  })

  handleIpc('window:isMaximized', event => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return window?.isMaximized() ?? false
  })

  handleIpc('window:resetState', async event => {
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

  handleIpc('app:getVersion', () => app.getVersion())

  handleIpc('app:getName', () => app.getName())

  handleIpc('app:getPlatform', () => process.platform)

  handleIpc('app:getRuntimeInfo', () => ({
    electron: process.versions.electron ?? '—',
    node: process.versions.node ?? '—',
    chrome: process.versions.chrome ?? '—'
  }))

  handleIpc('app:getPath', (_, name: unknown) => {
    if (!isValidElectronPathName(name)) {
      logger.warn('Blocked app:getPath with invalid name:', name)
      throw new Error('Invalid path name')
    }
    return app.getPath(name)
  })

  handleIpc('shell:openExternal', (_, url: string) => {
    if (typeof url !== 'string' || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      logger.warn('Blocked openExternal with invalid URL:', url)
      return false
    }
    shell.openExternal(url)
    return true
  })

  handleIpc('shell:openPath', (_, path: string) => {
    if (!isSafeLocalPath(path)) {
      logger.warn('Blocked openPath with invalid or missing path:', path)
      return false
    }
    shell.openPath(resolve(path))
    return true
  })

  handleIpc('dialog:showOpenDialog', async (event, options: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { canceled: true, filePaths: [] }
    const result = await dialog.showOpenDialog(window, sanitizeOpenDialogOptions(options))
    if (!result.canceled) {
      for (const filePath of result.filePaths) {
        authorizePath(filePath)
      }
    }
    return result
  })

  handleIpc('dialog:showSaveDialog', async (event, options: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { canceled: true, filePath: undefined }
    const result = await dialog.showSaveDialog(window, sanitizeSaveDialogOptions(options))
    if (!result.canceled) {
      authorizePath(result.filePath)
    }
    return result
  })

  handleIpc('dialog:showMessageBox', async (event, options: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { response: 0, checkboxChecked: false }
    const sanitized = sanitizeMessageBoxOptions(options)
    if (!sanitized) return { response: 0, checkboxChecked: false }
    return await dialog.showMessageBox(window, sanitized as Electron.MessageBoxOptions)
  })

  logger.info('IPC handlers setup complete')
}
