import { ipcMain, dialog } from 'electron'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { createHash } from 'crypto'
import { basename } from 'path'
import { logger } from '../../logger'
import type { HashAlgorithm, FileHashResults } from '@dev-tool-kit/shared'

const ALGORITHM_MAP: Record<HashAlgorithm, string> = {
  'MD5': 'md5',
  'SHA-1': 'sha1',
  'SHA-256': 'sha256',
  'SHA-512': 'sha512'
}

function computeFileStreamHash(algorithm: string, filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm)
    const stream = createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

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

  ipcMain.handle('hash-generator:computeFileHash', async (_, filePath: string) => {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      return null
    }
    try {
      const fileStat = await stat(filePath)
      const fileName = basename(filePath)
      const algorithms: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

      const hashes = await Promise.all(
        algorithms.map(async (algo) => ({
          algorithm: algo,
          hash: await computeFileStreamHash(ALGORITHM_MAP[algo], filePath)
        }))
      )

      return { fileName, fileSize: fileStat.size, hashes } as FileHashResults
    } catch (error) {
      logger.error('Failed to compute file hash:', error)
      return null
    }
  })

  logger.info('Hash Generator IPC handlers ready')
}
