import { afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: unknown[]) => Promise<unknown>>(),
  release: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn(),
  retry: vi.fn().mockReturnValue(true)
}))
vi.mock('electron', () => ({
  ipcMain: {
    handle: (name: string, handler: (...args: unknown[]) => Promise<unknown>) =>
      mocks.handlers.set(name, handler)
  },
  dialog: {}
}))
vi.mock('../../logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('./batch-task', async importOriginal => {
  const original = await importOriginal<typeof import('./batch-task')>()
  return {
    ...original,
    BatchTask: {
      create: vi.fn(async (request: unknown) => ({
        request,
        release: mocks.release,
        run: mocks.run,
        cancel: mocks.cancel,
        retry: mocks.retry
      }))
    }
  }
})
import { setupBatchIPC } from './batch-ipc'
const event = (id: number) => ({
  sender: { id, isDestroyed: () => false, once: vi.fn(), send: vi.fn() }
})
afterEach(() => {
  vi.clearAllMocks()
  mocks.handlers.clear()
})
it('keeps tasks scoped to their owner and validates requests before allocating a job', async () => {
  setupBatchIPC()
  const owner = event(1),
    stranger = event(2)
  const call = (channel: string, sender: unknown, argument: unknown) =>
    mocks.handlers.get('image-tools:' + channel)!(sender, argument)
  expect(await call('batchStart', owner, {})).toEqual({
    success: false,
    errorCode: 'invalid_options'
  })
  const request = {
    taskId: 'owned',
    items: [{ fileName: 'a.png', filePath: '/a.png' }],
    config: { operation: 'compress', compressOptions: { format: 'png', quality: 80 } }
  }
  expect(await call('batchStart', owner, request)).toEqual({ success: true })
  expect(await call('batchStart', owner, request)).toEqual({
    success: false,
    errorCode: 'task_busy'
  })
  for (const channel of ['batchCancel', 'batchRelease', 'batchSave', 'batchRetry']) {
    expect(await call(channel, stranger, 'owned')).toEqual({
      success: false,
      errorCode: 'task_not_found'
    })
  }
  expect(mocks.release).not.toHaveBeenCalled()
  expect(await call('batchRelease', owner, 'owned')).toEqual({ success: true })
  expect(mocks.release).toHaveBeenCalledOnce()
})
