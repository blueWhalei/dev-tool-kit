import { ipcMain, dialog } from 'electron'
import { readFile } from 'fs/promises'
import { basename } from 'path'
import type { CertificateFileReadResult, CertificateParseResult } from '@dev-tool-kit/shared'
import { logger } from '../../logger'
import { parseCertificatePem } from './parse'

const CERT_FILE_EXTENSIONS = ['pem', 'crt', 'cer', 'cert']

export function setupCertParserIPC(): void {
  logger.info('Setting up Certificate Parser IPC handlers')

  ipcMain.handle('cert-parser:readFile', async (): Promise<CertificateFileReadResult | null> => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        title: 'Select certificate file',
        filters: [
          { name: 'Certificate', extensions: CERT_FILE_EXTENSIONS },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (result.canceled || result.filePaths.length === 0) return null

      const filePath = result.filePaths[0]
      const content = await readFile(filePath, 'utf-8')
      return { content, fileName: basename(filePath) }
    } catch (error) {
      logger.error('Failed to read certificate file:', error)
      return null
    }
  })

  ipcMain.handle('cert-parser:parsePem', async (_, pemText: unknown): Promise<CertificateParseResult> => {
    if (typeof pemText !== 'string') {
      return { success: false, error: '请输入 PEM 证书内容' }
    }
    return parseCertificatePem(pemText)
  })

  logger.info('Certificate Parser IPC handlers ready')
}
