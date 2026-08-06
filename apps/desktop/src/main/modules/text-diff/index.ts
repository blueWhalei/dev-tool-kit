import { ipcMain } from 'electron'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import { logger } from '../../logger'
import { isPathAuthorized } from '../path-guard'

export interface TextFileReadResult {
  content: string
  fileName: string
}

export function setupTextDiffIPC(): void {
  logger.info('Setting up Text Diff IPC handlers')

  ipcMain.handle('text-diff:readFile', async (_, filePath: unknown) => {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return null
    }
    if (!isPathAuthorized(filePath)) {
      logger.warn('Blocked text-diff:readFile for unauthorized path:', filePath)
      return null
    }
    try {
      const content = await readFile(filePath, 'utf-8')
      return { content, fileName: basename(filePath) } satisfies TextFileReadResult
    } catch (error) {
      logger.error('Failed to read text file:', error)
      return null
    }
  })

  logger.info('Text Diff IPC handlers ready')
}
