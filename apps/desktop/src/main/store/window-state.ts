import { app, screen } from 'electron'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { readFile, writeFile, unlink } from 'fs/promises'
import { logger } from '../logger'
import { WindowState, DEFAULT_STATE } from '../window'

const STORE_DIR = join(app.getPath('userData'), 'store')
const WINDOW_STATE_FILE = join(STORE_DIR, 'window-state.json')

async function ensureStoreDir(): Promise<void> {
  if (!existsSync(STORE_DIR)) {
    await mkdir(STORE_DIR, { recursive: true })
    logger.info(`Created store directory: ${STORE_DIR}`)
  }
}

function isValidWindowState(state: Record<string, unknown>): boolean {
  if (typeof state.width !== 'number' || typeof state.height !== 'number') return false
  if (typeof state.isMaximized !== 'boolean') return false
  if (state.width < 100 || state.height < 100) return false
  if (state.width > 7680 || state.height > 4320) return false
  if (state.x !== undefined && (typeof state.x !== 'number' || !isFinite(state.x))) return false
  if (state.y !== undefined && (typeof state.y !== 'number' || !isFinite(state.y))) return false
  return true
}

function isPositionVisible(x: number, y: number): boolean {
  const displays = screen.getAllDisplays()
  return displays.some(d => {
    const { x: dx, y: dy, width, height } = d.workArea
    return x >= dx && x < dx + width && y >= dy && y < dy + height
  })
}

export async function saveWindowState(state: WindowState): Promise<void> {
  try {
    await ensureStoreDir()
    await writeFile(WINDOW_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8')
    logger.info(`Window state saved: ${JSON.stringify(state)}`)
  } catch (error) {
    logger.error('Failed to save window state:', error)
  }
}

export async function loadWindowState(): Promise<WindowState> {
  try {
    if (!existsSync(WINDOW_STATE_FILE)) {
      logger.info('No saved window state found, using defaults')
      return { ...DEFAULT_STATE }
    }

    const data = await readFile(WINDOW_STATE_FILE, 'utf-8')
    const state = JSON.parse(data) as Record<string, unknown>

    if (!isValidWindowState(state)) {
      logger.warn('Invalid window state format, using defaults')
      return { ...DEFAULT_STATE }
    }

    if (state.x !== undefined && state.y !== undefined && !isPositionVisible(state.x as number, state.y as number)) {
      logger.warn('Saved window position is off-screen, using defaults')
      return { ...DEFAULT_STATE }
    }

    logger.info(`Window state loaded: ${JSON.stringify(state)}`)
    return state as unknown as WindowState
  } catch (error) {
    logger.error('Failed to load window state:', error)
    return { ...DEFAULT_STATE }
  }
}

export async function resetWindowState(): Promise<void> {
  try {
    if (existsSync(WINDOW_STATE_FILE)) {
      await unlink(WINDOW_STATE_FILE)
      logger.info('Window state reset')
    }
  } catch (error) {
    logger.error('Failed to reset window state:', error)
  }
}
