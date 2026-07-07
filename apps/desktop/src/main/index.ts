import { app, shell, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipc'
import { createAppMenu } from './menu'
import { initLogger, logger } from './logger'
import { setupPortManagerIPC } from './modules/port-manager'
import { setupEnvManagerIPC } from './modules/env-manager'
import { setupHostsEditorIPC } from './modules/hosts-editor'
import { setupFileRenamerIPC } from './modules/file-renamer'
import { setupRegexTesterIPC } from './modules/regex-tester'
import { setupHashGeneratorIPC } from './modules/hash-generator'
import { setupImageBase64IPC } from './modules/image-base64'
import { setupTextDiffIPC } from './modules/text-diff'
import { setupCertParserIPC } from './modules/cert-parser'
import { loadWindowState, saveWindowState } from './store/window-state'
import { getWindowState } from './window'

// Initialize logger first
initLogger()

logger.info('Application starting...')

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  logger.info('Creating main window')

  const savedState = await loadWindowState()

  mainWindow = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    frame: true,
    titleBarStyle: 'default',
    title: 'DevToolkit',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    logger.info('Window ready to show')
    if (savedState.isMaximized) {
      mainWindow?.maximize()
    }
    mainWindow?.show()
  })

  // Listen for system theme changes
  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors
    logger.info(`System theme changed: ${isDark ? 'dark' : 'light'}`)
    mainWindow?.webContents.send('theme:changed', isDark)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = details.url
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      shell.openExternal(url)
    } else {
      logger.warn('Blocked window open with disallowed URL:', url)
    }
    return { action: 'deny' }
  })

  // Load the renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  let saveStateTimeout: NodeJS.Timeout | null = null
  const debouncedSaveState = () => {
    if (saveStateTimeout) {
      clearTimeout(saveStateTimeout)
    }
    saveStateTimeout = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        saveWindowState(getWindowState(mainWindow))
      }
    }, 500)
  }

  mainWindow.on('close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      void saveWindowState(getWindowState(mainWindow))
    }
  })

  mainWindow.on('resize', debouncedSaveState)
  mainWindow.on('move', debouncedSaveState)

  app.on('before-quit', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      void saveWindowState(getWindowState(mainWindow))
    }
  })

  logger.info('Main window created successfully')
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error)
  if (app.isReady()) {
    app.quit()
  } else {
    process.exit(1)
  }
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection:', reason)
})

app.whenReady().then(async () => {
  logger.info('App ready')

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.devtoolkit.app')

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Setup IPC handlers
  setupIpcHandlers()

  // Setup port manager IPC
  setupPortManagerIPC()

  // Setup env manager IPC
  setupEnvManagerIPC()

  // Setup hosts editor IPC
  setupHostsEditorIPC()

  // Setup file renamer IPC
  setupFileRenamerIPC()

  // Setup regex tester IPC
  setupRegexTesterIPC()

  // Setup hash generator IPC
  setupHashGeneratorIPC()

  setupImageBase64IPC()

  setupTextDiffIPC()

  setupCertParserIPC()

  // Create menu
  createAppMenu()

  // Create window
  await createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
})

app.on('window-all-closed', () => {
  logger.info('All windows closed')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Export for IPC handlers
export { mainWindow }
