import { BrowserWindow, screen } from 'electron'
import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { logger } from './logger'

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
}

export const DEFAULT_STATE: WindowState = {
  width: 1200,
  height: 800,
  isMaximized: false
}

export function getWindowState(window: BrowserWindow): WindowState {
  const bounds = window.getBounds()
  return {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: window.isMaximized()
  }
}

export function setWindowState(window: BrowserWindow, state: WindowState): void {
  if (state.isMaximized) {
    window.maximize()
  } else {
    if (state.x !== undefined && state.y !== undefined) {
      window.setBounds({ ...state })
    } else {
      window.setSize(state.width, state.height)
    }
  }
}

export function centerWindow(window: BrowserWindow): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  const [windowWidth, windowHeight] = window.getSize()
  
  const x = Math.floor((screenWidth - windowWidth) / 2)
  const y = Math.floor((screenHeight - windowHeight) / 2)
  
  window.setPosition(x, y)
  logger.info(`Window centered at ${x}, ${y}`)
}

export function loadRenderer(window: BrowserWindow): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
