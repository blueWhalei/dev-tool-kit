import { ipcMain } from 'electron'
import type { KeyPairGenerateResult } from '@dev-tool-kit/shared'
import { logger } from '../../logger'
import { generateKeyPairPem } from './generate'

export function setupKeyPairGeneratorIPC(): void {
  logger.info('Setting up Key Pair Generator IPC handlers')

  ipcMain.handle('key-pair-generator:generate', async (_, algorithm: unknown): Promise<KeyPairGenerateResult> => {
    return generateKeyPairPem(algorithm)
  })

  logger.info('Key Pair Generator IPC handlers ready')
}
