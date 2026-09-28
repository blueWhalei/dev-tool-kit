import { dialog, type IpcMainInvokeEvent } from 'electron'
import { copyFile, constants } from 'fs/promises'
import { join } from 'path'
import { handleIpc as handle } from '../../typed-ipc'
import { BatchTask, isBatchTaskRequest } from './batch-task'
import { isPathAuthorized } from '../path-guard'
import { logger } from '../../logger'

export function setupBatchIPC(): void {
  const jobs = new Map<number, BatchTask>()
  const busy = new Set<number>()
  const observed = new Set<number>()
  const fail = (errorCode: string) => ({ success: false as const, errorCode })
  const find = (event: IpcMainInvokeEvent, id: string) => {
    const job = jobs.get(event.sender.id)
    return typeof id === 'string' && job?.request.taskId === id ? job : undefined
  }
  handle('image-tools:batchStart', async (event, request) => {
    if (!isBatchTaskRequest(request)) return fail('invalid_options')
    const owner = event.sender.id
    if (busy.has(owner) || jobs.has(owner)) return fail('task_busy')
    busy.add(owner)
    try {
      const job = await BatchTask.create(request, isPathAuthorized, progress => {
        try {
          if (!event.sender.isDestroyed()) event.sender.send('image-tools:batchProgress', progress)
        } catch (error) {
          logger.error('Batch progress delivery failed', error)
        }
      })
      if (event.sender.isDestroyed()) {
        await job.release()
        return fail('owner_closed')
      }
      jobs.set(owner, job)
      if (!observed.has(owner)) {
        observed.add(owner)
        event.sender.once('destroyed', () => {
          const current = jobs.get(owner)
          jobs.delete(owner)
          observed.delete(owner)
          void current?.release().catch(error => logger.error('Batch cleanup failed', error))
        })
      }
      void job.run().catch(error => logger.error('Batch failed', error))
      return { success: true }
    } catch (error) {
      logger.error('Batch start failed', error)
      return fail('task_start_failed')
    } finally {
      busy.delete(owner)
    }
  })
  handle('image-tools:batchCancel', async (event, id) => {
    const job = find(event, id)
    if (!job) return fail('task_not_found')
    job.cancel()
    return { success: true }
  })
  handle('image-tools:batchRetry', async (event, id) => {
    const job = find(event, id)
    if (!job) return fail('task_not_found')
    if (!job.retry()) return fail('task_busy')
    void job.run().catch(error => logger.error('Batch failed', error))
    return { success: true }
  })
  handle('image-tools:batchRelease', async (event, id) => {
    const job = find(event, id)
    if (!job) return fail('task_not_found')
    await job.release()
    if (jobs.get(event.sender.id) === job) jobs.delete(event.sender.id)
    return { success: true }
  })
  handle('image-tools:batchSave', async (event, id) => {
    const job = find(event, id)
    if (!job) return fail('task_not_found')
    if (job.running) return fail('task_busy')
    const selection = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    if (selection.canceled || !selection.filePaths[0]) return { success: true, cancelled: true }
    let saved = 0
    let failed = 0
    for (const [index, output] of job.outputs) {
      const result = job.items[index].result
      if (!result) continue
      try {
        await copyFile(
          output,
          join(selection.filePaths[0], result.fileName),
          constants.COPYFILE_EXCL
        )
        saved++
      } catch {
        failed++
      }
    }
    return failed ? { ...fail('save_failed'), saved, failed } : { success: true, saved, failed }
  })
}
