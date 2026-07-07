import { ipcMain, dialog } from 'electron'
import { readFile } from 'fs/promises'
import { basename, extname } from 'path'
import { logger } from '../../logger'

const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon'
}

export interface ImageBase64Result {
  fileName: string
  mimeType: string
  base64: string
  dataUri: string
  size: number
}

export function setupImageBase64IPC(): void {
  logger.info('Setting up Image Base64 IPC handlers')

  ipcMain.handle('image-base64:pickImage', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico']
          }
        ]
      })
      if (result.canceled || result.filePaths.length === 0) return null

      const filePath = result.filePaths[0]
      const buffer = await readFile(filePath)
      const fileName = basename(filePath)
      const ext = extname(filePath).toLowerCase()
      const mimeType = MIME_BY_EXT[ext] || 'application/octet-stream'
      const base64 = buffer.toString('base64')

      return {
        fileName,
        mimeType,
        base64,
        dataUri: `data:${mimeType};base64,${base64}`,
        size: buffer.length
      } satisfies ImageBase64Result
    } catch (error) {
      logger.error('Failed to pick image:', error)
      return null
    }
  })

  logger.info('Image Base64 IPC handlers ready')
}
