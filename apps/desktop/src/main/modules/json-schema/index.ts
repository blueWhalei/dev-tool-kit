import { ipcMain } from 'electron'
import { validateAgainstSchema } from '@dev-tool-kit/shared'
import { logger } from '../../logger'

interface JsonSchemaValidatePayload {
  data?: unknown
  schemaText?: unknown
}

/**
 * JSON Schema 校验在主进程执行：ajv 依赖 new Function 编译 schema，
 * 渲染进程 CSP 无 unsafe-eval 时会被拦截；移入主进程后渲染进程不再
 * 需要 ajv，为收紧 CSP（移除 unsafe-eval）铺路。
 */
export function setupJsonSchemaIPC(): void {
  logger.info('Setting up JSON Schema IPC handlers')

  ipcMain.handle('json-schema:validate', async (_event, payload: JsonSchemaValidatePayload) => {
    if (!payload || typeof payload !== 'object' || typeof payload.schemaText !== 'string') {
      return { success: false, error: '无效的 JSON Schema' }
    }
    try {
      return validateAgainstSchema(payload.data, payload.schemaText)
    } catch (error) {
      logger.error('json-schema:validate failed:', error)
      return { success: false, error: '无效的 JSON Schema' }
    }
  })

  logger.info('JSON Schema IPC handlers ready')
}
