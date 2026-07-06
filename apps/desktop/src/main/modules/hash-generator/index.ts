import { ipcMain, dialog } from 'electron'
import { logger } from '../../logger'
import { computeFileHashes } from './file-hash'

export function setupHashGeneratorIPC(): void {
  logger.info('Setting up Hash Generator IPC handlers')

  ipcMain.handle('hash-generator:selectFile', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: 'Select file for hash computation'
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    } catch (error) {
      logger.error('Failed to select file:', error)
      return null
    }
  })

  ipcMain.handle('hash-generator:computeFileHash', async (_, filePath: unknown) => {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return null
    }
    try {
      return await computeFileHashes(filePath)
    } catch (error) {
      logger.error('Failed to compute file hash:', error)
      return null
    }
  })

  logger.info('Hash Generator IPC handlers ready')
}
