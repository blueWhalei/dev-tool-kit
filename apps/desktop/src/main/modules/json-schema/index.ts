import { TOOL_ERROR_CODES } from '@dev-tool-kit/shared'
import { handleIpc } from '../../typed-ipc'
import type { IpcResult } from '@dev-tool-kit/shared'
import { join } from 'path'
import { runWorkerTask } from '../worker-task'
import { logger } from '../../logger'

interface JsonSchemaValidatePayload {
  data?: unknown
  schemaText?: unknown
}

/** Isolate untrusted schema execution; each window owns at most one validation. */
export function setupJsonSchemaIPC(): void {
  logger.info('Setting up JSON Schema IPC handlers')
  const pending = new Map<number, AbortController>()

  handleIpc('json-schema:validate', async (event, payload: JsonSchemaValidatePayload) => {
    const senderId = event.sender.id
    pending.get(senderId)?.abort()
    if (!payload || typeof payload !== 'object' || typeof payload.schemaText !== 'string') {
      return { success: false, error: TOOL_ERROR_CODES.schemaInvalid }
    }
    const controller = new AbortController()
    pending.set(senderId, controller)
    const close = () => controller.abort()
    event.sender.once('destroyed', close)
    try {
      if (
        Buffer.byteLength(payload.schemaText, 'utf8') > 256 * 1024 ||
        Buffer.byteLength(JSON.stringify(payload.data) ?? '', 'utf8') > 2 * 1024 * 1024
      )
        return { success: false, error: 'schemaInputTooLarge' }
      return await runWorkerTask<IpcResult<'json-schema:validate'>>(
        join(__dirname, 'modules/json-schema/schema-worker.js'),
        payload,
        3000,
        controller.signal
      )
    } catch (error) {
      logger.error('json-schema:validate failed:', error)
      return {
        success: false,
        error:
          error instanceof Error && error.message === 'workerTimeout'
            ? 'schemaTimeout'
            : 'schemaWorkerFailed'
      }
    } finally {
      event.sender.removeListener('destroyed', close)
      if (pending.get(senderId) === controller) pending.delete(senderId)
    }
  })

  logger.info('JSON Schema IPC handlers ready')
}
